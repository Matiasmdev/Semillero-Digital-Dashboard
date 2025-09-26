'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  ArrowLeftIcon,
  PlayIcon,
  StopIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import AttendanceTracker from '@/components/AttendanceTracker'
import AuthButton from '@/components/AuthButton'
import NotificationBell from '@/components/NotificationBell'

export default function LiveAttendancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [course, setCourse] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [currentEvent, setCurrentEvent] = useState<any>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionData, setSessionData] = useState<any>(null)

  // Obtener parámetros de URL
  const courseId = searchParams.get('courseId')
  const eventId = searchParams.get('eventId')

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

  // Cargar datos del curso y estudiantes
  useEffect(() => {
    let mounted = true
    async function loadCourseData() {
      if (!courseId) return
      
      try {
        setLoading(true)
        setError(null)

        // Cargar información del curso
        const coursesRes = await fetch('/api/classroom/courses')
        if (!coursesRes.ok) throw new Error('No se pudo obtener información del curso')
        const coursesData = await coursesRes.json()
        const foundCourse = coursesData.courses?.find((c: any) => c.id === courseId)
        
        if (!foundCourse) throw new Error('Curso no encontrado')
        if (!mounted) return
        setCourse(foundCourse)

        // Cargar estudiantes del curso
        const studentsRes = await fetch(`/api/classroom/courses/${courseId}/students`)
        if (!studentsRes.ok) throw new Error('No se pudieron obtener los estudiantes')
        const studentsData = await studentsRes.json()
        if (!mounted) return
        setStudents(studentsData.students || [])

        // Si hay eventId, cargar información del evento
        if (eventId) {
          const eventsRes = await fetch('/api/calendar/events')
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json()
            const event = eventsData.events?.find((e: any) => e.id === eventId)
            if (event && mounted) {
              setCurrentEvent(event)
            }
          }
        }

      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Error cargando datos')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (status === 'authenticated') {
      loadCourseData()
    }

    return () => { mounted = false }
  }, [courseId, eventId, status])

  const handleAttendanceUpdate = async (attendanceList: any[]) => {
    try {
      // Guardar cada registro de asistencia
      const promises = attendanceList.map(attendance => 
        fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: eventId || `manual-${Date.now()}`,
            courseId: course?.id,
            courseName: course?.name,
            studentId: attendance.studentId,
            studentName: attendance.studentName,
            status: attendance.status,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0],
            location: currentEvent?.location || 'Virtual'
          })
        })
      )

      await Promise.all(promises)
      
      // Mostrar resumen
      setSessionData({
        totalStudents: attendanceList.length,
        present: attendanceList.filter(a => a.status === 'present').length,
        late: attendanceList.filter(a => a.status === 'late').length,
        absent: attendanceList.filter(a => a.status === 'absent').length,
        attendanceList
      })
      
      setSessionActive(false)
      
    } catch (error) {
      console.error('Error saving attendance:', error)
      setError('Error guardando la asistencia')
    }
  }

  const startNewSession = () => {
    setSessionData(null)
    setSessionActive(true)
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">Cargando...</div>
  }

  if (!courseId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="card text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Curso no especificado
          </h2>
          <p className="text-gray-500 dark:text-gray-300 mb-4">
            Selecciona un curso para iniciar el control de asistencia
          </p>
          <Link href="/attendance" className="btn-primary">
            Volver a Asistencia
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link href="/attendance" className="mr-4">
                <ArrowLeftIcon className="h-6 w-6 text-gray-400 hover:text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Control de Asistencia en Vivo
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {course?.name || 'Cargando curso...'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="card mb-6">Cargando información del curso...</div>
        )}
        
        {error && (
          <div className="card mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Información del evento actual */}
        {currentEvent && (
          <div className="card mb-6">
            <div className="flex items-start space-x-4">
              <CalendarDaysIcon className="h-8 w-8 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {currentEvent.summary || 'Evento de Calendar'}
                </h3>
                <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <p>
                    📅 {currentEvent.start?.dateTime 
                      ? new Date(currentEvent.start.dateTime).toLocaleString()
                      : 'Fecha no disponible'
                    }
                  </p>
                  {currentEvent.location && (
                    <p>📍 {currentEvent.location}</p>
                  )}
                  {currentEvent.description && (
                    <p>📝 {currentEvent.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Información del curso */}
        {course && (
          <div className="card mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <UserGroupIcon className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {course.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {students.length} estudiantes registrados
                  </p>
                </div>
              </div>
              
              {!sessionActive && !sessionData && (
                <button 
                  onClick={startNewSession}
                  className="btn-primary flex items-center space-x-2"
                  disabled={students.length === 0}
                >
                  <PlayIcon className="h-4 w-4" />
                  <span>Iniciar Control</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tracker de asistencia */}
        {course && (sessionActive || sessionData) && (
          <AttendanceTracker
            eventId={eventId || undefined}
            courseName={course.name}
            students={students}
            onAttendanceUpdate={handleAttendanceUpdate}
          />
        )}

        {/* Resumen de sesión completada */}
        {sessionData && (
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📋 Resumen de Asistencia
              </h3>
              <button 
                onClick={startNewSession}
                className="btn-secondary flex items-center space-x-2"
              >
                <PlayIcon className="h-4 w-4" />
                <span>Nueva Sesión</span>
              </button>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {sessionData.totalStudents}
                </div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {sessionData.present}
                </div>
                <div className="text-sm text-gray-500">Presente</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {sessionData.late}
                </div>
                <div className="text-sm text-gray-500">Tarde</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {sessionData.absent}
                </div>
                <div className="text-sm text-gray-500">Ausente</div>
              </div>
            </div>

            {/* Tasa de asistencia */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tasa de Asistencia
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(((sessionData.present + sessionData.late) / sessionData.totalStudents) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${((sessionData.present + sessionData.late) / sessionData.totalStudents) * 100}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/attendance" 
                className="btn-secondary"
              >
                Ver Historial
              </Link>
              <button 
                onClick={() => {
                  // Aquí se podría implementar exportación
                  console.log('Exportar datos:', sessionData)
                }}
                className="btn-primary"
              >
                Exportar Datos
              </button>
            </div>
          </div>
        )}

        {/* Estado sin sesión */}
        {!sessionActive && !sessionData && course && (
          <div className="card text-center">
            <ClockIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Listo para iniciar control de asistencia
            </h3>
            <p className="text-gray-500 dark:text-gray-300 mb-6">
              Haz clic en "Iniciar Control" para comenzar a registrar la asistencia de los estudiantes
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center space-x-2">
                <UserGroupIcon className="h-4 w-4" />
                <span>{students.length} estudiantes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CalendarDaysIcon className="h-4 w-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
