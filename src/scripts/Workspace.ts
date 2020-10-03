import HttpSession from "./HttpSession";
import { Storage, loadStorage } from "./storage";
import m from "mithril";
import CodeMirror from "codemirror";
import { BlockType, computeStructure } from "./Parser";
import BracesSVG from "remixicon/icons/Development/braces-line.svg";
import CookieJar from "./CookieJar";

// Expected environment variables.
declare const process: { env: { PRESTIGE_PROXY_URL: string } };

const DEFAULT_EDITOR_CONTENT = `GET http://httpbin.org/get?name=haha

###

POST http://httpbin.org/post
Content-Type: application/x-www-form-urlencoded

username=sherlock&password=elementary
`;

export default class Workspace {
	codeMirror: null | CodeMirror.Editor;
	private _content: string;
	private _lines: null | string[];
	private prevExecuteBookmark: null | CodeMirror.TextMarker;
	session: HttpSession;
	storage: Storage;
	private flashQueue: any[];
	private widgetMarks: CodeMirror.TextMarker[];

	constructor() {
		this.codeMirror = null;
		this._content = "";
		this._lines = null;
		this.prevExecuteBookmark = null;
		this.session = new HttpSession(process.env.PRESTIGE_PROXY_URL);
		this.flashQueue = [];
		this.widgetMarks = [];

		this.runAgain = this.runAgain.bind(this);
		this.doExecute = this.doExecute.bind(this);
		this.onNewClicked = this.onNewClicked.bind(this);
		this.onPrettifyClicked = this.onPrettifyClicked.bind(this);
	}

	loadStorage(name: string): void {
		if (name == null) {
			throw new TypeError("Storage name must be non-null.");
		}

		this.storage = loadStorage(name);

		if (!this.storage.text) {
			this.storage.text = DEFAULT_EDITOR_CONTENT;
		}

		if (this.storage.cookieJar) {
			this.session.cookieJar.update(this.storage.cookieJar);
			m.redraw();
		}

		this.setContent(this.storage.text);
	}

	initCodeMirror(element: HTMLElement): void {
		if (this.codeMirror != null) {
			return;
		}

		// These two mappings are used for back/forward in macOS. Let the browser handle them.
		delete (CodeMirror as any).keyMap.macDefault["Cmd-["];
		delete (CodeMirror as any).keyMap.macDefault["Cmd-]"];

		this.codeMirror = CodeMirror(element, {
			mode: "prestige",
			lineNumbers: true,
			matchBrackets: {},
			autofocus: true,
			autoCloseBrackets: true,
			styleActiveLine: true,
			gutters: ["prestige"],
			value: this.getContent(),
			extraKeys: {
				"Ctrl-Enter": this.doExecute,
				"Cmd-Enter": this.doExecute,
				"Cmd-F": "findPersistent",
				"Cmd-/": "toggleComment",
				"Shift-Tab": "indentLess",
			},
		});

		this.updateEditorDisplay();

		this.codeMirror.on("changes", () => {
			this._lines = null;
			this.storage.save({ text: this.getContent() })
				.catch(error => {
					console.error("Error saving", error);
				});
			this.updateEditorDisplay();
		});
	}

	getContent(): string {
		return this.codeMirror ? this.codeMirror.getValue() : this._content;
	}

	setContent(content: string): void {
		this._lines = null;
		if (this.codeMirror == null) {
			this._content = content;
		} else {
			this.codeMirror.setValue(content);
		}
	}

	get lines(): string[] {
		if (this._lines == null) {
			this._lines = this.getContent().split("\n");
		}

		return this._lines;
	}

