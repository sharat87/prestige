import m from "mithril"
import type CookieJar from "_/CookieJar"
import type { StoreType } from "_/CookieJar"
import type { RequestDetails } from "_/Parser"

interface ResultBase {
	timeTaken?: number
}

interface SuccessResult extends ResultBase {
	ok: true
	response: Response
	history: Response[]
	proxy: null | string
	cookies: null | StoreType
	cookieChanges?: {
		added: number
		modified: number
		removed: number
		any: boolean
	}
	request: RequestDetails
}

interface FailureResult extends ResultBase {
	ok: false
	error?: {
		title?: string
		message?: string
		stack?: string
	}
	request: null | RequestDetails
}

export type AnyResult = SuccessResult | FailureResult

export interface Response {
	status: number
	statusText: string
	url: string
	headers: Headers
	body: string
	request: RequestDetails
}

interface ExecuteResponse {
	status: number
	statusText: string
	headers: string[][]
	body: string
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
		const startTime = Date.now()
		const { method, url, headers, body } = request

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
			serialize<T>(data: T): T {
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

		if (response.status === 0) {
			// This means that the request was indeed successful and the browser has the response data, but due to some
			// CORS restriction, the browser won't let us access the data.
			// See <https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSNotSupportingCredentials>.
			return {
				ok: false,
				error: {
					title: "CORS Error",
					message: "CORS Error when reading response data.\nPlease visit browser console for more details.",
				},
				request,
				timeTaken: Date.now() - startTime,
			}
		}

		return {
			ok: true,
			proxy: null,
			request,
			response: {
				status: response.status,
				statusText: response.statusText,
				url,
				headers: new Headers(response.headers as [name: string, value: string][]),
				body: response.body,
				request: {
					method,
					url,
					headers,
					body,
					bodyType: "",
				},
			},
			history: [],
			cookies: null,
			timeTaken: Date.now() - startTime,
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
		if (data.response != null && data.response.headers != null) {
			data.response.headers = new Headers(data.response.headers)
		}

		for (const res of (data.history ?? [])) {
			if (res.headers != null) {
				res.headers = new Headers(res.headers)
			}
		}

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
