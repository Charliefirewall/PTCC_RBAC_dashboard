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
    // Vitest defaults to 5 s per test. The simulation cases tick a 1,100-vehicle world
    // through six sim-hours and land at 5.0-5.5 s, so on a loaded machine or cold CI
    // runner they were failing the timeout rather than the assertion - a suite that is
    // green locally and red in CI teaches people to ignore it.
    testTimeout: 30_000,
  },
} as any);
