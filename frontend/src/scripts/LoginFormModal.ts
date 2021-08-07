import m from "mithril"
import ModalManager from "_/ModalManager"
import Button from "_/Button"
import AuthService from "_/AuthService"
import { AuthState } from "_/AuthService"

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
	console.log("login form view")
	const authState = AuthService.getAuthState()
	if (authState === AuthState.LOGGED_IN) {
		return m(ProfileView)
	} else if (authState === AuthState.ANONYMOUS) {
		return m(LoginFormView)
	}
}

function oncreate(vnode: m.VnodeDOM): void {
	(vnode.dom?.querySelector("input[type=email]") as HTMLInputElement)?.focus()
}

class LoginFormView implements m.Component {
	view(): m.Children {
		return m(
			ModalManager.DrawerLayout,
			{
				title: "LogIn / SignUp",
			},
			[
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
				m("h2.tc.mt4", "Sign Up"),
				m("form.grid.w-60", { onsubmit: onSignupSubmit }, [
					m("label", { for: "signupEmail" }, "Email"),
					m(Input, { id: "signupEmail", type: "email", required: true }),
					m("label", { for: "signupPassword" }, "Password"),
					m(Input, { id: "signupPassword", type: "password", required: true, minlength: 6 }),
					m("label", { for: "signupPasswordRepeat" }, "Password (Repeat)"),
					m(Input, { id: "signupPasswordRepeat", type: "password", required: true, minlength: 6 }),
					m("p", { style: { "grid-column-end": "span 2", textAlign: "center" } }, [
						m(Button, { style: "primary", type: "submit" }, "Sign up!"),
					]),
				]),
			],
		)

		function onLoginSubmit(event: Event) {
			event.preventDefault()
			AuthService
				.login((event.target as LoginForm).loginEmail.value, (event.target as LoginForm).loginPassword.value)
				.then(ModalManager.close)
				.catch(error => {
					console.error("Error logging in", error)
					alert("Error logging in: [" + error.code + "] " + error.message)
				})
		}

		function onSignupSubmit(event: Event) {
			event.preventDefault()

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
					console.error("Error signing up", error)
					alert("Error signing up: [" + error.code + "] " + error.message)
				})
		}

	}
}

class ProfileView implements m.Component {
	isGithubOauthWindowOpen: boolean

	constructor() {
		this.isGithubOauthWindowOpen = false
	}

	view() {
		return m(
			ModalManager.DrawerLayout,
			{
				title: "User Profile",
			},
			[
				m("p", [m("strong", "Email"), ": ", AuthService.email()]),
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
				m(
					Button,
					{
						disabled: this.isGithubOauthWindowOpen,
						onclick() {
							const oauthWindow = window.open(
								"/accounts/github/login/?process=connect",
								"github-oauth",
								"menubar=no,status=no,width=600,height=500",
							)
							if (oauthWindow != null) {
								this.isGithubOauthWindowOpen = true
								const intervalId = setInterval(() => {
									if (oauthWindow.closed) {
										clearInterval(intervalId)
										this.isGithubOauthWindowOpen = false
										m.redraw()
									}
								}, 300)
							}
						},
					},
					"GitHub",
				),
			],
		)
	}
}
