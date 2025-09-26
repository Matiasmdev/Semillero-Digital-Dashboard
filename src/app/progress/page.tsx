'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'

export default function StudentProgress() {
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [submissionsAgg, setSubmissionsAgg] = useState<any[]>([])
  const [rosters, setRosters] = useState<Record<string, any[]>>({})
  const [viewMode, setViewMode] = useState<'course' | 'student'>('course')

  const toIso = (d?: any) => d ? `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}` : undefined
  
  const getSubmissionStatus = (submission: any, work: any) => {
    const state = submission?.state
    const updateTime = submission?.updateTime
    const dueDate = work?.dueDate
    
    // Si no está entregada, es pendiente
    if (state === 'NEW' || state === 'CREATED' || !state) {
      return 'pending'
    }
    
    // Si está entregada pero no hay fecha límite, consideramos a tiempo
    if (!dueDate) {
      return state === 'TURNED_IN' || state === 'RETURNED' ? 'ontime' : 'pending'
    }
    
    // Si hay fecha límite, verificar si se entregó a tiempo
    if (updateTime && (state === 'TURNED_IN' || state === 'RETURNED')) {
      const dueIso = toIso(dueDate) + 'T23:59:59' // Fin del día
      const submissionTime = new Date(updateTime).getTime()
      const dueTime = new Date(dueIso).getTime()
      
      return submissionTime <= dueTime ? 'ontime' : 'late'
    }
    
    return 'pending'
  }

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

        // submissions aggregate
        const agg: any[] = []
        const rosterMap: Record<string, any[]> = {}
        for (const course of list) {
          // fetch roster for student names (best-effort)
          try {
            const rRes = await fetch(`/api/classroom/courses/${course.id}/students`)
            if (rRes.ok) {
              const rData = await rRes.json()
              rosterMap[course.id] = Array.isArray(rData?.students) ? rData.students : []
            }
          } catch {}
          const cwRes = await fetch(`/api/classroom/courses/${course.id}/courseWork`)
          if (!cwRes.ok) continue
          const cwData = await cwRes.json()
          const works = Array.isArray(cwData?.courseWork) ? cwData.courseWork : []
          for (const work of works) {
            try {
              const sRes = await fetch(`/api/classroom/courses/${course.id}/courseWork/${work.id}/studentSubmissions`)
              if (!sRes.ok) continue
              const sData = await sRes.json()
              const subs = Array.isArray(sData?.studentSubmissions) ? sData.studentSubmissions : []
              for (const s of subs) {
                const status = getSubmissionStatus(s, work)
                const dueIso = toIso(work?.dueDate)
                
                // Debug log para verificar el cálculo
                console.log(`📝 Tarea "${work.title}":`)
                console.log(`  - Estado original: ${s?.state}`)
                console.log(`  - Fecha límite: ${dueIso}`)
                console.log(`  - Fecha entrega: ${s?.updateTime}`)
                console.log(`  - Estado calculado: ${status}`)
                
                agg.push({
                  courseId: course.id,
                  courseName: course.name,
                  workId: work.id,
                  workTitle: work.title,
                  dueDate: dueIso,
                  state: s?.state,
                  status: status, // 'pending', 'ontime', 'late'
                  onTime: status === 'ontime',
                  isLate: status === 'late',
                  isPending: status === 'pending',
                  userId: s?.userId,
                  updateTime: s?.updateTime,
                })
              }
            } catch {}
          }
        }
        if (!mounted) return
        setSubmissionsAgg(agg)
        setRosters(rosterMap)
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

  // Early returns AFTER hooks to maintain stable hook order
  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">Cargando...</div>
  }
  if (status === 'authenticated' && (session?.user as any)?.role === 'alumno') {
    return null
  }

  const classes = useMemo(() => courses.map((c:any)=>({ id: c.id, name: c.name })), [courses])
  const kpis = useMemo(() => {
    const total = submissionsAgg.length || 1
    const completed = submissionsAgg.filter(s => s.status === 'ontime' || s.status === 'late').length
    const onTime = submissionsAgg.filter(s => s.status === 'ontime').length
    const late = submissionsAgg.filter(s => s.status === 'late').length
    const pending = submissionsAgg.filter(s => s.status === 'pending').length
    
    console.log('📊 KPIs Progress calculados:')
    console.log(`  - Total submissions: ${total}`)
    console.log(`  - Completadas: ${completed}`)
    console.log(`  - A tiempo: ${onTime}`)
    console.log(`  - Tardías: ${late}`)
    console.log(`  - Pendientes: ${pending}`)
    
    return { total, completed, onTime, late, pending, atRisk: pending }
  }, [submissionsAgg])

  // data for charts
  const barData = useMemo(() => ([
    { name: 'Completadas', value: kpis.completed },
    { name: 'Pendientes', value: kpis.pending },
  ]), [kpis])

  const pieData = useMemo(() => ([
    { name: 'A tiempo', value: kpis.onTime },
    { name: 'Tardías', value: kpis.late },
  ]), [kpis])

  const COLORS = ['#10B981', '#EF4444']

  // Build student-level rows
  const studentRows = useMemo(() => {
    // Key by courseId+userId
    const m = new Map<string, { courseId: string, courseName: string, userId: string, name: string, email: string, completed: number, total: number, onTime: number, lastActivity?: string }>()
    for (const s of submissionsAgg) {
      const key = `${s.courseId}::${s.userId || 'unknown'}`
      if (!m.has(key)) {
        // resolve name/email from roster
        let name = 'Desconocido'
        let email = ''
        const roster = rosters[String(s.courseId)] || []
        const found = roster.find((st: any) => st?.userId === s.userId)
        if (found) {
          name = found?.profile?.name?.fullName || name
          email = found?.profile?.emailAddress || ''
        }
        m.set(key, { courseId: String(s.courseId), courseName: s.courseName, userId: String(s.userId || 'unknown'), name, email, completed: 0, total: 0, onTime: 0, lastActivity: undefined })
      }
      const row = m.get(key)!
      row.total += 1
      const isCompleted = s.status === 'ontime' || s.status === 'late'
      if (isCompleted) row.completed += 1
      if (s.status === 'ontime') row.onTime += 1
      // track last activity
      if (s.updateTime) {
        if (!row.lastActivity || new Date(s.updateTime).getTime() > new Date(row.lastActivity).getTime()) {
          row.lastActivity = s.updateTime
        }
      }
    }
    return Array.from(m.values())
  }, [submissionsAgg, rosters])

  // Derive course-level rows from submissionsAgg
  const courseRows = useMemo(() => {
    const map = new Map<string, { courseId: string, courseName: string, completed: number, pending: number, onTime: number, total: number, status: string }>()
    for (const s of submissionsAgg) {
      const key = String(s.courseId)
      if (!map.has(key)) {
        map.set(key, { courseId: key, courseName: s.courseName || 'Curso', completed: 0, pending: 0, onTime: 0, total: 0, status: 'bueno' })
      }
      const row = map.get(key)!
      const isCompleted = s.status === 'ontime' || s.status === 'late'
      row.total += 1
      if (isCompleted) row.completed += 1
      else row.pending += 1
      if (s.status === 'ontime') row.onTime += 1
    }
    // compute status bucket by completion %
    Array.from(map.values()).forEach(row => {
      const pct = row.total ? Math.round((row.completed / row.total) * 100) : 0
      if (pct >= 85) row.status = 'excelente'
      else if (pct >= 70) row.status = 'bueno'
      else if (pct >= 50) row.status = 'requiere-atención'
      else row.status = 'en-riesgo'
    })
    return Array.from(map.values())
  }, [submissionsAgg])

  const filteredCourses = useMemo(() => {
    return courseRows.filter(row => {
      const matchesSearch = row.courseName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesClass = filterClass === 'all' || String(row.courseId) === filterClass
      const matchesStatus = filterStatus === 'all' || row.status === filterStatus
      return matchesSearch && matchesClass && matchesStatus
    })
  }, [courseRows, searchTerm, filterClass, filterStatus])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excelente': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'bueno': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'requiere-atención': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'en-riesgo': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tablero de progreso estudiantil</h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">Monitorea rendimiento y progreso</p>
              </div>
            </div>
            <ChartBarIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats (reales) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card"><div className="flex items-center"><div className="p-2 rounded-lg bg-green-100"><CheckCircleIcon className="h-6 w-6 text-green-600"/></div><div className="ml-4"><p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completadas</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.completed}</p></div></div></div>
          <div className="card"><div className="flex items-center"><div className="p-2 rounded-lg bg-blue-100"><ArrowTrendingUpIcon className="h-6 w-6 text-blue-600"/></div><div className="ml-4"><p className="text-sm font-medium text-gray-600 dark:text-gray-300">A tiempo</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.onTime}</p></div></div></div>
          <div className="card"><div className="flex items-center"><div className="p-2 rounded-lg bg-yellow-100"><ExclamationTriangleIcon className="h-6 w-6 text-yellow-600"/></div><div className="ml-4"><p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pendientes</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.atRisk}</p></div></div></div>
          <div className="card"><div className="flex items-center"><div className="p-2 rounded-lg bg-gray-100"><ChartBarIcon className="h-6 w-6 text-gray-600"/></div><div className="ml-4"><p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.total}</p></div></div></div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card col-span-1 lg:col-span-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Estado de envíos</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" stroke="#9CA3AF"/>
                  <YAxis stroke="#9CA3AF"/>
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">A tiempo vs tardías</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => setViewMode('course')} className={`px-3 py-1 rounded-lg text-sm ${viewMode === 'course' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>Por curso</button>
          <button onClick={() => setViewMode('student')} className={`px-3 py-1 rounded-lg text-sm ${viewMode === 'student' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>Por estudiante</button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar estudiantes..."
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
              {classes.map(cls => (
                <option key={cls.id} value={cls.id.toString()}>{cls.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">Todos los estados</option>
              <option value="excelente">Excelente</option>
              <option value="bueno">Bueno</option>
              <option value="requiere-atención">Requiere atención</option>
              <option value="en-riesgo">En riesgo</option>
            </select>
          </div>
        </div>

        {viewMode === 'course' ? (
          <>
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Curso</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Completadas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pendientes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">A tiempo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredCourses.map((row) => (
                      <tr key={row.courseId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.courseName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{row.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{row.pending}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{row.onTime}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{row.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row.status)}`}>{row.status.replace('-', ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredCourses.length === 0 && (
              <div className="text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron cursos</h3>
                <p className="text-gray-500">Prueba ajustando tu búsqueda o filtros.</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estudiante</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Curso</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">% Completado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">% A tiempo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Última actividad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {studentRows
                      .filter(r => (filterClass === 'all' || r.courseId === filterClass))
                      .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((r) => {
                        const pct = r.total ? Math.round((r.completed / r.total) * 100) : 0
                        const pctOn = r.completed ? Math.round((r.onTime / r.completed) * 100) : 0
                        return (
                          <tr key={`${r.courseId}-${r.userId}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{r.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{r.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{r.courseName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{pct}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{pctOn}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{r.lastActivity ? new Date(r.lastActivity).toLocaleString() : '-'}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {studentRows.length === 0 && (
              <div className="text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron estudiantes</h3>
                <p className="text-gray-500">Prueba ajustando tu búsqueda o filtros.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
