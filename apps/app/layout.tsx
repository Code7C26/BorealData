
import type { Metadata, Viewport } from 'next'
import { Inter, Lora } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import './global.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AletheIA — Detector de noticias falsas con IA | Boreal Data',
  description:
    'Pegá una URL o texto y AletheIA analiza la fuente, verifica los datos y te explica por qué una noticia es confiable o no. Desarrollado por Boreal Data.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b1929',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${lora.variable} bg-background`}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
