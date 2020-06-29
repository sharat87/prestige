module.exports = {
	plugins: {
		"posthtml-expressions": {
			locals: {
				isDev: process.env.NODE_ENV === "development",
			},
		},
	},
};
