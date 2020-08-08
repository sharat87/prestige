export class EventEmitter<TargetType, DetailType> {
    private readonly type: string;
    private readonly fns: Set<(CustomEvent) => void>;

    constructor(type) {
        this.type = type;
        this.fns = new Set();
    }

    on(fn) {
        this.fns.add(fn);
    }

    off(fn) {
        this.fns.delete(fn);
    }

    emit({target, detail}: { target: TargetType, detail: DetailType }) {
        const event = new CustomEvent(this.type, {
            target,
            detail,
        });
        for (const fn of this.fns) {
            fn(event);
        }
    }
}
