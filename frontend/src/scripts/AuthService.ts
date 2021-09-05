import m from "mithril"
import Stream from "mithril/stream"
import { authUrl } from "_/Env"
import Toaster from "_/Toaster"
import { getRecaptchaSiteKey } from "_/Env"

export const enum AuthState {
	PENDING,
	LOGGED_IN,
	ANONYMOUS,
	OAUTH_WAITING,
}

export interface User {
	email: string
	isGitHubConnected: boolean
}

interface AuthMessage {
	type: "oauth"
	provider: "github"
	isApproved: boolean
	error?: string
}

const AUTH_URL_BASE = authUrl()

declare const grecaptcha: {
	enterprise: {
		ready(callback: ((nothing: unknown) => void)): void
		execute(siteKey: string, options: { action: string }): Promise<string>
	}
}

class AuthServiceImpl {
	authState: AuthState
	currentUser: Stream<null | User>
	email: Stream<string>
	oAuthWindow: null | Window

	constructor() {
		this.authState = AuthState.PENDING
		// TODO: Use a non-null sentinel value for indicating anonymous user.
		this.currentUser = Stream(null)
		this.email = Stream("")
		this.oAuthWindow = null

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
					this.currentUser(response.user)
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

	async signup(email: string, password: string): Promise<void> {
		const recaptchaSiteKey = await getRecaptchaSiteKey()
		if (typeof grecaptcha === "undefined") {
			await new Promise((resolve, reject) => {
				const s = document.createElement("script")
				s.src = "https://www.google.com/recaptcha/enterprise.js?render=" + recaptchaSiteKey
				s.onload = resolve
				s.onerror = reject
				document.body.appendChild(s)
			})
		}

		await new Promise(resolve => grecaptcha.enterprise.ready(resolve))

		let token = ""
		try {
			token = await grecaptcha.enterprise.execute(recaptchaSiteKey, { action: "SIGNUP" })
		} catch (error) {
			console.error("Error getting reCAPTCHA token", error)
			alert("Unable to do reCAPTCHA, signup failed.")
			return
		}

		return this.authAction("signup", email, password, token)
	}

	login(email: string, password: string): Promise<void> {
		return this.authAction("login", email, password)
	}

	authAction(urlPath: string, email: string, password: string, recaptchaToken: null | string = null): Promise<void> {
		const prevState = this.authState
		this.authState = AuthState.PENDING

		return m.request<{ user: null | User }>({
			method: "POST",
			url: AUTH_URL_BASE + urlPath,
			withCredentials: true,
			body: {
				email,
				password,
				recaptchaToken,
			},
		})
			.then((response) => {
				this.authState = AuthState.LOGGED_IN
				this.currentUser(response.user)
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

	startOAuth(): void {
		const prevState = this.authState
		this.authState = AuthState.OAUTH_WAITING

		if (this.oAuthWindow != null) {
			if (!this.oAuthWindow.closed) {
				this.oAuthWindow.close()
			}
			this.oAuthWindow = null
		}

		this.oAuthWindow = window.open(
			"/auth/github",
			"github-oauth",
			"menubar=no,status=no,width=600,height=500",
		)

		if (this.oAuthWindow == null) {
			alert("Unable to open OAuth popup!")
			this.authState = prevState
			return
		}

		const intervalId = setInterval(() => {
			if (this.oAuthWindow == null || this.oAuthWindow.closed) {
				this.check()
				clearInterval(intervalId)
				this.oAuthWindow = null
				m.redraw()
			}
		}, 300)

		window.addEventListener("message", messageHandler, false)

		function messageHandler(event: MessageEvent): void {
			if (event.origin !== window.location.origin) {
				console.warn("Nasty stuff alert, from '" + event.origin + "'.", event)
				return
			}
			if (!isAuthMessage(event.data)) {
				console.warn("Invalid message data, from '" + event.origin + "'.", event)
				return
			}
			const message = event.data as AuthMessage
			if (message.isApproved) {
				Toaster.push("success", "OAuth with GitHub successful.")
			} else if (message.error === "access_denied") {
				Toaster.push("danger", "OAuth with GitHub rejected. Perhaps, some other time!")
			} else {
				Toaster.push("danger", "OAuth with GitHub failed. Sorry about this.")
			}
			window.removeEventListener("message", messageHandler)
			m.redraw()
		}
	}

	focusOAuthWindow(): void {
		this.oAuthWindow?.focus()
	}

}

function isAuthMessage(object: unknown): object is AuthMessage {
	if (object == null) {
		return false
	}

	const am = object as AuthMessage
	return am.type === "oauth"
		&& am.provider === "github"
		&& typeof am.isApproved === "boolean"
		&& (am.error == null || typeof am.error === "string")
}

export default new AuthServiceImpl
