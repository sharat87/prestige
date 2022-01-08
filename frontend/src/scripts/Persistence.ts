import m from "mithril"
import Stream from "mithril/stream"
import AuthService from "_/AuthService"
import type { User } from "_/AuthService"
import { GIST_API_PREFIX, storageUrl } from "_/Env"
import ModalManager from "_/ModalManager"
import Button from "_/Button"

const STORAGE_URL_BASE = storageUrl()

export type Source =
	LocalSource
	| CloudSource
	| GistSource

interface BaseSource {
	type: string
	title: string
}

interface LocalSource extends BaseSource {
	type: "browser"
	details: {
		prefix: string
	}
}

interface CloudSource extends BaseSource {
	type: "cloud"
}

interface GistSource extends BaseSource {
	type: "gist"
}

type SheetPath = string

export const enum SaveState {
	unchanged,
	unsaved,
	saving,
	saved,
}

export class Sheet {
	path: SheetPath
	name: string
	body: string
	saveState: SaveState

	constructor(path: SheetPath, body: string) {
		this.path = path
		this.name = path
		this.body = body
		this.saveState = SaveState.unchanged
	}
}

type SheetEntry = Pick<Sheet, "path" | "name">

export abstract class Provider<S extends Source> {
	key: string
	source: S
	entries: SheetEntry[]
	isManualSave: boolean

	constructor(key: string, source: S, isManualSave = false) {
		this.key = key
		this.source = source
		this.entries = []
		this.isManualSave = isManualSave
		this.create = this.create.bind(this)
	}

	abstract loadRootListing(): Promise<void>

	abstract load(sheetPath: SheetPath): Promise<Sheet>

	abstract autoSave(sheet: Sheet): Promise<void>

	manualSave(sheet: Sheet): Promise<void> {
		return this.autoSave(sheet)
	}

	abstract create(): Promise<void>

	abstract delete(path: string): Promise<void>

