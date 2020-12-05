import { makeContext } from "../scripts/Context"
import HttpSession from "../scripts/HttpSession"

jest.mock("../scripts/HttpSession")

beforeEach(() => {
	(HttpSession as jest.Mock).mockClear()
})

test("basic auth header generation", () => {
	const context = makeContext(new HttpSession())

	expect(context.authHeader("user", "pass"))
		.toBe("Authorization: Basic dXNlcjpwYXNz")

	expect(context.authHeader("another user", "another password"))
		.toBe("Authorization: Basic YW5vdGhlciB1c2VyOmFub3RoZXIgcGFzc3dvcmQ=")
})

test("event system in contexts", () => {
	const context = makeContext(new HttpSession())

	const fn1 = jest.fn()
	const fn2 = jest.fn()
	const fn3 = jest.fn()

	context.on("one", fn1)
	context.on("one", fn2)
	context.on("one", fn3)
	context.on("two", fn3)
	context.emit("one")
	expect(fn1).toBeCalledTimes(1)
	expect(fn2).toBeCalledTimes(1)
	expect(fn3).toBeCalledTimes(1)

	context.off("one", fn1)
	context.on("one", fn3)
	context.emit("one")
	expect(fn1).toBeCalledTimes(1)
	expect(fn2).toBeCalledTimes(2)
	expect(fn3).toBeCalledTimes(2)
})
