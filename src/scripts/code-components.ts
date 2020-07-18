import m from "mithril";
import CodeMirror from "codemirror";
import "codemirror/addon/selection/active-line";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/dialog/dialog.css";
import "codemirror/addon/search/searchcursor";
import "codemirror/addon/search/search";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/comment/comment";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/htmlmixed/htmlmixed";
import "codemirror/lib/codemirror.css";
import {BlockType, computeStructure} from "./Parser";

export function Editor(initialVnode) {
	let content = "";
	let onUpdate: null | ((string) => void) = null;
	let codeMirror: null | CodeMirror.Editor = null;
	const onExecute = initialVnode.attrs.onExecute;
	initialVnode.attrs.workspaceBeacon?.on("run-again", onRunAgain);

	return { view, oncreate, onremove };

	function onremove(vnode) {
		vnode.attrs.workspaceBeacon?.off("run-again", onRunAgain);
	}

	function onRunAgain() {
		if (codeMirror != null) {
			initialVnode.attrs.onRunAgain(codeMirror);
		}
	}

	function oncreate(vnode) {
		content = vnode.attrs.content || "";
		codeMirror = CodeMirror(vnode.dom, {
			mode: "prestige",
			lineNumbers: true,
			matchBrackets: {},
			autofocus: true,
			autoCloseBrackets: true,
			styleActiveLine: true,
			gutters: ["prestige"],
			value: content,
			extraKeys: {
				"Ctrl-Enter": onExecute,
				"Cmd-Enter": onExecute,
				"Cmd-F": "findPersistent",
				"Cmd-/": "toggleComment",
			},
		});

		codeMirror.on("changes", onChanges);

		updateGutter(codeMirror);
		updateLineBackgrounds(codeMirror);

		onUpdate = vnode.attrs.onUpdate;

		document.addEventListener("keydown", event => {
			if (event.key === "Escape") {
				codeMirror?.focus();
			}
		});
	}

	function onChanges(codeMirror1) {
		content = codeMirror1.getValue();
		updateGutter(codeMirror1);
		updateLineBackgrounds(codeMirror1);

		if (onUpdate) {
			onUpdate(content);
		}
	}

	function updateGutter(codeMirror1) {
		const doc = codeMirror1.getDoc();
		doc.clearGutter("prestige");

		const lines: string[] = codeMirror1.getValue().split("\n");
		const structure = computeStructure(lines);

		for (const {start, end, type} of structure) {
			if (type === BlockType.PAGE && lines[start].startsWith("###")) {
				const el = document.createElement("span");
				el.innerText = "+";
				el.style.color = "green";
				el.style.fontWeight = "bold";
				el.style.cursor = "pointer";
				el.title = "Insert new request here.";
				el.dataset.lineNum = start.toString();
				el.addEventListener("click", onNewClicked);
				doc.setGutterMarker(start, "prestige", el);

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
						el.addEventListener("click", onPrettifyClicked);
						doc.setGutterMarker(start, "prestige", el);
					}

				} catch (e) {
					console.error("Error adding prettify button on line " + start, e);

				}

			}
		}
	}

	function updateLineBackgrounds(codeMirror1) {
		const lines = codeMirror1.getValue().split("\n");

		let inJs = false;
		for (const [i, line] of lines.entries()) {
			if (line.startsWith("### javascript")) {
				inJs = true;

			} else if (line.startsWith("###")) {
				inJs = false;

			}

			if (inJs) {
				codeMirror1.addLineClass(i, "background", "line-javascript");

			} else {
				codeMirror1.removeLineClass(i, "background", "line-javascript");

			}
		}
	}

	function onNewClicked(event) {
		const lineNum = parseInt(event.target.dataset.lineNum, 10);
		codeMirror?.replaceRange(
			"###\n\nGET http://httpbin.org/get?name=sherlock\n\n",
			{ line: lineNum, ch: 0 }
		);
	}

	function onPrettifyClicked(event) {
		codeMirror?.replaceRange(
			event.target.dataset.pretty + "\n",
			{ line: parseInt(event.target.dataset.start, 10), ch: 0 },
			{ line: 1 + parseInt(event.target.dataset.end, 10), ch: 0 }
		)
	}

	function onFlash(event: CustomEvent | { detail: { start: number, end: number } }) {
		if (codeMirror == null) {
			return;
		}

		const doc = codeMirror.getDoc() as any;
		const { start, end } = event.detail;

		for (let i = start; i < end; ++i) {
			doc.addLineClass(i, "line", "flash");
		}

		clearFlash(doc, start, end);
	}

	function clearFlash(doc, start, end) {
		setTimeout(() => {
			for (let i = start; i < end; ++i) {
				doc.removeLineClass(i, "line", "flash");
			}
		}, 0);
	}

	function view(vnode) {
		const flashQueue = vnode.attrs.flashQueue;
		if (codeMirror && flashQueue) {
			while (flashQueue.length > 0) {
				onFlash({ detail: flashQueue.shift() })
			}
		}

		codeMirror?.refresh();
		return m(".body");
	}
}

