"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  HomeIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  BellIcon
} from '@heroicons/react/24/outline'

export default function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || 'alumno'

  const items = role === 'alumno'
    ? [
        { href: '/student', label: 'Inicio', icon: HomeIcon },
        { href: '/notifications', label: 'Avisos', icon: BellIcon },
      ]
    : [
        { href: '/', label: 'Inicio', icon: HomeIcon },
        { href: '/classes', label: 'Clases', icon: AcademicCapIcon },
        { href: '/progress', label: 'Progreso', icon: ChartBarIcon },
        { href: '/assignments', label: 'Tareas', icon: ClipboardDocumentListIcon },
        { href: '/notifications', label: 'Avisos', icon: BellIcon },
      ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 dark:bg-gray-900/90 dark:border-gray-700">
      <ul className={`grid ${role === 'alumno' ? 'grid-cols-2' : 'grid-cols-5'}`}>
        {items.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link href={item.href} className="flex flex-col items-center justify-center py-2">
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`} />
                <span className={`text-[11px] mt-1 ${active ? 'text-primary font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
