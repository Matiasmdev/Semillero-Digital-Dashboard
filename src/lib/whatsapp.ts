import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export interface WhatsAppNotification {
  to: string // Formato: whatsapp:+1234567890
  type: 'new_task' | 'due_soon' | 'overdue' | 'submission_received' | 'task_returned'
  data: {
    studentName?: string
    teacherName?: string
    taskTitle: string
    courseName: string
    dueDate?: string
    submissionDate?: string
  }
}

export async function sendWhatsAppNotification(notification: WhatsAppNotification) {
  try {
    console.log('🚀 Intentando enviar WhatsApp...')
    console.log('📱 Desde:', process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886')
    console.log('📱 Para:', notification.to)
    console.log('🔑 Account SID:', process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + '...')
    
    const message = getWhatsAppMessage(notification)
    console.log('💬 Mensaje:', message.substring(0, 100) + '...')
    
    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
      to: notification.to,
      body: message,
    })

    console.log('✅ WhatsApp enviado exitosamente!')
    console.log('📋 SID:', result.sid)
    console.log('📊 Status:', result.status)
    
    return { success: true, sid: result.sid }
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp:', error)
    console.error('🔍 Error code:', error.code)
    console.error('🔍 Error message:', error.message)
    console.error('🔍 Error details:', error.moreInfo)
    return { success: false, error: error.message, code: error.code }
  }
}

function getWhatsAppMessage(notification: WhatsAppNotification): string {
  const { type, data } = notification
  const header = "🎓 *Aulux - Semillero Digital*\n\n"

  switch (type) {
    case 'new_task':
      return header + 
        `📚 *Nueva tarea asignada*\n\n` +
        `📝 Tarea: ${data.taskTitle}\n` +
        `📖 Curso: ${data.courseName}\n` +
        `${data.dueDate ? `📅 Vence: ${data.dueDate}\n` : ''}` +
        `\n¡Revisa los detalles en Classroom!`

    case 'due_soon':
      return header + 
        `⏰ *Tarea vence pronto*\n\n` +
        `📝 Tarea: ${data.taskTitle}\n` +
        `📖 Curso: ${data.courseName}\n` +
        `📅 Vence: ${data.dueDate}\n` +
        `\n🚨 ¡No olvides entregar a tiempo!`

    case 'overdue':
      return header + 
        `🚨 *Tarea vencida*\n\n` +
        `📝 Tarea: ${data.taskTitle}\n` +
        `📖 Curso: ${data.courseName}\n` +
        `📅 Venció: ${data.dueDate}\n` +
        `\n⚠️ Entrega lo antes posible`

    case 'submission_received':
      return header + 
        `✅ *Nueva entrega recibida*\n\n` +
        `👤 Estudiante: ${data.studentName}\n` +
        `📝 Tarea: ${data.taskTitle}\n` +
        `📖 Curso: ${data.courseName}\n` +
        `📅 Entregado: ${data.submissionDate}\n` +
        `\n📋 Revisa en Classroom`

    case 'task_returned':
      return header + 
        `📝 *Tarea devuelta con comentarios*\n\n` +
        `📝 Tarea: ${data.taskTitle}\n` +
        `📖 Curso: ${data.courseName}\n` +
        `👨‍🏫 Profesor: ${data.teacherName}\n` +
        `\n💬 Revisa los comentarios en Classroom`

    default:
      return header + `📢 Tienes una nueva notificación en Aulux`
  }
}
