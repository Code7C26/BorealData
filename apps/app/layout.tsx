import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import './global.css'

/**
 * latin-ext es obligatorio en las tres: sin ese subset la ñ y las vocales
 * acentuadas caen al fallback del sistema y se rompe el ritmo del texto en
 * español — que es el único idioma en el que se lee esta app.
 */
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  /* El 300 existe por el lockup de Boreal Data: el corte de peso de la marca es
     «Boreal» en extrabold (800) contra «Data» en light (300). Sin esos pesos el
     navegador los falsea y el corte —que es toda la marca— se pierde. */
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
})

const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AletheIA — Verificación que se deja auditar | Boreal Data',
  description:
    'Pegá un enlace o el texto de una nota y AletheIA te muestra el camino completo hasta el veredicto: qué fuentes consultó, cuál es su postura y cómo lo razonó. No un puntaje.',
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b100f' },
    { media: '(prefers-color-scheme: light)', color: '#f7f8f6' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      data-theme="dark"
      suppressHydrationWarning
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="bg-bg font-sans text-body text-ink antialiased">
        {/* Lee el modo guardado antes de que se pinte el contenido. Sin esto,
            alguien con light elegido ve un flash de Noche en cada navegación
            dura: dark es el valor que manda el servidor.

            Va como primer hijo del <body> y no dentro de un <head> propio: en
            el App Router el <head> lo arma Next a partir de la Metadata API, y
            agregarle etiquetas a mano es justamente lo que la doc desaconseja. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
