"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AcademicCapIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  BellIcon,
  HomeIcon
} from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'

export default function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || 'alumno'

  const nav = role === 'alumno'
    ? [
        { href: '/student', label: 'Inicio', icon: HomeIcon },
        { href: '/notifications', label: 'Notificaciones', icon: BellIcon },
      ]
    : [
        { href: '/', label: 'Inicio', icon: HomeIcon },
        { href: '/classes', label: 'Clases', icon: AcademicCapIcon },
        { href: '/progress', label: 'Progreso', icon: ChartBarIcon },
        { href: '/assignments', label: 'Tareas', icon: ClipboardDocumentListIcon },
        { href: '/notifications', label: 'Notificaciones', icon: BellIcon },
      ]

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-40 md:hidden ${open ? '' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Panel */}
      <aside
        className={`absolute top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Menú de navegación"
      >
        <nav className="mt-16 p-4 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <div
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                  <span className="ml-3">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}
