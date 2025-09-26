import { NextRequest, NextResponse } from 'next/server'

// Endpoint simple para disparar notificaciones manualmente (para testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action = 'check_new_tasks' } = body

    if (action === 'check_new_tasks') {
      // Llamar al endpoint de notificaciones automáticas
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/notifications/auto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pasar las cookies de la sesión actual
          'Cookie': request.headers.get('cookie') || '',
        },
      })

      const result = await response.json()

      return NextResponse.json({
        success: response.ok,
        message: response.ok 
          ? `✅ Notificaciones enviadas: ${result.processed} tareas procesadas`
          : `❌ Error: ${result.error}`,
        details: result
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Acción no reconocida'
    })

  } catch (error) {
    console.error('Error triggering notifications:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
