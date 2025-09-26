import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { notifyNewTask, notifySubmissionReceived } from '@/lib/notification-service'

// Este endpoint detecta nuevas tareas y envía notificaciones automáticamente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener cursos del usuario - pasar la sesión completa
    const baseUrl = request.nextUrl.origin
    const coursesRes = await fetch(`${baseUrl}/api/classroom/courses`, {
      headers: {
        'Content-Type': 'application/json',
        // Pasar las cookies de la sesión actual
        'Cookie': request.headers.get('cookie') || '',
      },
    })

    console.log('🔍 Fetching courses from:', `${baseUrl}/api/classroom/courses`)
    console.log('🔑 Using access token:', (session as any).access_token ? 'Present' : 'Missing')

    if (!coursesRes.ok) {
      const errorText = await coursesRes.text()
      console.error('❌ Courses API error:', coursesRes.status, errorText)
      throw new Error(`No se pudieron obtener cursos: ${coursesRes.status} - ${errorText}`)
    }

    const coursesData = await coursesRes.json()
    const courses = Array.isArray(coursesData?.courses) ? coursesData.courses : []

    const now = Date.now()
    const last24h = now - 24 * 60 * 60 * 1000 // Últimas 24 horas
    const notificationResults = []

    for (const course of courses) {
      try {
        // Obtener courseWork del curso
        const workRes = await fetch(`${baseUrl}/api/classroom/courses/${course.id}/courseWork`, {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
        })

        if (!workRes.ok) {
          console.log(`⚠️ No se pudo obtener courseWork para curso ${course.name}: ${workRes.status}`)
          continue
        }

        const workData = await workRes.json()
        const works = Array.isArray(workData?.courseWork) ? workData.courseWork : []

        // Filtrar tareas creadas en las últimas 24h
        const newTasks = works.filter(work => {
          const creationTime = work?.creationTime ? new Date(work.creationTime).getTime() : 0
          return creationTime >= last24h
        })

        if (newTasks.length === 0) continue

        // Obtener estudiantes del curso
        const studentsRes = await fetch(`${baseUrl}/api/classroom/courses/${course.id}/students`, {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
        })

        if (!studentsRes.ok) {
          console.log(`⚠️ No se pudieron obtener estudiantes para curso ${course.name}: ${studentsRes.status}`)
          continue
        }

        const studentsData = await studentsRes.json()
        const students = Array.isArray(studentsData?.students) ? studentsData.students : []

        // Preparar lista de destinatarios (estudiantes) - SOLO EMAIL por ahora
        const recipients = students.map(student => ({
          email: student.profile?.emailAddress || '',
          phone: undefined, // Deshabilitado: requiere cuenta paga de Twilio
          name: student.profile?.name?.fullName || 'Estudiante',
          role: 'student' as const
        })).filter(r => r.email) // Solo estudiantes con email

        // Enviar notificaciones por cada tarea nueva
        for (const task of newTasks) {
          const dueDate = task.dueDate 
            ? `${task.dueDate.year}-${String(task.dueDate.month).padStart(2,'0')}-${String(task.dueDate.day).padStart(2,'0')}`
            : undefined

          const taskData = {
            taskTitle: task.title || 'Nueva tarea',
            courseName: course.name || 'Curso',
            teacherName: session.user?.name || 'Profesor',
            dueDate,
            creationDate: new Date(task.creationTime).toLocaleString(),
            classroomLink: task.alternateLink
          }

          console.log(`🚀 Enviando notificaciones para tarea: ${taskData.taskTitle}`)
          console.log(`📧 Destinatarios: ${recipients.length} estudiantes`)

          const results = await notifyNewTask(recipients, taskData)
          
          notificationResults.push({
            courseId: course.id,
            courseName: course.name,
            taskId: task.id,
            taskTitle: task.title,
            recipients: recipients.length,
            emailsSent: results.filter(r => r.type === 'email' && r.success).length,
            whatsappSent: results.filter(r => r.type === 'whatsapp' && r.success).length,
            errors: results.filter(r => !r.success).length
          })
        }

      } catch (error) {
        console.error(`Error procesando curso ${course.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      processed: notificationResults.length,
      results: notificationResults,
      message: `Procesadas ${notificationResults.length} tareas nuevas`
    })

  } catch (error) {
    console.error('Error en notificaciones automáticas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Helper: Obtener teléfono del estudiante (puedes mapear emails a teléfonos aquí)
function getStudentPhone(email?: string): string | undefined {
  // Mapeo manual de emails a teléfonos para testing
  // En producción, esto vendría de una base de datos
  const phoneMap: Record<string, string> = {
    'juanestudiante@gmail.com': '+546546546546', // Ejemplo
    // Agrega más mapeos según necesites
  }
  
  return email ? phoneMap[email.toLowerCase()] : undefined
}
