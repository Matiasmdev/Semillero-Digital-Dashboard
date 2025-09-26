'use client'

import { useState, useEffect } from 'react'
import { 
  BellIcon, 
  BellSlashIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface AutoNotificationToggleProps {
  className?: string
}

export default function AutoNotificationToggle({ className = '' }: AutoNotificationToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle')
  const [interval, setIntervalState] = useState<NodeJS.Timeout | null>(null)

  // Cargar estado desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('autoNotifications')
    if (saved) {
      const data = JSON.parse(saved)
      setIsEnabled(data.enabled || false)
      setLastCheck(data.lastCheck || null)
    }
  }, [])

  // Guardar estado en localStorage
  const saveState = (enabled: boolean, lastCheckTime?: string) => {
    const data = {
      enabled,
      lastCheck: lastCheckTime || lastCheck,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('autoNotifications', JSON.stringify(data))
  }

  // Ejecutar verificación de nuevas tareas
  const checkForNewTasks = async () => {
    try {
      setIsLoading(true)
      setStatus('running')
      
      console.log('🔍 Verificando nuevas tareas automáticamente...')
      
      const response = await fetch('/api/notifications/detect-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'default-secret'}`
        },
        body: JSON.stringify({
          teacherEmail: 'auto-check@system.com',
          checkLast: '1h'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const now = new Date().toISOString()
        setLastCheck(now)
        setStatus('idle')
        saveState(isEnabled, now)
        
        console.log('✅ Verificación completada:', data)
        
        // Mostrar notificación si se encontraron tareas
        if (data.processed > 0) {
          console.log(`📧 Se enviaron notificaciones para ${data.processed} tareas nuevas`)
        }
      } else {
        console.error('❌ Error verificando tareas:', response.status)
        setStatus('error')
      }
    } catch (error) {
      console.error('Error en verificación automática:', error)
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  // Activar/desactivar notificaciones automáticas
  const toggleAutoNotifications = async () => {
    const newEnabled = !isEnabled
    setIsEnabled(newEnabled)
    saveState(newEnabled)

    if (newEnabled) {
      // Activar: ejecutar primera verificación y configurar intervalo
      await checkForNewTasks()
      
      // Configurar verificación cada 30 minutos
      const newInterval = setInterval(checkForNewTasks, 30 * 60 * 1000)
      setIntervalState(newInterval)
      
      console.log('🔔 Notificaciones automáticas ACTIVADAS (cada 30 min)')
    } else {
      // Desactivar: limpiar intervalo
      if (interval) {
        clearInterval(interval)
        setIntervalState(null)
      }
      setStatus('idle')
      console.log('🔕 Notificaciones automáticas DESACTIVADAS')
    }
  }

  // Verificación manual
  const manualCheck = async () => {
    if (isLoading) return
    await checkForNewTasks()
  }

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [interval])

  const getStatusIcon = () => {
    if (isLoading) {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
    }
    
    switch (status) {
      case 'running':
        return <PlayIcon className="h-4 w-4 text-blue-600" />
      case 'error':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
      default:
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />
    }
  }

  const getStatusText = () => {
    if (isLoading) return 'Verificando...'
    
    switch (status) {
      case 'running':
        return 'Ejecutando'
      case 'error':
        return 'Error'
      default:
        return 'Activo'
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {isEnabled ? (
            <BellIcon className="h-6 w-6 text-blue-600" />
          ) : (
            <BellSlashIcon className="h-6 w-6 text-gray-400" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notificaciones Automáticas
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Detecta y notifica nuevas tareas por email
            </p>
          </div>
        </div>
        
        <button
          onClick={toggleAutoNotifications}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isEnabled 
              ? 'bg-blue-600' 
              : 'bg-gray-200 dark:bg-gray-600'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-3">
          {/* Estado actual */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-gray-600 dark:text-gray-300">
                Estado: {getStatusText()}
              </span>
            </div>
            
            {lastCheck && (
              <span className="text-gray-500 dark:text-gray-400">
                Última verificación: {new Date(lastCheck).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Botón de verificación manual */}
          <button
            onClick={manualCheck}
            disabled={isLoading}
            className="w-full px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verificando...' : '🔍 Verificar Ahora'}
          </button>

          {/* Información adicional */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• Verifica cada 30 minutos</p>
            <p>• Detecta tareas de la última hora</p>
            <p>• Envía emails automáticamente</p>
          </div>
        </div>
      )}

      {!isEnabled && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>Las notificaciones automáticas están desactivadas.</p>
          <p>Activa el interruptor para recibir alertas de nuevas tareas.</p>
        </div>
      )}
    </div>
  )
}
