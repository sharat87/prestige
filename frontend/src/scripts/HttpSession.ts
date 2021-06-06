import m from "mithril"
import type CookieJar from "./CookieJar"
import type { RequestDetails } from "./Parser"

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
	error?: {
		title?: string,
		message?: string,
		stack?: string,
	},
	request: any,
	timeTaken?: number,
}

export type AnyResult = SuccessResult | FailureResult

interface ExecuteResponse {
	status: number,
	statusText: string,
	headers: string[][],
	body: string,
}

// TODO: Investigate if this class can just be merged in with Workspace.
export default class HttpSession {
	private loadingCounter: number
	result: AnyResult | null

	constructor() {
		// These are persistent throughout a session.
		this.loadingCounter = 0

		// These should reset for each execute action.
		this.result = null
	}

	get isLoading(): boolean {
		return this.loadingCounter > 0
	}

	pushLoading(): void {
		++this.loadingCounter
		m.redraw()
	}

	popLoading(): void {
		--this.loadingCounter
		m.redraw()
	}

	async executeDirect(request: RequestDetails): Promise<AnyResult> {
		const { method, url, headers, body } = request

		const options: RequestInit = {
			cache: "no-store",
			credentials: "same-origin",
			method: request.method,
			headers: request.headers,
		}

		if (body !== "") {
			options.body = body
		}

		const headersObject: Record<string, string> = {}
		for (const [name, value] of headers) {
			headersObject[name] = value
		}

		const response = await m.request({
			url,
			method,
			headers: headersObject,
			body,
			withCredentials: true,
			serialize(data: any): any {
				return data
			},
			extract(xhr: XMLHttpRequest/*, options1: m.RequestOptions<ExecuteResponse>*/): ExecuteResponse {
				const lines: string[] = xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)
				const responseHeaders: string[][] = []

				for (const headerLine of lines) {
					const parts = headerLine.split(":")
					const name = parts.shift()
					if (name != null) {
						responseHeaders.push([name, parts.join(":").trim()])
					}
				}

				return {
					status: xhr.status,
					statusText: xhr.statusText,
					headers: responseHeaders,
					body: xhr.responseText,
				}
			},
		})

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
		}
	}

	async executeWithProxy(
		request: RequestDetails,
		{ timeout, proxy }: { timeout: number, proxy: string },
		cookieJar: CookieJar | null,
	): Promise<AnyResult> {

		const { method, url, headers, bodyType, body } = request

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
				cookies: cookieJar,
				bodyType,
				body,
			}),
		}

		const response = await fetch(proxy, options)
		const textResponse = await response.text()
		let data

		try {
			if (response.status === 200) {
				data = {
					ok: true,
					response: null,
					history: [],
					cookies: {},
					...JSON.parse(textResponse),
				}
			} else {
				data = {
					ok: false,
					...JSON.parse(textResponse),
				}
			}
		} catch (error) {
			if (!(error instanceof SyntaxError)) {
				throw error
			}
			// The proxy server didn't return a valid JSON, this is most likely due to a server error on the proxy.
			data = {
				ok: false,
				proxy,
				error: {
					title: "Error parsing response from the proxy",
					message: textResponse,
				},
			}
		}

		data.proxy = proxy

		if (typeof data.ok === "undefined") {
			console.error("Unexpected protocol response from proxy", data)
			return data

		} else if (data.ok) {
			console.log("response ok data", data)
			return data

		} else {
			console.error("response non-ok data", data)
			return Promise.reject(new Error(data.error?.message))

		}
	}

}
