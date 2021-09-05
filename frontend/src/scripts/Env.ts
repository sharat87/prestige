import m from "mithril"

declare const process: {
	env: {
		NODE_ENV: string
		PRESTIGE_BACKEND: string
		PRESTIGE_ALLOWED_HOSTS: string
	}
}

const PRESTIGE_BACKEND = (process.env.PRESTIGE_BACKEND || "/")?.replace(/\/*$/, "/")

export const GIST_API_PREFIX = PRESTIGE_BACKEND + "gist/"

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
	return process.env.NODE_ENV === "development"
}

export function proxyUrl(): string {
	return PRESTIGE_BACKEND + "proxy/"
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
		process.env.PRESTIGE_ALLOWED_HOSTS.split(",").includes(location.host)
}
