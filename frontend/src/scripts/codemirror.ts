import CodeMirror from "codemirror"
import "codemirror/addon/selection/active-line"
import "codemirror/addon/edit/matchbrackets"
import "codemirror/addon/edit/closebrackets"
import "codemirror/addon/dialog/dialog"
import "codemirror/addon/dialog/dialog.css"
import "codemirror/addon/search/searchcursor"
import "codemirror/addon/search/search"
import "codemirror/addon/fold/foldcode"
import "codemirror/addon/fold/brace-fold"
import "codemirror/addon/fold/foldgutter"
import "codemirror/addon/fold/foldgutter.css"
import "codemirror/addon/comment/comment"
import "codemirror/addon/scroll/scrollpastend"
import "codemirror/addon/lint/lint"
import "codemirror/addon/lint/lint.css"
import "codemirror/mode/javascript/javascript"
import "codemirror/mode/htmlmixed/htmlmixed"
import "codemirror/lib/codemirror.css"
import * as acorn from "acorn/dist/acorn"

interface PrestigeState {
	context: null | string
	bodyJustStarted: boolean
	jsState: any
	bodyState: any
}

CodeMirror.defineMode("prestige", (config/*, modeOptions*/): CodeMirror.Mode<PrestigeState> => {
	const jsMode = CodeMirror.getMode(config, "javascript")
	const jsonMode = CodeMirror.getMode(config, { name: "javascript", json: true })

	return {
		name: "prestige",
		lineComment: "#",
		token,
		startState,
		blankLine,
		copyState,
	}

	function startState(): PrestigeState {
		return {
			context: null,
			bodyJustStarted: false,
			jsState: null,
			bodyState: null,
		}
	}

	function copyState(state: PrestigeState): PrestigeState {
		return {
			context: state.context,
			bodyJustStarted: state.bodyJustStarted,
			jsState: state.jsState === null ? null : (CodeMirror as any).copyState(jsMode, state.jsState),
			bodyState: state.bodyState === null ? null : (CodeMirror as any).copyState(jsMode, state.bodyState),
		}
	}

	function token(stream: any, state: PrestigeState): string | null {
		const { bodyJustStarted } = state
		state.bodyJustStarted = false

		if (stream.match("###")) {
			if (state.jsState !== null) {
				state.jsState = null
			}
			if (state.bodyState !== null) {
				state.bodyState = null
			}

			stream.eatSpace()
			state.context = stream.match("javascript") ? "javascript" : null
			if (state.context === "javascript") {
				state.jsState = CodeMirror.startState(jsMode)
			}

			stream.skipToEnd()
			return "tag header"
		}

		if (stream.eat("#")) {
			stream.skipToEnd()
			return "comment"
		}

		if (state.context === "javascript") {
			if (state.jsState === null) {
				console.log("incorrect state", stream.current())
			}
			return jsMode.token ? jsMode.token(stream, state.jsState) : "error"
		}

		if (state.context === null) {
			state.context = "request-preamble"
			stream.skipToEnd()
			return null
		}

		if (state.context === "request-body") {
			if (bodyJustStarted) {
				if (stream.peek() === "{") {
					state.bodyState = CodeMirror.startState(jsonMode)
				} else if (stream.peek() === "=") {
					state.bodyState = CodeMirror.startState(jsMode)
					stream.eat("=")
				}
			}
			if (state.bodyState) {
				return jsonMode.token ? jsonMode.token(stream, state.bodyState) : "error"
			} else {
				stream.skipToEnd()
				return "string"
			}
		}

		stream.skipToEnd()
		return null
	}

	function blankLine(state: PrestigeState) {
		if (state.context === "request-preamble") {
			state.context = "request-body"
			state.bodyJustStarted = true
		}
	}
})

CodeMirror.registerHelper("lint", "prestige", (text: string/*, options: any*/): any[] => {
	console.log("linting prestige", text)
	const flags: any[] = []
	const lines: string[] = text.split("\n")

	let inJs = false
	const currentJsLines: string[] = []
	let currentJsBeginLineNum = 0

	for (const [i, line] of lines.entries()) {
		if (inJs && line.startsWith("###")) {
			const jsCode = "async function _() {\n" + currentJsLines.join("\n") + "\n}"
			currentJsLines.splice(0, currentJsLines.length)
			inJs = line.startsWith("### javascript")
			try {
				acorn.parse(jsCode, { ecmaVersion: 2019 })
			} catch (error: unknown) {
				if (error instanceof SyntaxError) {
					const loc: { line: number, column: number } = (error as any).loc
					// Extra 1 below for the function definition line.
					const actualLineNum: number = currentJsBeginLineNum + loc.line - 1
					flags.push({
						message: error.message.replace(loc.line.toString(), (actualLineNum + 1).toString()),
						severity: "error",
						from: CodeMirror.Pos(actualLineNum, loc.column),
						to: CodeMirror.Pos(actualLineNum, loc.column + 1),
					})
				}
			}
			continue
		}

		if (line.startsWith("### javascript")) {
			inJs = true
			currentJsBeginLineNum = i
			continue
		}

		if (!inJs) {
			continue
		}

		currentJsLines.push(line)
	}

	return flags
})

export default CodeMirror
