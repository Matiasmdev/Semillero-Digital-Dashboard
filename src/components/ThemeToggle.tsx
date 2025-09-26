"use client"

import { useTheme } from '@/app/providers'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-gray-900 text-white shadow-lg hover:opacity-90 transition dark:bg-gray-700"
    >
      {theme === 'dark' ? (
        <SunIcon className="h-6 w-6" />
      ) : (
        <MoonIcon className="h-6 w-6" />
      )}
    </button>
  )
}
