import m from "mithril"

export interface Toast {
	id: number
	type: "success" | "danger"
	message: string
	endTime: number
}

export interface Message {
	type: "error" | "success",
	body: string,
}

let nextId = 0

class Toaster {
	private toasts: Toast[]

	constructor() {
		this.toasts = []
	}

	map<T>(fn: ((toast: Toast) => T)): T[] {
		return this.toasts.map(fn)
	}

	push(type: Toast["type"], message: Toast["message"]): void {
		this.toasts.push({
			id: nextId++,
			type: type,
			message: message,
			endTime: Date.now() + 6000,
		})
		setTimeout(m.redraw, 6000)
	}

	pushMessages(messages: Message[]) {
		for (const message of messages) {
			this.push(message.type === "error" ? "danger" : "success", message.body)
		}
	}

	cleanup(): void {
		const now = Date.now()
		for (let i = this.toasts.length; i-- > 0;) {
			if (this.toasts[i].endTime < now) {
				this.toasts.splice(i, 1)
			}
		}
	}

	remove(id: number): void {
		this.toasts.splice(
			this.toasts.findIndex(t => t.id === id),
			1,
		)
	}

}

export default new Toaster()
