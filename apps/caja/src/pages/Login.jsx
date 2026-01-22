import { LoginForm } from '@shared/login'

// Usuarios de prueba para Caja
const testUsers = [
  { email: 'admin@ceviche.cr', password: 'admin123', role: 'Admin', name: 'Rosa Luz' },
  { email: 'cajero@ceviche.cr', password: 'cajero123', role: 'Cajero', name: 'Marcos R.' },
]

export default function Login() {
  return (
    <LoginForm
      appName="Ceviche del Rey"
      appSubtitle="Sistema de Gestion"
      moduleTitle="Modulo Caja - POS"
      formTitle="Cajero"
      redirectPath="/ventas"
      testUsers={testUsers}
      showGoogleLogin={true}
    />
  )
}
