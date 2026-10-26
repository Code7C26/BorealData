import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { traducciones } from '@/lib/idioma'
import { leerIdioma } from '@/lib/idioma-servidor'
import { IdiomaProvider } from '@/lib/use-idioma'
import { SIDEBAR_INIT_SCRIPT } from '@/lib/sidebar-colapso'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import './global.css'

/**
 * latin-ext es obligatorio en las tres: sin ese subset la ñ y las vocales
 * acentuadas caen al fallback del sistema y se rompe el ritmo del texto en
 * español — el idioma canónico de la app. En inglés también hacen falta: los
 * nombres propios de las notas traen acentos igual.
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

const METADATA = traducciones<Metadata>({
  es: {
    title: 'AletheIA — Verificación que se deja auditar | Boreal Data',
    description:
      'Pegá un enlace o el texto de una nota y AletheIA te muestra el camino completo hasta el veredicto: qué fuentes consultó, cuál es su postura y cómo lo razonó. No un puntaje.',
  },
  en: {
    title: 'AletheIA — Fact-checking you can audit | Boreal Data',
    description:
      'Paste a link or the text of an article and AletheIA shows you the full path to the verdict: which sources it checked, where each one stands and how it reasoned. Not a score.',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return METADATA[await leerIdioma()]
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b100f' },
    { media: '(prefers-color-scheme: light)', color: '#f7f8f6' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const idioma = await leerIdioma()

  return (
    <html
      lang={idioma}
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
        {/* Mismo motivo que el de arriba, para el ancho del sidebar: sin esto el
            servidor lo manda expandido y el cliente lo corrige al hidratar, con un
            salto de 288 px a 76 px que corre el contenido de la página. */}
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_INIT_SCRIPT }} />
        <IdiomaProvider idioma={idioma}>
          <AuthProvider>{children}</AuthProvider>
        </IdiomaProvider>
      </body>
    </html>
  )
}
