import { Block, BlockType, parse } from "../scripts/Parser"

console.log = jest.fn()

test("single line input with one request", async () => {
	const structure: Block[] = parse([
		"GET http://httpbin.org",
	])

	expect(structure).toBeDefined()
	expect(structure).toStrictEqual([
		{
			type: BlockType.HTTP_REQUEST,
			start: 0,
			end: 0,
			header: {
				start: 0,
				end: 0,
			},
			payload: null,
		},
	])
})

test("comment and a request", async () => {
	const structure: Block[] = parse([
		"# a comment goes here",
		"GET http://httpbin.org",
	])

	expect(structure).toBeDefined()
	expect(structure).toStrictEqual([
		{
			type: BlockType.HTTP_REQUEST,
			start: 0,
			end: 1,
			header: {
				start: 1,
				end: 1,
			},
			payload: null,
		},
	])
})

test("get request on first and only non-blank line", async () => {
	const structure: Block[] = parse([
		"GET http://httpbin.org",
		"",
	])

	expect(structure).toBeDefined()
	expect(structure).toStrictEqual([
		{
			type: BlockType.HTTP_REQUEST,
			start: 0,
			end: 1,
			header: {
				start: 0,
				end: 0,
			},
			payload: null,
		},
	])
})

test("get request with blank lines around", async () => {
	const structure = parse([
		"",
		"GET http://httpbin.org",
		"",
	])

	expect(structure).toBeDefined()
	expect(structure).toStrictEqual([
		{
			type: BlockType.HTTP_REQUEST,
			start: 0,
			end: 2,
			header: {
				start: 1,
				end: 1,
			},
			payload: null,
		},
	])
})

test("post request with one line body", async () => {
	const structure: Block[] = parse([
		"POST http://httpbin.org",
		"",
		"body goes here",
	])

	expect(structure).toBeDefined()
	expect(structure).toStrictEqual([
		{
			type: BlockType.HTTP_REQUEST,
			start: 0,
			end: 2,
			header: {
				start: 0,
				end: 0,
			},
			payload: {
				start: 2,
				end: 2,
			},
		},
	])
})

test("two get requests", async () => {
	const structure: Block[] = parse([
		"GET http://httpbin.org/get",
		"",
		"###",
		"",
		"GET http://google.com",
	])

	expect(structure).toBeDefined()
	expect(structure).toStrictEqual([
		{
			type: BlockType.HTTP_REQUEST,
			start: 0,
			end: 1,
			header: {
				start: 0,
				end: 0,
			},
			payload: null,
		},
		{
			type: BlockType.PAGE_BREAK,
			start: 2,
			end: 2,
			tail: "",
		},
		{
			type: BlockType.HTTP_REQUEST,
			start: 3,
			end: 4,
			header: {
				start: 4,
				end: 4,
			},
			payload: null,
		},
	])
})

test("get request with an ending", async () => {
	const structure: Block[] = parse([
		"POST http://httpbin.org",
		"",
		"body goes here",
		"",
		"###",
		"more useless stuff here",
		"",
	])

	expect(structure).toBeDefined()
	expect(structure).toStrictEqual([
		{
			type: BlockType.HTTP_REQUEST,
			start: 0,
			end: 3,
			header: {
				start: 0,
				end: 0,
			},
			payload: {
				start: 2,
				end: 2,
			},
		},
		{
			type: BlockType.PAGE_BREAK,
			start: 4,
			end: 4,
			tail: "",
		},
		{
			type: BlockType.HTTP_REQUEST,
			start: 5,
			end: 6,
			header: {
				start: 5,
				end: 5,
			},
			payload: null,
		},
	])
})

test("one js and one request block", async () => {
	const structure = parse([
		"### javascript",
		"void 0",
		"###",
		"GET http://httpbin.org",
		"",
	])

	expect(structure).toBeDefined()
	expect(structure).toStrictEqual([
		{
			type: BlockType.PAGE_BREAK,
			start: 0,
			end: 0,
			tail: "javascript",
		},
		{
			type: BlockType.JAVASCRIPT,
			start: 1,
			end: 1,
		},
		{
			type: BlockType.PAGE_BREAK,
			start: 2,
			end: 2,
			tail: "",
		},
		{
			type: BlockType.HTTP_REQUEST,
			start: 3,
			end: 4,
			header: {
				start: 3,
				end: 3,
			},
			payload: null,
		},
	])
})
