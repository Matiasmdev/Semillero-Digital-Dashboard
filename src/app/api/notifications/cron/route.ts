import { NextRequest, NextResponse } from 'next/server'

// Este endpoint se ejecuta periódicamente para detectar nuevas tareas
// En producción se puede configurar con un cron job o Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Verificar autorización (opcional: usar API key para cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('🔒 Cron job sin autorización válida')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('⏰ Ejecutando detección automática de nuevas tareas...')

    // Obtener todos los usuarios profesores/coordinadores para verificar sus cursos
    const professorEmails = (process.env.PROFESSOR_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
    const coordinatorEmails = (process.env.COORDINATOR_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
    const allTeacherEmails = [...professorEmails, ...coordinatorEmails]

    if (allTeacherEmails.length === 0) {
      console.log('⚠️ No hay emails de profesores configurados')
      return NextResponse.json({ 
        success: false, 
        message: 'No hay profesores configurados' 
      })
    }

    const results = []
    
    // Por cada profesor, simular una llamada al endpoint de notificaciones
    for (const teacherEmail of allTeacherEmails) {
      try {
        console.log(`🔍 Verificando tareas para profesor: ${teacherEmail}`)
        
        // Simular sesión de profesor para la API
        // En un sistema real, necesitarías tokens de servicio o una implementación diferente
        const mockSession = {
          user: { email: teacherEmail, name: 'Sistema Automático' },
          access_token: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN // Token de servicio si está disponible
        }

        // Llamar al endpoint de detección de tareas
        const baseUrl = request.nextUrl.origin
        const notificationRes = await fetch(`${baseUrl}/api/notifications/detect-new`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({
            teacherEmail,
            checkLast: '1h' // Verificar última hora
          })
        })

        if (notificationRes.ok) {
          const notificationData = await notificationRes.json()
          results.push({
            teacherEmail,
            success: true,
            tasksFound: notificationData.processed || 0,
            details: notificationData.results || []
          })
        } else {
          console.log(`❌ Error verificando tareas para ${teacherEmail}: ${notificationRes.status}`)
          results.push({
            teacherEmail,
            success: false,
            error: `HTTP ${notificationRes.status}`
          })
        }

      } catch (error) {
        console.error(`Error procesando profesor ${teacherEmail}:`, error)
        results.push({
          teacherEmail,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalTasks = results.reduce((sum, r) => sum + (r.tasksFound || 0), 0)

    console.log(`✅ Cron completado: ${successCount}/${allTeacherEmails.length} profesores, ${totalTasks} tareas nuevas`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      professorsChecked: allTeacherEmails.length,
      successfulChecks: successCount,
      totalNewTasks: totalTasks,
      results
    })

  } catch (error) {
    console.error('Error en cron de notificaciones:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// POST method para testing manual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { force = false } = body

    if (!force) {
      return NextResponse.json({
        message: 'Use GET para cron automático o POST con {"force": true} para testing'
      })
    }

    // Ejecutar la misma lógica que GET pero sin verificación de autorización
    console.log('🧪 Ejecutando detección manual de nuevas tareas...')
    
    // Simular detección para testing
    const mockResults = {
      success: true,
      timestamp: new Date().toISOString(),
      professorsChecked: 1,
      successfulChecks: 1,
      totalNewTasks: 0,
      results: [{
        teacherEmail: 'test@example.com',
        success: true,
        tasksFound: 0,
        details: []
      }],
      note: 'Esta es una ejecución de prueba. En producción se verificarían tareas reales.'
    }

    return NextResponse.json(mockResults)

  } catch (error) {
    console.error('Error en testing de notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
