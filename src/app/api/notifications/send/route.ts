import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sendEmailNotification } from '@/lib/email'
import { sendWhatsAppNotification } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      recipients, // Array de { email, phone?, type: 'student' | 'teacher' }
      notificationType, // 'new_task' | 'due_soon' | 'overdue' | 'submission_received' | 'task_returned'
      data // Datos específicos de la notificación
    } = body

    const results = []

    for (const recipient of recipients) {
      // Enviar email
      if (recipient.email) {
        const emailResult = await sendEmailNotification({
          to: recipient.email,
          subject: getEmailSubject(notificationType, data),
          type: notificationType,
          data
        })
        results.push({ 
          type: 'email', 
          recipient: recipient.email, 
          ...emailResult 
        })
      }

      // Enviar WhatsApp (solo si tiene teléfono configurado)
      if (recipient.phone) {
        const whatsappResult = await sendWhatsAppNotification({
          to: `whatsapp:${recipient.phone}`,
          type: notificationType,
          data
        })
        results.push({ 
          type: 'whatsapp', 
          recipient: recipient.phone, 
          ...whatsappResult 
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results 
    })

  } catch (error) {
    console.error('Error sending notifications:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

function getEmailSubject(type: string, data: any): string {
  switch (type) {
    case 'new_task':
      return `📚 Nueva tarea: ${data.taskTitle}`
    case 'due_soon':
      return `⏰ Tarea vence pronto: ${data.taskTitle}`
    case 'overdue':
      return `🚨 Tarea vencida: ${data.taskTitle}`
    case 'submission_received':
      return `✅ Nueva entrega: ${data.taskTitle}`
    case 'task_returned':
      return `📝 Tarea devuelta: ${data.taskTitle}`
    default:
      return '📢 Notificación de Aulux'
  }
}
