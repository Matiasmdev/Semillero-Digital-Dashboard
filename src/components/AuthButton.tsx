'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg" disabled>
        Cargando...
      </button>
    )
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="btn-primary"
        aria-label="Iniciar sesión con Google"
      >
        Iniciar sesión
      </button>
    )
  }

  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/' })} 
      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
    >
      Cerrar sesión
    </button>
  )
}
