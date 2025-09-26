"use client"

import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export default function HamburgerButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/80 backdrop-blur border border-gray-200 text-gray-700 shadow hover:bg-white dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-700"
    >
      {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
    </button>
  )
}
