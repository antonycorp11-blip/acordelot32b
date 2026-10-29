import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: o mesmo build serve como PWA e dentro de um wrapper Android (Capacitor/TWA).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
});
