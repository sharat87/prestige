module.exports = {
	plugins: {
		"posthtml-expressions": {
			delimiters: ["{%", "%}"],
			locals: {
				NODE_ENV: process.env.NODE_ENV,
			},
		},
	},
}
