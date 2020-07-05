import m from "mithril";
import CodeMirror from "codemirror";
import "codemirror/addon/selection/active-line";
import "codemirror/mode/javascript/javascript";
import "codemirror/lib/codemirror.css";

export default function CodeEditor() {
	let content = "";
	let onUpdate: null | ((string) => void) = null;
	let codeMirror: CodeMirror.Editor | null = null;

	return {view, oncreate};

	function oncreate(vnode) {
		content = vnode.attrs.content || "";
		codeMirror = CodeMirror(vnode.dom, {
			mode: "prestige",
			lineNumbers: true,
			autofocus: true,
			styleActiveLine: true,
			gutters: ["prestige"],
			value: content,
		});
		codeMirror.setOption("extraKeys", {
			"Ctrl-Enter": vnode.attrs.onExecute,
			"Cmd-Enter": vnode.attrs.onExecute,
		});
		codeMirror.on("changes", onChanges);
		updateGutter(codeMirror);
		updateLineBackgrounds(codeMirror);
		onUpdate = vnode.attrs.onUpdate;
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
		const lines = codeMirror1.getValue().split("\n");
		const doc = codeMirror1.getDoc();
		doc.clearGutter("prestige");

		for (const [i, line] of lines.entries()) {
			if (line.startsWith("###")) {
				const el = document.createElement("span");
				el.innerText = "+";
				el.style.color = "green";
				el.style.fontWeight = "bold";
				el.style.cursor = "pointer";
				el.title = "Insert new request here.";
				el.dataset.lineNum = i;
				el.addEventListener("click", onNewClicked);
				doc.setGutterMarker(i, "prestige", el);
			}
		}
	}

	function updateLineBackgrounds(codeMirror1) {
		const lines = codeMirror1.getValue().split("\n");
		const doc = codeMirror1.getDoc();

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

	function view() {
		return m(".body");
	}
}

CodeMirror.defineMode("prestige", (config) => {
	const jsMode = CodeMirror.getMode(config, "javascript");
	const jsonMode = CodeMirror.getMode(config, { name: "javascript", json: true });

	return { startState, copyState, token, blankLine };

	function startState() {
		return {
			context: null,
			bodyJustStarted: false,
			jsState: null,
			jsonState: null,
		};
	}

	function copyState(state) {
		return {
			context: state.context,
			bodyJustStarted: state.bodyJustStarted,
			// @ts-ignore
			jsState: state.jsState === null ? null : CodeMirror.copyState(jsMode, state.jsState),
			// @ts-ignore
			jsonState: state.jsonState === null ? null : CodeMirror.copyState(jsMode, state.jsonState),
		}
	}

	function token(stream, state) {
		const { bodyJustStarted } = state;
		state.bodyJustStarted = false;

		if (stream.match("###")) {
			if (state.jsState !== null) {
				state.jsState = null;
			}
			if (state.jsonState !== null) {
				state.jsonState = null;
			}

			stream.eatSpace();
			state.context = stream.match("javascript") ? "javascript" : null;
			if (state.context === "javascript") {
				state.jsState = CodeMirror.startState(jsMode);
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
			// @ts-ignore
			return jsMode?.token(stream, state.jsState);
		}

		if (state.context === null) {
			state.context = "request-preamble";
			stream.skipToEnd();
			return null;
		}

		if (state.context === "request-body") {
			if (bodyJustStarted) {
				if (stream.peek() === "{") {
					state.jsonState = CodeMirror.startState(jsonMode);
				}
			}
			if (state.jsonState) {
				// @ts-ignore
				return jsonMode.token(stream, state.jsonState);
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
