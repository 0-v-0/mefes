/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import htmlMinifier from 'vite-plugin-html-minifier'
import UnoCSS from 'unocss/vite'

export default defineConfig({
	build: {
		modulePreload: false,
	},
	plugins: [UnoCSS(), htmlMinifier()],
	resolve: {
		extensions: ['.ts', '.js'],
	},
})
