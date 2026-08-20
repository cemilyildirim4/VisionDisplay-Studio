import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /*
     * Geliştirmede leftover production SW'yi öldür.
     *
     * docker compose frontend de 5173'ü kullanıyor ve orada PWA service
     * worker kaydı oluşuyor. Aynı origin'de `npm run dev` açılınca tarayıcı
     * hâlâ o SW'yi çalıştırıyor; `/src/main.jsx` gibi Vite yollarını
     * kesiyor ve sayfa boş kalıyor. Bu middleware /sw.js isteğine
     * kendini silen bir SW verir — bir sonraki yüklemede kayıt düşer.
     */
    {
      name: 'kill-production-sw-in-dev',
      configureServer(server) {
        const killSw = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
`
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split('?')[0]
          if (url === '/sw.js' || url === '/registerSW.js') {
            res.setHeader('Content-Type', 'application/javascript')
            res.setHeader('Cache-Control', 'no-store')
            res.end(killSw)
            return
          }
          next()
        })
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-192.png', 'logo-512.png', 'masaustu-logo-isaret.png'],
      manifest: {
        name: 'Masaüstü LED Ekran Konfigüratörü',
        short_name: 'LED Konfigüratör',
        description: 'LED video duvarı boyutlandırma, fiyatlandırma ve 3D önizleme aracı',
        theme_color: '#2962ad',
        background_color: '#0b0f16',
        display: 'standalone',
        start_url: '/',
        /*
          Şeffaf PNG ikonlar (kare, logo ortalanmış). Eski favicon.svg'nin siyah
          arka planı vardı; ayrıca manifestte 192/512 olarak gösterilen dosya
          aslında 384x315'ti — beyan edilen ölçüyle uyuşmuyordu.
        */
        icons: [
          { src: '/logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
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
          // Admin paneli müşteri SW kurulumunda indirilmesin.
          '**/admin-*.js',
          '**/AdminPanel-*.js',
        ],
        runtimeCaching: [
          {
            // API: her zaman ağı tercih et; kısa süreli 503'lerde eski cache yanıltmasın.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 },
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
          {
            // Admin chunk yalnızca #yonetim açıldığında gelir; o zaman cache'lenir.
            urlPattern: ({ url }) => /(^|\/)admin[-.]/.test(url.pathname) || /AdminPanel-/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'admin-chunk-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 90 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Admin async chunk'ını giriş HTML'ine modulepreload olarak ekleme.
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter(
          (dep) => !/(^|\/)admin[-.]/.test(dep) && !/AdminPanel-/.test(dep),
        )
      },
    },
  },
  server: {
    // Adres her zaman http://localhost:5173 olsun (yer imine eklenebilsin).
    // strictPort: port doluysa başka porta kaymak yerine hata versin —
    // böylece yanlışlıkla ikinci bir sunucu başlatılmış olmaz.
    port: 5173,
    strictPort: true,
    // Geliştirmede /api → backend. VITE_API_URL boş bırakılırsa frontend
    // aynı origin üzerinden proxy kullanır; CORS ve anlık port dalgalanması azalır.
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5007',
        changeOrigin: true,
        secure: false,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
    },
  },
})
