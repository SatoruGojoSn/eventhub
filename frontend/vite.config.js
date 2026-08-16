import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En developpement, Vite joue le role de passerelle : il redirige les prefixes
// /api/* vers les microservices lances en local (npm run dev dans chaque dossier).
// En production, c'est Nginx qui assure ce role (voir frontend/nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/events': {
        target: process.env.EVENTS_SERVICE_URL ?? 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/api/participants': {
        target: process.env.PARTICIPANTS_SERVICE_URL ?? 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/api/registrations': {
        target: process.env.REGISTRATIONS_SERVICE_URL ?? 'http://localhost:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Sondes de sante agregees pour le tableau de bord
      '/api/health/events': {
        target: process.env.EVENTS_SERVICE_URL ?? 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/health'
      },
      '/api/health/participants': {
        target: process.env.PARTICIPANTS_SERVICE_URL ?? 'http://localhost:3002',
        changeOrigin: true,
        rewrite: () => '/health'
      },
      '/api/health/registrations': {
        target: process.env.REGISTRATIONS_SERVICE_URL ?? 'http://localhost:3003',
        changeOrigin: true,
        rewrite: () => '/health'
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
