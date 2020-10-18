import AuthService from "./AuthService";
import firebase from "firebase/app";
import "firebase/firestore";

let currentProviders: Provider<Source>[] = [];

export type Source =
	LocalSource
	| CloudSource
	;

interface LocalSource {
	type: "local";
	title: string;
	details: {
		prefix: string;
	};
}

interface CloudSource {
	type: "cloud";
	title: string;
	details: null;
}

type SheetPath = string;

export class Sheet {
	path: SheetPath;
	body: string;
	cookieJar: any;

	constructor(path: SheetPath, body: string, cookieJar = null) {
		this.path = path;
		this.body = body;
		this.cookieJar = cookieJar;
	}
}

export abstract class Provider<S extends Source> {
	source: S;
	entries: string[];

	constructor(source: S) {
		this.source = source;
		this.entries = [];
	}

	abstract loadRootListing(): Promise<void>;

	abstract load(sheetPath: SheetPath): Promise<Sheet>;

	abstract save(sheet: Sheet): Promise<void>;
}

class LocalProvider extends Provider<LocalSource> {
	source: LocalSource;

	get prefix() {
		return this.source.details.prefix;
	}

	loadRootListing(): Promise<void> {
		const paths: string[] = [];
		for (let i = 0; i < localStorage.length; ++i) {
			const key = localStorage.key(i);
			if (key?.startsWith(this.prefix)) {
				paths.push(key.substr(this.prefix.length));
			}
		}
		this.entries = paths;
		return Promise.resolve();
	}

	load(sheetPath: SheetPath): Promise<Sheet> {
		const raw = localStorage.getItem(this.prefix + sheetPath);

		if (raw == null) {
			return Promise.reject(new Error(`Item '${ sheetPath }' not found.`));
		}

		const [body, cookieJar] = JSON.parse(raw);
		return Promise.resolve(new Sheet(sheetPath, body, cookieJar));
	}

	save(sheet: Sheet): Promise<void> {
		return new Promise(resolve => {
			localStorage.setItem(
				this.prefix + sheet.path,
				JSON.stringify([sheet.body, sheet.cookieJar]),
			);
			resolve();
		});
	}
}

class CloudProvider extends Provider<CloudSource> {
	source: CloudSource;

	loadRootListing(): Promise<void> {
		const db = firebase.firestore();
		const currentUser = AuthService.getCurrentUser();

		if (currentUser == null) {
			return Promise.reject("Cannot browse sheets on cloud, since user not logged in.");
		}

		return db.collection(`s/${ currentUser.uid }/sheets`)
			.get()
			.then(snapshot => {
				const paths: string[] = [];
				for (const doc of snapshot.docs) {
					paths.push(doc.id);
				}
				this.entries = paths;
			})
			.catch(error => {
				console.error("Error browsing sheets from cloud.", error);
			});
	}

	load(sheetPath: SheetPath): Promise<Sheet> {
		const db = firebase.firestore();
		const currentUser = AuthService.getCurrentUser();

		if (currentUser == null) {
			return Promise.reject("Cannot load sheets on cloud, since user not logged in.");
		}

		return db.doc(`s/${ currentUser.uid }/sheets/${ sheetPath }`)
			.get()
			.then(snapshot => {
				return new Sheet(sheetPath, snapshot.get("body"), snapshot.get("cookieJar"));
			})
			.catch(error => {
				console.error(`Error loading sheet by path '${ sheetPath }'.`, error);
				return Promise.reject(error);
			});
	}

	save(sheet: Sheet): Promise<void> {
		const db = firebase.firestore();
		const currentUser = AuthService.getCurrentUser();

		if (currentUser == null) {
			return Promise.reject("Cannot load sheets on cloud, since user not logged in.");
		}

		return db.doc(`s/${ currentUser.uid }/sheets/${ sheet.path }`)
			.set({
				body: sheet.body,
				cookieJar: sheet.cookieJar,
			}, {
				merge: true,
			})
			.catch(error => {
				console.error(`Error saving sheet by path '${ sheet.path }'.`, error);
				return Promise.reject(error);
			});
	}
}

function getAllAvailableSources(): Promise<Source[]> {
	const sources: Source[] = [
		{
			type: "local",
			title: "Browser Storage",
			details: {
				prefix: "instance:",
			},
		},
	];

	const currentUser = AuthService.getCurrentUser();
	if (currentUser == null) {
		return Promise.resolve(sources);
	}

	const db = firebase.firestore();

	sources.push({
		type: "cloud",
		title: "Cloud",
		details: null,
	});

	return db.collection(`s/${ currentUser.uid }/sources`)
		.get()
		.then(snapshot => {
			for (const doc of snapshot.docs) {
				sources.push({
					type: doc.get("type"),
					title: doc.get("title"),
					details: doc.get("details") || {},
				});
			}
			return sources;
		})
		.catch(error => {
			console.error("Error loading sources from cloud.", error);
			return sources;
		});
}

function createProviderForSource(source: Source): Provider<Source> {
	if (source.type === "local") {
		return new LocalProvider(source);
	} else if (source.type === "cloud") {
		return new CloudProvider(source);
	}

	throw new Error(`Unrecognized persistence source type: '${ (source as any).type }'.`);
}

const providerRegistry: Map<string, Provider<Source>> = new Map();

export function getAllAvailableProviders(): Provider<Source>[] {
	return currentProviders;
}

export function refreshAvailableProviders(): Promise<void> {
	return getAllAvailableSources()
		.then(sources => {
			const providers: Provider<Source>[] = [];

			const typeCounts: Record<string, number> = {};

			for (const source of sources) {
				typeCounts[source.type] = 1 + (typeCounts[source.type] || -1);
				const key = source.type + (typeCounts[source.type] > 0 ? ":" + typeCounts[source.type] : "");
				let provider = providerRegistry.get(key);

				if (provider == null) {
					providerRegistry.set(key, provider = createProviderForSource(source));
				}

				providers.push(provider);
			}

			return currentProviders = providers;
		})
		.then(providers => {
			return Promise.all(providers.map(provider => {
				return provider.loadRootListing();
			}));
		})
		.then(() => void 0)
		.catch(error => {
			console.error("Unable to refresh available providers", error);
		});
}

export function getSheet(qualifiedName: string): Promise<Sheet> {
	const [providerKey, ...pathParts] = qualifiedName.split("/");
	const path = pathParts.join("/");

	const provider = providerRegistry.get(providerKey);
	if (provider == null) {
		console.error("Couldn't get provider for sheet", qualifiedName);
		return Promise.reject(new Error("Couldn't get provider for key " + providerKey));
	}

	return provider.load(path);
}
