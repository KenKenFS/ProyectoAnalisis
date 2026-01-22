import { LoginForm } from '@shared/login'

// Usuarios de prueba para Meseros
const testUsers = [
  { email: 'admin@ceviche.cr', password: 'admin123', role: 'Admin', name: 'Rosa Luz' },
  { email: 'mesero@ceviche.cr', password: 'mesero123', role: 'Mesero', name: 'Ana Maria' },
]

export default function Login() {
  return (
    <LoginForm
      appName="Ceviche del Rey"
      appSubtitle="Sistema de Gestion"
      moduleTitle="Tablet de Ordenes"
      formTitle="Mesero"
      redirectPath="/mesero"
      testUsers={testUsers}
      showGoogleLogin={true}
    />
  )
}
