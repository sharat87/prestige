interface Morsel {
	value: string;
	expires: string;
}

type Host = string
type Path = string
type Name = string
export type StoreType = Record<Host, Record<Path, Record<Name, Morsel>>>

export default class CookieJar {
	store: StoreType
	size: number
	sheetPath: null | string

	constructor(store: StoreType = {}, sheetPath: null | string = null) {
		this.store = store ?? {}
		this.size = 0
		this.sheetPath = sheetPath

		this.recomputeSize()
	}

	clear(): void {
		this.store = {}
		this.size = 0
		this.save()
	}

	// Not used directly anywhere, but needed for CookieJar objects to be JSON-serializable, which is required.
	toJSON(): StoreType {
		return this.store
	}

	save(): void {
		if (this.sheetPath != null) {
			localStorage.setItem("cookies:" + this.sheetPath, JSON.stringify(this))
		}
	}

	static loadOrCreate(sheetPath: string): CookieJar {
		const serializedCookies = localStorage.getItem("cookies:" + sheetPath)
		if (serializedCookies != null && serializedCookies !== "") {
			try {
				return new CookieJar(JSON.parse(serializedCookies), sheetPath)
			} catch (error) {
				console.error("Unable to load cookies for path", sheetPath, error)
				return new CookieJar({}, sheetPath)
			}
		} else {
			return new CookieJar({}, sheetPath)
		}
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
		this.save()

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

	// TODO: Change signature for set cookie, to take domain, path and name as separate arguments.
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
		this.save()
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
		this.save()
	}

}
