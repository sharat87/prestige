
declare const process: {
	env: any
}

export function isDev(): boolean {
	return process.env.NODE_ENV === "development"
}

export function proxyUrl(): string {
	return process.env.PRESTIGE_BACKEND + "/proxy/"
}

export function authUrl(): string {
	return process.env.PRESTIGE_BACKEND + "/auth/"
}

export function storageUrl(): string {
	return process.env.PRESTIGE_BACKEND + "/storage/"
}
