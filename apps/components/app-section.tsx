'use client'

import Link from 'next/link'
import { BellRing, KeyRound, Smartphone } from 'lucide-react'
import { BotonInstalarApp, useEstadoInstalacion } from '@/components/boton-instalar-app'
import { LogoMark } from '@/components/logo'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'

const TEXTOS = traducciones({
  es: {
    etiqueta: 'App para celular y computadora',
    titulo: 'AletheIA en tu',
    tituloDestacado: 'pantalla de inicio',
    bajada:
      'Instalala en el celular y abrila con un toque, como cualquier app. Sin tiendas ni descargas pesadas: es la misma AletheIA, con tu misma cuenta.',
    bajadaCorta: 'Instalala en el celular y abrila con un toque, sin pasar por ninguna tienda.',
    beneficios: [
      { titulo: 'Sin App Store ni Play Store', texto: 'Se instala desde el navegador en segundos y ocupa casi nada.' },
      { titulo: 'Te avisa cuando termina', texto: 'Mandá a verificar una nota, seguí con lo tuyo y te llega la notificación.' },
      { titulo: 'Tu misma cuenta', texto: 'El historial y el plan son los mismos que en la web.' },
    ],
    comoFunciona: 'Ver cómo se instala',
    letraChica: 'Gratis · iPhone (Safari), Android (Chrome) y computadora',
    notificacionApp: 'AletheIA · ahora',
    notificacionTitulo: 'Tu verificación está lista',
    notificacionTexto: 'No encontramos respaldo para el dato del aumento.',
    hora: '9:41',
  },
  en: {
    etiqueta: 'App for phone and computer',
    titulo: 'AletheIA on your',
    tituloDestacado: 'home screen',
    bajada:
      "Install it on your phone and open it with one tap, like any app. No app stores or heavy downloads: it's the same AletheIA, with your same account.",
    bajadaCorta: 'Install it on your phone and open it with one tap, no app store needed.',
    beneficios: [
      { titulo: 'No App Store or Play Store', texto: 'It installs from the browser in seconds and takes up almost no space.' },
      { titulo: "It tells you when it's done", texto: 'Send an article to check, keep doing your thing and get a notification.' },
      { titulo: 'Your same account', texto: 'Your history and plan are the same as on the web.' },
    ],
    comoFunciona: 'See how to install it',
    letraChica: 'Free · iPhone (Safari), Android (Chrome) and desktop',
    notificacionApp: 'AletheIA · now',
    notificacionTitulo: 'Your check is ready',
    notificacionTexto: "We couldn't find support for the price-hike claim.",
    hora: '9:41',
  },
})

/** En el mismo orden que `beneficios`. */
const ICONOS = [Smartphone, BellRing, KeyRound]

/** Íconos genéricos de la pantalla de inicio, alrededor del de AletheIA. */
const OTRAS_APPS = [
  '#3d4240', '#4b5250', '#2f3533', '#555c5a', '#3a403e', '#474e4c', '#323837',
  '#4f5654', '#383e3c', '#505755', '#2c3230',
]

/**
 * La maqueta del celular: pantalla de inicio con el ícono de AletheIA entre las demás
 * apps y la notificación de "análisis listo" arriba. Muestra las dos cosas que la app
 * suma sobre la web: estar a un toque y avisarte.
 */