export function CodeBlock(initialVnode) {
	console.log("New CodeBlock component", initialVnode.attrs);
	let codeMirror: null | CodeMirror.Editor = null;
	return { view, oncreate };

	function oncreate(vnode) {
		let text = vnode.attrs.text;

		if (text == null || text === "") {
			return m("p", m("em", "Nothing"));
		}

		if (typeof text !== "string") {
			text = JSON.stringify(text);
		}

		codeMirror = CodeMirror(vnode.dom, {
			mode: vnode.attrs.spec,
			readOnly: true,
			lineNumbers: true,
			foldGutter: true,
			gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
			value: prettify(text, vnode.attrs.spec),
		});
	}

	function view() {
		return m(".code-block");
	}
}

interface PrestigeState {
	context: null | string;
	bodyJustStarted: boolean;
	jsState: any;
	bodyState: any;
}

CodeMirror.defineMode("prestige", (config, modeOptions): CodeMirror.Mode<PrestigeState> => {
	const jsMode = CodeMirror.getMode(config, "javascript");
	const jsonMode = CodeMirror.getMode(config, { name: "javascript", json: true });

	return {
		name: "prestige",
		lineComment: "#",
		token,
		startState,
		blankLine,
		copyState,
	};

	function startState(): PrestigeState {
		return {
			context: null,
			bodyJustStarted: false,
			jsState: null,
			bodyState: null,
		};
	}

	function copyState(state: PrestigeState) {
		return {
			context: state.context,
			bodyJustStarted: state.bodyJustStarted,
			jsState: state.jsState === null ? null : CodeMirror.copyState(jsMode, state.jsState),
			bodyState: state.bodyState === null ? null : CodeMirror.copyState(jsMode, state.bodyState),
		}
	}

	function token(stream, state): string | null {
		const { bodyJustStarted } = state;
		state.bodyJustStarted = false;/**/

		if (stream.match("###")) {
			if (state.jsState !== null) {
				state.jsState = null;
			}
			if (state.bodyState !== null) {
				state.bodyState = null;
			}

			stream.eatSpace();
			state.context = stream.match("javascript") ? "javascript" : null;
			if (state.context === "javascript") {
				state.jsState = CodeMirror.startState(jsMode);/**/
			}

			stream.skipToEnd();
			return "tag header";
		}

		if (stream.eat("#")) {
			stream.skipToEnd();
			return "comment";
		}

		if (state.context === "javascript") {
			if (state.jsState === null) {
				console.log("incorrect state", stream.current());
			}
			return jsMode.token(stream, state.jsState);
		}

		if (state.context === null) {
			state.context = "request-preamble";
			stream.skipToEnd();
			return null;
		}

		if (state.context === "request-body") {
			if (bodyJustStarted) {
				if (stream.peek() === "{") {
					state.bodyState = CodeMirror.startState(jsonMode);
				} else if (stream.peek() === "=") {
					state.bodyState = CodeMirror.startState(jsMode);
					stream.eat("=");
				}
			}
			if (state.bodyState) {
				return jsonMode.token(stream, state.bodyState);
			} else {
				stream.skipToEnd();
				return "string";
			}
		}

		stream.skipToEnd();
		return null;
	}

	function blankLine(state) {
		if (state.context === "request-preamble") {
			state.context = "request-body";
			state.bodyJustStarted = true;
		}
	}
});

function prettify(text, spec) {
	const language = spec.split("/", 2)[1];
	if (language === "json") {
		return prettifyJson(text);
	}
	return text;
}

function prettifyJson(json) {
	try {
		return JSON.stringify(JSON.parse(json), null, 2);
	} catch (error) {
		// TODO: The fact that this JSON is invalid should be communicated to the user.
		console.error("Error parsing/prettifying JSON.");
		return json;
	}
}
