'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import AuthButton from '@/components/AuthButton'
import NotificationBell from '@/components/NotificationBell'
import {
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  BellIcon,
  ArrowLeftIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

export default function StudentHome() {
  const { data: session } = useSession()
  const name = session?.user?.name || 'Estudiante'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [courseworkByCourse, setCourseworkByCourse] = useState<Record<string, any[]>>({})
  const [assignments, setAssignments] = useState<{
    id: string
    title: string
    courseId: string
    courseName: string
    dueDate?: string
    status: 'pendiente' | 'entregada' | 'devuelta' | 'desconocido'
    alternateLink?: string
  }[]>([])

  // Map Classroom submission state to human-readable
  const mapSubmissionState = (state?: string): 'pendiente' | 'entregada' | 'devuelta' | 'desconocido' => {
    switch (state) {
      case 'TURNED_IN':
        return 'entregada'
      case 'RETURNED':
        return 'devuelta'
      case 'NEW':
      case 'CREATED':
        return 'pendiente'
      case 'RECLAIMED_BY_STUDENT':
        return 'pendiente' // El estudiante retiró la entrega, ahora está pendiente
      default:
        return state ? 'desconocido' : 'pendiente'
    }
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)

        // 1) Cursos
        const cRes = await fetch('/api/classroom/courses')
        if (!cRes.ok) throw new Error('No se pudieron obtener los cursos')
        const cData = await cRes.json()
        const list = Array.isArray(cData?.courses) ? cData.courses : []
        if (!mounted) return
        setCourses(list)

        // 2) Coursework por curso
        const cwEntries = await Promise.all(list.map(async (course: any) => {
          const cwRes = await fetch(`/api/classroom/courses/${course.id}/courseWork`)
          if (!cwRes.ok) return [course.id, []] as const
          const cwData = await cwRes.json()
          const items = Array.isArray(cwData?.courseWork) ? cwData.courseWork : []
          return [course.id, items] as const
        }))
        if (!mounted) return
        const cwMap: Record<string, any[]> = {}
        cwEntries.forEach(([cid, items]) => { cwMap[cid] = items })
        setCourseworkByCourse(cwMap)

        // 3) Submissions por coursework (del alumno actual)
        const allAssignments: {
          id: string
          title: string
          courseId: string
          courseName: string
          dueDate?: string
          status: 'pendiente' | 'entregada' | 'devuelta' | 'desconocido'
          alternateLink?: string
        }[] = []

        // Obtener el userId del estudiante actual
        const currentUserEmail = session?.user?.email
        console.log('🔍 Current user email:', currentUserEmail)

        for (const course of list) {
          const items = cwMap[course.id] || []
          for (const work of items) {
            let status: 'pendiente' | 'entregada' | 'devuelta' | 'desconocido' = 'pendiente'
            try {
              const sRes = await fetch(`/api/classroom/courses/${course.id}/courseWork/${work.id}/studentSubmissions`)
              if (sRes.ok) {
                const sData = await sRes.json()
                const submissions = Array.isArray(sData?.studentSubmissions) ? sData.studentSubmissions : []
                
                // Buscar la submission específica del estudiante actual
                let mySubmission = null
                if (currentUserEmail) {
                  // Primero intentar por email si está disponible en el profile
                  mySubmission = submissions.find(sub => 
                    sub.userId && sub.userId === session?.user?.id ||
                    (sub.profile?.emailAddress && sub.profile.emailAddress.toLowerCase() === currentUserEmail.toLowerCase())
                  )
                }
                
                // Si no se encuentra por email, usar la primera submission (fallback)
                if (!mySubmission && submissions.length > 0) {
                  mySubmission = submissions[0]
                }
                
                if (mySubmission) {
                  status = mapSubmissionState(mySubmission.state)
                  console.log(`📝 Tarea "${work.title}": ${mySubmission.state} -> ${status}`)
                } else {
                  console.log(`⚠️ No se encontró submission para tarea "${work.title}"`)
                }
              }
            } catch (err) {
              console.error(`❌ Error obteniendo submissions para ${work.title}:`, err)
            }

            allAssignments.push({
              id: String(work.id),
              title: work.title || 'Tarea',
              courseId: String(course.id),
              courseName: course.name || 'Curso',
              dueDate: work?.dueDate ? `${work.dueDate.year}-${String(work.dueDate.month).padStart(2,'0')}-${String(work.dueDate.day).padStart(2,'0')}` : undefined,
              status,
              alternateLink: work?.alternateLink,
            })
          }
        }

        if (!mounted) return
        setAssignments(allAssignments)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Error cargando datos')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  const myCourses = useMemo(() => {
    const result = courses.map((c) => {
      const pendingTasks = assignments.filter(a => a.courseId === String(c.id) && a.status === 'pendiente')
      console.log(`🏫 Curso "${c.name}": ${pendingTasks.length} pendientes`)
      pendingTasks.forEach(task => {
        console.log(`  - "${task.title}": ${task.status}`)
      })
      
      return {
        id: c.id,
        name: c.name,
        pending: pendingTasks.length,
      }
    })
    
    return result
  }, [courses, assignments])

  const myAssignments = assignments

  // Helpers
  const isOverdue = (a: { dueDate?: string; status: string }) => {
    if (!a.dueDate) return false
    const due = new Date(a.dueDate + 'T23:59:59')
    const now = new Date()
    const notDelivered = a.status !== 'entregada' && a.status !== 'devuelta'
    return notDelivered && due.getTime() < now.getTime()
  }

  const isSoon = (a: { dueDate?: string; status: string }) => {
    if (!a.dueDate) return false
    const now = new Date().getTime()
    const due = new Date(a.dueDate + 'T23:59:59').getTime()
    const within48h = due - now <= 48 * 60 * 60 * 1000 && due - now > 0
    const notDelivered = a.status !== 'entregada' && a.status !== 'devuelta'
    return notDelivered && within48h
  }

  // KPIs
  const kpis = useMemo(() => {
    const entregadas = myAssignments.filter(a => a.status === 'entregada').length
    const devueltas = myAssignments.filter(a => a.status === 'devuelta').length
    const pendientes = myAssignments.filter(a => a.status === 'pendiente').length
    const vencidas = myAssignments.filter(a => isOverdue(a)).length
    
    console.log('📊 KPIs calculados:')
    console.log(`  - Total tareas: ${myAssignments.length}`)
    console.log(`  - Entregadas: ${entregadas}`)
    console.log(`  - Devueltas: ${devueltas}`)
    console.log(`  - Pendientes: ${pendientes}`)
    console.log(`  - Vencidas: ${vencidas}`)
    
    // Debug: mostrar detalle de cada tarea
    myAssignments.forEach(a => {
      console.log(`  📝 "${a.title}" (${a.courseName}): ${a.status}`)
    })
    
    return { entregadas, devueltas, pendientes, vencidas }
  }, [myAssignments])

  // Filters
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const filteredAssignments = useMemo(() => {
    return myAssignments.filter(a => {
      const byCourse = filterCourse === 'all' || a.courseId === filterCourse
      const byStatus = (() => {
        if (filterStatus === 'all') return true
        if (filterStatus === 'vencida') return isOverdue(a)
        if (filterStatus === 'pronto') return isSoon(a)
        return a.status === filterStatus
      })()
      return byCourse && byStatus
    })
  }, [myAssignments, filterCourse, filterStatus])

  // Actividad reciente (72h): nuevas tareas y vence pronto/vencida (solo si no entregó)
  const recentActivity = useMemo(() => {
    const now = Date.now()
    const last72h = now - 72 * 60 * 60 * 1000
    const deliveredIds = new Set(
      myAssignments.filter(a => a.status === 'entregada' || a.status === 'devuelta').map(a => a.id)
    )
    const out: Array<{ id: string; action: string; class: string; time: string; }> = []
    for (const c of courses) {
      const list = courseworkByCourse[String(c.id)] || []
      for (const w of list) {
        // Nueva tarea
        const creationTs = w?.creationTime ? new Date(w.creationTime).getTime() : 0
        if (creationTs && creationTs >= last72h) {
          out.push({ id: `new-${c.id}-${w.id}`, action: `Nueva tarea: ${w.title || 'Tarea'}` , class: c.name, time: new Date(creationTs).toLocaleString() })
        }
        // Vence pronto / Vencida si no entregó
        const dueIso = w?.dueDate ? `${w.dueDate.year}-${String(w.dueDate.month).padStart(2,'0')}-${String(w.dueDate.day).padStart(2,'0')}` : undefined
        const dueTs = dueIso ? new Date(dueIso).getTime() : undefined
        const soon = dueTs ? (dueTs - now <= 48*60*60*1000 && dueTs - now > 0) : false
        const overdue = dueTs ? (dueTs < now) : false
        if (!deliveredIds.has(String(w.id))) {
          if (soon) out.push({ id: `soon-${c.id}-${w.id}`, action: `Vence pronto: ${w.title || 'Tarea'}`, class: c.name, time: new Date().toLocaleString() })
          if (overdue) out.push({ id: `over-${c.id}-${w.id}`, action: `Tarea vencida: ${w.title || 'Tarea'}`, class: c.name, time: new Date().toLocaleString() })
        }
      }
    }
    return out.slice(0, 5)
  }, [courses, courseworkByCourse, myAssignments])

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inicio alumno</h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">Hola {name}, aquí verás tus cursos y tareas</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="card mb-6">Cargando datos de Classroom...</div>
        )}
        {error && (
          <div className="card mb-6 text-red-300">{error}</div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-100">
                <AcademicCapIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Mis cursos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{myCourses.length}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-yellow-100">
                <ClipboardDocumentListIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tareas pendientes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.pendientes}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.entregadas}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-red-100">
                <ClockIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Vencidas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.vencidas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cursos */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Cursos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCourses.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{c.name}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{c.pending} pendientes</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                  {c.pending > 0 ? `Tienes ${c.pending} tarea${c.pending > 1 ? 's' : ''} pendiente${c.pending > 1 ? 's' : ''}` : 'Todas las tareas completadas'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tareas */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tareas</h2>
            <div className="flex items-center gap-2">
              <select value={filterCourse} onChange={(e)=>setFilterCourse(e.target.value)} className="input-field w-auto">
                <option value="all">Todos los cursos</option>
                {myCourses.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="input-field w-auto">
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="entregada">Entregada</option>
                <option value="devuelta">Devuelta</option>
                <option value="vencida">Vencida</option>
                <option value="pronto">Vence pronto (48h)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((a) => (
              <div key={a.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{a.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{a.courseName}</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-300 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {a.dueDate || 'sin fecha'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    a.status === 'entregada'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : a.status === 'devuelta'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : isOverdue(a)
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {isOverdue(a) ? 'vencida' : a.status}
                  </span>
                  {(!isOverdue(a) && isSoon(a)) && (
                    <span className="ml-2 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      vence pronto
                    </span>
                  )}
                  <a
                    href={a.alternateLink || `https://classroom.google.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 font-medium py-2 px-4 rounded-lg text-sm"
                  >
                    Ver en Classroom
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
