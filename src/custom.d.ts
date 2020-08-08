import m from "mithril";

declare module "*.svg" {
	const content: string;
	const component: m.Component;
}
