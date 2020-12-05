import HttpSession, { AnyResult } from "./HttpSession"
import { isPromise } from "./utils"
import m from "mithril"

export interface Context {
	data: any;
	run: ((lines: string[], runLineNum: number) => Promise<AnyResult>);
	on: ((event: string, callback: ((e: CustomEvent) => void)) => void);
	off: ((event: string, callback: ((e: CustomEvent) => void)) => void);
	emit: any;
	authHeader: (username: string, password: string) => string;
}

export function makeContext(session: HttpSession): Context {
	const handlers: Map<string, Set<(e: CustomEvent) => any>> = new Map()

	return { data: {}, on, off, emit, run, authHeader }

	function run(lines: string[], runLineNum = 0): Promise<AnyResult> {
		return session.runTop(lines, runLineNum, true)
	}

	function off(eventName: string, callback: (e: CustomEvent) => void): void {
		handlers.get(eventName)?.delete(callback)
	}

	function on(eventName: string, callback: (e: CustomEvent) => void): void {
		(handlers.get(eventName) ?? handlers.set(eventName, new Set()).get(eventName))
			?.add(callback)
	}

	function emit(eventName: string, detail: any = null) {
		const event = new CustomEvent(eventName, { detail })
		const promises: Promise<void>[] = []

		for (const fn of handlers.get(eventName) ?? []) {
			const value = fn(event)
			if (isPromise(value)) {
				promises.push(value)
			}
		}

		return (promises.length === 0 ? Promise.resolve() : Promise.all(promises)).finally(m.redraw)
	}

}

function authHeader(username: string, password: string): string {
	return "Authorization: Basic " + btoa(username + ":" + password)
}
