import m from "mithril"
import ModalManager from "_/ModalManager"
import Button from "_/Button"
import AuthService from "_/AuthService"
import { AuthState, User } from "_/AuthService"
import GitHubAuthButton from "_/GitHubAuthButton"

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
		return m(ModalManager.DrawerLayout, { title: "Login / Signup" }, m(LoginFormView))

	}

}

function oncreate(vnode: m.VnodeDOM): void {
	(vnode.dom?.querySelector("input[type=email]") as HTMLInputElement)?.focus()
}

class LoginFormView implements m.ClassComponent<never> {
	isLogin: boolean
	isSignupLoading: boolean
	signupError: m.Children

	constructor() {
		this.isLogin = true
		this.isSignupLoading = false
		this.signupError = null
	}

	view(): m.Children {
		const onLoginSubmit = (event: Event) => {
			event.preventDefault()
			AuthService
				.login((event.target as LoginForm).loginEmail.value, (event.target as LoginForm).loginPassword.value)
				.then(ModalManager.close)
				.catch(error => {
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
										this.isLogin = true
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

		return m(".auth-pane", [
			m(".auth-options", [
				m(
					Button,
					{
						style: this.isLogin ? "primary" : null,
						onclick: () => {
							this.isLogin = true
						},
					},
					"Login with email",
				),
				m(
					Button,
					{
						style: !this.isLogin ? "primary" : null,
						onclick: () => {
							this.isLogin = false
						},
					},
					"Signup with email",
				),
				m(
					GitHubAuthButton,
					"Login with GitHub",
				),
			]),
			this.isLogin
				? m("div", [ // Login form
					m("h2.tc", "Log In"),
					m("form.grid.w-60", { onsubmit: onLoginSubmit }, [
						m("label", { for: "loginEmail" }, "Email"),
						m(Input, { id: "loginEmail", type: "email", required: true }),
						m("label", { for: "loginPassword" }, "Password"),
						m(Input, { id: "loginPassword", type: "password", required: true, minlength: 6 }),
						m("p", { style: { "grid-column-end": "span 2", textAlign: "center" } }, [
							m(Button, { style: "primary", type: "submit" }, "Log in!"),
						]),
					]),
				])
				: m("div", [ // Signup form
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
						// ModalManager.close()
					},
				},
				"Log out",
			)),
			m("h2", "Social Connections"),
			AuthService.isGistAvailable()
				? m("p", "GitHub already connected.")
				: m(GitHubAuthButton, "Connect GitHub to work with Gists"),
		]
	}
}
