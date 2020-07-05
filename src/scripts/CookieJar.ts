interface Morsel {
	value: string,
	expires: string,
}

export default class CookieJar {
	store: object;
	size: number;

	constructor() {
		this.store = {};
		this.size = 0;
	}

	recomputeSize() {
		let count = 0;

		for (const byPath of Object.values(this.store)) {
			for (const byName of Object.values(byPath)) {
				count += Object.keys(byName as object).length;
			}
		}

		this.size = count;
	}

	toJSON() {
		return this.store;
	}

	update(newCookies: object) {
		const counts = {
			added: 0,
			modified: 0,
			removed: 0,
			any: false,
		};

		for (const [domain, byPath] of Object.entries(newCookies)) {
			let isNew = false;
			if (!this.store[domain]) {
				this.store[domain] = {};
				isNew = true;
			}
			const oldByPath = this.store[domain];

			for (const [path, byName] of Object.entries(byPath)) {
				if (!oldByPath[path]) {
					oldByPath[path] = {};
					isNew = true;
				}
				const oldByName = oldByPath[path];

				for (const [name, morsel] of Object.entries(byName as object)) {
					if (!isNew && oldByName[name]
							&& (oldByName[name].value !== morsel.value || oldByName[name].expires !== morsel.expires)) {
						++counts.modified;
					} else {
						++counts.added;
					}
					oldByName[name] = morsel;

				}

			}
		}

		if (counts.added > 0 || counts.modified > 0 || counts.removed > 0) {
			counts.any = true;
		}

		this.recomputeSize();
		return counts;
	}

	get(domain, path, name): Morsel | null {
		try {
			return this.store[domain][path][name];
		} catch (error) {
			if (error instanceof TypeError) {
				return null;
			} else {
				throw error;
			}
		}
	}
}
