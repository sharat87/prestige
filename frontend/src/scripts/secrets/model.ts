export default class SecretsPack {
	currentEnv: string
	configStr: string

	constructor() {
		this.currentEnv = ""
		this.configStr = ""
	}

	getEnvNames() {
		return [
			"dev",
			"staging",
			"prod",
		]
	}

}
