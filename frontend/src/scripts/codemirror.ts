import CodeMirror from "codemirror"
import "codemirror/addon/selection/active-line"
import "codemirror/addon/edit/matchbrackets"
import "codemirror/addon/edit/closebrackets"
import "codemirror/addon/dialog/dialog"
import "codemirror/addon/search/searchcursor"
import "codemirror/addon/search/search"
import "codemirror/addon/fold/foldcode"
import "codemirror/addon/fold/brace-fold"
import "codemirror/addon/fold/foldgutter"
import "codemirror/addon/comment/comment"
import "codemirror/addon/lint/lint"
import "codemirror/mode/javascript/javascript"
import "codemirror/mode/htmlmixed/htmlmixed"
import * as acorn from "acorn"

interface PrestigeState {
	context: string
	bodyJustStarted: boolean
	jsState: unknown
	bodyMode: null | CodeMirror.Mode<unknown>
	bodyState: unknown
}

/* Parser state contexts

### javascript |
| javascript
console.log(42); | javascript
 | javascript
### |
 | request-space-1
POST https://httpbun.com/post | request-url
Content-Type: application/json | request-headers*
X-Custom-Header: more| request-headers
 | request-space-2
payload body here| request-body
| request-body
###|

*/

CodeMirror.defineMode("prestige", prestigeMode)
CodeMirror.defineMode("javascript-custom", javascriptCustomMode)

