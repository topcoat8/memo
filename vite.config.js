import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env': {},
    global: 'window',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
});