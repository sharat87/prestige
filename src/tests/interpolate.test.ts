import interpolate from "../scripts/interpolate";

test("access context from this", async () => {
	expect(interpolate(
		"Hello ${ this.greeting }",
		{ greeting: "abc" }
	)).toBe("Hello abc");
});

test("data properties in scope", async () => {
	expect(interpolate(
		"Hello ${ x } and ${ y.d }",
		{ data: { x: "abc", y: { d: 42 } } }
	)).toBe("Hello abc and 42");
});

test("nested template strings", async () => {
	expect(interpolate(
		"Hello ${ `[${this.greeting}]` }",
		{ greeting: "abc" }
	)).toBe("Hello [abc]");
});
