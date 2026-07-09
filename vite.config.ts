import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    // Dedupe katex to prevent double-registration of accessibility-tree
    dedupe: ['katex', 'react', 'react-dom'],
  },
  server: {
    historyApiFallback: true,
    port: 5173,
  },
  optimizeDeps: {
    include: ['katex'],
    exclude: [],
  },
})
