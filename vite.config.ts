import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'serve-downloads',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url.startsWith('/download/') || req.url.endsWith('.apk') || req.url.endsWith('.exe') || req.url.endsWith('.deb') || req.url.endsWith('.zip'))) {
              const urlParts = req.url.split('?')[0].split('/');
              const filename = urlParts[urlParts.length - 1];
              if (filename) {
                const candidates = [
                  path.resolve(__dirname, 'public/download', filename),
                  path.resolve(__dirname, 'public', filename)
                ];
                for (const filePath of candidates) {
                  if (fs.existsSync(filePath)) {
                    const stat = fs.statSync(filePath);
                    let contentType = 'application/octet-stream';
                    if (filename.endsWith('.apk')) contentType = 'application/vnd.android.package-archive';
                    else if (filename.endsWith('.deb')) contentType = 'application/vnd.debian.binary-package';
                    else if (filename.endsWith('.exe')) contentType = 'application/vnd.microsoft.portable-executable';
                    else if (filename.endsWith('.zip')) contentType = 'application/zip';

                    res.writeHead(200, {
                      'Content-Type': contentType,
                      'Content-Length': stat.size,
                      'Content-Disposition': `attachment; filename="${filename}"`,
                      'Cache-Control': 'no-cache, no-store, must-revalidate',
                      'Pragma': 'no-cache',
                      'Expires': '0'
                    });
                    fs.createReadStream(filePath).pipe(res);
                    return;
                  }
                }
              }
            }
            next();
          });
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'StockSync - Kiểm Tra Xác LK',
          short_name: 'StockSync',
          description: 'Ứng dụng kiểm kê và đối chiếu xác linh kiện kho',
          theme_color: '#2563eb',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          prefer_related_applications: false,
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
