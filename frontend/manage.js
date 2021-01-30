/**
 * A Parcel based project build script.
 */

/* global require, process */
/* eslint-disable @typescript-eslint/no-var-requires */

const Bundler = require("parcel-bundler")
const fs = require("fs")

const job = process.argv[2]

process.env.NODE_ENV = process.env.NODE_ENV || (job === "build" ? "production" : "development")
const isProduction = process.env.NODE_ENV === "production"

if (fs.existsSync("private-env.txt")) {
	const envContents = fs.readFileSync("private-env.txt", { encoding: "utf8" })

	for (const line of envContents.split("\n")) {
		const strippedLine = line.trim()

		if (strippedLine.length === 0 || strippedLine.startsWith("#")) {
			continue
		}

		const [name, ...value] = strippedLine.split("=")
		process.env[name.trim()] = value.join("=").trim()
	}
}

if (!process.env.PRESTIGE_BACKEND) {
	process.env.PRESTIGE_BACKEND = isProduction ? "/api" : "http://localhost:3041"
}

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled rejection at: Promise:", promise, "  reason:", reason)
})

const outDir = job === "serve" ? "./dist-serve" : "./dist"
const cacheDir = "./.cache"

fs.rmdirSync(outDir, { recursive: true })
fs.rmdirSync(cacheDir, { recursive: true })

const bundler = new Bundler(["src/index.pug", "src/help.pug"], {
	outDir,
	cacheDir,
	cache: !isProduction,
	autoInstall: false,
	sourceMaps: !isProduction,
	minify: true,
	logLevel: isProduction ? 4 : 3,
	detailedReport: true,
})

bundler.addAssetType("svg", require.resolve("./SVGAsset"))

if (job === "build") {
	bundler.on("buildEnd", () => {
		console.log("Fin")
		process.exit()
	})
	bundler.bundle()

} else if (job === "serve") {
	bundler.serve(parseInt(process.env.PORT || "3040", 10), /*HTTPS = */ false, "localhost")

} else {
	console.log("Unknown job: ", job)

}
