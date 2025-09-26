'use client'

import { useEffect, useState } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function NotificationBell() {
  const [unread, setUnread] = useState<number>(0)

  useEffect(() => {
    const update = () => {
      try {
        // Check all possible keys for current user/roles and sum max
        const keys = Object.keys(localStorage).filter(k => k.startsWith('aulux_unread_count_'))
        let maxUnread = 0
        for (const k of keys) {
          const n = Number(localStorage.getItem(k) || '0')
          if (!isNaN(n)) maxUnread = Math.max(maxUnread, n)
        }
        setUnread(maxUnread)
      } catch {
        setUnread(0)
      }
    }
    update()
    const onFocus = () => update()
    window.addEventListener('focus', onFocus)
    const interval = setInterval(update, 5000)
    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [])

  return (
    <Link href="/notifications" className="relative inline-flex items-center">
      <BellIcon className="h-6 w-6 text-gray-500 dark:text-gray-300" />
      {unread > 0 && (
        <span
          aria-label={`${unread} notificaciones sin leer`}
          className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-red-500"
        />
      )}
    </Link>
  )
}
