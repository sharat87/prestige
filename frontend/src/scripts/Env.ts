declare const process: {
	env: {
		NODE_ENV: string
		PRESTIGE_BACKEND: string
		PRESTIGE_ALLOWED_HOSTS: string
	}
}

const PRESTIGE_BACKEND = (process.env.PRESTIGE_BACKEND || "/")?.replace(/\/*$/, "/")

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

export function allowedToStart(): boolean {
	return process.env.PRESTIGE_ALLOWED_HOSTS == null ||
		process.env.PRESTIGE_ALLOWED_HOSTS.split(",").includes(location.host)
}
