import type { Metadata } from 'next'
import { Inter, Source_Sans_3 } from 'next/font/google'
import './globals.css'
import { SchoolProvider } from '@/context/SchoolContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-heading' })
const sourceSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-body' })

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Aksara School Management'
const brandTagline = process.env.NEXT_PUBLIC_BRAND_TAGLINE || 'Lacak. Terhubung. Percaya. Semua dalam Satu Tempat'
const theme = process.env.NEXT_PUBLIC_THEME === 'kitschool' ? 'kitschool' : 'default'

export const metadata: Metadata = {
  title: `${brandName} - School Management`,
  description: brandTagline,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme={theme} className={`${inter.variable} ${sourceSans.variable}`}>
      <body className="font-body antialiased" suppressHydrationWarning>
        <SchoolProvider>{children}</SchoolProvider>
      </body>
    </html>
  )
}

