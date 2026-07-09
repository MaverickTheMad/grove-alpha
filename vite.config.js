import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Grove alpha — single Vite app, React 18 baseline (suite standard).
export default defineConfig({
  plugins: [react()],
  server: { port: Number(process.env.PORT) || 5173, strictPort: false },
})
