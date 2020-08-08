import { EventEmitter } from "./EventEmitter";
import HttpSession from "./HttpSession";
import { Instance, loadInstance, saveInstance } from "./storage";
import m from "mithril";
import CodeMirror from "codemirror";
import { BlockType, computeStructure } from "./Parser";

// Expected environment variables.
declare var process: { env: { PRESTIGE_PROXY_URL: string } };

interface Storage {
	save(name: string, data: object): void;
	load(name: string): object;
}

export default class Workspace {
	codeMirror: null | CodeMirror.Editor;
	private _content: string;
	storage: null | Storage;
	private prevExecuteBookmark: null | CodeMirror.TextMarker;
	private readonly contentChanged: EventEmitter<Workspace, string>;
	private session: HttpSession;
	instance: null | Instance;
	instanceName: null | string;
	private flashQueue: any[];

	constructor() {
		this.codeMirror = null;
		this._content = "";
		this.storage = null;
		this.prevExecuteBookmark = null;
		this.contentChanged = new EventEmitter("contentChanged");
		this.session = new HttpSession(process.env.PRESTIGE_PROXY_URL);
		this.flashQueue = [];

		this.runAgain = this.runAgain.bind(this);
		this.doExecute = this.doExecute.bind(this);
		this.onNewClicked = this.onNewClicked.bind(this);
		this.onPrettifyClicked = this.onPrettifyClicked.bind(this);
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

		if (this.instance.cookieJar) {
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

	initCodeMirror(element) {
		if (this.codeMirror != null) {
			return;
		}

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
			},
		});

		this.updateGutter();
		this.updateLineBackgrounds();

		this.codeMirror.on("changes", () => {
			this.saveInstance();
			this.updateGutter();
			this.updateLineBackgrounds();
		});
	}

	getContent() {
		return this.codeMirror ? this.codeMirror.getValue() : this._content;
	}

	setContent(content) {
		if (this.codeMirror == null) {
			this._content = content;
		} else {
			this.codeMirror.setValue(content);
		}
	}

	updateLineBackgrounds() {
		if (this.codeMirror == null) {
			return;
		}

		const lines = this.getContent().split("\n");

		let inJs = false;
		for (const [i, line] of lines.entries()) {
			if (line.startsWith("### javascript")) {
				inJs = true;

			} else if (line.startsWith("###")) {
				inJs = false;

			}

			if (inJs) {
				this.codeMirror.addLineClass(i, "background", "line-javascript");

			} else {
				this.codeMirror.removeLineClass(i, "background", "line-javascript");

			}
		}
	}

	updateGutter() {
		if (this.codeMirror == null) {
			return;
		}

		this.codeMirror.clearGutter("prestige");

		const lines: string[] = this.getContent().split("\n");
		const structure = computeStructure(lines);

		for (const { start, end, type } of structure) {
			if (type === BlockType.PAGE && lines[start].startsWith("###")) {
				const el = document.createElement("span");
				el.innerText = "+";
				el.style.color = "green";
				el.style.fontWeight = "bold";
				el.style.cursor = "pointer";
				el.title = "Insert new request here.";
				el.dataset.lineNum = start.toString();
				el.addEventListener("click", this.onNewClicked);
				this.codeMirror.setGutterMarker(start, "prestige", el);

			} else if (type === BlockType.BODY && lines[start].startsWith("{")) {
				const pageContent = lines.slice(start, end + 1).join("\n");
				try {
					const pretty = JSON.stringify(JSON.parse(pageContent), null, 2);
					if (pageContent !== pretty) {
						const el = document.createElement("span");
						el.innerText = "P";
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

	onNewClicked(event) {
		const lineNum = parseInt(event.target.dataset.lineNum, 10);
		this.codeMirror?.replaceRange(
			"###\n\nGET http://httpbin.org/get?name=sherlock\n\n",
			{ line: lineNum, ch: 0 }
		);
	}

	onPrettifyClicked(event) {
		this.codeMirror?.replaceRange(
			event.target.dataset.pretty + "\n",
			{ line: parseInt(event.target.dataset.start, 10), ch: 0 },
			{ line: 1 + parseInt(event.target.dataset.end, 10), ch: 0 }
		)
	}

	get cookieJar() {
		return this.session.cookieJar;
	}

	doExecute() {
		if (this.codeMirror == null) {
			return;
		}

		if (this.codeMirror.somethingSelected()) {
			alert("Running a selection is not supported yet.");
			return;
		}

		const lines = this.getContent().split("\n");
		const cursorLine = this.codeMirror.getCursor().line;

		this.prevExecuteBookmark?.clear();
		this.prevExecuteBookmark = this.codeMirror.getDoc().setBookmark(this.codeMirror.getCursor());

		let startLine = cursorLine;
		while (startLine >= 0 && !lines[startLine].startsWith("###")) {
			--startLine;
		}

		let endLine = cursorLine;
		while (endLine <= lines.length && !lines[endLine].startsWith("###")) {
			++endLine;
		}

		this.flashQueue.push({ start: startLine, end: endLine + 1 });

		this.session.runTop(lines, cursorLine)
			.finally(() => {
				if (this.instance != null) {
					this.instance.cookieJar = this.session.cookieJar;
				}
				this.saveInstance();
				m.redraw();
			});
	}

	runAgain() {
		if (this.codeMirror == null || this.prevExecuteBookmark == null) {
			return;
		}

		this.codeMirror.setCursor(this.prevExecuteBookmark.find() as any);
		this.doExecute();
	}

	doFlashes() {
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
