import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure relative paths for Electron build
  test: { // Vitest configuration
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js', // Optional setup file
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
    },
  },
})
