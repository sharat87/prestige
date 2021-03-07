import m from "mithril"
import * as AuthService from "./AuthService"
import Stream from "mithril/stream"
import { storageUrl } from "./Env"
import CookieJar from "./CookieJar"

const STORAGE_URL_BASE = storageUrl()

export type Source =
	LocalSource
	| CloudSource


interface BaseSource {
	type: string;
	title: string;
}

interface LocalSource extends BaseSource {
	type: "browser";
	details: {
		prefix: string;
	};
}

interface CloudSource extends BaseSource {
	type: "cloud";
}

type SheetPath = string

export class Sheet {
	path: SheetPath
	name: string
	body: string
	cookieJar: CookieJar | null

	constructor(path: SheetPath, body: string, cookieJar: CookieJar | null = null) {
		this.path = path
		this.name = path
		this.body = body
		this.cookieJar = cookieJar
	}
}

type SheetEntry = Pick<Sheet, "path" | "name">

export abstract class Provider<S extends Source> {
	key: string
	source: S
	entries: SheetEntry[]

	constructor(key: string, source: S) {
		this.key = key
		this.source = source
		this.entries = []
	}

	abstract loadRootListing(): Promise<void>

	abstract load(sheetPath: SheetPath): Promise<Sheet>

	abstract save(sheet: Sheet): Promise<void>

	abstract create(path: string, name: string): Promise<void>

	abstract delete(path: string): Promise<void>
}

class BrowserProvider extends Provider<LocalSource> {
	get prefix() {
		return this.source.details.prefix
	}

	async loadRootListing(): Promise<void> {
		const paths: SheetEntry[] = []
		for (let i = 0; i < localStorage.length; ++i) {
			const key = localStorage.key(i)
			if (key?.startsWith(this.prefix) && key.endsWith(":name")) {
				const path = key.substring(this.prefix.length, key.length - ":name".length)
				paths.push({ path, name: localStorage.getItem(key) ?? path })
			}
		}
		this.entries = paths
	}

	async load(sheetPath: SheetPath): Promise<Sheet> {
		const pathPrefix = this.prefix + sheetPath

		const body = localStorage.getItem(pathPrefix + ":body") ?? ""

		const cookieJarString = localStorage.getItem(pathPrefix + ":cookieJar")
		let cookieJar = null
		if (cookieJarString != null) {
			cookieJar = JSON.parse(cookieJarString)
		}

		return new Sheet(sheetPath, body, CookieJar.fromPlain(cookieJar))
	}

	async save({ path, name, body, cookieJar }: Sheet): Promise<void> {
		localStorage.setItem(this.prefix + path + ":name", name)
		localStorage.setItem(this.prefix + path + ":body", body)
		console.log("saving cookieJar", cookieJar)
		localStorage.setItem(this.prefix + path + ":cookieJar", JSON.stringify(cookieJar))
	}

	create(path: string, name: string): Promise<void> {
		if (path === "") {
			path = name
		}
		localStorage.setItem(this.prefix + path + ":name", name)
		localStorage.setItem(this.prefix + path + ":body", "")
		return this.loadRootListing()
	}

	delete(path: string): Promise<void> {
		// TODO: Iterate over all of localStorage and delete all keys with path as prefix.
		localStorage.removeItem(this.prefix + path + ":name")
		localStorage.removeItem(this.prefix + path + ":body")
		localStorage.removeItem(this.prefix + path + ":cookieJar")
		return this.loadRootListing()
	}
}

class CloudProvider extends Provider<CloudSource> {
	async loadRootListing(): Promise<void> {
		const currentUser = AuthService.currentUser()

		if (currentUser == null) {
			throw new Error("Cannot browse sheets on cloud, since user not logged in.")
		}

		const response = await m.request<{ ok: boolean, entries: { name: string, slug: string }[] }>({
			method: "GET",
			url: STORAGE_URL_BASE,
			withCredentials: true,
		})

		const entries = []
		for (const item of response.entries) {
			entries.push({ path: item.slug, name: item.name })
		}

		this.entries = entries
	}

	async load(sheetPath: SheetPath): Promise<Sheet> {
		const currentUser = AuthService.currentUser()

		if (currentUser == null) {
			throw new Error("Cannot load sheets on cloud, since user not logged in.")
		}

		const response = await m.request<{ body: string }>({
			method: "GET",
			url: STORAGE_URL_BASE + sheetPath,
			withCredentials: true,
		})

		return new Sheet(sheetPath, response.body)
	}

