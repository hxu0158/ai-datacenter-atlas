import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base => the production build is drop-anywhere portable: works at a
  // domain root (Netlify/Cloudflare/Vercel) AND under a subpath (GitHub Pages).
  base: './',
  server: {
    host: true,
    port: 5173,
  },
})
