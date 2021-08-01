import Context from "_/Context"
import Workspace from "_/Workspace"
import HttpSession from "_/HttpSession"
import CookieJar from "_/CookieJar"
import FileBucket from "_/FileBucket"
import Toaster from "_/Toaster"

console.log = jest.fn()

jest.mock("_/HttpSession")

beforeEach(() => {
	(HttpSession as jest.Mock).mockClear()
})

test("basic auth header generation", () => {
	const cookieJar = new CookieJar()
	const fileBucket = new FileBucket()
	const context = new Context(new Workspace(), cookieJar, fileBucket)

	expect(context.basicAuth("user", "pass"))
		.toBe("Basic dXNlcjpwYXNz")

	expect(context.basicAuth("another user", "another password"))
		.toBe("Basic YW5vdGhlciB1c2VyOmFub3RoZXIgcGFzc3dvcmQ=")
})

test("event system in contexts", () => {
	const cookieJar = new CookieJar()
	const fileBucket = new FileBucket()
	const context = new Context(new Workspace(), cookieJar, fileBucket)

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

test("multipart form", () => {
	const cookieJar = new CookieJar()
	const fileBucket = new FileBucket()
	const context = new Context(new Workspace(), cookieJar, fileBucket)

	const multipartForm = context.multipart({
		one: "value one",
		two: "value two",
	})

	expect(Array.from(multipartForm.entries())).toStrictEqual([
		["one", "value one"],
		["two", "value two"],
	])
})

test("add a toast", () => {
	const cookieJar = new CookieJar()
	const fileBucket = new FileBucket()
	const context = new Context(new Workspace(), cookieJar, fileBucket)

	context.toast("some random message")
	context.toast("error", "some error message")
	context.toast("danger", "some danger message")

	expect(Toaster.toasts.map(t => ({ type: t.type, message: t.message }))).toStrictEqual([
		{
			type: "success",
			message: "some random message",
		},
		{
			type: "danger",
			message: "some error message",
		},
		{
			type: "danger",
			message: "some danger message",
		},
	])
})
