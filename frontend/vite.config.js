import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'stellar-sdk', 'lucide-react'],
  },
  
  // Build optimizations
  build: {
    // Code splitting - separate vendor chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Stellar SDK is huge - put it in its own chunk
          stellar: ['stellar-sdk'],
          // React in its own chunk
          react: ['react', 'react-dom'],
          // Icons library
          icons: ['lucide-react'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  
  // Faster dev server
  server: {
    warmup: {
      clientFiles: ['./src/App.jsx', './src/main.jsx'],
    },
  },
})