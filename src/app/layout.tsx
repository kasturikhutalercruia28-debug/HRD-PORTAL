import type { Metadata, Viewport } from 'next'
import { SessionProvider } from 'next-auth/react'
import './globals.css'
import PwaSetup from '@/components/PwaSetup'

export const metadata: Metadata = {
  title: 'SYNC | Rotaract District 3141',
  description: 'District Management Portal for Rotaract District 3141',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'SYNC', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#180F04',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
          <PwaSetup />
        </SessionProvider>
      </body>
    </html>
  )
}
