/**
 * A Parcel Plugin to import SVG files as Mithril components.
 */

const { Asset } = require("parcel-bundler");

module.exports = class SVGAsset extends Asset {
	constructor(name, options) {
		super(name, options);
		this.type = "js";
	}

	async generate() {
		this.addDependency("mithril");
		return [
			{
				type: "js",
				value: `const icon = require("mithril").trust(${JSON.stringify(this.contents)}); module.exports = { view: () => icon };`,
			},
		];
	}
}
