'use client'

import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  AcademicCapIcon, 
  ChartBarIcon, 
  ClipboardDocumentListIcon,
  BellIcon,
  UserGroupIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import AuthButton from '@/components/AuthButton'
import NotificationBell from '@/components/NotificationBell'
import NotificationTester from '@/components/NotificationTester'
import AutoNotificationToggle from '@/components/AutoNotificationToggle'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Todos los hooks deben estar aquí, antes de cualquier return condicional
  const user = useMemo(() => ({
    name: session?.user?.name || 'Usuario',
    role: (session?.user as any)?.role || 'alumno',
  }), [session])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalCourseWork, setTotalCourseWork] = useState(0)
  const [pendingCourseWork, setPendingCourseWork] = useState(0)

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'alumno') {
      router.replace('/student')
    }
  }, [status, session, router])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        // Courses
        const cRes = await fetch('/api/classroom/courses')
        if (!cRes.ok) throw new Error('No se pudieron obtener cursos')
        const cData = await cRes.json()
        const list = Array.isArray(cData?.courses) ? cData.courses : []
        if (!mounted) return
        setCourses(list)

        // Roster counts and coursework
        let studentsCount = 0
        let cwCount = 0
        let cwPending = 0
        const now = Date.now()
        for (const course of list) {
          try {
            const rRes = await fetch(`/api/classroom/courses/${course.id}/students`)
            if (rRes.ok) {
              const rData = await rRes.json()
              const roster = Array.isArray(rData?.students) ? rData.students : []
              studentsCount += roster.length
            }
          } catch {}
          try {
            const wRes = await fetch(`/api/classroom/courses/${course.id}/courseWork`)
            if (wRes.ok) {
              const wData = await wRes.json()
              const works = Array.isArray(wData?.courseWork) ? wData.courseWork : []
              cwCount += works.length
              for (const w of works) {
                if (!w?.dueDate) { cwPending += 1; continue }
                const iso = `${w.dueDate.year}-${String(w.dueDate.month).padStart(2,'0')}-${String(w.dueDate.day).padStart(2,'0')}`
                if (new Date(iso).getTime() >= now) cwPending += 1
              }
            }
          } catch {}
        }
        if (!mounted) return
        setTotalStudents(studentsCount)
        setTotalCourseWork(cwCount)
        setPendingCourseWork(cwPending)
      } catch (e:any) {
        if (!mounted) return
        setError(e?.message || 'Error cargando datos')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // Build recent activity (last 72h): new tasks, due soon, overdue
  useEffect(() => {
    const now = Date.now()
    const last72h = now - 72 * 60 * 60 * 1000
    const items: any[] = []
    for (const course of courses) {
      // This list is populated when stats load fetched courseWork already
      // We don't keep courseWork state, so recompute lightweight from counts would lose details.
      // Instead, skip if no courses yet; detailed events are computed in notifications page.
    }
    // As a quick recent: derive from courseWork again for accuracy
    async function derive() {
      const out: any[] = []
      for (const course of courses) {
        try {
          const wRes = await fetch(`/api/classroom/courses/${course.id}/courseWork`)
          if (!wRes.ok) continue
          const wData = await wRes.json()
          const works = Array.isArray(wData?.courseWork) ? wData.courseWork : []
          for (const w of works) {
            const creationTs = w?.creationTime ? new Date(w.creationTime).getTime() : 0
            const dueIso = w?.dueDate ? `${w.dueDate.year}-${String(w.dueDate.month).padStart(2,'0')}-${String(w.dueDate.day).padStart(2,'0')}` : undefined
            const dueTs = dueIso ? new Date(dueIso).getTime() : undefined
            const soon = dueTs ? (dueTs - now <= 48*60*60*1000 && dueTs - now > 0) : false
            const overdue = dueTs ? (dueTs < now) : false
            if (creationTs && creationTs >= last72h) {
              out.push({ id: `new-${course.id}-${w.id}`, action: `Nueva tarea: ${w.title || 'Tarea'}`, class: course.name, time: new Date(creationTs).toLocaleString() })
            }
            if (soon) {
              out.push({ id: `soon-${course.id}-${w.id}`, action: `Vence pronto: ${w.title || 'Tarea'}`, class: course.name, time: new Date().toLocaleString() })
            }
            if (overdue) {
              out.push({ id: `over-${course.id}-${w.id}`, action: `Tarea vencida: ${w.title || 'Tarea'}`, class: course.name, time: new Date().toLocaleString() })
            }
          }
        } catch {}
      }
      // Keep latest 5
      setRecentActivity(out.slice(0, 5))
    }
    if (courses.length) derive()
  }, [courses])

  // Mostrar loading mientras se determina el estado
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si es estudiante, mostrar loading mientras se redirige (evita el pantallazo)
  if (status === 'authenticated' && (session?.user as any)?.role === 'alumno') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Redirigiendo a vista de estudiante...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              <AcademicCapIcon className="mx-auto h-16 w-16 text-blue-600" />
              <h1 className="mt-6 text-4xl font-bold text-gray-900 dark:text-gray-100">
                Aulux
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Semillero Digital Dashboard
              </p>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Plataforma educativa digital integrada con Google Classroom para jóvenes en situación de vulnerabilidad.
              </p>
            </div>
            
            <div className="space-y-4">
              <AuthButton />
              
              <div className="grid grid-cols-1 gap-4 mt-8">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <UserGroupIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Para Estudiantes</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Accede a tus cursos y tareas</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <ChartBarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Para Profesores</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Gestiona clases y seguimiento</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Para Coordinadores</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Métricas y reportes avanzados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      title: 'Resumen de clases',
      description: 'Gestiona tus clases y visualiza detalles',
      href: '/classes',
      icon: AcademicCapIcon,
      color: 'bg-primary'
    },
    {
      title: 'Progreso de estudiantes',
      description: 'Monitorea rendimiento y progreso',
      href: '/progress',
      icon: ChartBarIcon,
      color: 'bg-secondary'
    },
    {
      title: 'Seguimiento de tareas',
      description: 'Estados y fechas límite de tareas',
      href: '/assignments',
      icon: ClipboardDocumentListIcon,
      color: 'bg-orange-500'
    },
    {
      title: 'Notificaciones',
      description: 'Ver y administrar notificaciones',
      href: '/notifications',
      icon: BellIcon,
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Aulux: Semillero Digital Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              {status === 'authenticated' && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300 capitalize">{user.role}</p>
                  </div>
                </div>
              )}
              <AuthButton />
            </div>
          </div>
        </div>
      </header>


      {status !== 'authenticated' ? (
        // Landing (pre-login)
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <section className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">Tu capa complementaria para Google Classroom</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Aulux se conecta directamente con Google Classroom para ofrecer paneles claros, seguimiento de tareas, progreso y notificaciones. No reemplaza Classroom; lo potencia.</p>
            <div className="mt-6">
              <AuthButton />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Inicias sesión con tu cuenta de Google. Solo pedimos permisos de lectura para cursos, rosters y tareas.</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="card">
              <div className="flex items-start">
                <ClipboardDocumentListIcon className="h-6 w-6 text-primary mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Seguimiento de tareas</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Estados claros, vencimientos y recordatorios opcionales.</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-start">
                <ChartBarIcon className="h-6 w-6 text-secondary mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Progreso y métricas</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Indicadores de avance por curso y por estudiante.</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-start">
                <BellIcon className="h-6 w-6 text-purple-500 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notificaciones</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Avisos de nuevas tareas, cambios y sincronizaciones.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Privacidad y permisos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Aulux solo lee la información necesaria de Google Classroom para mostrar paneles y resúmenes. No modifica ni reemplaza tus clases ni tareas. Puedes revocar permisos cuando quieras desde tu cuenta de Google.</p>
          </section>
        </main>
      ) : (
        // Authenticated dashboard
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Ya estamos autenticados en esta rama */}
          {/* Welcome Section */}
          <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">¡Bienvenida de nuevo, {user.name}!</h2>
              <p className="text-gray-600 dark:text-gray-300">Aquí tienes un resumen de tus clases y actividades.</p>
          </div>

          {/* Loading / Error */}
          {loading && (
            <div className="card mb-6">Cargando datos de Classroom...</div>
          )}
          {error && (
            <div className="card mb-6 text-red-300">{error}</div>
          )}

          {/* Stats Grid (reales) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-blue-100">
                  <AcademicCapIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Clases activas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{courses.length}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-green-100">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de estudiantes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalStudents}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-orange-100">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tareas vigentes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingCourseWork}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-purple-100">
                  <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de tareas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCourseWork}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Acciones rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <div className="card hover:shadow-md transition-shadow duration-200 cursor-pointer">
                    <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{action.title}</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Acceso especial para coordinadores */}
          {user.role === 'coordinador' && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-2">🎯 Panel de Coordinación</h3>
                    <p className="text-purple-100">Accede a métricas avanzadas y herramientas de supervisión</p>
                  </div>
                  <Link href="/coordinator" className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                    Acceder →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Actividad reciente</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">{activity.class}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-400">{activity.time}</span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-300">Sin eventos recientes. Revisa más en <Link href="/notifications" className="text-primary">Notificaciones</Link>.</div>
              )}
            </div>
          </div>

          {/* Notificaciones automáticas y tester */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AutoNotificationToggle />
            <NotificationTester />
          </div>
        </main>
      )}
    </div>
  )
}
