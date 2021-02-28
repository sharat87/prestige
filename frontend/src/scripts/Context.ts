import m from "mithril"
import HttpSession, { AnyResult } from "./HttpSession"
import { isPromise } from "./utils"
import type FileBucket from "./FileBucket"
import type CookieJar from "./CookieJar"
import { MultiPartForm } from "./BodyTypes"
import type { MultiPartFormValue } from "./BodyTypes"

export interface Context {
	data: Record<string, unknown>
	run: (lines: string[], runLineNum: number) => Promise<AnyResult>
	on: (event: string, callback: ((e: CustomEvent) => void)) => void
	off: (event: string, callback: ((e: CustomEvent) => void)) => void
	emit: (eventName: string, detail: unknown) => Promise<unknown>
	authHeader: (username: string, password: string) => string
	multipart: (data: Record<string, string | MultiPartFormValue>) => MultiPartForm
	fileFromBucket: (fileName: string) => Promise<MultiPartFormValue>
}

export function makeContext(session: HttpSession, cookieJar: CookieJar | null, fileBucket: FileBucket): Context {
	const handlers: Map<string, Set<(e: CustomEvent) => unknown>> = new Map()

	return { data: {}, on, off, emit, run, authHeader, multipart, fileFromBucket }

	function run(lines: string[], runLineNum = 0): Promise<AnyResult> {
		return session.runTop(lines, runLineNum, true, cookieJar, fileBucket)
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

function authHeader(username: string, password: string): string {
	return "Authorization: Basic " + btoa(username + ":" + password)
}
