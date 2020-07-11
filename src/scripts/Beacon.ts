export default class Beacon {
	fns: Map<String, Set<Function>>;

	constructor() {
		this.fns = new Map();
	}

	on(name, fn: Function) {
		if (!this.fns.has(name)) {
			this.fns.set(name, new Set());
		}
		(this.fns.get(name) as Set<Function>).add(fn);
	}

	do(name, detail) {
		for (const fn of this.fns.get(name) || []) {
			fn({ detail });
		}
	}
}
