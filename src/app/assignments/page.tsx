'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BellIcon
} from '@heroicons/react/24/outline'

export default function AssignmentTracking() {
  const { data: session, status } = useSession()
  const router = useRouter()
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'alumno') {
      router.replace('/student')
    }
  }, [status, session, router])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])

  // Helpers
  const toIsoDate = (d?: any) => d ? `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}` : undefined
  const isPast = (iso?: string) => iso ? new Date(iso).getTime() < Date.now() : false
  const computePriority = (iso?: string) => {
    if (!iso) return 'baja'
    const ms = new Date(iso).getTime() - Date.now()
    const days = ms / (1000*60*60*24)
    if (days <= 2) return 'alta'
    if (days <= 7) return 'media'
    return 'baja'
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)

        // 1) Courses
        const cRes = await fetch('/api/classroom/courses')
        if (!cRes.ok) throw new Error('No se pudieron obtener cursos')
        const cData = await cRes.json()
        const list = Array.isArray(cData?.courses) ? cData.courses : []
        if (!mounted) return
        setCourses(list)

        // 2) Aggregate coursework and submissions
        const agg: any[] = []
        for (const course of list) {
          const cwRes = await fetch(`/api/classroom/courses/${course.id}/courseWork`)
          if (!cwRes.ok) continue
          const cwData = await cwRes.json()
          const works = Array.isArray(cwData?.courseWork) ? cwData.courseWork : []

          for (const work of works) {
            let submitted = 0
            let overdue = 0
            let missing = 0
            let resubmission = 0

            try {
              const sRes = await fetch(`/api/classroom/courses/${course.id}/courseWork/${work.id}/studentSubmissions`)
              if (sRes.ok) {
                const sData = await sRes.json()
                const subs = Array.isArray(sData?.studentSubmissions) ? sData.studentSubmissions : []
                // Nota: sin scope de curso completo puede que solo veamos "me". Igual computamos con lo disponible.
                for (const s of subs) {
                  const state = s?.state
                  const dueIso = toIsoDate(work?.dueDate)
                  const turnedIn = state === 'TURNED_IN' || state === 'RETURNED'
                  if (turnedIn) submitted += 1
                  if (!turnedIn && isPast(dueIso)) overdue += 1
                  if (!turnedIn && !isPast(dueIso)) missing += 1
                  if (state === 'RETURNED') resubmission += 1
                }
              }
            } catch {}

            const dueIso = toIsoDate(work?.dueDate)
            const createdIso = work?.creationTime ? new Date(work.creationTime).toISOString().slice(0,10) : undefined
            const totalStudents = submitted + overdue + missing
            const status = submitted > 0 && overdue === 0 && missing === 0 ? 'completada' : 'activa'
            const priority = computePriority(dueIso)
            agg.push({
              id: String(work.id),
              title: work.title || 'Tarea',
              class: course.name || 'Curso',
              classId: course.id,
              dueDate: dueIso,
              createdDate: createdIso,
              totalStudents,
              submitted,
              overdue,
              missing,
              resubmission,
              status,
              priority,
              description: work?.description || '',
            })
          }
        }
        if (!mounted) return
        setAssignments(agg)
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

  // Early returns AFTER hooks to keep hook order stable
  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">Cargando...</div>
  }
  if (status === 'authenticated' && (session?.user as any)?.role === 'alumno') {
    return null
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.class.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = filterClass === 'all' || assignment.classId.toString() === filterClass
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus
    return matchesSearch && matchesClass && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completada': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'activa': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'vencida': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'media': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'baja': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completada':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      case 'activa':
        return <ClockIcon className="h-4 w-4 text-blue-500" />
      case 'vencida':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getCompletionPercentage = (assignment: any) => {
    return Math.round((assignment.submitted / assignment.totalStudents) * 100)
  }

  const handleNotificationToggle = () => {
    setNotificationsEnabled(!notificationsEnabled)
    // In a real app, this would update user preferences
  }

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Seguimiento de tareas</h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">Monitorea entregas y fechas límite</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleNotificationToggle}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  notificationsEnabled 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <BellIcon className="h-4 w-4" />
                <span className="text-sm">
                  {notificationsEnabled ? 'Notificaciones activas' : 'Notificaciones desactivadas'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-100">
                <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de tareas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{assignments.length}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {assignments.filter(a => a.status === 'completada').length}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-yellow-100">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Activas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {assignments.filter(a => a.status === 'activa').length}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Entregas vencidas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {assignments.reduce((sum, a) => sum + a.overdue, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">Todas las clases</option>
              {courses.map((c: any) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="completada">Completada</option>
              <option value="vencida">Vencida</option>
            </select>
          </div>
        </div>

        {/* Assignments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAssignments.map((assignment) => (
            <div key={assignment.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {getStatusIcon(assignment.status)}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">{assignment.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{assignment.description}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">{assignment.class}</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                    {assignment.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(assignment.priority)}`}>
                    prioridad {assignment.priority}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <span>Progreso de entregas</span>
                  <span>{getCompletionPercentage(assignment)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getCompletionPercentage(assignment)}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mb-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">{assignment.submitted}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-300">Entregadas</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{assignment.overdue}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-300">Vencidas</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-600 dark:text-gray-300">{assignment.missing}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-300">Faltantes</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-yellow-600">{assignment.resubmission}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-300">Reentrega</div>
                </div>
              </div>

              {/* Assignment Details */}
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-300 mb-4">
                <div className="flex items-center">
                  <CalendarDaysIcon className="h-4 w-4 mr-1" />
                  <span>Entrega: {assignment.dueDate}</span>
                </div>
                <div>
                  <span>Creada: {assignment.createdDate}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Link href={`/assignments/${assignment.id}`} className="flex-1">
                  <button className="w-full btn-primary text-sm py-2">
                    Ver detalles
                  </button>
                </Link>
                <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm">
                  Enviar recordatorio
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredAssignments.length === 0 && (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron tareas</h3>
            <p className="text-gray-500">Prueba ajustando tu búsqueda o filtros.</p>
          </div>
        )}
      </main>
    </div>
  )
}
