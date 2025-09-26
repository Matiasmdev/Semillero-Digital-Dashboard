'use client'

import { useState } from 'react'
import { BellIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function NotificationTester() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const triggerNotifications = async () => {
    try {
      setLoading(true)
      setResult(null)

      const response = await fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'check_new_tasks' }),
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      setResult({
        success: false,
        message: 'Error de conexión',
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        🧪 Tester de Notificaciones
      </h3>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Detecta tareas creadas en las últimas 24h y envía notificaciones por email y WhatsApp a los estudiantes.
        </p>

        <button
          onClick={triggerNotifications}
          disabled={loading}
          className="btn-primary flex items-center space-x-2"
        >
          <BellIcon className="h-4 w-4" />
          <span>{loading ? 'Enviando...' : 'Enviar Notificaciones'}</span>
        </button>

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start space-x-2">
              {result.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  result.success 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {result.message}
                </p>
                
                {result.details && result.details.results && (
                  <div className="mt-2 text-xs space-y-1">
                    {result.details.results.map((item: any, index: number) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded border">
                        <p><strong>Tarea:</strong> {item.taskTitle}</p>
                        <p><strong>Curso:</strong> {item.courseName}</p>
                        <p><strong>Estudiantes:</strong> {item.recipients}</p>
                        <p className="text-green-600"><strong>✅ Emails enviados:</strong> {item.emailsSent}</p>
                        <p className={item.whatsappSent > 0 ? "text-green-600" : "text-yellow-600"}>
                          <strong>📱 WhatsApp enviados:</strong> {item.whatsappSent}
                        </p>
                        {item.errors > 0 && (
                          <p className="text-red-600"><strong>❌ Errores:</strong> {item.errors}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">🔍 Revisa la consola del servidor para logs detallados de WhatsApp</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p><strong>📧 Email:</strong> Se envía a todos los estudiantes del curso</p>
          <p><strong>⏰ Detección:</strong> Tareas creadas en las últimas 24 horas</p>
          <p><strong>🎯 Testing:</strong> Crea una tarea en Classroom y prueba este botón</p>
        </div>
      </div>
    </div>
  )
}
