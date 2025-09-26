"use client"

import { useState } from 'react'
import HamburgerButton from '@/components/HamburgerButton'
import MobileDrawer from '@/components/MobileDrawer'
import BottomNav from '@/components/BottomNav'

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <HamburgerButton open={open} onClick={() => setOpen((v) => !v)} />
      <MobileDrawer open={open} onClose={() => setOpen(false)} />
      <div>{children}</div>
      <BottomNav />
    </>
  )
}
