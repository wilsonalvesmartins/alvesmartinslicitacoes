import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Garante que o build vai para a pasta correta que o server.js espera
    outDir: 'dist',
    emptyOutDir: true
  }
})
