import { EventEmitter } from "./EventEmitter";
import HttpSession from "./HttpSession";
import {loadInstance, saveInstance} from "./storage";
import m from "mithril";
import { Instance } from "./storage";

interface Storage {
	save(name: string, data: object): void;
	load(name: string): object;
}

export default class Workspace {
	private _content: string;
	storage: null | Storage;
	prevExecuteBookmark: null | CodeMirror.TextMarker;
	private readonly contentChanged: EventEmitter<Workspace, string>;
	// TODO: Make `session` a private field, and expose only specific features of it directly.
	session: null | HttpSession;
	instance: null | Instance;
	instanceName: null | string;

	constructor() {
		this._content = "";
		this.storage = null;
		this.prevExecuteBookmark = null;
		this.contentChanged = new EventEmitter("contentChanged");
		this.session = null;
	}

	loadInstance(name) {
		if (name == null) {
			throw new TypeError("instance name must be non-null.");
		}
		this.instanceName = name;
		this.instance = loadInstance(name) || {
			text: "GET http://httpbin.org/get?name=haha\n\n###\n\nPOST http://httpbin.org/post\nContent-Type: application/x-www-form-urlencoded\n\nusername=sherlock&password=elementary\n",
			cookieJar: {},
		};

		if (this.instance.cookieJar && this.session != null) {
			this.session.cookieJar.update(this.instance.cookieJar);
			m.redraw();
		}

		this.setContent(this.instance.text);
	}

	saveInstance() {
		if (this.instance != null && this.instanceName != null) {
			this.instance.text = this.getContent();
			saveInstance(this.instanceName, this.instance);
		}
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
		this.saveInstance();
		if (!isSilent) {
			this.contentChanged.emit({
				detail: value,
				target: this,
			});
		}
	}

	execute(codeMirror, flashQueue) {
		const lines = this.getContent().split("\n");
		const cursorLine = codeMirror.getCursor().line;

		this.prevExecuteBookmark?.clear();
		this.prevExecuteBookmark = codeMirror.getDoc().setBookmark(codeMirror.getCursor());

		let startLine = cursorLine;
		while (startLine >= 0 && !lines[startLine].startsWith("###")) {
			--startLine;
		}

		let endLine = cursorLine;
		while (endLine <= lines.length && !lines[endLine].startsWith("###")) {
			++endLine;
		}

		flashQueue.push({ start: startLine, end: endLine + 1 });
	}

	runAgain(codeMirror) {
		if (codeMirror == null || this.prevExecuteBookmark == null) {
			return;
		}

		codeMirror.setCursor(this.prevExecuteBookmark.find() as any);
	}
}
