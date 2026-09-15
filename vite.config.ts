import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version-plugin',
    // In dev mode, serve /sw.js with dynamic build timestamp
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/sw.js' || req.url === '/sw.js/') {
          try {
            const swPath = path.resolve(__dirname, 'public/sw.js');
            if (fs.existsSync(swPath)) {
              let content = fs.readFileSync(swPath, 'utf-8');
              const devVersion = `dev-${Date.now()}`;
              content = content.replace(/__SW_BUILD_VERSION__/g, devVersion);
              res.setHeader('Content-Type', 'text/javascript');
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
              res.end(content);
              return;
            }
          } catch {
            // fall through to default static middleware
          }
        }
        next();
      });
    },
    // In production build, replace the placeholder in dist/sw.js
    closeBundle() {
      try {
        const distSwPath = path.resolve(__dirname, 'dist/sw.js');
        if (fs.existsSync(distSwPath)) {
          let content = fs.readFileSync(distSwPath, 'utf-8');
          const buildVersion = `v-${Date.now()}`;
          content = content.replace(/__SW_BUILD_VERSION__/g, buildVersion);
          fs.writeFileSync(distSwPath, content, 'utf-8');
          console.log(`[sw-version-plugin] Injected SW version: ${buildVersion}`);
        }
      } catch (err) {
        console.error('[sw-version-plugin] Error injecting SW version:', err);
      }
    }
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), swVersionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
