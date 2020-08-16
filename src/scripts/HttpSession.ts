import m from "mithril";
import CookieJar from "./CookieJar";
import { extractRequest, RequestDetails } from "./Parser";
import { makeContext } from "./Context";

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

interface ExecuteResponse {
	status: number,
	statusText: string,
	headers: string[][],
	body: string,
}

export default class HttpSession {
	cookieJar: CookieJar;
	_isLoading: boolean;
	proxy: null | string;
	result: SuccessResult | FailureResult | null;

	constructor(proxy: null | string = null) {
		// These are persistent throughout a session.
		this.cookieJar = new CookieJar();
		this._isLoading = false;
		this.proxy = proxy;

		// These should reset for each execute action.
		this.result = null;

		this.checkProxy();
	}

	checkProxy(): void {
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

	get isLoading(): boolean {
		return this._isLoading;
	}

	set isLoading(value: boolean) {
		this._isLoading = value;
		m.redraw();
	}

	runTop(lines: string[], cursorLine: number): Promise<void> {
		if (this.isLoading) {
			alert("There's a request currently pending. Please wait for it to finish.");
			return Promise.reject();
		}

		const startTime = Date.now();
		this.isLoading = true;
		let request: any = null;

		// TODO: Use a separate context type and object, instead of `this`.
		const context = makeContext(this);
		return extractRequest(lines, cursorLine, context)
			.then(async (req) => {
				request = req;
				await context.emit("BeforeExecute", { request });
				return this._execute(request);
			})
			.then(res => {
				this.isLoading = false;
				console.log("Execute Result", res);
				this.result = res;
				if (this.result != null) {
					this.result.ok = true;
					if ((this.result as SuccessResult).cookies) {
						(this.result as SuccessResult).cookieChanges =
							this.cookieJar.update((this.result as SuccessResult).cookies);
					}
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

	run(lines: string | string[], runLineNum: string | number = 0): Promise<void> {
		if (typeof lines === "string") {
			lines = lines.split("\n");
		}

		if (typeof runLineNum === "string") {
			runLineNum = parseInt(runLineNum, 10);
		}

		let request: any = null;

		return extractRequest(lines, runLineNum, makeContext(this))
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

		const proxy = this.getProxyUrl({ method, url, headers, body });
		// TODO: Let the timeout be set by the user.
		const timeout = 5 * 60;  // Seconds.

		if (proxy == null || proxy === "") {
			options.method = method;
			options.headers = headers;

			if (typeof body === "string" && body !== "") {
				options.body = body;
			}

			const headersObject = {};
			for (const [name, value] of headers) {
				headersObject[name] = value;
			}

			const response = await m.request({
				url,
				method,
				headers: headersObject,
				body,
				withCredentials: true,
				serialize(data: any): any {
					return data;
				},
				config(xhr: XMLHttpRequest/*, options1: m.RequestOptions<ExecuteResponse>*/): XMLHttpRequest | void {
					xhr.addEventListener("readystatechange", event => {
						/* Use xhr.readyState to show progress.
						0 UNSENT Client has been created. open() not called yet.
						1 OPENED open() has been called.
						2 HEADERS_RECEIVED send() has been called, and headers and status are available.
						3 LOADING Downloading; responseText holds partial data.
						4 DONE The operation is complete.
						 */
					});
				},
				extract(xhr: XMLHttpRequest/*, options1: m.RequestOptions<ExecuteResponse>*/): ExecuteResponse {
					const lines: string[] = xhr.getAllResponseHeaders().trim().split(/[\r\n]+/);
					const responseHeaders: string[][] = [];

					for (const headerLine of lines) {
						const parts = headerLine.split(":");
						const name = parts.shift();
						if (name != null) {
							responseHeaders.push([name, parts.join(":").trim()]);
						}
					}

					return {
						status: xhr.status,
						statusText: xhr.statusText,
						headers: responseHeaders,
						body: xhr.responseText,
					};
				},
			});

			return {
				ok: true,
				proxy: null,
				response: {
					status: response.status,
					statusText: response.statusText,
					url,
					headers: response.headers,
					body: response.body,
					request: {
						url,
						body: null,
						...options,
					},
				},
				history: [],
				cookies: [],
			};

		} else {
			options.method = "POST";
			options.headers = new Headers({
				"Content-Type": "application/json",
				"Accept": "application/json",
			});

			const requestHeaders = Array.from(headers.entries());
			options.body = JSON.stringify({
				url,
				method,
				headers: requestHeaders,
				timeout,
				cookies: this.cookieJar,
				body,
			});

			const response = await fetch(proxy, options);

			const textResponse = await response.text();
			let data;

			try {
				data = JSON.parse(textResponse);
			} catch (error) {
				if (!(error instanceof SyntaxError)) {
					throw error;
				}
				// The proxy server didn't return a valid JSON, this is most likely due to a server error on the proxy.
				data = {
					ok: false,
					proxy,
					error: {
						title: "Error parsing response from the proxy",
						message: textResponse,
					},
				};
			}

			data.proxy = proxy;

			if (typeof data.ok === "undefined") {
				console.error("Unexpected protocol response from proxy", data);
				return data;

			} else if (data.ok) {
				console.log("response ok data", data);
				return data;

			} else {
				console.error("response non-ok data", data);
				return Promise.reject(new Error(data.error.message));

			}

		}
	}

	getProxyUrl({ url }: RequestDetails): null | string {
		return this.proxy && this.proxy.includes("://localhost")
			? this.proxy
			: url.includes("://localhost")
				? null
				: this.proxy;
	}

	authHeader(username: string, password: string): string {
		return "Authorization: Basic " + btoa(username + ":" + password);
	}
}