	/**
	 * Update gutter, widgets, highlights etc. of the CodeMirror editor. Usually called when the contents of the editor
	 * change.
	 */
	updateEditorDisplay(): void {
		if (this.codeMirror == null) {
			return;
		}

		this.codeMirror.clearGutter("prestige");

		const lines: string[] = this.lines;
		const structure = computeStructure(lines);

		for (const mark of this.widgetMarks.splice(0, this.widgetMarks.length)) {
			mark.clear();
		}

		for (const i of lines.keys()) {
			this.codeMirror.removeLineClass(i, "background", "line-javascript");
		}

		for (const { start, end, type } of structure) {
			const startLine = lines[start];

			if (type === BlockType.PAGE && startLine.startsWith("###")) {
				const el = document.createElement("span");
				el.classList.add("icon", "add-widget");
				el.innerHTML = "+new";
				el.style.cursor = "pointer";
				el.style.marginLeft = "1.5ch";
				el.style.color = "green";
				el.style.textDecoration = "underline";
				el.title = "Insert new request here.";
				el.dataset.lineNum = start.toString();
				el.addEventListener("click", this.onNewClicked);
				this.widgetMarks.push(this.codeMirror.setBookmark(
					{ line: start, ch: startLine.length },
					{ widget: el, insertLeft: true },
				));

				if (startLine.startsWith("### javascript")) {
					for (let i = start; i <= end + 1; ++i) {
						this.codeMirror.addLineClass(i, "background", "line-javascript");
					}
				}

			} else if (type === BlockType.BODY && startLine.startsWith("{")) {
				const pageContent = lines.slice(start, end + 1).join("\n");
				try {
					const pretty = JSON.stringify(JSON.parse(pageContent), null, 2);
					if (pageContent !== pretty) {
						const el = document.createElement("span");
						el.classList.add("icon");
						el.innerHTML = BracesSVG.content;
						el.style.backgroundColor = "#09F";
						el.style.color = "white";
						el.style.cursor = "pointer";
						el.title = "Prettify JSON body.";
						el.dataset.start = start.toString();
						el.dataset.end = end.toString();
						el.dataset.pretty = pretty;
						el.addEventListener("click", this.onPrettifyClicked);
						this.codeMirror.setGutterMarker(start, "prestige", el);
					}

				} catch (e) {
					console.error("Error adding prettify button on line " + start, e);

				}

			}
		}
	}

	onNewClicked(event: MouseEvent): void {
		const lineNum = parseInt((event.currentTarget as HTMLElement).dataset.lineNum || "0", 10);
		this.codeMirror?.replaceRange(
			"###\n\nGET http://httpbin.org/get?name=sherlock\n\n",
			{ line: lineNum, ch: 0 }
		);
		this.codeMirror?.setCursor(lineNum + 2, 0);
		this.codeMirror?.focus();
	}

	onPrettifyClicked(event: MouseEvent): void {
		if (!(event.currentTarget instanceof HTMLElement)) {
			throw new Error("Event without a target.");
		}

		if (typeof event.currentTarget.dataset.start !== "string"
			|| typeof event.currentTarget.dataset.end !== "string") {
			throw new Error("Start/End not available on prettify button.");
		}

		this.codeMirror?.replaceRange(
			event.currentTarget.dataset.pretty + "\n",
			{ line: parseInt(event.currentTarget.dataset.start, 10), ch: 0 },
			{ line: 1 + parseInt(event.currentTarget.dataset.end, 10), ch: 0 }
		);
	}

	get cookieJar(): CookieJar {
		return this.session.cookieJar;
	}

	doExecute(): void {
		if (this.codeMirror == null) {
			return;
		}

		if (this.codeMirror.somethingSelected()) {
			alert("Running a selection is not supported yet.");
			return;
		}

		const lines = this.lines;
		const cursorLine = this.codeMirror.getCursor().line;

		this.prevExecuteBookmark?.clear();
		this.prevExecuteBookmark = this.codeMirror.getDoc().setBookmark(this.codeMirror.getCursor());

		let startLine = cursorLine;
		while (startLine >= 0 && !lines[startLine].startsWith("###")) {
			--startLine;
		}

		let endLine = cursorLine;
		while (endLine < lines.length && !lines[endLine].startsWith("###")) {
			++endLine;
		}

		this.flashQueue.push({ start: startLine, end: endLine + 1 });

		this.session.runTop(lines, cursorLine)
			.finally(() => {
				m.redraw();
				return this.storage.save({ cookieJar: this.session.cookieJar });
			});
	}

	runAgain(): void {
		if (this.codeMirror == null || this.prevExecuteBookmark == null) {
			return;
		}

		this.codeMirror.setCursor(this.prevExecuteBookmark.find() as any);
		this.doExecute();
	}

	doFlashes(): void {
		if (this.codeMirror == null) {
			return;
		}

		const doc = this.codeMirror.getDoc() as any;

		while (this.flashQueue.length > 0) {
			const { start, end } = this.flashQueue.shift();

			for (let i = start; i < end; ++i) {
				doc.addLineClass(i, "line", "flash");
			}

			requestAnimationFrame(() => {
				for (let i = start; i < end; ++i) {
					doc.removeLineClass(i, "line", "flash");
				}
			});
		}
	}
}
