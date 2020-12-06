import m from "mithril"
import Stream from "mithril/stream"
import { authUrl } from "./Env"

enum AuthState {
	PENDING,
	LOGGED_IN,
	ANONYMOUS,
}

interface User {
	email: string
}

let authState: AuthState = AuthState.PENDING
// TODO: Use a non-null sentinel value for indicating anonymous user.
const currentUser: Stream<null | User> = Stream()

const AUTH_URL_BASE = authUrl()

function check(): void {
	m.request<{ user: User }>({
		method: "GET",
		url: AUTH_URL_BASE + "profile",
		withCredentials: true,
	})
		.then(response => {
			authState = AuthState.LOGGED_IN
			currentUser({
				email: response.user.email,
			})
		})
		.catch(() => {
			authState = AuthState.ANONYMOUS
			currentUser(null)
		})
		.finally(m.redraw)
}

function getAuthState() {
	return authState
}

function signup(email: string, password: string): Promise<void> {
	const prevState = authState
	authState = AuthState.PENDING

	return m.request<{ ok: boolean, user: User }>({
		method: "POST",
		url: AUTH_URL_BASE + "signup",
		withCredentials: true,
		body: {
			email,
			password,
		},
	})
		.then(response => {
			console.log("signup response", response)
			authState = AuthState.LOGGED_IN
			currentUser({
				email: response.user.email,
			})
		})
		.catch(error => {
			console.log("profile error", error)
			authState = prevState
		})
}

function login(email: string, password: string): Promise<void> {
	const prevState = authState
	authState = AuthState.PENDING

	return m.request<{ ok: boolean, user: User }>({
		method: "POST",
		url: AUTH_URL_BASE + "login",
		withCredentials: true,
		body: {
			email,
			password,
		},
	})
		.then(response => {
			console.log("login response", response)
			authState = AuthState.LOGGED_IN
			currentUser({
				email: response.user.email,
			})
		})
		.catch(error => {
			authState = prevState
			return Promise.reject(error)
		})
}

function logout() {
	const prevState = authState
	authState = AuthState.PENDING

	m.request<void>({
		method: "POST",
		url: AUTH_URL_BASE + "logout",
		withCredentials: true,
	})
		.then(() => {
			authState = AuthState.ANONYMOUS
			currentUser(null)
		})
		.catch(() => {
			authState = prevState
		})
		.finally(m.redraw)
}

export const email: Stream<string> = Stream()
currentUser.map(async function(user): Promise<void> {
	email(user ? user.email : "anonymous")
	m.redraw()
})

export default {
	check,
	AuthState: AuthState,
	getAuthState,
	currentUser,
	signup,
	login,
	logout,
}
