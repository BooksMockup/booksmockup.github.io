import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function syncRootAssetsAndStaticBuild() {
  return {
    name: 'sync-root-assets-and-static-build',
    buildStart() {
      const rootHeader = path.resolve(__dirname, 'header.png');
      const publicHeader = path.resolve(__dirname, 'public', 'header.png');
      if (fs.existsSync(rootHeader)) {
        fs.mkdirSync(path.dirname(publicHeader), {recursive: true});
        fs.copyFileSync(rootHeader, publicHeader);
      }
    },
    closeBundle() {
      try {
        const distAssetsDir = path.resolve(__dirname, 'dist', 'assets');
        if (!fs.existsSync(distAssetsDir)) return;
        const files = fs.readdirSync(distAssetsDir);
        const jsFile = files.find((f) => f.endsWith('.js'));
        const cssFile = files.find((f) => f.endsWith('.css'));
        for (const target of ['static-build', path.join('public', 'static-build')]) {
          const outDir = path.resolve(__dirname, target);
          fs.mkdirSync(outDir, {recursive: true});
          if (jsFile) {
            fs.copyFileSync(path.join(distAssetsDir, jsFile), path.join(outDir, 'app.js'));
          }
          if (cssFile) {
            fs.copyFileSync(path.join(distAssetsDir, cssFile), path.join(outDir, 'app.css'));
          }
        }
      } catch {
        // Ignore post-build copy errors
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), syncRootAssetsAndStaticBuild()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
