'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline'
import AuthButton from '@/components/AuthButton'
import NotificationBell from '@/components/NotificationBell'

export default function ClassList() {
  const { data: session, status } = useSession()
  const router = useRouter()
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'alumno') {
      router.replace('/student')
    }
  }, [status, session, router])

  const [searchTerm, setSearchTerm] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/classroom/courses')
        if (!res.ok) throw new Error('No se pudieron obtener cursos')
        const data = await res.json()
        const list = Array.isArray(data?.courses) ? data.courses : []
        if (!mounted) return
        setCourses(list)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Error inesperado')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // Early returns AFTER hooks
  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">Cargando...</div>
  }
  if (status === 'authenticated' && (session?.user as any)?.role === 'alumno') {
    return null
  }

  const filteredCourses = courses.filter((c:any) => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()))

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de clases</h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">Administra tus clases y visualiza detalles</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => window.location.reload()}
                className="btn-primary flex items-center space-x-2"
                title="Refrescar"
              >
                <CloudArrowDownIcon className="h-5 w-5" />
                <span>Refrescar</span>
              </button>
              <NotificationBell />
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clases o docentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-300">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <span>{filteredCourses.length} curso(s)</span>
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCourses.map((course: any) => (
            <div key={course.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{course.name}</h3>
                  {course.section && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Sección: {course.section}</p>
                  )}
                  {course.descriptionHeading && (
                    <p className="text-sm text-gray-500 dark:text-gray-300">{course.descriptionHeading}</p>
                  )}
                </div>
                {course.courseState && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    course.courseState === 'ACTIVE'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {course.courseState?.toLowerCase()}
                  </span>
                )}
              </div>
              {/* Actions */}
              <div className="flex space-x-2">
                <Link href={`/classes/${course.id}`} className="flex-1">
                  <button className="w-full btn-primary text-sm py-2">
                    Ver detalles
                  </button>
                </Link>
                <Link href={`/classes/${course.id}/sync`}>
                  <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm">
                    Sincronizar
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron cursos</h3>
          </div>
        ) : null}
      </main>
    </div>
  )
}
