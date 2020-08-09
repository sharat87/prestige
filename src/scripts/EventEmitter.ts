type Callback = (CustomEvent) => void;

export class EventEmitter<DetailType> {
	private readonly type: string;
	private readonly fns: Set<Callback>;

	constructor(type: string) {
		this.type = type;
		this.fns = new Set();
	}

	on(fn: Callback): void {
		this.fns.add(fn);
	}

	off(fn: Callback): void {
		this.fns.delete(fn);
	}

	emit({ detail }: { detail: DetailType }): void {
		const event = new CustomEvent(this.type, { detail });
		for (const fn of this.fns) {
			fn(event);
		}
	}
}
