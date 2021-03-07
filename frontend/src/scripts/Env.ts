declare const process: {
	env: {
		PRESTIGE_BACKEND: string
		NODE_ENV: string
	}
}

const PRESTIGE_BACKEND = process.env.PRESTIGE_BACKEND?.replace(/\/*$/, "/")

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
	return PRESTIGE_BACKEND + "storage/"
}
