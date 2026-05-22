#!/usr/bin/env node
import { main } from './index.js';

main().catch((err) => {
	console.error('\x1b[31mError:\x1b[0m', err);
	process.exit(1);
});
