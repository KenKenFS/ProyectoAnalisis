import { LoginForm } from '@shared/login'

// Usuarios de prueba para Admin
const testUsers = [
  { email: 'admin@ceviche.cr', password: 'admin123', role: 'Admin', name: 'Rosa Luz' },
  { email: 'cajero@ceviche.cr', password: 'cajero123', role: 'Cajero', name: 'Marcos R.' },
  { email: 'mesero@ceviche.cr', password: 'mesero123', role: 'Mesero', name: 'Ana Maria' },
  { email: 'cocina@ceviche.cr', password: 'cocina123', role: 'Cocina', name: 'Luis Chen' },
]

export default function Login() {
  return (
    <LoginForm
      appName="Ceviche del Rey"
      appSubtitle="Sistema de Gestion"
      moduleTitle="Admin Panel"
      formTitle="Administrador"
      redirectPath="/admin"
      testUsers={testUsers}
      showGoogleLogin={true}
    />
  )
}
