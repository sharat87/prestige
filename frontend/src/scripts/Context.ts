import m from "mithril"
import type Workspace from "_/Workspace"
import { AnyResult } from "_/HttpSession"
import { isPromise } from "_/utils"
import type FileBucket from "_/FileBucket"
import type CookieJar from "_/CookieJar"
import { MultiPartForm } from "_/BodyTypes"
import type { MultiPartFormValue } from "_/BodyTypes"
import type { RequestDetails } from "_/Parser"

export interface Context {
	data: Record<string, unknown>
	run: (lines: string[], runLineNum: number) => Promise<AnyResult>
	on: (event: string, callback: ((e: CustomEvent) => void)) => void
	off: (event: string, callback: ((e: CustomEvent) => void)) => void
	emit: (eventName: string, detail: unknown) => Promise<unknown>
	basicAuth: (username: string, password: string) => string
	multipart: (data: Record<string, string | MultiPartFormValue>) => MultiPartForm
	fileFromBucket: (fileName: string) => Promise<MultiPartFormValue>
	getProxyUrl: null | ((request: RequestDetails) => null | string)
}

export function makeContext(workspace: Workspace, cookieJar: CookieJar | null, fileBucket: FileBucket): Context {
	const handlers: Map<string, Set<(e: CustomEvent) => unknown>> = new Map()

	return { data: {}, on, off, emit, run, basicAuth, multipart, fileFromBucket, getProxyUrl: null }

	function run(lines: string[], runLineNum = 0): Promise<AnyResult> {
		return workspace.runTop(lines, runLineNum, true)
	}

	function off(eventName: string, callback: (e: CustomEvent) => void): void {
		handlers.get(eventName)?.delete(callback)
	}

	function on(eventName: string, callback: (e: CustomEvent) => void): void {
		(handlers.get(eventName) ?? handlers.set(eventName, new Set()).get(eventName))
			?.add(callback)
	}

	function emit<T>(eventName: string, detail: T | null = null) {
		const event = new CustomEvent(eventName, { detail })
		const promises: Promise<unknown>[] = []

		for (const fn of handlers.get(eventName) ?? []) {
			const value = fn(event)
			if (isPromise(value)) {
				promises.push(value as Promise<unknown>)
			}
		}

		return (promises.length === 0 ? Promise.resolve() : Promise.all(promises)).finally(m.redraw)
	}

	function multipart(data: Record<string, string | MultiPartFormValue>): MultiPartForm {
		const formData = new MultiPartForm()
		for (const [key, value] of Object.entries(data)) {
			formData.set(key, value)
		}
		return formData
	}

	function fileFromBucket(fileName: string): Promise<MultiPartFormValue> {
		return fileBucket.load(fileName)
	}

}

function basicAuth(username: string, password: string): string {
	return "Basic " + btoa(username + ":" + password)
}
