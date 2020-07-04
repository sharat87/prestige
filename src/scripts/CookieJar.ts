interface FullCookie {
	domain: string,
	path: string,
	name: string,
	value: string,
	expires: string,
}

interface Morsel {
	path: string,
	name: string,
	value: string,
	expires: string,
}

export default class CookieJar {
	cookies: Map<string, Morsel[]>;
	length: number;

	constructor() {
		this.cookies = new Map();
		this.length = 0;
	}

	recomputeLength() {
		let count = 0;

		for (const cookies of this.cookies.values()) {
			count += cookies.length;
		}

		this.length = count;
	}

	toJSON() {
		return this.cookies;
	}

	plain() {
		const plainData = {};

		for (const [domain, cookies] of this.cookies) {
			plainData[domain] = Array.from(cookies);
		}

		return plainData;
	}

	update(newCookies: FullCookie[]) {
		const counts = {
			added: 0,
			modified: 0,
			removed: 0,
			any: false,
		};

		for (const newOne of newCookies) {
			let isFound = false;

			const domainCookies = this.cookies.get(newOne.domain) || [];
			if (!this.cookies.has(newOne.domain)) {
				this.cookies.set(newOne.domain, domainCookies);
			}

			for (const oldOne of domainCookies) {
				console.log("cookies", oldOne, newOne);
				if (oldOne.path === newOne.path && oldOne.name === newOne.name) {
					if (oldOne.value !== newOne.value || oldOne.expires !== newOne.expires) {
						oldOne.value = newOne.value;
						oldOne.expires = newOne.expires;
						++counts.modified;
					}
					isFound = true;
				}
			}

			if (!isFound) {
				domainCookies.push(newOne);
				++counts.added;
			}
		}

		if (counts.added > 0 || counts.modified > 0 || counts.removed > 0) {
			counts.any = true;
		}

		this.recomputeLength();
		return counts;
	}
}