	abstract render(): m.Children
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
		return new Sheet(sheetPath, body)
	}

	async autoSave({ path, name, body }: Sheet): Promise<void> {
		localStorage.setItem(this.prefix + path + ":name", name)
		localStorage.setItem(this.prefix + path + ":body", body)
	}

	async create(): Promise<void> {
		const name = window.prompt("Sheet Name") ?? ""
		if (name === "") {
			return
		}
		const path = name
		localStorage.setItem(this.prefix + path + ":name", name)
		localStorage.setItem(this.prefix + path + ":body", "")
		await this.loadRootListing()
	}

	delete(path: string): Promise<void> {
		// TODO: Iterate over all of localStorage and delete all keys with path as prefix.
		localStorage.removeItem(this.prefix + path + ":name")
		localStorage.removeItem(this.prefix + path + ":body")
		localStorage.removeItem(this.prefix + path + ":cookieJar")
		return this.loadRootListing()
	}

	render(): m.Children {
		return [
			m(
				"a.pv1.ph2.db",
				{
					onclick: this.create,
					href: "#",
				},
				"+ Create new",
			),
			m("ul", [
				this.entries.map(entry => {
					const href = `/doc/${ this.key }/${ entry.path }`
					return m(
						"li",
						[
							m(
								m.route.Link,
								{
									href,
									class: window.location.hash.substr(2) === href ? "active" : "",
								},
								entry.name,
							),
							/* Deleting UI should be elsewhere.
							m(
								Button,
								{
									class: "compact danger-light",
									onclick(event: Event) {
										console.log("Deleting", entry)
										provider.delete(entry.path)
										event.preventDefault()
									},
								},
								"Del",
							),
						   //*/
						],
					)
				}),
			]),
		]
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

	async autoSave(sheet: Sheet): Promise<void> {
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

	async create(): Promise<void> {
		const name = window.prompt("Sheet path:")
		await m.request({
			method: "POST",
			url: STORAGE_URL_BASE + name,
			withCredentials: true,
			body: {
				name,
			},
		})
		await this.loadRootListing()
	}

	delete(path: string): Promise<void> {
		return m.request({
			method: "DELETE",
			url: STORAGE_URL_BASE + path,
			withCredentials: true,
		})
			.then(() => this.loadRootListing())
	}

	render(): m.Children {
		return "Deprecated?"
	}
}

interface Gist {
	id: string
	name: string
	owner: string
	description: string
	path: string
	readme: GistFile
	files: GistFile[]
}

interface GistFile {
	name: string
	rawUrl: string
}

export class GistProvider extends Provider<GistSource> {
	private gists: Record<string, Gist>

	constructor(key: string, source: GistSource) {
		super(key, source, true)
		this.gists = {}
	}

	verifyUser(): User {
		const currentUser = AuthService.currentUser()

		if (currentUser == null) {
			throw new Error("User not logged in, cannot browse documents on Gist.")
		}

		if (!currentUser.isGitHubConnected) {
			throw new Error("GitHub not connected for logged in user, cannot browse documents on Gist.")
		}

		return currentUser
	}

	async loadRootListing(): Promise<void> {
		try {
			this.verifyUser()
		} catch (error) {
			return
		}

		const response = await m.request<{ gists: Gist[] }>({
			method: "GET",
			url: GIST_API_PREFIX,
			withCredentials: true,
		})

		this.entries = []
		for (const gist of response.gists) {
			if (gist.readme != null && gist.files?.length > 0) {
				const path = `${ gist.owner }/${ gist.name }`
				gist.path = path
				this.gists[gist.name] = gist
			}
		}
	}

	async clearListing() {
		this.gists = {}
	}

	async load(sheetPath: SheetPath): Promise<Sheet> {
		const response = await m.request<string>({
			method: "GET",
			url: GIST_API_PREFIX + "get-file/" + sheetPath,
			withCredentials: true,
			responseType: "text",
			deserialize(data) {
				return data
			},
		})

		return new Sheet(sheetPath, response)
	}

	autoSave(): Promise<void> {
		return Promise.reject()
	}

	async manualSave(sheet: Sheet): Promise<void> {
		this.verifyUser()

		const gistName = sheet.path.split("/")[1]
		const fileName = sheet.path.split("/")[2] ?? "main.prestige"
		const gist = this.gists[gistName]

		await m.request({
			method: "PATCH",
			url: GIST_API_PREFIX + "update/" + gistName,
			withCredentials: true,
			body: {
				readmeName: gist.readme.name,
				files: {
					[fileName]: {
						content: sheet.body,
					},
				},
			},
		})
	}

	async create(content = ""): Promise<void> {
		let title = ""
		let description = ""

		ModalManager.show((control) => {
			const onGistFormSubmit = (event: SubmitEvent) => {
				if (title === "") {
					return
				}
				event.preventDefault()
				control.close()
				m.request({
					method: "POST",
					url: GIST_API_PREFIX,
					withCredentials: true,
					body: {
						title,
						description,
						content,
						isPublic: event.submitter?.classList.contains("public") ?? false,
					},
				}).then(() => {
					console.log("Loading root listing after creating a gist.")
					this.loadRootListing()
				}).catch((error) => {
					console.error("Error creating Gist", error)
				})
			}

			return m(".pa2", [
				m("h1", "Create a new Gist"),
				m("form", { onsubmit: onGistFormSubmit }, [
					m(".grid", [
						m("label", { for: "gist-title" }, m("span", "Title*")),
						m("input", {
							id: "gist-title",
							type: "text",
							placeholder: "A title for the Gist",
							value: title,
							required: true,
							oninput(event: InputEvent) {
								title = (event.target as HTMLInputElement).value
							},
						}),
						m("label", { for: "gist-description" }, m("span", "Description")),
						m("input", {
							id: "gist-description",
							type: "text",
							placeholder: "Optional, description for the Gist",
							value: description,
							oninput(event: InputEvent) {
								description = (event.target as HTMLInputElement).value
							},
						}),
					]),
					m("p.tr", [
						m(Button, { type: "submit", style: "primary" }, "Create Secret Gist"),
						m(Button, { type: "submit", class: "ml2 public" }, "Create Public Gist"),
					]),
				]),
			])
		})
	}

	delete(path: string): Promise<void> {
		return m.request({
			method: "DELETE",
			url: STORAGE_URL_BASE + path,
			withCredentials: true,
		})
			.then(() => this.loadRootListing())
	}

	render(): m.Children {
		const currentUser = AuthService.currentUser()

		if (currentUser == null) {
			return "Please login with GitHub to view your Gists."
		}

		if (!currentUser.isGitHubConnected) {
			return "Please connect to GitHub to view your Gists."
		}

		const gists = Object.values(this.gists)

		return [
			gists.length === 0 && m("p.pa1", [
				"No prestige gists found! Let's ",
				m("a", { onclick: () => this.create(), href: "#" }, "create one now"),
				"!",
			]),
			gists.length > 0 && m(
				"a.pv1.ph2.db",
				{
					onclick: () => this.create(),
					href: "#",
				},
				"+ Create new",
			),
			gists.length > 0 && m("ul", [
				gists.map((gist: Gist) => {
					const gistHref = `/doc/${ this.key }/${ gist.path }`
					return m(
						"li",
						gist.files.length === 1 && [
							m("li", m(
								m.route.Link,
								{
									href: gistHref,
									class: window.location.hash.substr(2) === gistHref ? "active" : "",
								},
								gist.readme.name.replace(/^_|(\.md$)/g, ""),
							)),
						],
						gist.files.length > 1 && [
							m(
								m.route.Link,
								{
									href: gistHref,
									class: window.location.hash.substr(2) === gistHref ? "active" : "",
								},
								gist.readme.name.replace(/^_|(\.md$)/g, ""),
							),
							m("ul", [
								gist.files.map((file) => {
									const fileHref = gistHref + "/" + file.name
									return m("li", m(
										m.route.Link,
										{
											href: fileHref,
											class: window.location.hash.substr(2) === fileHref ? "active" : "",
										},
										file.name,
									))
								}),
							]),
						],
					)
				}),
			]),
		]
	}
}

const availableSources: Stream<Source[]> = Stream()
AuthService.currentUser.map(recomputeAvailableSources)

async function recomputeAvailableSources(user: null | User): Promise<void> {
	const sources: Source[] = [
		{
			type: "browser",
			title: "Browser Storage",
			details: {
				prefix: "instance:",
			},
		},
	]

	if (STORAGE_URL_BASE && user != null) {
		sources.push({
			type: "cloud",
			title: "Cloud",
		})
	}

	// The Gist source is always available, since anonymous users should be able to load a Gist by URL.
	sources.push({
		type: "gist",
		title: "GitHub Gist",
	})

	// If available sources didn't change, after auth checking is done, don't recompute stuff below.
	if (JSON.stringify(availableSources()) !== JSON.stringify(sources)) {
		availableSources(sources)
	}
}

function createProviderForSource(key: string, source: Source): Provider<Source> {
	if (source.type === "browser") {
		return new BrowserProvider(key, source)
	} else if (source.type === "cloud") {
		return new CloudProvider(key, source)
	} else if (source.type === "gist") {
		return new GistProvider(key, source)
	}

	throw new Error(`Unrecognized persistence source type: '${ source != null && (source as BaseSource).type }'.`)
}

// TODO: Data in `currentProviders` and `providerRegistry` is the same, in different shapes. Remove one.
export const providerCache: Map<string, Provider<Source>> = new Map()
export const currentProviders: Stream<Provider<Source>[]> = Stream([])
export const currentSheetName: Stream<null | string> = Stream(null)
export const currentSheet: Stream<null | "loading" | Sheet> = Stream(null)

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
	console.log("Load sheet at", qualifiedName, "from", providerKey)

	const provider = providerCache.get(providerKey)

	if (provider == null) {
		console.log("providerCache", providerCache)
		throw new Error("Couldn't get provider for qualified name " + qualifiedName)
	}

	currentSheet("loading")
	provider.load(path)
		.then(currentSheet)
		.finally(m.redraw)

}, currentProviders, currentSheetName)

