import { isPromise } from "../scripts/utils"

test("promise object is okayed as a promise", async () => {
	expect(isPromise(new Promise((resolve) => resolve(void 0)))).toBeTruthy()
	expect(isPromise(Promise.resolve())).toBeTruthy()
	// In the below assertion, we catch the rejection to avoid Node's uncaught rejections warning.
	expect(isPromise(Promise.reject().catch(() => void 0))).toBeTruthy()
	expect(isPromise({ then: () => null })).toBeTruthy()

	expect(isPromise({})).toBeFalsy()
	expect(isPromise({ then: null })).toBeFalsy()
	expect(isPromise({ then: "random string value" })).toBeFalsy()
})
