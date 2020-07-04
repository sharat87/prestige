interface Cookie {
	domain: string,
	path: string,
	name: string,
	value: string,
	expires: string,
}

export default class CookieJar {
	cookies: Cookie[];

	constructor() {
		this.cookies = [];
	}

	get length() {
		return this.cookies.length;
	}

	toJSON() {
		return this.cookies;
	}

	update(newCookies: Cookie[]) {
		const counts = {
			added: 0,
			modified: 0,
			removed: 0,
			any: false,
		};

		console.log("cookies two", this.cookies, newCookies);

		for (const newOne of newCookies) {
			let isFound = false;
			for (const oldOne of this.cookies) {
				console.log("cookies", oldOne, newOne);
				if (oldOne.domain === newOne.domain && oldOne.path === newOne.path && oldOne.name === newOne.name) {
					if (oldOne.value !== newOne.value || oldOne.expires !== newOne.expires) {
						oldOne.value = newOne.value;
						oldOne.expires = newOne.expires;
						++counts.modified;
					}
					isFound = true;
				}
			}
			if (!isFound) {
				this.cookies.push(newOne);
				++counts.added;
			}
		}

		if (counts.added > 0 || counts.modified > 0 || counts.removed > 0) {
			counts.any = true;
		}

		return counts;
	}
}
