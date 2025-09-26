'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  UserGroupIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface AttendanceTrackerProps {
  eventId?: string
  courseName?: string
  students?: any[]
  onAttendanceUpdate?: (attendance: any[]) => void
}

export default function AttendanceTracker({ 
  eventId, 
  courseName = 'Clase', 
  students = [],
  onAttendanceUpdate 
}: AttendanceTrackerProps) {
  const [attendance, setAttendance] = useState<Record<string, {
    status: 'present' | 'absent' | 'late'
    timestamp: string
  }>>({})
  const [isLive, setIsLive] = useState(false)
  const [sessionStart, setSessionStart] = useState<Date | null>(null)

  // Inicializar asistencia
  useEffect(() => {
    const initialAttendance: Record<string, any> = {}
    students.forEach(student => {
      initialAttendance[student.userId] = {
        status: 'absent',
        timestamp: new Date().toISOString()
      }
    })
    setAttendance(initialAttendance)
  }, [students])

  const startSession = () => {
    setIsLive(true)
    setSessionStart(new Date())
    
    // Simular llegadas automáticas para demo
    simulateAttendance()
  }

  const endSession = () => {
    setIsLive(false)
    if (onAttendanceUpdate) {
      const attendanceList = students.map(student => ({
        studentId: student.userId,
        studentName: student.profile?.name?.fullName || 'Estudiante',
        status: attendance[student.userId]?.status || 'absent',
        timestamp: attendance[student.userId]?.timestamp || new Date().toISOString()
      }))
      onAttendanceUpdate(attendanceList)
    }
  }

  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        status,
        timestamp: new Date().toISOString()
      }
    }))
  }

  // Simular llegadas para demo
  const simulateAttendance = () => {
    const intervals: NodeJS.Timeout[] = []
    
    students.forEach((student, index) => {
      const delay = Math.random() * 10000 // Hasta 10 segundos
      const willAttend = Math.random() > 0.15 // 85% probabilidad
      const willBeLate = Math.random() > 0.9 // 10% probabilidad de llegar tarde
      
      if (willAttend) {
        const timeout = setTimeout(() => {
          markAttendance(student.userId, willBeLate ? 'late' : 'present')
        }, delay)
        intervals.push(timeout)
      }
    })

    // Limpiar timeouts después de 15 segundos
    setTimeout(() => {
      intervals.forEach(clearTimeout)
    }, 15000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100'
      case 'late': return 'text-yellow-600 bg-yellow-100'
      case 'absent': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircleIcon className="h-5 w-5" />
      case 'late': return <ClockIcon className="h-5 w-5" />
      case 'absent': return <XCircleIcon className="h-5 w-5" />
      default: return <UserGroupIcon className="h-5 w-5" />
    }
  }

  const stats = {
    present: Object.values(attendance).filter(a => a.status === 'present').length,
    late: Object.values(attendance).filter(a => a.status === 'late').length,
    absent: Object.values(attendance).filter(a => a.status === 'absent').length,
    total: students.length
  }

  const attendanceRate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            📋 Control de Asistencia
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-300">{courseName}</p>
          {sessionStart && (
            <p className="text-xs text-gray-400">
              Iniciado: {sessionStart.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {isLive && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-600">EN VIVO</span>
            </div>
          )}
          
          {!isLive ? (
            <button 
              onClick={startSession}
              className="btn-primary"
              disabled={students.length === 0}
            >
              Iniciar Sesión
            </button>
          ) : (
            <button 
              onClick={endSession}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Finalizar
            </button>
          )}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          <div className="text-xs text-gray-500">Presente</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
          <div className="text-xs text-gray-500">Tarde</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          <div className="text-xs text-gray-500">Ausente</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{attendanceRate}%</div>
          <div className="text-xs text-gray-500">Asistencia</div>
        </div>
      </div>

      {/* Lista de estudiantes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-medium text-gray-500 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
          <span>Estudiante</span>
          <span>Estado</span>
        </div>
        
        {students.map(student => {
          const studentAttendance = attendance[student.userId]
          const status = studentAttendance?.status || 'absent'
          
          return (
            <div key={student.userId} className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {student.profile?.name?.fullName || 'Estudiante'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-300">
                  {student.profile?.emailAddress}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                {isLive && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => markAttendance(student.userId, 'present')}
                      className={`p-1 rounded ${status === 'present' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}`}
                      title="Marcar presente"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => markAttendance(student.userId, 'late')}
                      className={`p-1 rounded ${status === 'late' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-400 hover:text-yellow-600'}`}
                      title="Marcar tarde"
                    >
                      <ClockIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => markAttendance(student.userId, 'absent')}
                      className={`p-1 rounded ${status === 'absent' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                      title="Marcar ausente"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                  {getStatusIcon(status)}
                  <span className="capitalize">
                    {status === 'present' ? 'Presente' : status === 'late' ? 'Tarde' : 'Ausente'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        
        {students.length === 0 && (
          <div className="text-center py-8">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-300">No hay estudiantes registrados</p>
          </div>
        )}
      </div>

      {/* Información adicional */}
      {isLive && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Sesión en curso
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                Los estudiantes pueden unirse hasta 15 minutos después del inicio
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
