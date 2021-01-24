import type { VnodeDOM } from "mithril"
import m from "mithril"
import Modal from "./Modal"
import Button from "./Button"
import AuthController from "./AuthService"

interface InputAttrs {
	id: string;
	type?: "text" | "email" | "password";
	required?: boolean;
	minlength?: number;
}

const Input = {
	view(vnode: VnodeDOM<InputAttrs>) {
		return m("input.pa1.br1.ba.b--silver.bg-transparent", { type: "text", ...vnode.attrs })
	},
}

export default function (initialVnode: VnodeDOM<{ onClose: (event?: Event) => void }>): m.Component {
	const { onClose } = initialVnode.attrs

	return { view, oncreate }

	function view() {
		return m(
			Modal,
			{
				title: "LogIn / SignUp",
				footer: [
					m(Button, { onclick: onClose }, "Close"),
				],
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
	}

	function oncreate(vnode: VnodeDOM) {
		(vnode.dom?.querySelector("input[type=email]") as HTMLInputElement)?.focus()
	}

	function onLoginSubmit(event: Event) {
		event.preventDefault()
		AuthController.login((event.target as any).loginEmail.value, (event.target as any).loginPassword.value)
			.then(() => onClose())
			.catch(error => {
				console.error("Error logging in", error)
				alert("Error logging in: [" + error.code + "] " + error.message)
			})
	}

	function onSignupSubmit(event: Event) {
		event.preventDefault()

		const password = (event.target as any).signupPassword.value

		if (password !== (event.target as any).signupPasswordRepeat.value) {
			alert("The passwords don't match. Please repeat the same password and then click Sign Up.")
			return
		}

		AuthController.signup((event.target as any).signupEmail.value, password)
			.then(user => {
				console.log("User signed up", user)
				onClose()
			})
			.catch(error => {
				console.error("Error signing up", error)
				alert("Error signing up: [" + error.code + "] " + error.message)
			})
	}

}