	async save(sheet: Sheet): Promise<void> {
		const currentUser = AuthService.currentUser()

		if (currentUser == null) {
			throw new Error("Cannot load sheets on cloud, since user not logged in.")
		}

		// TODO: Verify if the save was successful.
		await m.request({
			method: "PATCH",
			url: STORAGE_URL_BASE + sheet.path,
			withCredentials: true,
			body: {
				body: sheet.body,
			},
		})
	}

	create(path: string, name: string): Promise<void> {
		return m.request({
			method: "POST",
			url: STORAGE_URL_BASE + path,
			withCredentials: true,
			body: {
				name,
			},
		})
			.then(() => this.loadRootListing())
	}

	delete(path: string): Promise<void> {
		return m.request({
			method: "DELETE",
			url: STORAGE_URL_BASE + path,
			withCredentials: true,
		})
			.then(() => this.loadRootListing())
	}
}

const availableSources: Stream<Source[]> = Stream()
AuthService.currentUser.map(recomputeAvailableSources)
recomputeAvailableSources(null)

async function recomputeAvailableSources(user: null | AuthService.User): Promise<void> {
	const sources: Source[] = [
		{
			type: "browser",
			title: "Browser Storage",
			details: {
				prefix: "instance:",
			},
		},
	]

	if (user != null) {
		sources.push({
			type: "cloud",
			title: "Cloud",
		})
	}

	availableSources(sources)
}

function createProviderForSource(key: string, source: Source): Provider<Source> {
	if (source.type === "browser") {
		return new BrowserProvider(key, source)
	} else if (source.type === "cloud") {
		return new CloudProvider(key, source)
	}

	throw new Error(`Unrecognized persistence source type: '${ (source as any).type }'.`)
}

// TODO: Data in `currentProviders` and `providerRegistry` is the same, in different shapes. Remove one.
export const providerCache: Map<string, Provider<Source>> = new Map()
export const currentProviders: Stream<Provider<Source>[]> = Stream([])
export const currentSheetName: Stream<null | string> = Stream(null)
export const currentSheet: Stream<null | Sheet> = Stream(null)

availableSources.map(async function(sources: Source[]): Promise<void> {
	// Refresh available providers.
	const providers: Provider<Source>[] = []

	const typeCounts: Record<string, number> = {}

	for (const source of sources) {
		typeCounts[source.type] = 1 + (typeCounts[source.type] || -1)
		const key = source.type + (typeCounts[source.type] > 0 ? ":" + typeCounts[source.type] : "")
		let provider = providerCache.get(key)

		if (provider == null) {
			providerCache.set(key, provider = createProviderForSource(key, source))
		}

		providers.push(provider)
	}

	await Promise.all(providers.map(provider => provider.loadRootListing()))

	currentProviders(providers)
})

Stream.lift((providers: Provider<Source>[], qualifiedName: string | null) => {
	if (qualifiedName == null || providers == null || providers.length === 0) {
		currentSheet(null)
		return
	}

	const [providerKey, ...pathParts] = qualifiedName.split("/")
	const path = pathParts.join("/")

	const provider = providerCache.get(providerKey)

	if (provider == null) {
		console.log("providerCache", providerCache)
		throw new Error("Couldn't get provider for qualified name " + qualifiedName)
	}

	provider.load(path)
		.then((sheet: Sheet) => {
			currentSheet(sheet)
		})
		.finally(m.redraw)

}, currentProviders, currentSheetName)

export async function openSheet(qualifiedName: string): Promise<Sheet> {
	if (typeof currentProviders() === "undefined") {
		throw new Error("Providers not initialized yet.")
	}

	const [providerKey, ...pathParts] = qualifiedName.split("/")
	const path = pathParts.join("/")

	const provider = providerCache.get(providerKey)

	if (provider == null) {
		console.log("providerCache", providerCache)
		throw new Error("Couldn't get provider for qualified name " + qualifiedName)
	}

	return await provider.load(path)
}

export async function saveSheet(qualifiedName: string, sheet: Sheet): Promise<void> {
	if (typeof currentProviders() === "undefined") {
		throw new Error("Providers not initialized yet.")
	}

	const providerKey = qualifiedName.split("/")[0]

	const provider = providerCache.get(providerKey)

	if (provider == null) {
		console.log(providerCache)
		throw new Error("Couldn't get provider for qualified name " + qualifiedName)
	}

	return await provider.save(sheet)
}
