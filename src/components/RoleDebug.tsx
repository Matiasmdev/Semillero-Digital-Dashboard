'use client'

import { useSession } from 'next-auth/react'

export default function RoleDebug() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="p-4 bg-gray-100 rounded-lg">Cargando sesión...</div>
  }

  if (!session) {
    return <div className="p-4 bg-red-100 rounded-lg">No hay sesión activa</div>
  }

  return (
    <div className="p-4 bg-blue-100 rounded-lg mb-4">
      <h3 className="font-bold mb-2">🔍 Debug de Roles</h3>
      <div className="space-y-1 text-sm">
        <p><strong>Email:</strong> {session.user?.email}</p>
        <p><strong>Nombre:</strong> {session.user?.name}</p>
        <p><strong>Rol asignado:</strong> <span className="font-bold text-blue-600">{(session.user as any)?.role || 'No definido'}</span></p>
        <p><strong>Status:</strong> {status}</p>
      </div>
      
      <div className="mt-3 p-2 bg-white rounded border">
        <p className="text-xs"><strong>Variables de entorno necesarias:</strong></p>
        <p className="text-xs">COORDINATOR_EMAILS, PROFESSOR_EMAILS, STUDENT_EMAILS</p>
      </div>
    </div>
  )
}
