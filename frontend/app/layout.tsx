import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SchoolProvider } from '@/context/SchoolContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cognifa - School Management System',
  description: 'Lacak. Terhubung. Percaya. Semua dalam Satu Tempat',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SchoolProvider>{children}</SchoolProvider>
      </body>
    </html>
  )
}