function prestigeMode(
	config: CodeMirror.EditorConfiguration,
	// Unused modeOptions: Record<string, any>,
): CodeMirror.Mode<PrestigeState> {
	const jsMode = CodeMirror.getMode(config, "javascript-custom")
	const jsonMode = CodeMirror.getMode(
		config,
		{ name: "javascript", json: true } as CodeMirror.ModeSpec<{json: boolean}>,
	)

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
			context: "request-space-1",
			bodyJustStarted: false,
			jsState: null,
			bodyMode: null,
			bodyState: null,
		}
	}

	function copyState(state: PrestigeState): PrestigeState {
		return {
			...state,
			jsState: state.jsState == null ? null : (CodeMirror as any).copyState(jsMode, state.jsState),
			bodyState: state.bodyState == null ? null : (CodeMirror as any).copyState(state.bodyMode, state.bodyState),
		}
	}

	function token(stream: CodeMirror.StringStream, state: PrestigeState): string | null {
		const { bodyJustStarted } = state
		state.bodyJustStarted = false

		if (stream.sol() && stream.match("###")) {
			if (state.jsState !== null) {
				state.jsState = null
			}
			if (state.bodyState !== null) {
				state.bodyState = null
			}

			stream.eatSpace()
			state.context = stream.match("javascript") ? "javascript" : "request-space-1"
			if (state.context === "javascript") {
				state.jsState = CodeMirror.startState(jsMode)
			}

			stream.skipToEnd()
			return "tag header"
		}

		if (state.context === "javascript") {
			if (state.jsState === null) {
				console.error("incorrect state in javascript", stream.current())
			}
			return jsMode.token ? jsMode.token(stream, state.jsState) : "error"
		}

		if (
			(state.context === "request-space-1" && stream.eat("#"))
				|| state.context === "request-comment-after-link"
		) {
			if (stream.skipTo("https://") || stream.skipTo("http://")) {
				state.context = "request-comment-before-link"
			} else {
				stream.skipToEnd()
				state.context = "request-space-1"
			}
			return "comment"
		}

		if (state.context === "request-comment-before-link") {
			stream.eatWhile(/[-0-9a-zA-Z:.?&=#/]/)
			const url = stream.current()
			if (url.endsWith(".") && !url.endsWith("..")) {
				stream.backUp(1)
			}
			state.context = "request-comment-after-link"
			return "link"
		}

		if (state.context === "request-space-1") {
			if (stream.skipTo(" ")) {
				stream.eatSpace()
				state.context = "request-url"
			} else {
				stream.skipToEnd()
				state.context = "request-headers"
			}
			return "def"
		}

		if (state.context === "request-url") {
			stream.skipToEnd()
			state.context = "request-headers"
			return "string"
		}

		if (state.context === "request-headers") {
			if (stream.skipTo(":")) {
				state.context = "request-headers-after-name"
				return "keyword"
			} else {
				// If the header is written like `${myHeader}`, then a `:` won't be found.
				stream.skipToEnd()
				return null
			}
		}

		if (state.context === "request-headers-after-name") {
			stream.eat(":")
			stream.eatSpace()
			state.context = "request-headers-before-value"
			return null
		}

		if (state.context === "request-headers-before-value") {
			stream.skipToEnd()
			state.context = "request-headers"
			return "attribute"
		}

		if (state.context === "request-body") {
			if (bodyJustStarted) {
				if (stream.peek() === "{") {
					state.bodyMode = jsonMode
				} else if (stream.peek() === "=") {
					state.bodyMode = jsMode
					stream.eat("=")
				}
			}
			if (state.bodyMode != null) {
				if (state.bodyState == null) {
					state.bodyState = CodeMirror.startState(state.bodyMode)
					// Not helping here: state.bodyMode.token(new CodeMirror.StringStream("("), state.bodyState)
				}
				return state.bodyMode.token ? state.bodyMode.token(stream, state.bodyState) : "error"
			} else {
				stream.skipToEnd()
				return "string"
			}
		}

		stream.skipToEnd()
		return null
	}

	function blankLine(state: PrestigeState) {
		if (state.context.startsWith("request-headers")) {
			state.context = "request-body"
			state.bodyJustStarted = true
		}
	}
}

interface JavascriptCustomModeState {
	jsState: unknown
	context: null | string
}

/**
 * Wraps CodeMirror's default Javascript mode to provide some additional magic.
 */
function javascriptCustomMode(
	config: CodeMirror.EditorConfiguration,
	// Unused modeOptions: Record<string, any>,
): CodeMirror.Mode<JavascriptCustomModeState> {
	const jsMode = CodeMirror.getMode(config, "javascript")

	return {
		name: "javascript-custom",
		lineComment: "//",
		token,
		startState,
		blankLine,
		copyState,
	}

	function startState(): JavascriptCustomModeState {
		return {
			jsState: CodeMirror.startState(jsMode),
			context: null,
		}
	}

	function blankLine(state: JavascriptCustomModeState) {
		return jsMode.blankLine && jsMode.blankLine(state.jsState)
	}

	function copyState(state: JavascriptCustomModeState): JavascriptCustomModeState {
		return {
			...state,
			jsState: jsMode.copyState ? jsMode.copyState(state.jsState) : state.jsState,
		}
	}

	function token(stream: CodeMirror.StringStream, state: JavascriptCustomModeState): string | null {
		if (state.context === "comment-after-link" || stream.match("//")) {
			// TODO: Duplicate code for identifying links in comments.
			if (stream.skipTo("https://") || stream.skipTo("http://")) {
				state.context = "comment-before-link"
			} else {
				stream.skipToEnd()
				state.context = null
			}
			return "comment"
		}

		if (state.context === "comment-before-link") {
			stream.eatWhile(/[-0-9a-zA-Z:.?&=#/]/)
			const url = stream.current()
			if (url.endsWith(".") && !url.endsWith("..")) {
				stream.backUp(1)
			}
			state.context = stream.eol() ? null : "comment-after-link"
			return "link"
		}

		return jsMode.token(stream, state.jsState)
	}
}

interface LintItem {
	message: string
	severity: "error"
	from: CodeMirror.Position
	to: CodeMirror.Position
}

interface AcornSyntaxError extends SyntaxError {
	loc: acorn.Position
}

CodeMirror.registerHelper("lint", "prestige", (text: string/*, options: any*/): LintItem[] => {
	const flags: LintItem[] = []
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
					const loc = (error as AcornSyntaxError).loc
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
