import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';

import {resolve} from 'path';
import fg from 'fast-glob';

const inputFiles = fg.sync(['index.html', 'pages/**/*.html'], {onlyFiles: true})
    .reduce((entries, file) => {
        const name = file.replace(/\.html$/, '').replace(/\//g, '_'); // z.B. pages/foo/bar -> pages_foo_bar
        entries[name] = resolve(__dirname, file);
        return entries;
    }, {});

export default defineConfig({
    optimizeDeps: {
        include: ['purecloud-platform-client-v2']
    },
    build: {
        rollupOptions: {
            input: inputFiles
        },
        commonjsOptions: {
            include: [/purecloud-platform-client-v2/, /node_modules/]
        },
    },
    plugins: [
        tailwindcss(),
    ]
});