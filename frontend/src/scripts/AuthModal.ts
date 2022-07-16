import m from "mithril"
import ModalManager from "_/ModalManager"
import Button from "_/Button"
import AuthService, { AuthState, User } from "_/AuthService"
import GitHubAuthButton from "_/GitHubAuthButton"
import * as Icons from "_/Icons"

interface InputAttrs {
	id: string;
	type?: "text" | "email" | "password";
	required?: boolean;
	minlength?: number;
}

const Input = {
	view(vnode: m.VnodeDOM<InputAttrs>) {
		return m("input.pa1.br1.ba.b--silver.bg-transparent", { type: "text", ...vnode.attrs })
	},
}

export default { view, oncreate }

interface LoginForm extends HTMLFormElement {
	loginUsername: HTMLInputElement
	loginPassword: HTMLInputElement
}

function view(): m.Children {
	const authState = AuthService.getAuthState()
	const user = AuthService.currentUser()

	if (authState === AuthState.OAUTH_WAITING) {
		return m(ModalManager.DrawerLayout, { vcenter: true }, [
			m("h1.tc", m.trust("Waiting for OAuth window to close&hellip;")),
			m("p.tc", m(
				Button,
				{ style: "primary", onclick: AuthService.focusOAuthWindow.bind(AuthService) },
				"Go to that window",
			)),
		])

	} else if (authState === AuthState.LOGGED_IN && user != null) {
		return m(ModalManager.DrawerLayout, { title: "Profile" }, m(ProfileView, { user }))

	} else if (authState === AuthState.ANONYMOUS) {
		return m(ModalManager.DrawerLayout, { title: "Login / Signup" }, m(AuthFormView))

	}

}

function oncreate(vnode: m.VnodeDOM): void {
	(vnode.dom?.querySelector("input[type=email]") as HTMLInputElement)?.focus()
}

class AuthFormView implements m.ClassComponent<never> {
	currentView: "login" | "signup" | "forgot-request"
	isSignupLoading: boolean
	signupError: m.Children

	constructor() {
		this.currentView = "login"
		this.isSignupLoading = false
		this.signupError = null
	}

