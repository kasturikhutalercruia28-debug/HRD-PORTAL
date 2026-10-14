import type { Metadata, Viewport } from 'next'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import PwaSetup from '@/components/PwaSetup'
import './globals.css'

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

// Runs before React hydrates, so the correct theme class is on <html>
// from the very first paint — no flash of the wrong theme.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('sync-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
          <PwaSetup />
        </SessionProvider>
      </body>
    </html>
  )
}
