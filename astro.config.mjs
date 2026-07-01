// @ts-check
import { defineConfig } from 'astro/config';
import { VitePWA } from 'vite-plugin-pwa';

// Import Cloudflare adapter for Cloudflare deployment
// Importar el adaptador de Cloudflare para el despliegue en Cloudflare
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
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