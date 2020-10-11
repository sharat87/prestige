interface Morsel {
	value: string;
	expires: string;
}

export default class CookieJar {
	store: any;
	size: number;

	constructor() {
		this.clear();
	}

	clear() {
		this.store = {};
		this.size = 0;
	}

	toJSON(): any {
		return this.store;
	}

	private recomputeSize() {
		let count = 0;

		for (const byPath of Object.values(this.store)) {
			for (const byName of Object.values(byPath as any)) {
				count += Object.keys(byName as any).length;
			}
		}

		this.size = count;
	}

	private flat(jar = this.store) {
		const map: Map<string, Morsel> = new Map();

		for (const [domain, byPath] of Object.entries(jar)) {
			for (const [path, byName] of Object.entries(byPath as any)) {
				for (const [name, morsel] of Object.entries(byName as any)) {
					map.set(`${domain}\t${path}\t${name}`, morsel as Morsel);
				}
			}
		}

		return map;
	}

	overwrite(newCookies: any): { added: number, modified: number, removed: number, any: boolean } {
		let modified = 0;
		let removed = 0;

		const oldJar = this.flat();
		const newJar = this.flat(newCookies);

		const newKeys = new Set(newJar.keys());
		for (const key of oldJar.keys()) {
			newKeys.delete(key);
			if (newJar.has(key)) {
				const oldMorsel = oldJar.get(key) as Morsel;
				const newMorsel = newJar.get(key) as Morsel;
				if (oldMorsel.value !== newMorsel.value || oldMorsel.expires !== newMorsel.expires) {
					++modified;
					this.set(key, newMorsel);
				}
			} else {
				++removed;
				this.delete(key);
			}
		}

		const added = newKeys.size;
		for (const key of newKeys) {
			this.set(key, newJar.get(key) as Morsel);
		}

		this.recomputeSize();
		return {
			added,
			modified,
			removed,
			any: added > 0 || modified > 0 || removed > 0,
		};
	}

	get(domain: string, path: string, name: string): Morsel | null {
		try {
			return this.store[domain][path][name] ?? null;
		} catch (error) {
			if (error instanceof TypeError) {
				return null;
			} else {
				throw error;
			}
		}
	}

	set(key: string, morsel: Morsel) {
		const [domain, path, name] = key.split("\t");
		if (this.store[domain] == null) {
			this.store[domain] = {};
		}

		if (this.store[domain][path] == null) {
			this.store[domain][path] = {};
		}

		this.store[domain][path][name] = morsel;
		this.recomputeSize();
	}

	delete(key: string) {
		const [domain, path, name] = key.split("\t");

		if (this.store[domain] == null || this.store[domain][path] == null) {
			return;
		}

		delete this.store[domain][path][name];

		if (Object.keys(this.store[domain][path]).length === 0) {
			delete this.store[domain][path];
		}

		if (Object.keys(this.store[domain]).length === 0) {
			delete this.store[domain];
		}

		this.recomputeSize();
	}

}
