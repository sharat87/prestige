import Mithril from "mithril";

declare module "*.svg" {
	const content: Mithril.Component;
	export default content;
}
