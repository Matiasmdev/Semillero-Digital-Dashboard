'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  ArrowLeftIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function ClassroomSync() {
  const params = useParams()
  const classId = params.id
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncData, setSyncData] = useState<any>(null)

  const classData = {
    name: 'Habilidades Digitales 101',
    teacher: 'Ana Martínez',
    googleClassroomId: 'abc123def456'
  }

  const syncSteps = [
    { id: 1, name: 'Conectando con Google Classroom', status: 'pending' },
    { id: 2, name: 'Obteniendo información del curso', status: 'pending' },
    { id: 3, name: 'Recuperando lista de estudiantes', status: 'pending' },
    { id: 4, name: 'Descargando tareas', status: 'pending' },
    { id: 5, name: 'Sincronizando calificaciones y entregas', status: 'pending' },
    { id: 6, name: 'Actualizando registros de asistencia', status: 'pending' },
    { id: 7, name: 'Finalizando sincronización', status: 'pending' }
  ]

  const [steps, setSteps] = useState(syncSteps)

  const handleStartSync = async () => {
    setSyncStatus('syncing')
    setSyncProgress(0)
    
    // Reset steps
    setSteps(syncSteps.map(step => ({ ...step, status: 'pending' })))

    // Simulate sync process
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSteps(prev => prev.map((step, index) => ({
        ...step,
        status: index === i ? 'processing' : index < i ? 'completed' : 'pending'
      })))
      
      setSyncProgress(((i + 1) / steps.length) * 100)
    }

    // Simulate final result
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mock sync data
    const mockSyncData = {
      studentsUpdated: 24,
      assignmentsUpdated: 8,
      gradesUpdated: 156,
      attendanceUpdated: 72,
      lastSync: new Date().toLocaleString()
    }
    
    setSyncData(mockSyncData)
    setSyncStatus('success')
    setSteps(prev => prev.map(step => ({ ...step, status: 'completed' })))
  }

  const handleRetrySync = () => {
    setSyncStatus('idle')
    setSyncProgress(0)
    setSyncData(null)
    setSteps(syncSteps)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link href={`/classes/${classId}`} className="mr-4">
                <ArrowLeftIcon className="h-6 w-6 text-gray-400 hover:text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sincronización con Google Classroom</h1>
                <p className="text-sm text-gray-500">{classData.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sync Status Card */}
        <div className="card mb-8">
          <div className="text-center">
            {syncStatus === 'idle' && (
              <>
                <CloudArrowDownIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Listo para sincronizar</h2>
                <p className="text-gray-600 mb-6">
                  Sincroniza los datos de tu clase con Google Classroom para obtener la última información de estudiantes, tareas y calificaciones.
                </p>
                <button 
                  onClick={handleStartSync}
                  className="btn-primary"
                >
                  Iniciar sincronización
                </button>
              </>
            )}

            {syncStatus === 'syncing' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Sincronizando...</h2>
                <p className="text-gray-600 mb-4">Por favor, espera mientras sincronizamos tus datos con Google Classroom.</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">{Math.round(syncProgress)}% completado</p>
              </>
            )}

            {syncStatus === 'success' && (
              <>
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Sincronización completada con éxito!</h2>
                <p className="text-gray-600 mb-6">
                  Los datos de tu clase se han sincronizado correctamente con Google Classroom.
                </p>
                <div className="flex justify-center space-x-4">
                  <Link href={`/classes/${classId}`}>
                    <button className="btn-primary">Ver detalles de la clase</button>
                  </Link>
                  <button 
                    onClick={handleRetrySync}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Sincronizar nuevamente
                  </button>
                </div>
              </>
            )}

            {syncStatus === 'error' && (
              <>
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">La sincronización falló</h2>
                <p className="text-gray-600 mb-6">
                  Hubo un error al sincronizar tus datos. Revisa tu conexión e inténtalo nuevamente.
                </p>
                <div className="flex justify-center space-x-4">
                  <button 
                    onClick={handleStartSync}
                    className="btn-primary"
                  >
                    Reintentar sincronización
                  </button>
                  <Link href={`/classes/${classId}`}>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200">
                      Volver a la clase
                    </button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sync Steps */}
        {(syncStatus === 'syncing' || syncStatus === 'success') && (
          <div className="card mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso de la sincronización</h3>
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    {step.status === 'completed' && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )}
                    {step.status === 'processing' && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    )}
                    {step.status === 'pending' && (
                      <ClockIcon className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    step.status === 'completed' ? 'text-green-700' :
                    step.status === 'processing' ? 'text-primary' :
                    'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Results */}
        {syncStatus === 'success' && syncData && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados de la sincronización</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">{syncData.studentsUpdated}</div>
                <div className="text-sm text-gray-600">Estudiantes actualizados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary mb-1">{syncData.assignmentsUpdated}</div>
                <div className="text-sm text-gray-600">Tareas actualizadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500 mb-1">{syncData.gradesUpdated}</div>
                <div className="text-sm text-gray-600">Calificaciones actualizadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500 mb-1">{syncData.attendanceUpdated}</div>
                <div className="text-sm text-gray-600">Registros de asistencia</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Última sincronización: {syncData.lastSync}</p>
            </div>
          </div>
        )}

        {/* Information Card */}
        <div className="card mt-8">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Acerca de la integración con Google Classroom</h4>
              <p className="text-sm text-gray-600">
                Este proceso de sincronización obtiene los últimos datos de tu Google Classroom, incluyendo información de estudiantes, 
                tareas, calificaciones y registros de asistencia. Los datos se transfieren y almacenan de forma segura en cumplimiento con 
                las regulaciones de privacidad. La frecuencia de sincronización puede configurarse en tus ajustes.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
