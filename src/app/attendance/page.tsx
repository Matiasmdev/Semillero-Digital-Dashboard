'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  FunnelIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts'
import AuthButton from '@/components/AuthButton'
import NotificationBell from '@/components/NotificationBell'

export default function AttendancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [rosters, setRosters] = useState<Record<string, any[]>>({})
  
  // Filtros
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterWeek, setFilterWeek] = useState('current')
  const [filterStudent, setFilterStudent] = useState('all')
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'calendar'>('overview')

  useEffect(() => {
    if (status === 'authenticated') {
      const userRole = (session?.user as any)?.role
      if (userRole === 'alumno') {
        router.replace('/student')
      } else if (userRole === 'profesor') {
        router.replace('/')
      }
    }
  }, [status, session, router])

  // Cargar datos
  useEffect(() => {
    let mounted = true
    async function loadAttendanceData() {
      try {
        setLoading(true)
        setError(null)
        
        // Cargar cursos
        const coursesRes = await fetch('/api/classroom/courses')
        if (!coursesRes.ok) throw new Error('No se pudieron obtener cursos')
        const coursesData = await coursesRes.json()
        const courseList = Array.isArray(coursesData?.courses) ? coursesData.courses : []
        if (!mounted) return
        setCourses(courseList)

        // Cargar eventos de Calendar
        const calendarRes = await fetch('/api/calendar/events')
        if (calendarRes.ok) {
          const calendarData = await calendarRes.json()
          if (!mounted) return
          setCalendarEvents(calendarData.events || [])
        }

        // Cargar rosters por curso
        const allRosters: Record<string, any[]> = {}
        for (const course of courseList) {
          try {
            const rosterRes = await fetch(`/api/classroom/courses/${course.id}/students`)
            if (rosterRes.ok) {
              const rosterData = await rosterRes.json()
              allRosters[course.id] = Array.isArray(rosterData?.students) ? rosterData.students : []
            }
          } catch {}
        }
        
        if (!mounted) return
        setRosters(allRosters)
        
        // Generar registros de asistencia simulados basados en eventos
        const calendarEvents = calendarRes.ok ? (await calendarRes.json()).events || [] : []
        const attendanceData = generateAttendanceRecords(courseList, calendarEvents, allRosters)
        setAttendanceRecords(attendanceData)
        
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Error cargando datos de asistencia')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      loadAttendanceData()
    }
    
    return () => { mounted = false }
  }, [status])

  // Generar registros de asistencia basados en eventos de Calendar
  const generateAttendanceRecords = (courses: any[], events: any[], rosters: Record<string, any[]>) => {
    const records: any[] = []
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Filtrar eventos de clase de los últimos 30 días
    const classEvents = events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date)
      return eventDate >= thirtyDaysAgo && eventDate <= now
    })

    classEvents.forEach(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date)
      const eventTitle = event.summary || 'Clase'
      
      // Intentar asociar evento con curso
      const associatedCourse = courses.find(course => 
        eventTitle.toLowerCase().includes(course.name.toLowerCase()) ||
        course.name.toLowerCase().includes(eventTitle.toLowerCase())
      ) || courses[0] // Fallback al primer curso
      
      if (associatedCourse) {
        const courseStudents = rosters[associatedCourse.id] || []
        
        courseStudents.forEach(student => {
          // Simular asistencia (85% probabilidad de asistir)
          const attended = Math.random() > 0.15
          const wasLate = attended && Math.random() > 0.9 // 10% llega tarde
          
          records.push({
            id: `${event.id}-${student.userId}`,
            eventId: event.id,
            eventTitle,
            courseId: associatedCourse.id,
            courseName: associatedCourse.name,
            studentId: student.userId,
            studentName: student.profile?.name?.fullName || 'Estudiante',
            studentEmail: student.profile?.emailAddress,
            date: eventDate.toISOString().split('T')[0],
            time: eventDate.toTimeString().split(' ')[0],
            attended,
            wasLate,
            status: attended ? (wasLate ? 'late' : 'present') : 'absent',
            duration: event.duration || 60, // minutos
            location: event.location || 'Virtual'
          })
        })
      }
    })
    
    return records
  }

  // Métricas de asistencia
  const attendanceMetrics = useMemo(() => {
    const totalRecords = attendanceRecords.length
    const presentRecords = attendanceRecords.filter(r => r.attended).length
    const lateRecords = attendanceRecords.filter(r => r.wasLate).length
    const absentRecords = attendanceRecords.filter(r => !r.attended).length
    
    const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0
    const punctualityRate = presentRecords > 0 ? Math.round(((presentRecords - lateRecords) / presentRecords) * 100) : 0
    
    // Métricas por curso
    const courseMetrics = courses.map(course => {
      const courseRecords = attendanceRecords.filter(r => r.courseId === course.id)
      const coursePresent = courseRecords.filter(r => r.attended).length
      const courseTotal = courseRecords.length
      const courseRate = courseTotal > 0 ? Math.round((coursePresent / courseTotal) * 100) : 0
      
      return {
        courseId: course.id,
        courseName: course.name,
        totalSessions: courseRecords.length / (rosters[course.id]?.length || 1),
        attendanceRate: courseRate,
        totalRecords: courseTotal,
        presentCount: coursePresent,
        absentCount: courseTotal - coursePresent
      }
    })

    // Métricas por estudiante
    const allStudents = Object.values(rosters).flat()
    const studentMetrics = allStudents.map(student => {
      const studentRecords = attendanceRecords.filter(r => r.studentId === student.userId)
      const studentPresent = studentRecords.filter(r => r.attended).length
      const studentTotal = studentRecords.length
      const studentRate = studentTotal > 0 ? Math.round((studentPresent / studentTotal) * 100) : 0
      
      return {
        studentId: student.userId,
        studentName: student.profile?.name?.fullName || 'Estudiante',
        studentEmail: student.profile?.emailAddress,
        totalSessions: studentTotal,
        attendanceRate: studentRate,
        presentCount: studentPresent,
        absentCount: studentTotal - studentPresent,
        lateCount: studentRecords.filter(r => r.wasLate).length,
        status: studentRate >= 80 ? 'good' : studentRate >= 60 ? 'warning' : 'critical'
      }
    }).sort((a, b) => b.attendanceRate - a.attendanceRate)

    // Tendencia semanal
    const weeklyTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i * 7)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const weekRecords = attendanceRecords.filter(r => {
        const recordDate = new Date(r.date)
        return recordDate >= weekStart && recordDate <= weekEnd
      })
      
      const weekPresent = weekRecords.filter(r => r.attended).length
      const weekTotal = weekRecords.length
      const weekRate = weekTotal > 0 ? Math.round((weekPresent / weekTotal) * 100) : 0
      
      weeklyTrend.push({
        week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        attendanceRate: weekRate,
        totalSessions: weekTotal,
        presentCount: weekPresent
      })
    }

    return {
      totalRecords,
      attendanceRate,
      punctualityRate,
      presentRecords,
      lateRecords,
      absentRecords,
      courseMetrics,
      studentMetrics,
      weeklyTrend,
      
      // Datos para gráficos
      attendanceDistribution: [
        { name: 'Presente', value: presentRecords - lateRecords, color: '#10b981' },
        { name: 'Tarde', value: lateRecords, color: '#f59e0b' },
        { name: 'Ausente', value: absentRecords, color: '#ef4444' }
      ],
      
      courseAttendanceData: courseMetrics.map(c => ({
        name: c.courseName.substring(0, 12) + '...',
        rate: c.attendanceRate,
        present: c.presentCount,
        absent: c.absentCount
      }))
    }
  }, [attendanceRecords, courses, rosters])

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">Cargando...</div>
  }

  const userRole = (session?.user as any)?.role
  if (status === 'authenticated' && userRole !== 'coordinador') {
    return null
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Módulo de Asistencia</h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">Integrado con Google Calendar</p>
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
          <div className="card mb-6">Cargando datos de asistencia...</div>
        )}
        {error && (
          <div className="card mb-6 text-red-300">{error}</div>
        )}

        {/* Filtros y controles */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <select 
            value={filterCourse} 
            onChange={(e) => setFilterCourse(e.target.value)}
            className="input-field"
          >
            <option value="all">Todos los cursos</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
          
          <select 
            value={filterWeek} 
            onChange={(e) => setFilterWeek(e.target.value)}
            className="input-field"
          >
            <option value="current">Semana actual</option>
            <option value="last">Semana pasada</option>
            <option value="month">Último mes</option>
            <option value="all">Todo el período</option>
          </select>

          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-2 text-sm font-medium rounded-l-lg ${
                viewMode === 'overview' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-2 text-sm font-medium ${
                viewMode === 'detailed' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Detallado
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 text-sm font-medium rounded-r-lg ${
                viewMode === 'calendar' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Calendario
            </button>
          </div>

          <button className="btn-primary flex items-center space-x-2">
            <DocumentArrowDownIcon className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>

        {/* KPIs de Asistencia */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Asistencia General</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{attendanceMetrics.attendanceRate}%</p>
                <p className="text-xs text-gray-500">{attendanceMetrics.presentRecords} de {attendanceMetrics.totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-100">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Puntualidad</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{attendanceMetrics.punctualityRate}%</p>
                <p className="text-xs text-gray-500">{attendanceMetrics.lateRecords} llegadas tarde</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-purple-100">
                <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Sesiones Totales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{calendarEvents.length}</p>
                <p className="text-xs text-gray-500">Desde Calendar</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Ausencias</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{attendanceMetrics.absentRecords}</p>
                <p className="text-xs text-red-500">Requieren seguimiento</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos de Asistencia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tendencia semanal */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📈 Tendencia de Asistencia</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={attendanceMetrics.weeklyTrend}>
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="attendanceRate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="% Asistencia" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución de asistencia */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📊 Distribución de Asistencia</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={attendanceMetrics.attendanceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {attendanceMetrics.attendanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asistencia por curso */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">🏫 Asistencia por Curso</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attendanceMetrics.courseAttendanceData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" fill="#10b981" name="Presente" />
              <Bar dataKey="absent" fill="#ef4444" name="Ausente" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vista detallada por estudiante */}
        {viewMode === 'detailed' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">👥 Asistencia por Estudiante</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estudiante</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sesiones</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Asistencia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tardanzas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {attendanceMetrics.studentMetrics.slice(0, 10).map((student) => (
                    <tr key={student.studentId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.studentName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{student.studentEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {student.totalSessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.attendanceRate}%</span>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${student.attendanceRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {student.lateCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          student.status === 'good' 
                            ? 'bg-green-100 text-green-800' 
                            : student.status === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.status === 'good' ? 'Excelente' : student.status === 'warning' ? 'Regular' : 'Crítico'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vista de calendario */}
        {viewMode === 'calendar' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📅 Eventos de Clase (Google Calendar)</h3>
            <div className="space-y-4">
              {calendarEvents.slice(0, 10).map((event, index) => (
                <div key={event.id || index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.summary || 'Evento sin título'}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : 'Fecha no disponible'}
                    </p>
                    {event.location && (
                      <p className="text-xs text-gray-500 dark:text-gray-300">📍 {event.location}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">85% asistencia</p>
                    <p className="text-xs text-gray-500">Estimado</p>
                  </div>
                </div>
              ))}
              {calendarEvents.length === 0 && (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay eventos de Calendar</h3>
                  <p className="text-gray-500 dark:text-gray-300">Conecta tu Google Calendar para ver eventos de clase</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
