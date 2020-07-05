import { extractRequest } from "../scripts/Parser";

test("single line input with one request", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"GET http://httpbin.org",
	], 0, context);

	expect(request).toBeDefined();
	expect(request?.method).toBe("GET");
	expect(request?.url).toBe("http://httpbin.org");
});

test("get request on first and only non-blank line", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"GET http://httpbin.org",
		"",
	], 0, context);

	expect(request).toBeDefined();
	expect(request?.method).toBe("GET");
	expect(request?.url).toBe("http://httpbin.org");
});

function makeMockContext() {
	return {
		data: {},
		run: jest.fn(),
		on: jest.fn(),
		off: jest.fn(),
	};
}
