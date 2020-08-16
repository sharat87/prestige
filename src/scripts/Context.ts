import HttpSession from "./HttpSession";
import { isPromise } from "./utils";
import m from "mithril";

export interface Context {
	data: any;
	run: ((lines: string[], runLineNum: number) => Promise<void>);
	on: ((string, callback: ((CustomEvent) => void)) => void);
	off: ((string, callback: ((CustomEvent) => void)) => void);
	emit: any;
}

export function makeContext(session: HttpSession): Context {
	const handlers: Map<string, Set<(CustomEvent) => any>> = new Map();

	return { data: {}, on, off, emit, run };

	function off(string, callback: (CustomEvent) => void): void {
		handlers.get(name)?.delete(callback);
	}

	function on(string, callback: (CustomEvent) => void): void {
		(handlers.get(name) || handlers.set(name, new Set()).get(name))?.add(callback);
	}

	function run(lines: string[], runLineNum: number): Promise<void> {
		return session.run(lines, runLineNum);
	}

	function emit(name: string, detail: any) {
		const event = new CustomEvent(name, { detail });
		const promises: Promise<void>[] = [];

		for (const fn of handlers.get(name) || []) {
			const value = fn(event);
			if (isPromise(value)) {
				promises.push(value);
			}
		}

		return (promises.length === 0 ? Promise.resolve() : Promise.all(promises)).finally(m.redraw);
	}
}
