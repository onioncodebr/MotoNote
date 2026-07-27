import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Escuta em todas as interfaces (não só localhost) pra dar pra acessar
    // de outro dispositivo (celular) na mesma rede local.
    host: true,
  },
})
