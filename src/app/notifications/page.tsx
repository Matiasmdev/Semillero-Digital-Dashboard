'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'

export default function Notifications() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || 'alumno'
  const [filter, setFilter] = useState('all')
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const storageKey = useMemo(() => `aulux_notifications_read_${role}_${session?.user?.email || 'anon'}`, [role, session])

  const [settings, setSettings] = useState({
    assignments: true,
    overdue: true,
    attendance: true,
    progress: true,
    sync: false,
    system: true,
    achievements: true
  })

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const cRes = await fetch('/api/classroom/courses')
        if (!cRes.ok) throw new Error('No se pudieron obtener cursos')
        const cData = await cRes.json()
        const courses = Array.isArray(cData?.courses) ? cData.courses : []
        const now = Date.now()
        const last72h = now - 72 * 60 * 60 * 1000
        const items: any[] = []

        for (const course of courses) {
          // CourseWork per course
          const wRes = await fetch(`/api/classroom/courses/${course.id}/courseWork`)
          if (!wRes.ok) continue
          const wData = await wRes.json()
          const works = Array.isArray(wData?.courseWork) ? wData.courseWork : []

          // New assignments (last 72h)
          for (const w of works) {
            const creationTs = w?.creationTime ? new Date(w.creationTime).getTime() : 0
            const dueIso = w?.dueDate ? `${w.dueDate.year}-${String(w.dueDate.month).padStart(2,'0')}-${String(w.dueDate.day).padStart(2,'0')}` : undefined
            const dueTs = dueIso ? new Date(dueIso).getTime() : undefined
            const soon = dueTs ? (dueTs - now <= 48*60*60*1000 && dueTs - now > 0) : false
            const soonUrgent = dueTs ? (dueTs - now <= 24*60*60*1000 && dueTs - now > 0) : false
            const overdue = dueTs ? (dueTs < now) : false

            if (creationTs && creationTs >= last72h) {
              // For students: only show new assignments they can see
              if (role === 'alumno') {
                items.push({
                  id: `new-assign-${course.id}-${w.id}`,
                  type: 'assignment',
                  title: 'Nueva tarea publicada',
                  message: `${w.title || 'Tarea'} en ${course.name}`,
                  class: course.name,
                  timestamp: new Date(creationTs).toLocaleString(),
                  read: false,
                  priority: 'media',
                })
              } else {
                // professor/coordinator also see new coursework
                items.push({
                  id: `new-assign-${course.id}-${w.id}`,
                  type: 'assignment',
                  title: 'Nueva tarea creada',
                  message: `${w.title || 'Tarea'} en ${course.name}`,
                  class: course.name,
                  timestamp: new Date(creationTs).toLocaleString(),
                  read: false,
                  priority: 'media',
                })
              }
            }

            // Note: soon/overdue for students will be gated by their submission status below.

            // Student submissions (new/returned in last 72h) and gating for student-specific due alerts
            try {
              const sRes = await fetch(`/api/classroom/courses/${course.id}/courseWork/${w.id}/studentSubmissions`)
              if (sRes.ok) {
                const sData = await sRes.json()
                const subs = Array.isArray(sData?.studentSubmissions) ? sData.studentSubmissions : []
                // Determine if the current student has delivered
                let deliveredByStudent = false
                for (const s of subs) {
                  const state = s?.state
                  if (state === 'TURNED_IN' || state === 'RETURNED') deliveredByStudent = true
                }
                for (const s of subs) {
                  const state = s?.state
                  const updTs = s?.updateTime ? new Date(s.updateTime).getTime() : 0
                  if (updTs && updTs >= last72h) {
                    const isTurned = state === 'TURNED_IN' || state === 'RETURNED'
                    if (role !== 'alumno' && isTurned) {
                      items.push({
                        id: `subm-${course.id}-${w.id}-${s?.userId || 'unknown'}`,
                        type: 'assignment',
                        title: state === 'RETURNED' ? 'Tarea devuelta' : 'Nueva entrega de tarea',
                        message: `${w.title || 'Tarea'} en ${course.name}`,
                        class: course.name,
                        timestamp: new Date(updTs).toLocaleString(),
                        read: false,
                        priority: 'media',
                      })
                    }
                  }
                }
                // Add due alerts
                if (role === 'alumno') {
                  if (!deliveredByStudent && soon) {
                    items.push({
                      id: `soon-${course.id}-${w.id}`,
                      type: 'assignment',
                      title: 'Tarea vence pronto',
                      message: `${w.title || 'Tarea'} vence pronto en ${course.name}`,
                      class: course.name,
                      timestamp: new Date().toLocaleString(),
                      read: false,
                      priority: soonUrgent ? 'alta' : 'media',
                    })
                  }
                  if (!deliveredByStudent && overdue) {
                    items.push({
                      id: `overdue-${course.id}-${w.id}`,
                      type: 'overdue',
                      title: 'Tarea vencida',
                      message: `${w.title || 'Tarea'} está vencida en ${course.name}`,
                      class: course.name,
                      timestamp: new Date().toLocaleString(),
                      read: false,
                      priority: 'alta',
                    })
                  }
                } else {
                  // For teachers, keep generic due alerts
                  if (soon) {
                    items.push({
                      id: `soon-${course.id}-${w.id}`,
                      type: 'assignment',
                      title: 'Tarea vence pronto',
                      message: `${w.title || 'Tarea'} vence pronto en ${course.name}`,
                      class: course.name,
                      timestamp: new Date().toLocaleString(),
                      read: false,
                      priority: soonUrgent ? 'alta' : 'media',
                    })
                  }
                  if (overdue) {
                    items.push({
                      id: `overdue-${course.id}-${w.id}`,
                      type: 'overdue',
                      title: 'Tarea vencida',
                      message: `${w.title || 'Tarea'} está vencida en ${course.name}`,
                      class: course.name,
                      timestamp: new Date().toLocaleString(),
                      read: false,
                      priority: 'alta',
                    })
                  }
                }
              }
            } catch {}
          }
        }

        if (!mounted) return
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[]
          const merged = items.map(n => saved.includes(n.id) ? { ...n, read: true } : n)
          setNotifications(merged)
          // persist unread count for header badge
          const unread = merged.filter(n => !n.read).length
          localStorage.setItem(`aulux_unread_count_${role}_${session?.user?.email || 'anon'}`, String(unread))
        } catch {
          setNotifications(items)
          const unread = items.filter(n => !n.read).length
          localStorage.setItem(`aulux_unread_count_${role}_${session?.user?.email || 'anon'}`, String(unread))
        }
      } catch (e:any) {
        if (!mounted) return
        setError(e?.message || 'Error cargando notificaciones')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [role])

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read
    if (filter === 'high') return notification.priority === 'alta'
    return true
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />
      case 'overdue':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'attendance':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'progress':
        return <InformationCircleIcon className="h-5 w-5 text-green-500" />
      case 'sync':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />
      case 'system':
        return <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
      case 'achievement':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'border-l-red-500'
      case 'media': return 'border-l-yellow-500'
      case 'baja': return 'border-l-green-500'
      default: return 'border-l-gray-300'
    }
  }

  const markAsRead = (id: string | number) => {
    setNotifications(prev => {
      const next = prev.map(notification => (
        notification.id === id ? { ...notification, read: true } : notification
      ))
      try {
        const readIds = new Set<string>(JSON.parse(localStorage.getItem(storageKey) || '[]'))
        readIds.add(String(id))
        localStorage.setItem(storageKey, JSON.stringify(Array.from(readIds)))
        const unread = next.filter(n => !n.read).length
        localStorage.setItem(`aulux_unread_count_${role}_${session?.user?.email || 'anon'}`, String(unread))
      } catch {}
      return next
    })
  }

  const markAllAsRead = () => {
    setNotifications(prev => {
      const next = prev.map(notification => ({ ...notification, read: true }))
      try {
        const ids = next.map(n => String(n.id))
        localStorage.setItem(storageKey, JSON.stringify(ids))
        localStorage.setItem(`aulux_unread_count_${role}_${session?.user?.email || 'anon'}`, '0')
      } catch {}
      return next
    })
  }

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link href="/" className="mr-4">
                <ArrowLeftIcon className="h-6 w-6 text-gray-400 hover:text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notificaciones</h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : 'Todas las notificaciones leídas'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-sm text-primary hover:text-blue-700"
                >
                  Marcar todas como leídas
                </button>
              )}
              <BellIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="card mb-6">Cargando notificaciones...</div>
        )}
        {error && (
          <div className="card mb-6 text-red-300">{error}</div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Notifications List */}
          <div className="lg:col-span-3">
            {/* Filter Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setFilter('all')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      filter === 'all'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Todas ({notifications.length})
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      filter === 'unread'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Sin leer ({unreadCount})
                  </button>
                  <button
                    onClick={() => setFilter('high')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      filter === 'high'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Alta prioridad ({notifications.filter(n => n.priority === 'alta').length})
                  </button>
                </nav>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`card border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.read ? 'bg-blue-50 dark:bg-gray-800' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-300">
                            <span>{notification.class}</span>
                            <span className="flex items-center">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              {notification.timestamp}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-primary hover:text-blue-700"
                              >
                                Marcar como leída
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-xs text-gray-400 hover:text-red-500"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredNotifications.length === 0 && (
              <div className="text-center py-12">
                <BellIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Sin notificaciones</h3>
                <p className="text-gray-500 dark:text-gray-300">
                  {filter === 'unread' 
                    ? '¡Estás al día! No hay notificaciones sin leer.'
                    : 'Ninguna notificación coincide con tu filtro actual.'}
                </p>
              </div>
            )}
          </div>

          {/* Notification Settings */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                Configuración de notificaciones
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Actualizaciones de tareas</label>
                  <input
                    type="checkbox"
                    checked={settings.assignments}
                    onChange={(e) => setSettings(prev => ({ ...prev, assignments: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Alertas de vencimiento</label>
                  <input
                    type="checkbox"
                    checked={settings.overdue}
                    onChange={(e) => setSettings(prev => ({ ...prev, overdue: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Alertas de asistencia</label>
                  <input
                    type="checkbox"
                    checked={settings.attendance}
                    onChange={(e) => setSettings(prev => ({ ...prev, attendance: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Actualizaciones de progreso</label>
                  <input
                    type="checkbox"
                    checked={settings.progress}
                    onChange={(e) => setSettings(prev => ({ ...prev, progress: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Notificaciones de sincronización</label>
                  <input
                    type="checkbox"
                    checked={settings.sync}
                    onChange={(e) => setSettings(prev => ({ ...prev, sync: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Actualizaciones del sistema</label>
                  <input
                    type="checkbox"
                    checked={settings.system}
                    onChange={(e) => setSettings(prev => ({ ...prev, system: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Logros</label>
                  <input
                    type="checkbox"
                    checked={settings.achievements}
                    onChange={(e) => setSettings(prev => ({ ...prev, achievements: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card mt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Resumen de notificaciones</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Total</span>
                  <span className="font-medium">{notifications.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Sin leer</span>
                  <span className="font-medium text-primary">{unreadCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Alta prioridad</span>
                  <span className="font-medium text-red-600">
                    {notifications.filter(n => n.priority === 'alta').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
