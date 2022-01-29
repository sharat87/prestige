import m from "mithril"
import Button from "_/Button"
import AuthService from "_/AuthService"

export default {
	view(vnode: m.Vnode) {
		return m(
			Button,
			{
				class: "t-github-auth-btn",
				onclick() {
					AuthService.startOAuth()
				},
			},
			vnode.children ?? "GitHub",
		)
	},
}
