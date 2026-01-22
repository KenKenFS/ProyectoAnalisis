import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from '@shared/firebase/AuthContext'
import { OrdersProvider } from './context/OrdersContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <OrdersProvider>
        <App />
      </OrdersProvider>
    </AuthProvider>
  </React.StrictMode>,
)
