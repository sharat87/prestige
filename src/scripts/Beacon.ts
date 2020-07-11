type Callback = (event: { detail: any }) => void;

export default class Beacon {
	fns: Map<string, Set<Callback>>;

	constructor() {
		this.fns = new Map();
	}

	on(name: string, fn: Callback) {
		if (!this.fns.has(name)) {
			this.fns.set(name, new Set());
		}
		(this.fns.get(name) as Set<Callback>).add(fn);
	}

	do(name: string, detail: any) {
		for (const fn of this.fns.get(name) || []) {
			fn({ detail });
		}
	}
}
