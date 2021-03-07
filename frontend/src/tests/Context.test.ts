import { makeContext } from "../scripts/Context"
import Workspace from "../scripts/Workspace"
import HttpSession from "../scripts/HttpSession"
import CookieJar from "../scripts/CookieJar"
import FileBucket from "../scripts/FileBucket"

console.log = jest.fn()

jest.mock("../scripts/HttpSession")

beforeEach(() => {
	(HttpSession as jest.Mock).mockClear()
})

test("basic auth header generation", () => {
	const cookieJar = new CookieJar()
	const fileBucket = new FileBucket()
	const context = makeContext(new Workspace(), cookieJar, fileBucket)

	expect(context.authHeader("user", "pass"))
		.toBe("Authorization: Basic dXNlcjpwYXNz")

	expect(context.authHeader("another user", "another password"))
		.toBe("Authorization: Basic YW5vdGhlciB1c2VyOmFub3RoZXIgcGFzc3dvcmQ=")
})

test("event system in contexts", () => {
	const cookieJar = new CookieJar()
	const fileBucket = new FileBucket()
	const context = makeContext(new Workspace(), cookieJar, fileBucket)

	const fn1 = jest.fn()
	const fn2 = jest.fn()
	const fn3 = jest.fn()

	context.on("one", fn1)
	context.on("one", fn2)
	context.on("one", fn3)
	context.on("two", fn3)
	context.emit("one", null)
	expect(fn1).toBeCalledTimes(1)
	expect(fn2).toBeCalledTimes(1)
	expect(fn3).toBeCalledTimes(1)

	context.off("one", fn1)
	context.on("one", fn3)
	context.emit("one", null)
	expect(fn1).toBeCalledTimes(1)
	expect(fn2).toBeCalledTimes(2)
	expect(fn3).toBeCalledTimes(2)
})
