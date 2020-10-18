import { isPromise } from "../scripts/utils";

test("promise object is okayed as a promise", async () => {
	expect(isPromise(new Promise((resolve) => resolve()))).toBeTruthy();
	expect(isPromise(Promise.resolve())).toBeTruthy();
	expect(isPromise(Promise.reject())).toBeTruthy();
	expect(isPromise({ then: () => null })).toBeTruthy();

	expect(isPromise({})).toBeFalsy();
	expect(isPromise({ then: null })).toBeFalsy();
	expect(isPromise({ then: "random string value" })).toBeFalsy();
});
