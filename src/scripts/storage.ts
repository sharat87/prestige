import firebase from "firebase/app";
import "firebase/firebase-firestore";
import AuthService from "./AuthService";

export interface Storage {
	name: string;
	text: string;
	cookieJar: any;

	load(): Promise<void>;

	save(delta: { text?: string, cookieJar?: any }): Promise<void>;
}

const INSTANCE_KEY_PREFIX = "instance:";

export function loadStorage(name: string): Storage {
	return new LocalStorageImpl(name);
}

export function* listStorageNames(): Generator<string> {
	for (let i = 0; i < localStorage.length; ++i) {
		const key = localStorage.key(i);
		if (key?.startsWith(INSTANCE_KEY_PREFIX)) {
			yield key.substr(INSTANCE_KEY_PREFIX.length);
		}
	}
}

interface StorageSource {
	type: string;
	details: {
		token?: string;
	};
}

function createProviderForStorage(source: StorageSource) {
	console.log("createProviderForStorage", source);
	return source;
}

class LocalStorageImpl implements Storage {
	name: string;
	text: string;
	cookieJar: any;

	constructor(name: string) {
		this.name = name;
		this.text = "";
		this.cookieJar = {};
		this.load()
			.catch(error => {
				console.error(`Error loading LocalStorageImpl ${ name }.`, error);
			});
	}

	load() {
		const raw = localStorage.getItem(INSTANCE_KEY_PREFIX + this.name);
		if (raw != null) {
			const [text, cookieJar] = JSON.parse(raw);
			this.text = text;
			this.cookieJar = cookieJar;
		}
		return Promise.resolve();
	}

	save(delta: { text?: string, cookieJar?: any }) {
		let haveChanges = false;
		if (delta.text != null) {
			this.text = delta.text;
			haveChanges = true;
		}

		if (delta.cookieJar != null && typeof delta.cookieJar === "object") {
			this.cookieJar = delta.cookieJar;
			haveChanges = true;
		}

		if (haveChanges) {
			localStorage.setItem(
				INSTANCE_KEY_PREFIX + this.name,
				JSON.stringify([this.text, this.cookieJar]),
			);
		}

		return Promise.resolve();
	}
}
