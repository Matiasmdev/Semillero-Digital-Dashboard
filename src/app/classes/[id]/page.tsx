'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  ArrowLeftIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function ClassDetail() {
  const params = useParams()
  const classId = params.id
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | 'pending' | null>(null)
  const [courseData, setCourseData] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos reales de la API de Classroom
  useEffect(() => {
    let mounted = true
    async function loadCourseData() {
      try {
        setLoading(true)
        setError(null)
        
        // Obtener datos del curso específico
        const coursesRes = await fetch('/api/classroom/courses')
        if (!coursesRes.ok) throw new Error('No se pudieron obtener cursos')
        const coursesData = await coursesRes.json()
        const course = coursesData.courses?.find((c: any) => c.id === classId)
        
        if (!course) throw new Error('Curso no encontrado')
        if (!mounted) return
        setCourseData(course)
        
        // Obtener estudiantes
        const studentsRes = await fetch(`/api/classroom/courses/${classId}/students`)
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json()
          if (mounted) setStudents(studentsData.students || [])
        }
        
        // Obtener tareas
        const assignmentsRes = await fetch(`/api/classroom/courses/${classId}/courseWork`)
        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json()
          if (mounted) setAssignments(assignmentsData.courseWork || [])
        }
        
      } catch (e: any) {
        if (mounted) setError(e.message || 'Error cargando datos')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    if (classId) {
      loadCourseData()
    }
    
    return () => { mounted = false }
  }, [classId])

  const handleSyncClassroom = async () => {
    setIsLoading(true)
    setLastSyncStatus('pending')
    
    // Simulate API call to Google Classroom
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setLastSyncStatus('success')
      // In real app, this would update the class data
    } catch (error) {
      setLastSyncStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="card">Cargando datos del curso...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="card text-red-300">{error}</div>
      </div>
    )
  }

  if (!courseData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="card">Curso no encontrado</div>
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
              <Link href="/classes" className="mr-4">
                <ArrowLeftIcon className="h-6 w-6 text-gray-400 hover:text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{courseData.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">Docente: {courseData.ownerId || 'No especificado'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {lastSyncStatus && (
                <div className="flex items-center space-x-2">
                  {lastSyncStatus === 'success' && (
                    <>
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-green-600">Sincronización exitosa</span>
                    </>
                  )}
                  {lastSyncStatus === 'error' && (
                    <>
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      <span className="text-sm text-red-600">Fallo en la sincronización</span>
                    </>
                  )}
                  {lastSyncStatus === 'pending' && (
                    <span className="text-sm text-blue-600">Sincronizando...</span>
                  )}
                </div>
              )}
              <button 
                onClick={handleSyncClassroom}
                disabled={isLoading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <CloudArrowDownIcon className="h-5 w-5" />
                <span>{isLoading ? 'Sincronizando...' : 'Sincronizar con Google Classroom'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Class Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Información de la clase</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Descripción</label>
                  <p className="text-gray-900 dark:text-gray-100">{courseData.description || 'Sin descripción disponible'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Estado</label>
                    <p className="text-gray-900 dark:text-gray-100">{courseData.courseState || 'Activo'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-300">ID de Google Classroom</label>
                    <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{courseData.id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Creada</label>
                    <p className="text-gray-900 dark:text-gray-100">{courseData.creationTime ? new Date(courseData.creationTime).toLocaleDateString() : 'No disponible'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Última actualización</label>
                    <p className="text-gray-900 dark:text-gray-100">{courseData.updateTime ? new Date(courseData.updateTime).toLocaleDateString() : 'No disponible'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Estadísticas rápidas</h3>
                <ChartBarIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Estudiantes</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{students.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Tareas</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{assignments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Estado</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{courseData.courseState === 'ACTIVE' ? 'Activo' : courseData.courseState}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Acciones rápidas</h3>
              <div className="space-y-2">
                <Link href={`/classes/${classId}/progress`}>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                    Ver progreso de estudiantes
                  </button>
                </Link>
                <Link href={`/classes/${classId}/assignments`}>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                    Administrar tareas
                  </button>
                </Link>
                <Link href={`/classes/${classId}/attendance`}>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                    Ver asistencia
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Students and Assignments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Students */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Estudiantes</h3>
              <Link href={`/classes/${classId}/students`} className="text-sm text-primary hover:text-blue-700">
                Ver todos
              </Link>
            </div>
            <div className="space-y-3">
              {students.slice(0, 5).map((student) => (
                <div key={student.userId} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.profile?.name?.fullName || 'Nombre no disponible'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">{student.profile?.emailAddress || 'Email no disponible'}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-400">Activo</span>
                </div>
              ))}
              {students.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-300">No hay estudiantes registrados</p>
              )}
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tareas</h3>
              <Link href={`/classes/${classId}/assignments`} className="text-sm text-primary hover:text-blue-700">
                Ver todas
              </Link>
            </div>
            <div className="space-y-3">
              {assignments.slice(0, 5).map((assignment) => {
                const dueDate = assignment.dueDate 
                  ? `${assignment.dueDate.year}-${String(assignment.dueDate.month).padStart(2,'0')}-${String(assignment.dueDate.day).padStart(2,'0')}`
                  : null
                const creationDate = assignment.creationTime ? new Date(assignment.creationTime).toLocaleDateString() : 'No disponible'
                
                return (
                  <div key={assignment.id} className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{assignment.title || 'Tarea sin título'}</p>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {assignment.state || 'Activa'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        {dueDate ? `Vence: ${dueDate}` : `Creada: ${creationDate}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        {assignment.workType || 'Tarea'}
                      </p>
                    </div>
                  </div>
                )
              })}
              {assignments.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-300">No hay tareas disponibles</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
