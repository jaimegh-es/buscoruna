// @ts-check
import { defineConfig } from 'astro/config';
import { VitePWA } from 'vite-plugin-pwa';

// Import Cloudflare adapter for Cloudflare deployment
// Importar el adaptador de Cloudflare para el despliegue en Cloudflare
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  devToolbar: {
    enabled: false,
  },
  vite: {
    server: {
      watch: {
        ignored: [
          '**/android/**',
          '**/dist/**',
          '**/.git/**',
          '**/scripts/**',
          '**/.gradle/**',
        ],
      },
    },
    // Capacitor plugins use the native bridge at runtime and must not be
    // pre-bundled by Vite's dep optimizer (stale cache after plugin changes
    // breaks the whole app).
    // Los plugins de Capacitor usan el bridge nativo y Vite no debe
    // pre-bundlearlos (un caché obsoleto tras cambiar plugins rompe la app).
    optimizeDeps: {
      exclude: [
        '@capacitor/core',
        '@capacitor/local-notifications',
        '@capacitor/preferences',
        '@capacitor/filesystem',
        '@capacitor/app',
        'lucide',
      ],
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Coruña Bus',
          short_name: 'Coruña Bus',
          description: 'Buses de A Coruña en tiempo real',
          theme_color: '#f44336',
          background_color: '#f5f5f7',
          display: 'standalone',
          lang: 'es',
          scope: '/',
          start_url: '/',
          id: '/',
          orientation: 'portrait-primary',
          categories: ['transportation', 'navigation', 'travel'],
          prefer_related_applications: false,
          icons: [
            {
              src: 'logo.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })
    ]
  },

  // Use Cloudflare adapter for runtime
  // Usar el adaptador de Cloudflare para la ejecución
  adapter: cloudflare()
});