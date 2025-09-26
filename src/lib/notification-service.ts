import { sendEmailNotification } from './email'
import { sendWhatsAppNotification } from './whatsapp'

export interface NotificationRecipient {
  email: string
  phone?: string
  name: string
  role: 'student' | 'teacher' | 'coordinator'
}

export interface TaskNotificationData {
  taskTitle: string
  courseName: string
  teacherName: string
  dueDate?: string
  creationDate: string
  classroomLink?: string
}

export async function notifyNewTask(
  recipients: NotificationRecipient[],
  taskData: TaskNotificationData
) {
  const results = []

  for (const recipient of recipients) {
    try {
      // Enviar email
      const emailResult = await sendEmailNotification({
        to: recipient.email,
        subject: `📚 Nueva tarea: ${taskData.taskTitle}`,
        type: 'new_task',
        data: {
          studentName: recipient.name,
          teacherName: taskData.teacherName,
          taskTitle: taskData.taskTitle,
          courseName: taskData.courseName,
          dueDate: taskData.dueDate,
        }
      })

      results.push({
        recipient: recipient.email,
        type: 'email',
        success: emailResult.success,
        error: emailResult.error
      })

      // Enviar WhatsApp si tiene teléfono
      if (recipient.phone) {
        const whatsappResult = await sendWhatsAppNotification({
          to: `whatsapp:${recipient.phone}`,
          type: 'new_task',
          data: {
            studentName: recipient.name,
            teacherName: taskData.teacherName,
            taskTitle: taskData.taskTitle,
            courseName: taskData.courseName,
            dueDate: taskData.dueDate,
          }
        })

        results.push({
          recipient: recipient.phone,
          type: 'whatsapp',
          success: whatsappResult.success,
          error: whatsappResult.error
        })
      }

    } catch (error) {
      console.error(`Error notifying ${recipient.email}:`, error)
      results.push({
        recipient: recipient.email,
        type: 'error',
        success: false,
        error: error.message
      })
    }
  }

  return results
}

export async function notifyDueSoon(
  recipients: NotificationRecipient[],
  taskData: TaskNotificationData
) {
  const results = []

  for (const recipient of recipients) {
    try {
      // Email
      const emailResult = await sendEmailNotification({
        to: recipient.email,
        subject: `⏰ Tarea vence pronto: ${taskData.taskTitle}`,
        type: 'due_soon',
        data: {
          studentName: recipient.name,
          taskTitle: taskData.taskTitle,
          courseName: taskData.courseName,
          dueDate: taskData.dueDate,
        }
      })

      results.push({
        recipient: recipient.email,
        type: 'email',
        success: emailResult.success
      })

      // WhatsApp
      if (recipient.phone) {
        const whatsappResult = await sendWhatsAppNotification({
          to: `whatsapp:${recipient.phone}`,
          type: 'due_soon',
          data: {
            studentName: recipient.name,
            taskTitle: taskData.taskTitle,
            courseName: taskData.courseName,
            dueDate: taskData.dueDate,
          }
        })

        results.push({
          recipient: recipient.phone,
          type: 'whatsapp',
          success: whatsappResult.success
        })
      }

    } catch (error) {
      console.error(`Error notifying ${recipient.email}:`, error)
    }
  }

  return results
}

export async function notifySubmissionReceived(
  teacherRecipients: NotificationRecipient[],
  taskData: TaskNotificationData & { studentName: string; submissionDate: string }
) {
  const results = []

  for (const recipient of teacherRecipients) {
    try {
      // Email al profesor
      const emailResult = await sendEmailNotification({
        to: recipient.email,
        subject: `✅ Nueva entrega: ${taskData.taskTitle}`,
        type: 'submission_received',
        data: {
          studentName: taskData.studentName,
          teacherName: recipient.name,
          taskTitle: taskData.taskTitle,
          courseName: taskData.courseName,
          submissionDate: taskData.submissionDate,
        }
      })

      results.push({
        recipient: recipient.email,
        type: 'email',
        success: emailResult.success
      })

      // WhatsApp al profesor
      if (recipient.phone) {
        const whatsappResult = await sendWhatsAppNotification({
          to: `whatsapp:${recipient.phone}`,
          type: 'submission_received',
          data: {
            studentName: taskData.studentName,
            teacherName: recipient.name,
            taskTitle: taskData.taskTitle,
            courseName: taskData.courseName,
            submissionDate: taskData.submissionDate,
          }
        })

        results.push({
          recipient: recipient.phone,
          type: 'whatsapp',
          success: whatsappResult.success
        })
      }

    } catch (error) {
      console.error(`Error notifying teacher ${recipient.email}:`, error)
    }
  }

  return results
}
