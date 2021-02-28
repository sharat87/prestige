import m from "mithril"
import HttpSession from "../scripts/HttpSession"
import CookieJar from "../scripts/CookieJar"

jest.mock("mithril")
const mockedRequestFn = m.request as jest.Mock

test("execute direct get", async () => {
	const session = new HttpSession()

	mockedRequestFn.mockResolvedValue({
		status: 200,
		statueText: "OK",
		url: "http://httpbin.org/get?first=first-value",
		headers: [],
		body: "response body",
	})
	const cookieJar = new CookieJar()

	expect(session instanceof HttpSession).toBeTruthy()

	const result = await session.execute({
		method: "GET",
		url: "http://httpbin.org/get?first=first-value",
		bodyType: "raw",
		body: "",
		headers: new Headers(),
	}, cookieJar)

	expect(mockedRequestFn).toBeCalledWith(expect.objectContaining({
		method: "GET",
		url: "http://httpbin.org/get?first=first-value",
		body: "",
		headers: {},
		withCredentials: true,
	}))

	expect(result.ok).toBeTruthy()
	if (result.ok) {
		expect(result.response.status).toEqual(200)
		expect(result.response.url).toEqual("http://httpbin.org/get?first=first-value")
		expect(result.response.body).toBe("response body")
	}
})
