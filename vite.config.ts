import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: { manualChunks: { map: ['maplibre-gl'], charts: ['echarts'] } },
    },
  },
  server: { host: true, port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as any);
