import {BlockType, computeStructure} from "../scripts/Parser";
import {makeMockContext} from "./utils";

test("single line input with one request", async () => {
	const context = makeMockContext();

	const structure = computeStructure([
		"GET http://httpbin.org",
	]);

	expect(structure).toBeDefined();
	expect(structure).toStrictEqual([
		{ start: 0, end: 0, type: BlockType.PREAMBLE },
	]);
});

test("get request on first and only non-blank line", async () => {
	const context = makeMockContext();

	const structure = computeStructure([
		"GET http://httpbin.org",
		"",
	]);

	expect(structure).toBeDefined();
	expect(structure).toStrictEqual([
		{ start: 0, end: 0, type: BlockType.PREAMBLE },
	]);
});

test("get request with blank lines around", async () => {
	const context = makeMockContext();

	const structure = computeStructure([
		"",
		"GET http://httpbin.org",
		"",
	]);

	expect(structure).toBeDefined();
	expect(structure).toStrictEqual([
		{ start: 1, end: 1, type: BlockType.PREAMBLE },
	]);
});

test("post request with one line body", async () => {
	const context = makeMockContext();

	const structure = computeStructure([
		"POST http://httpbin.org",
		"",
		"body goes here"
	]);

	expect(structure).toBeDefined();
	expect(structure).toStrictEqual([
		{ start: 0, end: 0, type: BlockType.PREAMBLE },
		{ start: 2, end: 2, type: BlockType.BODY },
	]);
});

test("get request with an ending", async () => {
	const context = makeMockContext();

	const structure = computeStructure([
		"POST http://httpbin.org",
		"",
		"body goes here",
		"",
		"###",
		"more useless stuff here",
		"",
	]);

	expect(structure).toBeDefined();
	expect(structure).toStrictEqual([
		{ start: 0, end: 0, type: BlockType.PREAMBLE },
		{ start: 2, end: 2, type: BlockType.BODY },
		{ start: 0, end: 2, type: BlockType.PAGE },
		{ start: 5, end: 5, type: BlockType.PREAMBLE },
	]);
});