function MaquetaCelular() {
  const t = useTextos(TEXTOS)

  return (
    <div className="relative mx-auto w-[260px]" aria-hidden="true">
      <div
        className="absolute -inset-10 rounded-[3rem] blur-2xl"
        style={{ background: 'radial-gradient(circle at 50% 40%, var(--aurora-a), transparent 68%)' }}
      />
      <div className="relative rounded-[2.6rem] border border-border-strong bg-surface-sunk p-2.5 shadow-lg">
        <div className="relative flex h-[500px] flex-col overflow-hidden rounded-[2.1rem] bg-bg px-4 pt-3">
          {/* Barra de estado y la isla */}
          <div className="flex items-center justify-between px-2 font-mono text-[10px] text-muted">
            <span>{t.hora}</span>
            <span className="h-5 w-20 rounded-pill bg-surface-sunk" />
            <span className="flex gap-0.5">
              <span className="h-2 w-3 rounded-sm bg-muted" />
              <span className="h-2 w-1.5 rounded-sm bg-muted" />
            </span>
          </div>

          {/* La notificación */}
          <div className="mt-5 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-md bg-[#0B100F]">
                <LogoMark className="size-3.5" />
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-subtle">
                {t.notificacionApp}
              </span>
            </div>
            <p className="mt-2 font-display text-[12.5px] leading-snug font-semibold text-display">
              {t.notificacionTitulo}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{t.notificacionTexto}</p>
          </div>

          {/* La pantalla de inicio */}
          <div className="mt-8 grid grid-cols-4 gap-x-3 gap-y-5 px-1">
            {OTRAS_APPS.slice(0, 5).map((color, i) => (
              <span key={i} className="aspect-square rounded-[0.9rem]" style={{ background: color }} />
            ))}
            <span className="flex flex-col items-center gap-1">
              <span className="relative flex aspect-square w-full items-center justify-center rounded-[0.9rem] bg-[#0B100F] ring-2 ring-accent-text">
                <LogoMark className="size-7" />
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-pill bg-verdict-falso font-mono text-[8px] font-bold text-bruma">
                  1
                </span>
              </span>
              <span className="text-[8.5px] text-ink">AletheIA</span>
            </span>
            {OTRAS_APPS.slice(5).map((color, i) => (
              <span key={i} className="aspect-square rounded-[0.9rem]" style={{ background: color }} />
            ))}
          </div>

          {/* El dock */}
          <div className="mt-auto mb-3 grid grid-cols-4 gap-3 rounded-[1.4rem] bg-surface-sunk p-2.5">
            {OTRAS_APPS.slice(0, 4).map((color, i) => (
              <span key={i} className="aspect-square rounded-[0.8rem]" style={{ background: color }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * La sección de la app en la landing, hermana de ExtensionSection: la extensión es para
 * la computadora, la app para el celular. Si ya se está usando como app instalada, no
 * se muestra (invitar a instalar lo que ya tenés es ruido).
 */
export function AppSection() {
  const t = useTextos(TEXTOS)
  const estado = useEstadoInstalacion()

  if (estado === 'instalada') return null

  return (
    <section
      id="app"
      className="relative isolate overflow-hidden border-t border-border px-gutter py-20 md:px-6 md:py-40"
      aria-labelledby="app-title"
    >
      <div className="relative mx-auto grid max-w-shell grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        {/* En computadora la maqueta va a la izquierda: espejo de la sección de la extensión. */}
        <div className="relative order-2 hidden md:block lg:order-1">
          <MaquetaCelular />
        </div>

        <div className="order-1 lg:order-2">
          <span className="inline-flex items-center gap-2.5 rounded-pill border border-border bg-surface px-3.5 py-1.5 font-mono text-micro uppercase text-accent-text">
            <Smartphone aria-hidden="true" size={13} />
            {t.etiqueta}
          </span>
          <h2
            id="app-title"
            className="mt-5 text-balance font-display text-[1.5rem] leading-[1.1] font-semibold tracking-[-0.02em] text-display md:text-h2-fluid"
          >
            {t.titulo} <span className="text-aurora">{t.tituloDestacado}</span>
          </h2>
          <p className="mt-3 max-w-texto text-pretty text-body-sm text-muted md:mt-4 md:text-body">
            <span className="md:hidden">{t.bajadaCorta}</span>
            <span className="hidden md:inline">{t.bajada}</span>
          </p>

          <ul className="mt-8 hidden flex-col gap-4 md:flex">
            {t.beneficios.map((b, i) => {
              const Icono = ICONOS[i]
              return (
                <li key={b.titulo} className="flex items-start gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-accent-text">
                    <Icono aria-hidden="true" size={16} />
                  </span>
                  <span className="flex flex-col gap-0.5 pt-0.5">
                    <span className="font-display text-body-sm font-semibold text-display">{b.titulo}</span>
                    <span className="text-body-sm text-muted">{b.texto}</span>
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4 md:mt-10">
            <BotonInstalarApp />
            {/* Sin instalación directa, el botón principal ya lleva a /instalar. */}
            {estado === 'prompt' && (
              <Link href="/instalar" className="btn-secondary">
                {t.comoFunciona}
              </Link>
            )}
          </div>
          <p className="mt-4 hidden font-mono text-micro uppercase text-disabled md:block">{t.letraChica}</p>
        </div>
      </div>
    </section>
  )
}
