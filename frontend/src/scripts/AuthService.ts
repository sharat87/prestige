import m from "mithril"
import Stream from "mithril/stream"
import { authUrl } from "_/Env"

export const enum AuthState {
	PENDING,
	LOGGED_IN,
	ANONYMOUS,
}

export interface User {
	email: string
}

const AUTH_URL_BASE = authUrl()

class AuthServiceImpl {
	authState: AuthState
	currentUser: Stream<null | User>
	email: Stream<string>

	constructor() {
		this.authState = AuthState.PENDING
		// TODO: Use a non-null sentinel value for indicating anonymous user.
		this.currentUser = Stream(null)
		this.email = Stream("")

		this.currentUser.map(async (user): Promise<void> => {
			this.email(user ? user.email : "anonymous")
			m.redraw()
		})
	}

	check(): void {
		m.request<{ user: null | User }>({
			method: "GET",
			url: AUTH_URL_BASE + "profile",
			withCredentials: true,
		})
			.then(response => {
				if (response.user == null) {
					this.authState = AuthState.ANONYMOUS
					this.currentUser(null)
				} else {
					this.authState = AuthState.LOGGED_IN
					this.currentUser({
						email: response.user.email,
					})
				}
			})
			.catch(() => {
				this.authState = AuthState.ANONYMOUS
				this.currentUser(null)
			})
			.finally(m.redraw)
	}

	getAuthState(): AuthState {
		return this.authState
	}

	signup(email: string, password: string): Promise<void> {
		return this.authAction("signup", email, password)
	}

	login(email: string, password: string): Promise<void> {
		return this.authAction("login", email, password)
	}

	authAction(urlPath: string, email: string, password: string): Promise<void> {
		const prevState = this.authState
		this.authState = AuthState.PENDING

		return m.request<void>({
			method: "POST",
			url: AUTH_URL_BASE + urlPath,
			withCredentials: true,
			body: {
				email,
				password,
			},
		})
			.then(() => {
				this.authState = AuthState.LOGGED_IN
				this.currentUser({
					email,
				})
			})
			.catch(error => {
				this.authState = prevState
				return Promise.reject(error)
			})
	}

	logout(): Promise<void> {
		const prevState = this.authState
		this.authState = AuthState.PENDING

		return m.request<void>({
			method: "POST",
			url: AUTH_URL_BASE + "logout",
			withCredentials: true,
		})
			.then(() => {
				this.authState = AuthState.ANONYMOUS
				this.currentUser(null)
			})
			.catch(() => {
				this.authState = prevState
			})
	}

}

export default new AuthServiceImpl
