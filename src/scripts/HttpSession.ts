import m from "mithril";
import CookieJar from "./CookieJar";
import type { RequestDetails } from "./Parser";
import { extractRequest } from "./Parser";
import { makeContext } from "./Context";

interface SuccessResult {
	ok: true,
	response: any,
	history: any[],
	proxy: null | string,
	cookies: null | CookieJar,
	cookieChanges?: {
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

export type AnyResult = SuccessResult | FailureResult;

interface ExecuteResponse {
	status: number,
	statusText: string,
	headers: string[][],
	body: string,
}

export default class HttpSession {
	cookieJar: CookieJar;
	private loadingCounter: number;
	proxy: null | string;
	result: AnyResult | null;

	constructor(proxy: null | string = null) {
		// These are persistent throughout a session.
		this.cookieJar = new CookieJar();
		this.loadingCounter = 0;
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
		return this.loadingCounter > 0;
	}

	pushLoading() {
		++this.loadingCounter;
		m.redraw();
	}

	popLoading() {
		--this.loadingCounter;
		m.redraw();
	}

	async runTop(lines: string | string[], runLineNum: string | number, silent = false): Promise<AnyResult> {
		if (typeof lines === "string") {
			lines = lines.split("\n");
		}

		if (typeof runLineNum === "string") {
			runLineNum = parseInt(runLineNum, 10);
		}

		if (!silent && this.isLoading) {
			alert("There's a request currently pending. Please wait for it to finish.");
			return Promise.reject();
		}

		const startTime = Date.now();
		this.pushLoading();
		let request: null | RequestDetails = null;

		const context = makeContext(this);
		let result: null | AnyResult = null;

		try {
			request = await extractRequest(lines, runLineNum, context);
			if (!silent) {
				await context.emit("BeforeExecute", { request });
			}

			result = await this.execute(request);
			console.log(`Got runTop result (silent=${ silent })`, this.result);

			if (this.result != null && this.result.ok && this.result.cookies) {
				this.result.cookieChanges = this.cookieJar.overwrite(this.result.cookies);
			}

		} catch (error: any) {
			result = { ok: false, error, request };

		} finally {
			if (result != null) {
				result.timeTaken = Date.now() - startTime;
			}

			this.popLoading();

		}

		this.result = result;
		return result;
	}

	async execute(request: RequestDetails): Promise<AnyResult> {
		console.info("Executing", request);

		if (request.method === "") {
			throw new Error("Method cannot be empty!");
		}

		if (request.url === "") {
			throw new Error("URL cannot be empty!");
		}

		const proxy = this.getProxyUrl(request);

		// TODO: Let the timeout be set by the user.
		const timeout = 5 * 60;  // Seconds.

		if (proxy == null || proxy === "") {
			return this.executeDirect(request);

		} else {
			return this.executeWithProxy(request, { timeout, proxy });

		}
	}

	async executeDirect(request: RequestDetails): Promise<AnyResult> {
		const { method, url, headers, body } = request;

		const options: RequestInit = {
			cache: "no-store",
			credentials: "same-origin",
			method: request.method,
			headers: request.headers,
		};

		if (body !== "") {
			options.body = body;
		}

		const headersObject: Record<string, string> = {};
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
			request,
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
			cookies: null,
		};
	}

	async executeWithProxy(
		request: RequestDetails,
		{ timeout, proxy }: { timeout: number, proxy: string },
	): Promise<AnyResult> {

		const { method, url, headers, body } = request;

		const options: RequestInit = {
			cache: "no-store",
			credentials: "same-origin",
			method: "POST",
			headers: new Headers({
				"Content-Type": "application/json",
				"Accept": "application/json",
			}),
			body: JSON.stringify({
				url,
				method,
				headers: Array.from(headers.entries()),
				timeout,
				cookies: this.cookieJar,
				body,
			}),
		};

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

	getProxyUrl({ url }: RequestDetails): null | string {
		return this.proxy && this.proxy.includes("://localhost")
			? this.proxy
			: url.includes("://localhost")
				? null
				: this.proxy;
	}

}
