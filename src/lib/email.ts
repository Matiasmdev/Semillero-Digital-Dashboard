import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailNotification {
  to: string
  subject: string
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

export async function sendEmailNotification(notification: EmailNotification) {
  try {
    const template = getEmailTemplate(notification)
    
    const result = await resend.emails.send({
      from: process.env.NOTIFICATION_FROM_EMAIL || 'noreply@resend.dev',
      to: notification.to,
      subject: notification.subject,
      html: template,
    })

    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function getEmailTemplate(notification: EmailNotification): string {
  const { type, data } = notification
  const baseStyle = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Aulux - Semillero Digital</h1>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
  `
  const footer = `
      </div>
      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p>Este es un mensaje automático de Aulux. No responder a este email.</p>
      </div>
    </div>
  `

  switch (type) {
    case 'new_task':
      return baseStyle + `
        <h2 style="color: #1f2937;">📚 Nueva tarea asignada</h2>
        <p><strong>Tarea:</strong> ${data.taskTitle}</p>
        <p><strong>Curso:</strong> ${data.courseName}</p>
        ${data.dueDate ? `<p><strong>Fecha límite:</strong> ${data.dueDate}</p>` : ''}
        <p>Revisa los detalles en Google Classroom o en tu dashboard de Aulux.</p>
      ` + footer

    case 'due_soon':
      return baseStyle + `
        <h2 style="color: #f59e0b;">⏰ Tarea vence pronto</h2>
        <p><strong>Tarea:</strong> ${data.taskTitle}</p>
        <p><strong>Curso:</strong> ${data.courseName}</p>
        <p><strong>Vence:</strong> ${data.dueDate}</p>
        <p style="color: #f59e0b;"><strong>¡No olvides entregar a tiempo!</strong></p>
      ` + footer

    case 'overdue':
      return baseStyle + `
        <h2 style="color: #ef4444;">🚨 Tarea vencida</h2>
        <p><strong>Tarea:</strong> ${data.taskTitle}</p>
        <p><strong>Curso:</strong> ${data.courseName}</p>
        <p><strong>Venció:</strong> ${data.dueDate}</p>
        <p style="color: #ef4444;"><strong>Entrega lo antes posible para evitar penalizaciones.</strong></p>
      ` + footer

    case 'submission_received':
      return baseStyle + `
        <h2 style="color: #10b981;">✅ Nueva entrega recibida</h2>
        <p><strong>Estudiante:</strong> ${data.studentName}</p>
        <p><strong>Tarea:</strong> ${data.taskTitle}</p>
        <p><strong>Curso:</strong> ${data.courseName}</p>
        <p><strong>Entregado:</strong> ${data.submissionDate}</p>
        <p>Revisa la entrega en Google Classroom.</p>
      ` + footer

    case 'task_returned':
      return baseStyle + `
        <h2 style="color: #8b5cf6;">📝 Tarea devuelta con comentarios</h2>
        <p><strong>Tarea:</strong> ${data.taskTitle}</p>
        <p><strong>Curso:</strong> ${data.courseName}</p>
        <p><strong>Profesor:</strong> ${data.teacherName}</p>
        <p>Tu profesor ha devuelto la tarea con comentarios. Revisa Google Classroom para ver los detalles.</p>
      ` + footer

    default:
      return baseStyle + `
        <h2>Notificación de Aulux</h2>
        <p>Tienes una nueva notificación en tu dashboard.</p>
      ` + footer
  }
}
