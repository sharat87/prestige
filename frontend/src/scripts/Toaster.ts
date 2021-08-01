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

let nextId = 1

class Toaster {
	toasts: Toast[]

	constructor() {
		this.toasts = []
		this.onCloseBtnClicked = this.onCloseBtnClicked.bind(this)
	}

	map<T>(fn: ((toast: Toast) => T)): T[] {
		return this.toasts.map(fn)
	}

	push(type: Toast["type"], message: Toast["message"]): void
	push(t: Partial<Toast>): void

	push(type: Partial<Toast> | Toast["type"], message?: Toast["message"]): void {
		const id = nextId++
		let t: Toast
		if (typeof type === "string") {
			t = {
				id,
				type: type,
				message: message ?? "N/A",
				endTime: Date.now() + 6000,
			}
		} else {
			t = {
				id,
				type: "danger",
				message: "N/A",
				endTime: Date.now() + 6000,
				...type,
			}
		}
		this.toasts.push(t)
		setTimeout(() => this.remove(id), t.endTime - Date.now())
	}

	remove(id: number): void {
		this.toasts.splice(
			this.toasts.findIndex(t => t.id === id),
			1,
		)
		m.redraw()
	}

	render(): m.Children {
		return m(
			".toasts.pa4.fixed.right-0.top-0",
			{
				onclick: this.onCloseBtnClicked,
			},
			this.map(toast => m(
				".f5.pa3.mb2.br2.shadow-2",
				{
					class: {
						success: "bg-washed-green dark-green",
						danger: "bg-washed-red dark-red",
					}[toast.type],
					key: toast.id,
					onbeforeremove({ dom }: m.VnodeDOM): Promise<Event> {
						dom.classList.add("close")
						return new Promise(resolve => {
							dom.addEventListener("animationend", resolve)
						})
					},
				},
				[
					m("button.close-btn", {
						type: "button",
						class: {
							success: "bg-light-green dark-green",
							danger: "bg-light-red dark-red",
						}[toast.type],
						"data-toast-id": toast.id,
					}, m.trust("&times;")),
					toast.id + ": " + toast.message,
				],
			)))
	}

	onCloseBtnClicked(event: Event) {
		if ((event.target as HTMLButtonElement).matches(".close-btn")) {
			console.log("close", event.target)
			const toastId = (event.target as HTMLButtonElement).dataset.toastId
			if (toastId) {
				this.remove(parseInt(toastId, 10))
			}
		}
	}

}

export default new Toaster()
