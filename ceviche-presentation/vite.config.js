import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base path for GitHub Pages deployment
// Change this to your repo name when deploying: '/your-repo-name/'
export default defineConfig({
  base: '/ProyectoAnalisis/',
  plugins: [react()],
})