// When auth status changes, reset or refresh Gist listing.
Stream.lift((providers: Provider<Source>[], user: null | User) => {
	for (const provider of providers) {
		if (provider.key === "gist") {
			if (user == null) {
				(provider as GistProvider).clearListing()
			} else {
				provider.loadRootListing()
			}
		}
	}
}, currentProviders, AuthService.currentUser)

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

export function getProvider(qualifiedName: string): Provider<Source> {
	if (typeof currentProviders() === "undefined") {
		throw new Error("Providers not initialized yet.")
	}

	const providerKey = qualifiedName.split("/")[0]

	const provider = providerCache.get(providerKey)

	if (provider == null) {
		console.log(providerCache)
		throw new Error("Couldn't get provider for qualified name " + qualifiedName)
	}

	return provider
}

export async function saveSheetAuto(qualifiedName: string, sheet: Sheet): Promise<void> {
	console.log("Save auto")
	const provider = getProvider(qualifiedName)
	if (!provider.isManualSave) {
		const prevState = sheet.saveState
		sheet.saveState = SaveState.saving
		try {
			await provider.autoSave(sheet)
			sheet.saveState = SaveState.saved
		} catch (error) {
			console.error("Error saving automatically", error)
			sheet.saveState = prevState
		}
	}
}

export async function saveSheetManual(qualifiedName: string, sheet: Sheet): Promise<void> {
	console.log("Save manual")
	const provider = getProvider(qualifiedName)
	if (provider.isManualSave) {
		const prevState = sheet.saveState
		sheet.saveState = SaveState.saving
		try {
			await provider.manualSave(sheet)
			sheet.saveState = SaveState.saved
		} catch (error) {
			console.error("Error saving manually", error)
			sheet.saveState = prevState
		}
	}
}

export function isManualSaveAvailable(): boolean {
	const sheetName = currentSheetName()
	return sheetName != null && getProvider(sheetName).isManualSave
}
