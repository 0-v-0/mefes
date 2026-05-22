import { defineConfig, presetAttributify, presetMini } from 'unocss'
import { presetDaisy } from 'unocss-preset-daisyui-next'

export default defineConfig({
	content: {
		filesystem: ['public/*.html'],
	},
	preflights: [],
	presets: [
		presetAttributify(),
		presetMini({
			dark: 'media',
			preflight: 'on-demand',
			variablePrefix: 'u-',
		}),
		presetDaisy({
			base: false,
			themes: false,
			utils: true,
		})
	],
})
