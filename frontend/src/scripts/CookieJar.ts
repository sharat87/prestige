interface Morsel {
	value: string;
	expires: string;
}

type Host = string
type Path = string
type Name = string
type StoreType = Record<Host, Record<Path, Record<Name, Morsel>>>

export default class CookieJar {
	store: StoreType
	size: number

	constructor(store: StoreType = {}) {
		this.store = store ?? {}
		this.size = 0
		this.recomputeSize()
	}

	clear(): void {
		this.store = {}
		this.size = 0
	}

	toJSON(): StoreType {
		return this.store
	}

	static fromPlain(plain: StoreType): CookieJar {
		return new CookieJar(plain)
	}

	private recomputeSize(): void {
		let count = 0

		for (const byPath of Object.values(this.store)) {
			for (const byName of Object.values(byPath)) {
				count += Object.keys(byName).length
			}
		}

		this.size = count
	}

	private flat(jar: StoreType = this.store): Map<string, Morsel> {
		const map: Map<string, Morsel> = new Map()

		for (const [domain, byPath] of Object.entries(jar)) {
			for (const [path, byName] of Object.entries(byPath)) {
				for (const [name, morsel] of Object.entries(byName)) {
					map.set(`${domain}\t${path}\t${name}`, morsel)
				}
			}
		}

		return map
	}

	overwrite(newCookies: StoreType): { added: number, modified: number, removed: number, any: boolean } {
		let modified = 0
		let removed = 0

		const oldJar = this.flat()
		const newJar = this.flat(newCookies)

		const newKeys = new Set(newJar.keys())
		for (const key of oldJar.keys()) {
			newKeys.delete(key)
			if (newJar.has(key)) {
				const oldMorsel = oldJar.get(key) as Morsel
				const newMorsel = newJar.get(key) as Morsel
				if (oldMorsel.value !== newMorsel.value || oldMorsel.expires !== newMorsel.expires) {
					++modified
					this.set(key, newMorsel)
				}
			} else {
				++removed
				const [domain, path, name] = key.split("\t")
				this.delete(domain, path, name)
			}
		}

		const added = newKeys.size
		for (const key of newKeys) {
			const morsel = newJar.get(key)
			if (morsel != null) {
				this.set(key, morsel)
			}
		}

		this.recomputeSize()
		return {
			added,
			modified,
			removed,
			any: added > 0 || modified > 0 || removed > 0,
		}
	}

	get(domain: Host, path: Path, name: Name): Morsel | null {
		try {
			return this.store[domain][path][name] ?? null
		} catch (error: unknown) {
			if (error instanceof TypeError) {
				return null
			} else {
				throw error
			}
		}
	}

	set(key: string, morsel: Morsel): void {
		const [domain, path, name] = key.split("\t")
		if (this.store[domain] == null) {
			this.store[domain] = {}
		}

		if (this.store[domain][path] == null) {
			this.store[domain][path] = {}
		}

		this.store[domain][path][name] = morsel
		this.recomputeSize()
	}

	delete(domain: Host, path: Path, name: Name): void {
		if (this.store[domain] == null || this.store[domain][path] == null) {
			return
		}

		delete this.store[domain][path][name]

		if (Object.keys(this.store[domain][path]).length === 0) {
			delete this.store[domain][path]
		}

		if (Object.keys(this.store[domain]).length === 0) {
			delete this.store[domain]
		}

		this.recomputeSize()
	}

}
