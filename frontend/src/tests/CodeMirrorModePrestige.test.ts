import CodeMirror from "codemirror"
import "codemirror/addon/runmode/runmode"

// Following line is required so that Prestige mode's definition is loaded.
import "_/codemirror"

const prestigeMode = CodeMirror.getMode(CodeMirror.defaults, "prestige")
const javascriptCustomMode = CodeMirror.getMode(CodeMirror.defaults, "javascript-custom")

type TokenTuple = [style: null | string, text: string]

// Code taken from the official runMode addon of CodeMirror.
function runMode(lines: string[], mode: CodeMirror.Mode<unknown>): TokenTuple[] {
	lines = CodeMirror.splitLines(lines.join("\n"))
	const tokens: TokenTuple[] = []
	const state = CodeMirror.startState(mode)

	for (let i = 0, e = lines.length; i < e; ++i) {
		if (i) {
			tokens.push([null, "\n"])
		}
		const stream = new (CodeMirror as any).StringStream(lines[i], null, {
			lookAhead(n: number) {
				return lines[i + n]
			},
		})
		if (!stream.string && mode.blankLine) {
			mode.blankLine(state)
		}
		while (!stream.eol()) {
			const style = mode.token(stream, state)
			tokens.push([style ?? null, stream.current()])
			stream.start = stream.pos
		}
	}

	return tokens
}

function runModePrestige(lines: string[]): TokenTuple[] {
	return runMode(lines, prestigeMode)
}

test("simple sheet", async () => {
	const tokens = runModePrestige([
		"GET https://httpbun.com/get",
	])
	expect(tokens).toEqual([
		["def", "GET "],
		["string", "https://httpbun.com/get"],
	])
})

test("comment with a link", async () => {
	const tokens = runModePrestige([
		"# Go to https://httpbun.com to find out!",
	])
	expect(tokens).toEqual([
		["comment", "# Go to "],
		["link", "https://httpbun.com"],
		["comment", " to find out!"],
	])
})

test("request with headers", async () => {
	const tokens = runModePrestige([
		"GET https://httpbun.com/headers",
		"Content-Type: application/json",
		"X-More-Stuff: more stuff value here",
	])
	expect(tokens).toEqual([
		["def", "GET "],
		["string", "https://httpbun.com/headers"],
		[null, "\n"],
		["keyword", "Content-Type"],
		[null, ": "],
		["attribute", "application/json"],
		[null, "\n"],
		["keyword", "X-More-Stuff"],
		[null, ": "],
		["attribute", "more stuff value here"],
	])
})

test("request with javascript with template string in body", async () => {
	const tokens = runModePrestige([
		"POST https://httpbun.com/post",
		"",
		"= `abc ${1+2} def`",
	])
	expect(tokens).toEqual([
		["def", "POST "],
		["string", "https://httpbun.com/post"],
		[null, "\n"],
		[null, "\n"],
		[null, "= "],
		["string-2", "`abc ${"],
		["number", "1"],
		["operator", "+"],
		["number", "2"],
		["string-2", "}"],
		[null, " "],
		["string-2", "def`"],
	])
})

test("two GET requests", async () => {
	const tokens = runModePrestige([
		"GET https://httpbun.com/get",
		"",
		"###",
		"",
		"GET https://httpbun.com/anything",
	])
	expect(tokens).toEqual([
		["def", "GET "],
		["string", "https://httpbun.com/get"],
		[null, "\n"],
		[null, "\n"],
		["tag header", "###"],
		[null, "\n"],
		[null, "\n"],
		["def", "GET "],
		["string", "https://httpbun.com/anything"],
	])
})

test("request with initial header", async () => {
	const tokens = runModePrestige([
		"###",
		"",
		"GET https://httpbun.com/anything",
	])
	expect(tokens).toEqual([
		["tag header", "###"],
		[null, "\n"],
		[null, "\n"],
		["def", "GET "],
		["string", "https://httpbun.com/anything"],
	])
})

test("request with JSON body", async () => {
	const tokens = runModePrestige([
		"PATCH https://httpbun.com/patch",
		"Content-Type: application/json",
		"",
		'{ "one": 1, "two": "another" }',
	])
	expect(tokens).toEqual([
		["def", "PATCH "],
		["string", "https://httpbun.com/patch"],
		[null, "\n"],
		["keyword", "Content-Type"],
		[null, ": "],
		["attribute", "application/json"],
		[null, "\n"],
		[null, "\n"],
		[null, "{"],
		[null, " "],
		["string property", '"one"'],
		[null, ":"],
		[null, " "],
		["number", "1"],
		[null, ","],
		[null, " "],
		["string property", '"two"'],
		[null, ":"],
		[null, " "],
		["string", '"another"'],
		[null, " "],
		[null, "}"],
	])
})

test("links in javascript comments", async () => {
	expect(runMode(["// comment with https://httpbun.com link"], javascriptCustomMode))
		.toEqual([
			["comment", "// comment with "],
			["link", "https://httpbun.com"],
			["comment", " link"],
		])
	expect(runMode(["// comment with https://httpbun.com", "1"], javascriptCustomMode))
		.toEqual([
			["comment", "// comment with "],
			["link", "https://httpbun.com"],
			[null, "\n"],
			["number", "1"],
		])
	expect(runMode(["//https://httpbun.com link"], javascriptCustomMode))
		.toEqual([
			["comment", "//"],
			["link", "https://httpbun.com"],
			["comment", " link"],
		])
})
