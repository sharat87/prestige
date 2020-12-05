import gulp from "gulp";
import { rollup } from "rollup";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import rollupTypescript from "@rollup/plugin-typescript";
import rollupJson from "@rollup/plugin-json";
import {terser} from "rollup-plugin-terser";
import visualizer from "rollup-plugin-visualizer";

gulp.task('build', async function () {
	const bundle = await rollup({
		input: './src/scripts/main.ts',
		plugins: [
			rollupTypescript(),
			resolve(),
			rollupJson(),
			svgResolverPlugin(),
			ignoredImports(),
			commonjs(),
			terser(),
			visualizer({
				filename: "dist2/stats.html",
			}),
		],
	});

	await bundle.write({
		file: './dist2/main.js',
		format: 'iife',
		name: 'PrestigeMain',
		sourcemap: true
	});
});

function svgResolverPlugin() {
	return {
		resolveId(source, importer) {
			if (source.endsWith('.svg')) {
				return path.resolve(path.dirname(importer), source);
			}
		},
		transform(code, id) {
			if (id.endsWith('.svg')) {
				return {
					code: `export default ${JSON.stringify(code)};`,
					map: {
						mappings: "",
					},
				};
			}
		}
	};
}

function ignoredImports() {
	return {
		transform(code, id) {
			if (id.endsWith(".css")) {
				return {
					code: "",
					map: null
				};
			}
		}
	};
}
