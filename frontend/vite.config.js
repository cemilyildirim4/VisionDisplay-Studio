import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'masaustu-logo-isaret.png'],
      manifest: {
        name: 'Masaüstü LED Ekran Konfigüratörü',
        short_name: 'LED Konfigüratör',
        description: 'LED video duvarı boyutlandırma, fiyatlandırma ve 3D önizleme aracı',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/masaustu-logo-isaret.png', sizes: '192x192', type: 'image/png' },
          { src: '/masaustu-logo-isaret.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Büyük video/görsel örnekleri VE isteğe bağlı yüklenen 3D/AR paketini
        // (three.js, drei, model-viewer — draco/basis decoder'ları da içeriyor)
        // önbellek manifestine dahil etme; bunlar yalnızca "3D Görünüm"
        // açıldığında ağdan çekilir ve runtimeCaching kuralıyla o an cache'e
        // girer. Böylece uygulamayı hiç açmayan/3D kullanmayan kullanıcı bu
        // ~1.3 MB'lık paketi hiç indirmez.
        globPatterns: ['**/*.{js,css,html,svg,ico}'],
        globIgnores: [
          '**/sample-video.mp4',
          '**/model-viewer-*.js',
          '**/Scene3D-*.js',
        ],
        runtimeCaching: [
          {
            // API yanıtları: önce ağdan dene (StaleWhileRevalidate), yoksa cache'ten göster.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: ({ request }) => ['image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'asset-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // 3D/AR bileşenleri ilk kullanımdan sonra cache'lenir — ikinci açılış anında.
            urlPattern: ({ url }) => /(model-viewer-|Scene3D-)/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'scene3d-vendor-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 90 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    // Adres her zaman http://localhost:5173 olsun (yer imine eklenebilsin).
    // strictPort: port doluysa başka porta kaymak yerine hata versin —
    // böylece yanlışlıkla ikinci bir sunucu başlatılmış olmaz.
    port: 5173,
    strictPort: true,
  },
})
