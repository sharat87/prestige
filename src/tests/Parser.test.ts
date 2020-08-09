import { extractRequest } from "../scripts/Parser";
import { makeMockContext } from "./utils";

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

test("get request with blank lines around", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"",
		"GET http://httpbin.org",
		"",
	], 1, context);

	expect(request).toBeDefined();
	expect(request?.method).toBe("GET");
	expect(request?.url).toBe("http://httpbin.org");
});

test("post request with one line body", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"POST http://httpbin.org",
		"",
		"body goes here",
	], 0, context);

	expect(request).toBeDefined();
	expect(request?.method).toBe("POST");
	expect(request?.url).toBe("http://httpbin.org");
	expect(request?.body).toBe("body goes here");
});

test("get request with an ending", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"POST http://httpbin.org",
		"",
		"body goes here",
		"",
		"###",
		"more useless stuff here",
		"",
	], 0, context);

	expect(request).toBeDefined();
	expect(request?.method).toBe("POST");
	expect(request?.url).toBe("http://httpbin.org");
	expect(request?.body).toBe("body goes here");
});
