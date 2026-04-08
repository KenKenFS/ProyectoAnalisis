import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from '@shared/firebase/AuthContext'
import { ThemeProvider } from '@shared/context/ThemeContext'
import { OrdersProvider } from './context/OrdersContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <OrdersProvider>
          <App />
        </OrdersProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
