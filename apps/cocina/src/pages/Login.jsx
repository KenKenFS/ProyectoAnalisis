import { LoginForm } from '@shared/login'

// Usuarios de prueba para Cocina
const testUsers = [
  { email: 'admin@ceviche.cr', password: 'admin123', role: 'Admin', name: 'Rosa Luz' },
  { email: 'cocina@ceviche.cr', password: 'cocina123', role: 'Cocina', name: 'Luis Chen' },
]

export default function Login() {
  return (
    <LoginForm
      appName="Ceviche del Rey"
      appSubtitle="Sistema de Gestion"
      moduleTitle="Modulo Cocina"
      formTitle="Chef"
      redirectPath="/cocina"
      testUsers={testUsers}
      showGoogleLogin={true}
    />
  )
}
