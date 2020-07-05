import m from "mithril";
import msgpack from "msgpack-lite";
import CookieJar from "./CookieJar";
import { extractRequest } from "./Parser";
import { isPromise } from "./utils";

interface Cookie {
	domain: string,
	path: string,
	name: string,
	value: string,
	expires: string,
}

interface SuccessResult {
	ok: true,
	response: any,
	cookies: Map<string, Cookie[]>,
	cookieChanges: {
		added: number,
		modified: number,
		removed: number,
		any: boolean,
	},
	request: any,
	timeTaken?: number,
}

interface FailureResult {
	ok: false,
	error: any,
	request: any,
	timeTaken?: number,
}

export default class HttpSession {
	cookieJar: CookieJar;
	_isLoading: boolean;
	proxy: null | string;
	result: SuccessResult | FailureResult | null;
	handlers: Map<string, Set<(CustomEvent) => any>>;
	data: any;

	constructor(proxy) {
		// These are persistent throughout a session.
		this.cookieJar = new CookieJar();
		this._isLoading = false;
		this.proxy = proxy;

		// These should reset for each execute action.
		this.result = null;
		this.handlers = new Map();
		// This is is used as the Mustache template rendering context.
		this.data = {};

		this.checkProxy();
	}

	checkProxy() {
		if (this.proxy == null) {
			console.log("No proxy set.");
			return;
		}

		fetch(this.proxy, { headers: { Accept: "application/json" } })
			.then(response => response.json())
			.then((response: { ok: boolean, prestigeProxyVersion: number }) => {
				if (!response.ok || response.prestigeProxyVersion !== 1) {
					this.proxy = null;
				}
			})
			.finally(() => {
				if (this.proxy) {
					console.log("Proxy available at", this.proxy);
				} else {
					console.log("No proxy available. Functionality will be limited.");
				}
			});
	}

	get isLoading() {
		return this._isLoading;
	}

	set isLoading(value) {
		this._isLoading = value;
		m.redraw();
	}

	runTop(lines, cursorLine) {
		if (this.isLoading) {
			alert("There's a request currently pending. Please wait for it to finish.");
			return Promise.reject();
		}

		if (typeof lines === "string") {
			lines = lines.split("\n");
		}

		const startTime = Date.now();
		this.isLoading = true;
		let request: any = null;

		this.handlers.clear();
		this.data = {};

		return extractRequest(lines, cursorLine, this)
			.then(async (req) => {
				request = req;
				await this.emit("BeforeExecute", { request });
				return this._execute(request);
			})
			.then(res => {
				this.isLoading = false;
				this.result = res;
				if (this.result != null) {
					this.result.ok = true;
					(this.result as SuccessResult).cookieChanges =
						this.cookieJar.update((this.result as SuccessResult).cookies);
				}
			})
			.catch(error => {
				this.isLoading = false;
				this.result = { ok: false, error, request };
				return Promise.reject(error);
			})
			.finally(() => {
				if (this.result != null) {
					this.result.timeTaken = Date.now() - startTime;
				}
				m.redraw();
			});
	}

	run(lines, runLineNum) {
		console.log("run", lines, runLineNum);
		runLineNum = runLineNum || 0;
		if (typeof lines === "string") {
			lines = lines.split("\n");
		}

		let request: any = null;

		return extractRequest(lines, runLineNum, this)
			.then(req => {
				request = req;
				return this._execute(request);
			})
			.then(res => {
				console.log("Got run response for", request);
				this.result = res;
				if (this.result != null) {
					this.result.ok = true;
					this.cookieJar.update((this.result as SuccessResult).cookies);
				}
			})
			.catch(error => {
				this.result = { ok: false, error, request };
				return Promise.reject(error);
			});
	}

	async _execute(request) {
		console.info("Executing", request);
		if (request == null) {
			return null;
		}

		const { url, headers, body } = request;

		let method = request.method;
		if (method == null || method === "") {
			method = "GET";
		}

		if (url == null || url === "") {
			throw new Error("URL cannot be empty!");
		}

		const options: RequestInit = {
			cache: "no-store",
			credentials: "same-origin",
		};

		if (this.proxy == null) {
			options.method = method;
			options.headers = headers;

			if (typeof body === "string" && body.length > 0) {
				options.body = body;
			}

			const response = await fetch(url, options);
			return {
				ok: true,
				response: {
					status: response.status,
					statusText: response.statusText,
					headers: response.headers,
					body: msgpack.decode(Buffer.from(await response.arrayBuffer())),
					history: null,
					cookies: null,
				},
			};

		} else  {
			options.method = "POST";
			options.headers = new Headers({"Content-Type": "application/json"});
			options.body = JSON.stringify({
				url,
				method,
				headers: Array.from(headers.entries()),
				cookies: this.cookieJar,
				body,
			});

			const buffer = Buffer.from(await (await fetch(this.proxy, options)).arrayBuffer());
			const data = msgpack.decode(buffer);

			if (data.ok) {
				console.log("response data", data);
				return data;

			} else {
				console.error("response data", data);
				return Promise.reject(new Error(data.error.message));

			}

		}
	}

	on(name, fn) {
		(this.handlers.get(name) || this.handlers.set(name, new Set()).get(name))?.add(fn);
	}

	off(name, fn) {
		this.handlers.get(name)?.delete(fn);
	}

	emit(name, detail) {
		const event = new CustomEvent(name, { detail });
		const promises: Promise<any>[] = [];

		const functions = this.handlers.get(name);
		if (functions != null) {
			for (const fn of functions) {
				const value = fn(event);
				if (isPromise(value)) {
					promises.push(value);
				}
			}
		}

		return (promises.length === 0 ? Promise.resolve() : Promise.all(promises))
			.finally(m.redraw);
	}
}
