import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'SYNC | Rotaract District 3141',
  description: 'District Management Portal for Rotaract District 3141',
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
        </SessionProvider>
      </body>
    </html>
  )
}
