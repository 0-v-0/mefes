/*!
 * mefes v0.0.3
 */
'use strict';

import { build } from 'esbuild';
import { writeFile } from 'fs/promises';
import { stylusLoader } from 'esbuild-stylus-loader';

const bundle = (options = {}) => build({
	bundle: true,
	write: false,
	...options
}),
	terser = (code, options = {}) => {
		const { minify } = require('terser');
		return minify(code, {
			ecma: 2020,
			compress: {
				ecma: 2020,
				passes: 3,
				unsafe: true,
				unsafe_arrows: true,
				unsafe_comps: true,
				unsafe_Function: true,
				unsafe_math: true,
				unsafe_methods: true,
				unsafe_proto: true,
				unsafe_regexp: true,
				unsafe_undefined: true
			},
			...options.terser
		})
	},
	buildCSS = (options = {}) => {
		let opt = {
			includeCss: true,
			use: [],
			...options.stylus
		};
		if (options.postcss) {
			const poststylus = require('poststylus');
			opt.use.push(poststylus(options.postcss));
		}

		let css = bundle({
			plugins: [stylusLoader({ stylusOptions: opt })],
			...options.esbuild
		}).then(result => result.outputFiles),
			cleanCSS = options.cleanCSS && new require('clean-css')(options.cleanCSS);

		return cleanCSS ? css.then(files => Promise.all(
			files.map(file => (/\.css$/.test(file.path) ? {
				path: file.path,
				text: cleanCSS.minify(file.text).styles
			} : file))
		)) : css;
	},
	buildJS = async (options = {}) => {
		const result = await bundle({
			target: 'es2020',
			drop: ['console'],
			minify: true,
			...options.esbuild
		}),
			code = {},
			output = [];
		for (let file of result.outputFiles) {
			const { path, contents } = file;
			if (/\.js$/.test(path))
				code[path] = file.text;
			else
				output.push({ path, contents });
		}
		output.push({
			path: options.esbuild.outfile,
			text: (await terser(code)).code
		});
		return output;
	},
	compileTS = (options = {}) => bundle({
		target: 'es2020',
		write: true,
		...options
	}),
	runTask = (tasks, defaultTask) => {
		// TODO: Better report
		const start = +new Date,
			arg = process.argv[2] || defaultTask,
			task = tasks[arg];
		if (!task)
			throw new Error(`Unknown argument '${arg}'`);
		console.log(`Starting '${arg}' ...`);
		return task().then(() => console.log(`Finished '${arg}' after ${+new Date - start} ms`));
	},
	write = files => files.map(file => writeFile(file.path, file.contents || file.text));

export {
	buildCSS,
	buildJS,
	bundle,
	terser,
	compileTS,
	runTask,
	write
};
