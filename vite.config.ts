import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
    build: {
        lib: {
            entry: {
                bin: resolve(__dirname, 'src/bin.ts'),
                index: resolve(__dirname, 'src/index.ts'),
            },
            formats: ['es'],
        },
        outDir: 'dist',
        rolldownOptions: {
            external: [/node:.*/],
        },
        minify: false,
        ssr: true,
    },
});
