export default {
	plugins: process.env.NODE_ENV === "development" ? [] : [
		"transform-remove-console"
	],
};
