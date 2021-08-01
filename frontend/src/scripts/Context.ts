import m from "mithril"
import type Workspace from "_/Workspace"
import { AnyResult } from "_/HttpSession"
import { isPromise } from "_/utils"
import type FileBucket from "_/FileBucket"
import type CookieJar from "_/CookieJar"
import { MultiPartForm } from "_/BodyTypes"
import type { MultiPartFormValue } from "_/BodyTypes"
import type { RequestDetails } from "_/Parser"
import Toaster from "_/Toaster"

type EventCallback = (..._: unknown[]) => unknown

export default class Context {
	private data: Record<string, unknown>
	private handlers: Map<string, Set<EventCallback>>
	private workspace: null | Workspace
	private cookieJar: null | CookieJar
	private fileBucket: null | FileBucket
	getProxyUrl: null | ((request: RequestDetails) => null | string)

	constructor(workspace: null | Workspace, cookieJar: null | CookieJar, fileBucket: null | FileBucket) {
		this.data = {}
		this.handlers = new Map()

		this.workspace = workspace
		this.cookieJar = cookieJar
		this.fileBucket = fileBucket

		this.getProxyUrl = null
	}

	run(lines: string[], runLineNum = 0): Promise<AnyResult> {
		return this.workspace == null
			? Promise.reject(new Error("Workspace not available in this context"))
			: this.workspace.runTop(lines, runLineNum, true)
	}

	off(eventName: string, callback: EventCallback): void {
		this.handlers.get(eventName)?.delete(callback)
	}

	on(eventName: string, callback: EventCallback): void {
		(this.handlers.get(eventName) ?? this.handlers.set(eventName, new Set()).get(eventName))?.add(callback)
	}

	emit(eventName: string, data?: unknown): Promise<unknown> {
		const promises: Promise<unknown>[] = []

		for (const fn of this.handlers.get(eventName) ?? []) {
			const value = fn(data)
			if (isPromise(value)) {
				promises.push(value as Promise<unknown>)
			}
		}

		return (promises.length === 0 ? Promise.resolve() : Promise.all(promises)).finally(m.redraw)
	}

	fileFromBucket(fileName: string): Promise<MultiPartFormValue> {
		return this.fileBucket == null
			? Promise.reject(new Error("File bucket not available in this context"))
			: this.fileBucket.load(fileName)
	}

	multipart(data: Record<string, string | MultiPartFormValue>): MultiPartForm {
		const formData = new MultiPartForm()
		for (const [key, value] of Object.entries(data)) {
			formData.set(key, value)
		}
		return formData
	}

	basicAuth(username: string, password: string): string {
		return "Basic " + btoa(username + ":" + password)
	}

	toast(type: unknown, message?: unknown): void {
		if (arguments.length < 2) {
			message = type
			type = "success"
		}
		if (type !== "success" && type !== "danger") {
			type = "danger"
		}
		if (typeof message !== "string") {
			message = JSON.stringify(message, null, 2)
		}
		Toaster.push({
			type: type as "success"|"danger",
			message: message as string,
		})
	}

	storeItem(key: string, data: unknown): void {
		localStorage.setItem("pstore:" + key, JSON.stringify(data))
	}

	loadItem(key: string): unknown {
		const content = localStorage.getItem("pstore:" + key)
		return content == null || content === "" ? null : JSON.parse(content)
	}

}
