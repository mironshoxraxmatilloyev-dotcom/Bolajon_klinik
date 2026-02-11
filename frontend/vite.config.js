import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'image.jpg', 'robots.txt'],
      manifest: {
        name: 'Bolajon Med Klinikasi',
        short_name: 'Bolajon Med',
        description: 'Tibbiy klinika boshqaruv tizimi',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/image.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: '/image.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 yil
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 yil
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 daqiqa
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    port: 3000,
    host: true, // Barcha network interfacelar uchun
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    },
    // HMR sozlamalari
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
      port: 3000
    },
    // File watcher sozlamalari
    watch: {
      usePolling: true, // Windows uchun muhim
      interval: 100
    }
  },
  build: {
    // Chunk size optimization
    chunkSizeWarningLimit: 1000,
    // Tezroq build
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - katta kutubxonalar
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-hot-toast') || id.includes('qrcode')) {
              return 'ui-vendor';
            }
            if (id.includes('react-i18next') || id.includes('i18next')) {
              return 'i18n-vendor';
            }
            if (id.includes('axios')) {
              return 'axios-vendor';
            }
            // Boshqa node_modules
            return 'vendor';
          }
          // Page chunks
          if (id.includes('/src/pages/Dashboard.jsx') || id.includes('/src/pages/DoctorPanel.jsx')) {
            return 'dashboard-pages';
          }
          if (id.includes('/src/pages/Patients.jsx') || id.includes('/src/pages/PatientProfile.jsx')) {
            return 'patient-pages';
          }
          if (id.includes('/src/pages/Queue') || id.includes('/src/pages/QueueManagement')) {
            return 'queue-pages';
          }
          if (id.includes('/src/pages/Cashier') || id.includes('/src/pages/Invoices')) {
            return 'billing-pages';
          }
        },
      },
    },
    // Minification
    minify: 'esbuild', // esbuild tezroq
    // Source maps faqat development da
    sourcemap: false,
  },
  // Optimize dependencies - tezroq yuklash
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'react-hot-toast',
      'axios',
      'react-is',
      'chart.js',
      'react-chartjs-2'
    ],
    // Force pre-bundling
    force: true
  },
  // Resolve aliases - tezroq import
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@services': '/src/services',
      '@hooks': '/src/hooks',
      '@utils': '/src/utils'
    }
  }
})
