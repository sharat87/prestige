import m from "mithril"

declare const process: {
	env: {
		NODE_ENV?: string
		PRESTIGE_ALLOWED_HOSTS: string
		PRESTIGE_FRONTEND_ROLLBAR_TOKEN?: string
		PRESTIGE_EXT_URL_PREFIX?: string
	}
}

const NODE_ENV = process.env.NODE_ENV || "production"

const PRESTIGE_BACKEND = "/"

export const GIST_API_PREFIX = PRESTIGE_BACKEND + "gist/"

export const EXT_URL_PREFIX = (process.env.PRESTIGE_EXT_URL_PREFIX || "").trim()

export const rollbarToken: null | string = (() => {
	const token = (process.env.PRESTIGE_FRONTEND_ROLLBAR_TOKEN || "").trim()
	return token != null && token !== "" ? token : null
})()

export const name: string = (() => {
	return NODE_ENV != null && NODE_ENV !== "" ? NODE_ENV : "production"
})()

let recaptchaSiteKey: null | string = null

export async function getRecaptchaSiteKey(): Promise<string> {
	if (recaptchaSiteKey == null) {
		const response = await m.request<{ recaptchaSiteKey: string }>({
			method: "GET",
			url: PRESTIGE_BACKEND + "env",
		})
		recaptchaSiteKey = response.recaptchaSiteKey
	}
	return recaptchaSiteKey
}

export function isDev(): boolean {
	return name === "development"
}

export function proxyUrl(): string {
	console.log("proxyUrl", PRESTIGE_BACKEND)
	return PRESTIGE_BACKEND + "proxy"
}

export function authUrl(): string {
	return PRESTIGE_BACKEND + "auth/"
}

export function storageUrl(): string {
	// Commented out since support for storage backend is deprioritized/almost-deprecated.
	return ""  // PRESTIGE_BACKEND + "storage/"
}

export function allowedToStart(): boolean {
	return process.env.PRESTIGE_ALLOWED_HOSTS == null ||
		process.env.PRESTIGE_ALLOWED_HOSTS.split(",").includes(window.location.host)
}
