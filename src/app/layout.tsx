import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'
import ThemeToggle from '@/components/ThemeToggle'
import SiteShell from './SiteShell'

export const metadata: Metadata = {
  title: 'Aulux - Plataforma de Educación Digital',
  description: 'Mejorando la experiencia de aprendizaje para jóvenes a través de la integración con Google Classroom',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="font-inter">
        <Providers>
          <SiteShell>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              {children}
            </div>
          </SiteShell>
          <ThemeToggle />
        </Providers>
      </body>
    </html>
  )
}
