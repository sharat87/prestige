import { render } from "./utils"
import CodeBlock from "_/CodeBlock"

test("CodeBlock plain text", async () => {
	const root = render(CodeBlock, { text: "some plain text" })
	const el = root.querySelector("pre")
	expect(el).toBeDefined()
	if (el == null) {
		return
	}
	expect(getCodeTags(el))
		.toStrictEqual([
			["SPAN", "1"],
			["SPAN", "some plain text"],
		])
})

test("CodeBlock json", async () => {
	const root = render(CodeBlock, { text: '{ "key": true }', spec: "application/json" })
	const el = root.querySelector("pre")
	expect(el).toBeDefined()
	if (el == null) {
		return
	}
	expect(getCodeTags(el))
		.toStrictEqual([
			["SPAN", "1"],
			["SPAN", "{"],
			["SPAN", ""],
			["SPAN", "\n"],
			["SPAN", "2"],
			["SPAN", "  "],
			["SPAN", "\"key\""],
			["SPAN", ":"],
			["SPAN", " "],
			["SPAN", "true"],
			["SPAN", "\n"],
			["SPAN", "3"],
			["SPAN", "}"],
		])
})

function getCodeTags(el: HTMLPreElement): [tag: string, content: string][] {
	return Array.from(el!.firstElementChild!.children!).map(t => [t.tagName, t.textContent!])
}
