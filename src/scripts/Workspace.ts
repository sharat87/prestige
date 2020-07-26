import { EventEmitter } from "./EventEmitter";

interface Storage {
	save(name: string, data: object): void;
	load(name: string): object;
}

export default class Workspace {
	private _content: string;
	storage: Storage;
	private readonly contentChanged: EventEmitter<Workspace, string>;

	constructor() {
		this._content = "";
		this.storage = null;
		this.contentChanged = new EventEmitter("contentChanged");
	}

	onContentChanged(fn) {
		this.contentChanged.on(fn);
	}

	getContent() {
		return this._content;
	}

	setContent(value, isSilent: boolean = false) {
		if (this._content === value) {
			return;
		}

		this._content = value;
		if (!isSilent) {
			this.contentChanged.emit({
				detail: value,
				target: this,
			});
		}
	}
}