	view(): m.Children {
		const onLoginSubmit = (event: Event) => {
			event.preventDefault()
			AuthService
				.login((event.target as LoginForm).loginEmail.value, (event.target as LoginForm).loginPassword.value)
				.then(ModalManager.close)
				.catch((error) => {
					console.error("Error logging in", error)
					alert("Error logging in: [" + error.code + "] " + error.message)
				})
		}

		const onSignupSubmit = (event: Event) => {
			event.preventDefault()
			this.signupError = null
			this.isSignupLoading = true

			const password = (event.target as LoginForm).signupPassword.value

			if (password !== (event.target as LoginForm).signupPasswordRepeat.value) {
				alert("The passwords don't match. Please repeat the same password and then click Sign Up.")
				return
			}

			AuthService.signup((event.target as LoginForm).signupEmail.value, password)
				.then(user => {
					console.log("User signed up", user)
					ModalManager.close()
				})
				.catch(error => {
					console.dir(error)
					console.error("Error signing up")
					const code = error?.response?.error?.code

					if (code === "email-duplicate") {
						this.signupError = [
							"There's an account with that email already. Please ",
							m(
								"a",
								{
									href: "#",
									onclick: (event1: Event) => {
										this.currentView = "login"
										event1.preventDefault()
									},
								},
								"login",
							),
							".",
						]

					} else {
						alert("Error signing up: [" + error?.code + "] " + error?.message)

					}
				})
				.finally(() => {
					this.isSignupLoading = false
				})
		}

		const onForgotPasswordSubmit = (event: Event) => {
			event.preventDefault()
			AuthService
				.forgotPasswordRequest((event.target as LoginForm).loginEmail.value)
				.then(ModalManager.close)
				.catch((error) => {
					console.error("Error logging in", error)
					alert("Error logging in: [" + error.code + "] " + error.message)
				})
		}

		return m(".auth-pane", [
			this.currentView === "login" && m("div", [ // Login form
				m(
					GitHubAuthButton,
					[m(Icons.github), "Login with GitHub"],
				),
				m("h2", "Log In"),
				m("form.grid", { onsubmit: onLoginSubmit }, [
					m("label", { for: "loginEmail" }, "Email"),
					m(Input, { id: "loginEmail", type: "email", required: true }),
					m("label", { for: "loginPassword" }, "Password"),
					m(Input, { id: "loginPassword", type: "password", required: true, minlength: 6 }),
					m("p", { style: { "grid-column-end": "span 2", textAlign: "center" } }, [
						m(Button, { style: "primary", type: "submit" }, "Log in!"),
					]),
					m(
						"a",
						{
							"href": "#",
							onclick: (event: MouseEvent) => {
								event.preventDefault()
								this.currentView = "signup"
							},
						},
						"Signup with email",
					),
					false && m(
						"a",
						{
							"href": "#",
							onclick: (event: MouseEvent) => {
								event.preventDefault()
								this.currentView = "forgot-request"
							},
						},
						"Forgot Password",
					),
				]),
			]),
			this.currentView === "signup" && m("div", [ // Signup form
				m("h2.tc.mt4", "Sign Up"),
				m("form.grid.w-60", { onsubmit: onSignupSubmit }, [
					m("label", { for: "signupEmail" }, "Email"),
					m("div", [
						m(Input, { id: "signupEmail", type: "email", required: true }),
						m(".red", this.signupError),
					]),
					m("label", { for: "signupPassword" }, "Password"),
					m(Input, { id: "signupPassword", type: "password", required: true, minlength: 6 }),
					m("label", { for: "signupPasswordRepeat" }, "Password (Repeat)"),
					m(Input, { id: "signupPasswordRepeat", type: "password", required: true, minlength: 6 }),
					m("p", { style: { "grid-column-end": "span 2", textAlign: "center" } }, [
						m(
							Button,
							{ style: "primary", type: "submit", isLoading: this.isSignupLoading },
							"Sign up!",
						),
					]),
				]),
				m(
					"a",
					{
						"href": "#",
						onclick: (event: MouseEvent) => {
							event.preventDefault()
							this.currentView = "login"
						},
					},
					"Log in",
				),
			]),
			this.currentView === "forgot-request" && m("div", [ // Forgot password form
				m("h2.tc.mt4", "Forgot Password"),
				m("form.grid.w-60", { onsubmit: onForgotPasswordSubmit }, [
					m("label", { for: "signupEmail" }, "Email"),
					m("div", [
						m(Input, { id: "signupEmail", type: "email", required: true }),
						m(".red", this.signupError),
					]),
					m("p", { style: { "grid-column-end": "span 2", textAlign: "center" } }, [
						m(
							Button,
							{ style: "primary", type: "submit", isLoading: this.isSignupLoading },
							"Send recovery code",
						),
					]),
				]),
				m(
					"a",
					{
						"href": "#",
						onclick: (event: MouseEvent) => {
							event.preventDefault()
							this.currentView = "login"
						},
					},
					"Log in",
				),
			]),
		])

	}
}

class ProfileView implements m.Component<{ user: User }> {
	view(vnode: m.Vnode<{ user: User }>): m.Children {
		const { user } = vnode.attrs
		return [
			m("p", [m("strong", "Email"), ": ", m("span.t-user-email", user.email)]),
			m("p", m(
				Button,
				{
					onclick() {
						AuthService.logout()
							.catch(error => console.log("Error logging out", error))
						// ModalManager.close()
					},
				},
				"Log out",
			)),
			m("h2", "Social Connections"),
			AuthService.isGistAvailable()
				? m("p", [m(Icons.github), "GitHub already connected."])
				: m(GitHubAuthButton, [m(Icons.github), "Connect GitHub to work with Gists"]),
		]
	}
}
