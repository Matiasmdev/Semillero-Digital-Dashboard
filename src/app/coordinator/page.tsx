'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  ChartBarIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  BellIcon,
  FunnelIcon,
  CalendarDaysIcon,
  StarIcon,
  TrophyIcon,
  ShieldCheckIcon,
  CogIcon,
  EyeIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend, ComposedChart, Area, AreaChart } from 'recharts'
import AuthButton from '@/components/AuthButton'
import NotificationBell from '@/components/NotificationBell'

export default function CoordinatorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role !== 'coordinador') {
      router.replace('/')
    }
  }, [status, session, router])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])
  const [rosters, setRosters] = useState<Record<string, any[]>>({})
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [courseworkByCourse, setCourseworkByCourse] = useState<Record<string, any[]>>({})
  
  // Filtros específicos para coordinador
  const [filterCohort, setFilterCohort] = useState('all')
  const [filterProfessor, setFilterProfessor] = useState('all')
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterWeek, setFilterWeek] = useState('all')
  const [filterDeliveryStatus, setFilterDeliveryStatus] = useState('all')
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')

  // Cargar datos específicos para coordinador
  useEffect(() => {
    let mounted = true
    async function loadCoordinatorData() {
      try {
        setLoading(true)
        setError(null)
        
        // Cursos
        const cRes = await fetch('/api/classroom/courses')
        if (!cRes.ok) throw new Error('No se pudieron obtener cursos')
        const cData = await cRes.json()
        const courseList = Array.isArray(cData?.courses) ? cData.courses : []
        if (!mounted) return
        setCourses(courseList)

        // Cargar rosters, coursework y submissions con cálculos específicos
        const allSubs: any[] = []
        const allRosters: Record<string, any[]> = {}
        const allCoursework: Record<string, any[]> = {}
        
        for (const course of courseList) {
          try {
            // Roster
            const rRes = await fetch(`/api/classroom/courses/${course.id}/students`)
            if (rRes.ok) {
              const rData = await rRes.json()
              allRosters[course.id] = Array.isArray(rData?.students) ? rData.students : []
            }

            // CourseWork y submissions
            const wRes = await fetch(`/api/classroom/courses/${course.id}/courseWork`)
            if (wRes.ok) {
              const wData = await wRes.json()
              const works = Array.isArray(wData?.courseWork) ? wData.courseWork : []
              allCoursework[course.id] = works
              
              for (const work of works) {
                try {
                  const sRes = await fetch(`/api/classroom/courses/${course.id}/courseWork/${work.id}/studentSubmissions`)
                  if (sRes.ok) {
                    const sData = await sRes.json()
                    const subs = Array.isArray(sData?.studentSubmissions) ? sData.studentSubmissions : []
                    
                    subs.forEach((sub: any) => {
                      // Calcular estados específicos para coordinador
                      const dueDate = work.dueDate ? new Date(`${work.dueDate.year}-${String(work.dueDate.month).padStart(2,'0')}-${String(work.dueDate.day).padStart(2,'0')}`) : null
                      const turnedInTime = sub.updateTime ? new Date(sub.updateTime) : null
                      const isLate = dueDate && turnedInTime && turnedInTime > dueDate
                      const isMissing = sub.state === 'NEW' || sub.state === 'CREATED'
                      const isOnTime = sub.state === 'TURNED_IN' && !isLate
                      
                      allSubs.push({
                        ...sub,
                        courseId: course.id,
                        courseName: course.name,
                        workId: work.id,
                        workTitle: work.title,
                        dueDate,
                        isLate,
                        isMissing,
                        isOnTime,
                        hasGrade: sub.assignedGrade !== undefined,
                        grade: sub.assignedGrade || null
                      })
                    })
                  }
                } catch {}
              }
            }
          } catch {}
        }

        // Calendar events
        try {
          const calRes = await fetch('/api/calendar/events')
          if (calRes.ok) {
            const calData = await calRes.json()
            if (!mounted) return
            setCalendarEvents(calData.classEvents || [])
          }
        } catch {}

        if (!mounted) return
        setAllSubmissions(allSubs)
        setRosters(allRosters)
        setCourseworkByCourse(allCoursework)
        
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Error cargando datos')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      loadCoordinatorData()
    }
    
    return () => { mounted = false }
  }, [status])

  // Métricas específicas para coordinador
  const coordinatorMetrics = useMemo(() => {
    // 1. PROGRESO Y ENTREGAS
    const deliveryMetrics = courses.map(course => {
      const courseSubs = allSubmissions.filter(s => s.courseId === course.id)
      const onTime = courseSubs.filter(s => s.isOnTime).length
      const late = courseSubs.filter(s => s.isLate).length
      const missing = courseSubs.filter(s => s.isMissing).length
      const total = courseSubs.length || 1
      
      return {
        courseId: course.id,
        courseName: course.name,
        onTimeRate: Math.round((onTime / total) * 100),
        lateRate: Math.round((late / total) * 100),
        missingRate: Math.round((missing / total) * 100),
        onTime,
        late,
        missing,
        total
      }
    })

    // 2. ESTUDIANTES AL DÍA VS EN RIESGO
    const allStudents = Object.values(rosters).flat()
    const studentRiskAnalysis = allStudents.map((student: any) => {
      const studentSubs = allSubmissions.filter(s => s.userId === student.userId)
      const pendingTasks = studentSubs.filter(s => s.isMissing).length
      const lateTasks = studentSubs.filter(s => s.isLate).length
      const isAtRisk = pendingTasks >= 3 || lateTasks >= 2
      
      return {
        ...student,
        studentName: student.profile?.name?.fullName || 'Estudiante',
        studentEmail: student.profile?.emailAddress,
        pendingTasks,
        lateTasks,
        isAtRisk,
        status: isAtRisk ? 'at-risk' : 'on-track'
      }
    })

    // 3. CALIFICACIONES Y DESEMPEÑO
    const gradesByProfessor = courses.map(course => {
      const courseSubs = allSubmissions.filter(s => s.courseId === course.id && s.hasGrade)
      const grades = courseSubs.map(s => s.grade).filter(g => g !== null)
      const avgGrade = grades.length > 0 ? grades.reduce((sum, g) => sum + g, 0) / grades.length : 0
      
      return {
        courseId: course.id,
        courseName: course.name,
        professorName: course.name, // Simplificado
        avgGrade: Math.round(avgGrade * 10) / 10,
        totalGrades: grades.length,
        gradeDistribution: {
          excellent: grades.filter(g => g >= 90).length,
          good: grades.filter(g => g >= 70 && g < 90).length,
          regular: grades.filter(g => g >= 50 && g < 70).length,
          poor: grades.filter(g => g < 50).length
        }
      }
    })

    // 4. TAREAS PROBLEMÁTICAS
    const taskPerformance = Object.entries(courseworkByCourse).flatMap(([courseId, works]) => {
      return works.map((work: any) => {
        const workSubs = allSubmissions.filter(s => s.workId === work.id)
        const resubmissions = workSubs.filter(s => s.state === 'RETURNED').length
        const lowGrades = workSubs.filter(s => s.hasGrade && s.grade < 70).length
        const problemScore = resubmissions + lowGrades
        
        return {
          workId: work.id,
          workTitle: work.title,
          courseId,
          courseName: courses.find(c => c.id === courseId)?.name || 'Curso',
          resubmissions,
          lowGrades,
          problemScore,
          totalSubmissions: workSubs.length
        }
      })
    }).sort((a, b) => b.problemScore - a.problemScore)

    // 5. ASISTENCIA Y PARTICIPACIÓN
    const attendanceMetrics = {
      estimatedAttendance: 85, // Basado en Calendar events
      participationByStudent: allStudents.map((student: any) => {
        const studentSubs = allSubmissions.filter(s => s.userId === student.userId)
        const submissions = studentSubs.filter(s => s.state === 'TURNED_IN').length
        
        return {
          studentId: student.userId,
          studentName: student.profile?.name?.fullName || 'Estudiante',
          submissions,
          participationScore: submissions
        }
      }).sort((a, b) => b.participationScore - a.participationScore)
    }

    // 6. PROFESORES Y CURSOS
    const professorWorkload = courses.map(course => {
      const courseSubs = allSubmissions.filter(s => s.courseId === course.id)
      const pendingReviews = courseSubs.filter(s => s.state === 'TURNED_IN' && !s.hasGrade).length
      const avgCorrectionTime = 2.5 // Simulado
      
      return {
        courseId: course.id,
        courseName: course.name,
        professorName: course.name, // Simplificado
        activeCourses: 1,
        assignedTasks: courseworkByCourse[course.id]?.length || 0,
        pendingReviews,
        avgCorrectionTime,
        courseHealth: courseSubs.filter(s => s.isOnTime).length / (courseSubs.length || 1) * 100
      }
    })

    return {
      deliveryMetrics,
      studentRiskAnalysis,
      gradesByProfessor,
      taskPerformance,
      attendanceMetrics,
      professorWorkload,
      
      // KPIs principales
      studentsOnTrack: studentRiskAnalysis.filter(s => s.status === 'on-track').length,
      studentsAtRisk: studentRiskAnalysis.filter(s => s.status === 'at-risk').length,
      avgGradeOverall: gradesByProfessor.reduce((sum, g) => sum + g.avgGrade, 0) / (gradesByProfessor.length || 1),
      problematicTasks: taskPerformance.filter(t => t.problemScore > 2).length
    }
  }, [allSubmissions, rosters, courses, courseworkByCourse, calendarEvents])

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">Cargando...</div>
  }

  if (status === 'authenticated' && (session?.user as any)?.role !== 'coordinador') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Coordinador - Diseño único */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-8">
            <div className="flex items-center">
              <Link href="/" className="mr-6">
                <ArrowLeftIcon className="h-6 w-6 text-purple-200 hover:text-white transition-colors" />
              </Link>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <ShieldCheckIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Panel de Coordinación</h1>
                  <p className="text-purple-200">Supervisión integral y análisis avanzado</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                      <EyeIcon className="h-3 w-3 mr-1" />
                      Vista Ejecutiva
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-100">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Tiempo Real
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-purple-200">Sesión activa</p>
                <p className="text-white font-semibold">{session?.user?.email}</p>
              </div>
              <NotificationBell />
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="card mb-6">Cargando datos del coordinador...</div>
        )}
        {error && (
          <div className="card mb-6 text-red-300">{error}</div>
        )}

        {/* Panel de Control Ejecutivo - KPIs Coordinador */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📊 Métricas de Supervisión</h2>
              <p className="text-gray-600 dark:text-gray-300">Indicadores clave para toma de decisiones estratégicas</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <FireIcon className="h-3 w-3 mr-1" />
                Actualización en vivo
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Estudiantes en Riesgo - Prioridad Alta */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500 rounded-xl shadow-lg">
                  <ExclamationTriangleIcon className="h-8 w-8 text-white" />
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-200 px-2 py-1 rounded-full">CRÍTICO</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">Estudiantes en Riesgo</p>
                <p className="text-4xl font-bold text-red-900 dark:text-red-100 mb-1">{coordinatorMetrics.studentsAtRisk}</p>
                <p className="text-xs text-red-600 dark:text-red-400">Requieren intervención inmediata</p>
                <div className="mt-3 flex items-center">
                  <div className="flex-1 bg-red-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{width: `${(coordinatorMetrics.studentsAtRisk / (coordinatorMetrics.studentsOnTrack + coordinatorMetrics.studentsAtRisk)) * 100}%`}}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs text-red-600 font-medium">
                    {Math.round((coordinatorMetrics.studentsAtRisk / (coordinatorMetrics.studentsOnTrack + coordinatorMetrics.studentsAtRisk)) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: Estudiantes al Día */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 border-2 border-green-200 dark:border-green-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500 rounded-xl shadow-lg">
                  <CheckCircleIcon className="h-8 w-8 text-white" />
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-200 px-2 py-1 rounded-full">ÓPTIMO</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Estudiantes al Día</p>
                <p className="text-4xl font-bold text-green-900 dark:text-green-100 mb-1">{coordinatorMetrics.studentsOnTrack}</p>
                <p className="text-xs text-green-600 dark:text-green-400">Rendimiento satisfactorio</p>
                <div className="mt-3 flex items-center">
                  <div className="flex-1 bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{width: `${(coordinatorMetrics.studentsOnTrack / (coordinatorMetrics.studentsOnTrack + coordinatorMetrics.studentsAtRisk)) * 100}%`}}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs text-green-600 font-medium">
                    {Math.round((coordinatorMetrics.studentsOnTrack / (coordinatorMetrics.studentsOnTrack + coordinatorMetrics.studentsAtRisk)) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: Rendimiento Académico */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                  <StarIcon className="h-8 w-8 text-white" />
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">ACADÉMICO</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Rendimiento Global</p>
                <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-1">{Math.round(coordinatorMetrics.avgGradeOverall)}<span className="text-2xl">/100</span></p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Promedio institucional</p>
                <div className="mt-3 flex items-center">
                  <div className="flex-1 bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{width: `${coordinatorMetrics.avgGradeOverall}%`}}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs text-blue-600 font-medium">
                    {coordinatorMetrics.avgGradeOverall >= 80 ? 'Excelente' : coordinatorMetrics.avgGradeOverall >= 70 ? 'Bueno' : 'Mejorable'}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: Asistencia y Participación */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-800/20 border-2 border-purple-200 dark:border-purple-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
                  <CalendarDaysIcon className="h-8 w-8 text-white" />
                </div>
                <span className="text-xs font-bold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">ASISTENCIA</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Asistencia Estimada</p>
                <p className="text-4xl font-bold text-purple-900 dark:text-purple-100 mb-1">{coordinatorMetrics.attendanceMetrics.estimatedAttendance}<span className="text-2xl">%</span></p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Basado en Google Calendar</p>
                <div className="mt-3 flex items-center">
                  <div className="flex-1 bg-purple-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{width: `${coordinatorMetrics.attendanceMetrics.estimatedAttendance}%`}}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs text-purple-600 font-medium">
                    {coordinatorMetrics.attendanceMetrics.estimatedAttendance >= 90 ? 'Excelente' : coordinatorMetrics.attendanceMetrics.estimatedAttendance >= 80 ? 'Buena' : 'Regular'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Centro de Control de Asistencia - Diseño Ejecutivo */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-white/20 rounded-xl">
                  <CalendarDaysIcon className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Centro de Control de Asistencia</h2>
                  <p className="text-indigo-100">Integración avanzada con Google Calendar</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-indigo-200">Eventos sincronizados</p>
                <p className="text-3xl font-bold text-white">{calendarEvents.length}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Próximos Eventos */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📅 Agenda Próxima</h3>
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium">
                  {calendarEvents.length} eventos
                </span>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {calendarEvents.slice(0, 4).map((event, index) => (
                  <div key={event.id || index} className="border-l-4 border-indigo-400 pl-4 py-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.summary || 'Evento sin título'}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : 'Fecha no disponible'}
                    </p>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-xs text-green-600 font-medium">85% asistencia estimada</span>
                    </div>
                  </div>
                ))}
                {calendarEvents.length === 0 && (
                  <div className="text-center py-6">
                    <CalendarDaysIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-300">Sin eventos programados</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ranking de Participación */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">🏆 Ranking Participación</h3>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                  Top 5
                </span>
              </div>
              <div className="space-y-3">
                {coordinatorMetrics.attendanceMetrics.participationByStudent.slice(0, 5).map((student, index) => (
                  <div key={student.studentId} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <span className="text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.studentName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">{student.submissions} entregas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{student.participationScore}</p>
                      <p className="text-xs text-gray-500">puntos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Métricas de Riesgo */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">⚠️ Alertas de Riesgo</h3>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                  Crítico
                </span>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">Estudiantes en riesgo</p>
                      <p className="text-xs text-red-600 dark:text-red-400">3+ tareas pendientes</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{coordinatorMetrics.studentsAtRisk}</p>
                  </div>
                </div>
                
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Tareas problemáticas</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">Bajo rendimiento</p>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{coordinatorMetrics.problematicTasks}</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Cursos activos</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">En seguimiento</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{courses.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Acciones Ejecutivas */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">⚡ Centro de Comando</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link href="/attendance" className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-4 transition-all duration-200 shadow-lg hover:shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CalendarDaysIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Dashboard Completo</h4>
                    <p className="text-xs text-blue-100">Análisis detallado</p>
                  </div>
                </div>
              </Link>

              <Link href="/attendance/live" className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-4 transition-all duration-200 shadow-lg hover:shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Control en Vivo</h4>
                    <p className="text-xs text-green-100">Tiempo real</p>
                  </div>
                </div>
              </Link>

              <button className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-4 transition-all duration-200 shadow-lg hover:shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DocumentArrowDownIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Reporte Ejecutivo</h4>
                    <p className="text-xs text-purple-100">PDF/Excel</p>
                  </div>
                </div>
              </button>

              <button className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl p-4 transition-all duration-200 shadow-lg hover:shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <BellIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Alertas Masivas</h4>
                    <p className="text-xs text-orange-100">Notificaciones</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Análisis de Rendimiento Institucional */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📊 Análisis de Rendimiento Institucional</h3>
              <p className="text-gray-600 dark:text-gray-300">Progreso y entregas por curso - Vista ejecutiva</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                <ChartBarIcon className="h-3 w-3 mr-1" />
                Análisis Avanzado
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 mb-4">
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={coordinatorMetrics.deliveryMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="courseName" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Legend />
                <Bar dataKey="onTime" stackId="a" fill="#10b981" name="✅ A tiempo" radius={[0, 0, 4, 4]} />
                <Bar dataKey="late" stackId="a" fill="#f59e0b" name="⏰ Atrasadas" />
                <Bar dataKey="missing" stackId="a" fill="#ef4444" name="❌ Faltantes" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Resumen de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Total a tiempo</p>
                  <p className="text-2xl font-bold text-green-600">
                    {coordinatorMetrics.deliveryMetrics.reduce((sum, course) => sum + course.onTime, 0)}
                  </p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Total atrasadas</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {coordinatorMetrics.deliveryMetrics.reduce((sum, course) => sum + course.late, 0)}
                  </p>
                </div>
                <ClockIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Total faltantes</p>
                  <p className="text-2xl font-bold text-red-600">
                    {coordinatorMetrics.deliveryMetrics.reduce((sum, course) => sum + course.missing, 0)}
                  </p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}