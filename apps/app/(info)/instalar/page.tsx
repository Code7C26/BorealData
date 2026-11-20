import type { Metadata } from 'next'
import { InstalarApp } from '@/components/instalar-app'
import { traducciones } from '@/lib/idioma'
import { leerIdioma } from '@/lib/idioma-servidor'

const TEXTOS = traducciones({
  es: {
    metadata: {
      title: 'Instalar la app — AletheIA',
      description: 'Instalá AletheIA en tu celular o computadora, sin pasar por ninguna tienda.',
    },
    eyebrow: 'App',
    titulo: 'Tené AletheIA a un toque',
    bajada:
      'Instalala en tu celular o computadora y abrila desde la pantalla de inicio, sin buscar la página. Es la misma web, con tu misma cuenta.',
  },
  en: {
    metadata: {
      title: 'Install the app — AletheIA',
      description: 'Install AletheIA on your phone or computer, no app store needed.',
    },
    eyebrow: 'App',
    titulo: 'Keep AletheIA one tap away',
    bajada:
      'Install it on your phone or computer and open it from your home screen, without looking for the site. Same web, same account.',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return TEXTOS[await leerIdioma()].metadata
}

/**
 * /instalar — el link para compartir cuando alguien quiere "descargar la app".
 *
 * Vive en (info) porque es pública: se manda por WhatsApp a gente que todavía no tiene
 * cuenta. Qué muestra depende del dispositivo, y eso solo se sabe en el cliente (ver
 * components/instalar-app.tsx).
 */
export default async function InstalarPage() {
  const t = TEXTOS[await leerIdioma()]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="font-display text-h2-fluid text-display">{t.titulo}</h1>
        <p className="max-w-texto text-muted">{t.bajada}</p>
      </header>

      <InstalarApp />
    </div>
  )
}
