import { NextRequest, NextResponse } from 'next/server'
import { notifyNewTask } from '@/lib/notification-service'

// Endpoint optimizado para detectar y notificar nuevas tareas automáticamente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teacherEmail, checkLast = '1h' } = body

    // Verificar autorización
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log(`🔍 Detectando nuevas tareas para: ${teacherEmail}`)

    // Calcular ventana de tiempo
    const now = Date.now()
    let timeWindow = 60 * 60 * 1000 // 1 hora por defecto
    
    if (checkLast === '30m') timeWindow = 30 * 60 * 1000
    else if (checkLast === '2h') timeWindow = 2 * 60 * 60 * 1000
    else if (checkLast === '24h') timeWindow = 24 * 60 * 60 * 1000
    
    const cutoffTime = now - timeWindow

    // Simular obtención de cursos (en producción usarías service account)
    const baseUrl = request.nextUrl.origin
    
    // Para este ejemplo, vamos a usar una implementación simplificada
    // En producción necesitarías implementar autenticación de servicio
    console.log(`⏰ Verificando tareas creadas en los últimos ${checkLast}`)

    // Simulación de detección de nuevas tareas
    // En una implementación real, aquí consultarías la API de Classroom con service account
    const mockNewTasks = [
      // Simular que se encontró una nueva tarea
      {
        id: `task-${Date.now()}`,
        title: 'Nueva Tarea Detectada Automáticamente',
        courseName: 'Curso de Ejemplo',
        creationTime: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 días
        alternateLink: 'https://classroom.google.com/c/example'
      }
    ]

    const notificationResults = []

    // Solo procesar si hay tareas nuevas
    if (mockNewTasks.length > 0) {
      console.log(`📝 Encontradas ${mockNewTasks.length} tareas nuevas`)

      // Obtener lista de estudiantes (simulado)
      const mockStudents = [
        {
          email: 'estudiante1@example.com',
          name: 'Estudiante Uno',
          role: 'student' as const
        },
        {
          email: 'estudiante2@example.com', 
          name: 'Estudiante Dos',
          role: 'student' as const
        }
      ]

      // Enviar notificaciones por cada tarea nueva
      for (const task of mockNewTasks) {
        const taskData = {
          taskTitle: task.title,
          courseName: task.courseName,
          teacherName: teacherEmail.split('@')[0], // Usar parte del email como nombre
          dueDate: task.dueDate,
          creationDate: new Date(task.creationTime).toLocaleString(),
          classroomLink: task.alternateLink
        }

        console.log(`📧 Enviando notificaciones automáticas para: ${taskData.taskTitle}`)

        try {
          const results = await notifyNewTask(mockStudents, taskData)
          
          notificationResults.push({
            taskId: task.id,
            taskTitle: task.title,
            courseName: task.courseName,
            recipients: mockStudents.length,
            emailsSent: results.filter(r => r.type === 'email' && r.success).length,
            whatsappSent: results.filter(r => r.type === 'whatsapp' && r.success).length,
            errors: results.filter(r => !r.success).length,
            timestamp: new Date().toISOString()
          })

          console.log(`✅ Notificaciones enviadas para tarea: ${task.title}`)

        } catch (error) {
          console.error(`❌ Error enviando notificaciones para tarea ${task.title}:`, error)
          notificationResults.push({
            taskId: task.id,
            taskTitle: task.title,
            courseName: task.courseName,
            recipients: 0,
            emailsSent: 0,
            whatsappSent: 0,
            errors: 1,
            error: error instanceof Error ? error.message : 'Error desconocido',
            timestamp: new Date().toISOString()
          })
        }
      }
    } else {
      console.log(`ℹ️ No se encontraron tareas nuevas en los últimos ${checkLast}`)
    }

    return NextResponse.json({
      success: true,
      teacherEmail,
      timeWindow: checkLast,
      processed: notificationResults.length,
      results: notificationResults,
      message: `Procesadas ${notificationResults.length} tareas nuevas para ${teacherEmail}`
    })

  } catch (error) {
    console.error('Error detectando nuevas tareas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// GET method para verificación manual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherEmail = searchParams.get('teacherEmail') || 'test@example.com'
    const checkLast = searchParams.get('checkLast') || '1h'

    // Llamar al método POST con los parámetros
    const response = await POST(new NextRequest(request.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || `Bearer ${process.env.CRON_SECRET || 'default-secret'}`
      },
      body: JSON.stringify({ teacherEmail, checkLast })
    }))

    return response

  } catch (error) {
    console.error('Error en GET detect-new:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
