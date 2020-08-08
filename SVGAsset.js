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
		const value = `
		const content = ${JSON.stringify(this.contents.trim())}, m = require("mithril");
		module.exports = { content, component: { view: () => m("span.icon", {role: "image"}, m.trust(content)) } };`;
		return [{type: this.type, value}];
	}
}
