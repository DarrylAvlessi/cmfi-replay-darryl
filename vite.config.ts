import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        tailwindcss(),
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
            navigateFallback: '/index.html',
            navigateFallbackAllowlist: [/^(?!\/__)/],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'firestore-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)(?:\?.*)?$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'images-cache',
                  expiration: {
                    maxEntries: 60,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                  },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'fonts-cache',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 365 * 24 * 60 * 60,
                  },
                },
              },
            ],
          },
          manifest: {
            name: 'CMFI Replay',
            short_name: 'CMFI Replay',
            lang: 'fr',
            description: 'Replay application for CMFI',
            theme_color: '#ffffff',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      build: {
        rollupOptions: {
          output: {
            entryFileNames: 'assets/[name].[hash].js',
            chunkFileNames: 'assets/[name].[hash].js',
            assetFileNames: 'assets/[name].[hash].[ext]',
            manualChunks: {
              'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-ui': ['recharts', 'react-toastify'],
            }
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
