import { extractRequest } from "../scripts/Parser";
import { makeMockContext } from "./utils";

test("single line input with one request", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"GET http://httpbin.org",
	], 0, context);

	expect(request).toBeDefined();
	expect(request!.method).toBe("GET");
	expect(request!.url).toBe("http://httpbin.org");
});

test("get request on first and only non-blank line", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"GET http://httpbin.org",
		"",
	], 0, context);

	expect(request).toBeDefined();
	expect(request!.method).toBe("GET");
	expect(request!.url).toBe("http://httpbin.org");
});

test("get request with blank lines around", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"",
		"GET http://httpbin.org",
		"",
	], 1, context);

	expect(request).toBeDefined();
	expect(request!.method).toBe("GET");
	expect(request!.url).toBe("http://httpbin.org");
});

test("post request with one line body", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"POST http://httpbin.org",
		"",
		"body goes here",
	], 0, context);

	expect(request).toBeDefined();
	expect(request!.method).toBe("POST");
	expect(request!.url).toBe("http://httpbin.org");
	expect(request!.body).toBe("body goes here");
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
	expect(request!.method).toBe("POST");
	expect(request!.url).toBe("http://httpbin.org");
	expect(request!.body).toBe("body goes here");
});

test("pokemon graphql", async () => {
	const context = makeMockContext();

	const queryText = "query {\n" +
		"  pokemon(name: \"Pikachu\") {\n" +
		"    id\n" +
		"    number\n" +
		"    name\n" +
		"    attacks {\n" +
		"      special {\n" +
		"        name\n" +
		"        type\n" +
		"        damage\n" +
		"      }\n" +
		"      fast {\n" +
		"        name\n" +
		"        type\n" +
		"        damage\n" +
		"      }\n" +
		"    }\n" +
		"    evolutions {\n" +
		"      id\n" +
		"      number\n" +
		"      name\n" +
		"      attacks {\n" +
		"        fast {\n" +
		"          name\n" +
		"          type\n" +
		"          damage\n" +
		"        }\n" +
		"      }\n" +
		"    }\n" +
		"  }\n" +
		"}";

	const request = await extractRequest([
		"POST https://graphql-pokemon.now.sh/",
		"Content-Type: application/graphql",
		"",
		queryText,
	], 0, context);

	expect(request).toBeDefined();
	expect(request!.method).toBe("POST");
	expect(request!.url).toBe("https://graphql-pokemon.now.sh/");
	expect(Array.from(request!.headers)).toEqual([["content-type", "application/graphql"]]);
	expect(request!.body).toBe(queryText);
});

test("slack post message", async () => {
	const context = makeMockContext();

	const request = await extractRequest([
		"POST https://slack.com/api/chat.postMessage",
		"Content-Type: application/json; charset=UTF-8",
		"Authorization: Bearer token",
		"",
		JSON.stringify({
			channel: "#general",
			text: "A message from the API!",
		}),
	], 0, context);

	expect(request).toBeDefined();
	expect(request!.method).toBe("POST");
	expect(request!.url).toBe("https://slack.com/api/chat.postMessage");
	expect(Array.from(request!.headers)).toEqual([
		["authorization", "Bearer token"],
		["content-type", "application/json; charset=UTF-8"],
	]);
	expect(request!.body).toBe("{\"channel\":\"#general\",\"text\":\"A message from the API!\"}");
});
