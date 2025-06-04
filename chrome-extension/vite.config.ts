import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isWebapp = mode === 'webapp';

  const input: Record<string, string> = isWebapp 
    ? { main: resolve('./index.html') }
    : { 
        main: resolve('./index.html'),
        options: resolve('./options.html')
      };
  
  return {
    plugins: [react(), tailwindcss()],
    envDir: '../', // Load .env from parent directory
    build: {
      outDir: 'dist',
      rollupOptions: {
        input,
      }
    },
    publicDir: 'public',
    define: {
      // Ensure process.env is available in browser
      global: 'globalThis',
    },
    server: {
      port: 3000,
      open: isWebapp
    }
  };
})