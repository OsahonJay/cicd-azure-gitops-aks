import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/students':   { target: 'http://localhost:5000', changeOrigin: true },
      '/api/courses':    { target: 'http://localhost:3000', changeOrigin: true },
      '/api/enrolments': { target: 'http://localhost:3000', changeOrigin: true },
      '/api/reports':    { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
});
