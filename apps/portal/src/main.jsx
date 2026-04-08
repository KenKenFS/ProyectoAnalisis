import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from '@shared/firebase/AuthContext'
import { ThemeProvider } from '@shared/context/ThemeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
