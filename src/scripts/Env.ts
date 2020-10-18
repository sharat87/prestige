
declare const process: {
	env: any
};

export function isDev() {
	return process.env.NODE_ENV === "development";
}

export function proxyUrl() {
	return process.env.PRESTIGE_PROXY_URL;
}

export function firebaseConfig() {
	return {
		apiKey: process.env.PRESTIGE_FIRESTORE_API_KEY,
		authDomain: process.env.PRESTIGE_FIRESTORE_AUTH_DOMAIN,
		databaseURL: process.env.PRESTIGE_FIRESTORE_DATABASE_URL,
		projectId: process.env.PRESTIGE_FIRESTORE_PROJECT_ID,
		storageBucket: process.env.PRESTIGE_FIRESTORE_STORAGE_BUCKET,
		messagingSenderId: process.env.PRESTIGE_FIRESTORE_MESSAGING_SENDER_ID,
		appId: process.env.PRESTIGE_FIRESTORE_APP_ID,
	}
}
