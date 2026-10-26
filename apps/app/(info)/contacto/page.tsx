import type { Metadata } from 'next'
import { Clock, Mail, MessageCircle } from 'lucide-react'
import { traducciones } from '@/lib/idioma'
import { leerIdioma } from '@/lib/idioma-servidor'

const TEXTOS = traducciones({
  es: {
    metadata: {
      title: 'Contacto — AletheIA',
      description:
        'Escribinos por una duda, una sugerencia, o un análisis que salió raro. Contestamos dentro de 1 a 2 días hábiles.',
    },
    eyebrow: 'Contacto',
    titulo: 'Escribinos',
    bajada:
      '¿Una duda, una sugerencia, o un análisis que salió raro? Contanos qué nota estabas verificando y qué pasó.',
    porEmail: 'Por email',
    porEmailBajada:
      'Es el canal que miramos todos los días. Si podés, pegá el enlace de la nota: con eso reproducimos el caso enseguida.',
    notas: [
      {
        titulo: 'Tiempo de respuesta',
        texto: 'Normalmente contestamos dentro de 1 a 2 días hábiles.',
      },
      {
        titulo: 'Antes de escribir',
        texto:
          'Si el análisis se cortó, probá de nuevo: suele ser un corte momentáneo de conexión con la fuente.',
      },
    ],
  },
  en: {
    metadata: {
      title: 'Contact — AletheIA',
      description:
        'Write to us with a question, a suggestion, or an analysis that came out odd. We reply within 1 to 2 business days.',
    },
    eyebrow: 'Contact',
    titulo: 'Write to us',
    bajada:
      'A question, a suggestion, or an analysis that came out odd? Tell us which article you were checking and what happened.',
    porEmail: 'By email',
    porEmailBajada:
      "It's the channel we check every day. If you can, paste the link to the article: with that we can reproduce the case right away.",
    notas: [
      {
        titulo: 'Response time',
        texto: 'We usually reply within 1 to 2 business days.',
      },
      {
        titulo: 'Before writing',
        texto:
          "If the analysis got cut off, try again: it's usually a momentary connection drop with the source.",
      },
    ],
  },
})

/** Un ícono por nota, en el mismo orden que `notas`. */
const ICONOS_NOTAS = [Clock, MessageCircle]

export async function generateMetadata(): Promise<Metadata> {
  return TEXTOS[await leerIdioma()].metadata
}

/**
 * Contacto.
 *
 * Vive en (info) y no en (autenticado): quien quiere escribirnos por algo que
 * no funciona es, muy posiblemente, alguien que todavía no pudo crear una
 * cuenta. Antes estaba detrás del guard de auth y el enlace del pie de la
 * landing lo mandaba al login. El layout del grupo le pone el sidebar si hay
 * sesión, así que para alguien logueado se ve igual que antes.
 */
export default async function ContactoPage() {
  const t = TEXTOS[await leerIdioma()]

  // Sin contenedor propio: el ancho, el gutter y el aire los pone el layout del grupo
  // (ver CONTENEDOR en ../layout.tsx), igual que en privacidad y términos. Tenerlo acá
  // además del layout duplicaba el padding horizontal.
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="font-display text-h2-fluid text-display">{t.titulo}</h1>
        <p className="max-w-texto text-muted">{t.bajada}</p>
      </header>

      <section className="card-shell border-t-accent">
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-bruma">
          <Mail aria-hidden="true" size={22} />
        </span>
        <h2 className="font-display text-h3 font-semibold text-display">{t.porEmail}</h2>
        <p className="text-body-sm text-muted">{t.porEmailBajada}</p>
        <a href="mailto:contacto@borealdata.com" className="btn-primary self-start">
          <Mail aria-hidden="true" size={16} />
          contacto@borealdata.com
        </a>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {t.notas.map(({ titulo, texto }, i) => {
          const Icon = ICONOS_NOTAS[i]
          return (
            <section key={i} className="panel flex items-start gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-pill border border-border text-accent-text">
                <Icon aria-hidden="true" size={16} />
              </span>
              <div>
                <h2 className="font-mono text-micro uppercase text-subtle">{titulo}</h2>
                <p className="mt-2 text-body-sm text-muted">{texto}</p>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
