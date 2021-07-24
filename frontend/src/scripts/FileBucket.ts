import type { MultiPartFormValue } from "_/BodyTypes"

export default class FileBucket {
	private files: Map<string, File>

	constructor() {
		this.files = new Map()
	}

	set(name: string, file: File): void {
		this.files.set(name, file)
	}

	del(name: string): void {
		this.files.delete(name)
	}

	get(name: string): File | null {
		return this.files.get(name) ?? null
	}

	load(name: string): Promise<MultiPartFormValue> {
		const file = this.get(name)

		if (file == null) {
			throw new Error("File not available: " + name)
		}

		console.log("file", file)
		const fileReader = new FileReader()

		// Source: <https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader#examples>
		return new Promise((resolve, reject) => {
			fileReader.onload = (e) => {
				if (e.target == null) {
					console.error("Null target in file reader load event handler", e)
				}
				resolve({
					body: btoa(e.target?.result as string),
					name: file.name,
					type: file.type,
					size: file.size,
				})
			}
			fileReader.onerror = (e) => {
				console.error("Error loading file", e)
				reject(e)
			}
			fileReader.readAsBinaryString(file)
		})
	}

	get size(): number {
		return this.files.size
	}

	[Symbol.iterator](): Iterator<File> {
		return this.files.values()
	}

}
