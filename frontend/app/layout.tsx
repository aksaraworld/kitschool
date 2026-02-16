import type { Metadata } from 'next'
import { Inter, Source_Sans_3 } from 'next/font/google'
import './globals.css'
import { SchoolProvider } from '@/context/SchoolContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-heading' })
const sourceSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-body' })

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
    <html lang="en" className={`${inter.variable} ${sourceSans.variable}`}>
      <body className="font-body antialiased">
        <SchoolProvider>{children}</SchoolProvider>
      </body>
    </html>
  )
}

