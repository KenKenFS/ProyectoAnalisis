import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '../..'),
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      'firebase',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'firebase/functions',
    ],
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      firebase: path.resolve(__dirname, 'node_modules/firebase'),
      'firebase/app': path.resolve(__dirname, 'node_modules/firebase/app/dist/index.cjs.js'),
      'firebase/auth': path.resolve(__dirname, 'node_modules/firebase/auth/dist/index.cjs.js'),
      'firebase/firestore': path.resolve(__dirname, 'node_modules/firebase/firestore/dist/index.cjs.js'),
      'firebase/storage': path.resolve(__dirname, 'node_modules/firebase/storage/dist/index.cjs.js'),
      'firebase/functions': path.resolve(__dirname, 'node_modules/firebase/functions/dist/index.cjs.js'),
    }
  },
  server: {
    port: 5173
  }
})
