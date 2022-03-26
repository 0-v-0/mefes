# mefes
Modern Esbuild FrontEnd Scaffold

一个基于 esbuild 的现代前端开发脚手架

# Usage
build.js
```js
const { buildCSS, compileTS, runTask, write } = require('mefes'),
	ts = options => compileTS({ entryPoints: ['main.ts'], outdir: '.', ...options }),
	css = options => buildCSS({
		esbuild: {
			entryPoints: ['main.styl'],
			sourcemap: 'external',
			outfile: 'main.css'
		},
		...options
	}).then(write);

runTask({
	compile: () => Promise.all([css(), ts()]),
	css,
	ts,
}, "compile");
```

build:
```sh
node build
```