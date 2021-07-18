import CodeMirror from "codemirror"

// Following line is required so that Prestige mode's definition is loaded.
import "../scripts/codemirror"

const prestigeMode = CodeMirror.getMode(CodeMirror.defaults, "prestige")

interface Token {
	text: string
	style: null | string
}

// Code taken from the official runMode addon of CodeMirror.
function runMode(
	lines: string[],
	mode: CodeMirror.Mode<unknown>,
): Token[] {
	const tokens: Token[] = []
	const state = CodeMirror.startState(mode)

	for (let i = 0, e = lines.length; i < e; ++i) {
		if (i) {
			tokens.push({ text: "\n", style: null })
		}
		const stream = new (CodeMirror as any).StringStream(lines[i], null, {
			lookAhead(n: number) {
				return lines[i + n]
			},
			baseToken() {
				return null
			},
		})
		if (!stream.inputText && mode.blankLine) {
			mode.blankLine(state)
		}
		while (!stream.eol()) {
			const style = mode.token(stream, state)
			tokens.push({ text: stream.current(), style: style == null ? null : style })
			stream.start = stream.pos
		}
	}

	return tokens
}

function runModePrestige(lines: string[]): Token[] {
	return runMode(lines, prestigeMode)
}

test("simple sheet", async () => {
	const tokens = runModePrestige([
		"GET",
	])
	expect(tokens).toEqual([
		{ text: "GET", style: null },
	])
})

test("request with javascript with template string in body", async () => {
	const tokens = runModePrestige([
		"POST https://httpbun.com/post",
		"",
		"= `abc ${1+2} def`",
	])
	expect(tokens).toEqual([
		{ text: "POST https://httpbun.com/post", style: null },
		{ text: "\n",                            style: null },
		{ text: "\n",                            style: null },
		{ text: "= ",                            style: null },
		{ text: "`abc ${",                       style: "string-2" },
		{ text: "1",                             style: "number" },
		{ text: "+",                             style: "operator" },
		{ text: "2",                             style: "number" },
		{ text: "}",                             style: "string-2" },
		{ text: " ",                             style: null },
		{ text: "def`",                          style: "string-2" },
	])
})
