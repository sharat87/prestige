export interface Instance {
	text: string;
	cookieJar;
}

const INSTANCE_KEY_PREFIX = "instance:";

export function loadInstance(name: string): Instance | null {
	const raw = localStorage.getItem(INSTANCE_KEY_PREFIX + name);

	if (raw == null) {
		return null;
	}

	const [text, cookieJar] = JSON.parse(raw);
	return { text, cookieJar };
}

export function saveInstance(name: string, instance: Instance) {
	localStorage.setItem(INSTANCE_KEY_PREFIX + name, JSON.stringify([instance.text, instance.cookieJar]));
}

export function delInstance(name: string) {
	localStorage.removeItem(INSTANCE_KEY_PREFIX + name);
}

export function* listInstanceNames(): Generator<string> {
	for (let i = 0; i < localStorage.length; ++i) {
		const key = localStorage.key(i);
		if (key?.startsWith(INSTANCE_KEY_PREFIX)) {
			yield key.substr(INSTANCE_KEY_PREFIX.length);
		}
	}
}
