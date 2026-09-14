import Link from 'next/link'
import { PanelRight } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { ANALISIS_EJEMPLO } from '@/lib/ejemplo'
import { CONFIDENCE, STANCE, VERDICT } from '@/lib/verdict'
import { cn } from '@/lib/utils'

function BarraDeTexto({ ancho, alto = 'h-2' }: { ancho: string; alto?: string }) {
  return <span className={cn(alto, 'block rounded-sm bg-border-strong')} style={{ width: ancho }} />
}

/**
 * La maqueta del panel lateral.
 *
 * Usa el mismo análisis de ejemplo que la card grande, apretado al ancho del
 * side panel: el veredicto, la barra de cinco segmentos y las dos primeras
 * fuentes con su postura. Es la prueba de que el sistema sobrevive a 190 px.
 */
function MaquetaPanel() {
  const meta = VERDICT[ANALISIS_EJEMPLO.verdict]
  const Icon = meta.icon
  const confianza = CONFIDENCE[ANALISIS_EJEMPLO.confidence]

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2rem] blur-2xl"
        style={{ background: 'radial-gradient(circle at 70% 40%, var(--aurora-a), transparent 68%)' }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
        {/* Barra del navegador */}
        <div className="flex items-center gap-2 border-b border-border bg-surface-sunk px-4 py-3">
          <span className="size-2.5 rounded-pill bg-verdict-falso" />
          <span className="size-2.5 rounded-pill bg-verdict-dudoso" />
          <span className="size-2.5 rounded-pill bg-verdict-verificado" />
          <span className="ml-2.5 h-6 flex-1 truncate rounded-pill border border-border bg-bg px-3 font-mono text-[10px] leading-6 text-disabled">
            diario-ejemplo.com/nota/8821
          </span>
        </div>

        <div className="grid min-h-[320px] grid-cols-[1fr_200px]">
          {/* La nota */}
          <div className="flex flex-col gap-3 p-6" aria-hidden="true">
            <BarraDeTexto ancho="85%" alto="h-3" />
            <BarraDeTexto ancho="60%" alto="h-3" />
            <div className="mt-2 flex flex-col gap-2.5">
              {['100%', '96%', '99%', '72%', '92%', '55%', '88%'].map((w, i) => (
                <BarraDeTexto key={i} ancho={w} />
              ))}
            </div>
          </div>

          {/* El side panel de AletheIA */}
          <div className={cn('flex flex-col gap-4 border-l border-border bg-surface-sunk p-4', 'border-t-[3px]', meta.borderTop)}>
            <div className="flex items-center gap-2">
              <LogoMark className="size-5" />
              <span className="font-display text-[11px] font-bold tracking-[-0.01em] text-display">
                Alethe<span className="text-accent-text">IA</span>
              </span>
            </div>

            <span className={cn('inline-flex items-center gap-2 self-start rounded-pill border border-current px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em]', meta.text)}>
              <Icon aria-hidden="true" size={11} strokeWidth={2.5} />
              {meta.label}
            </span>

            <p className="font-display text-[12.5px] leading-snug font-semibold text-display">
              {ANALISIS_EJEMPLO.headline}
            </p>

            <div className="flex flex-col gap-1.5">
              <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'flex-1 rounded-pill',
                      i <= ANALISIS_EJEMPLO.confidence ? meta.bg : 'bg-border',
                    )}
                  />
                ))}
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-subtle">
                Confianza {confianza.label.toLowerCase()}
              </span>
            </div>

            <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
              {ANALISIS_EJEMPLO.sources.slice(0, 3).map((s) => (
                <li key={s.domain} className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[9.5px] text-muted">{s.domain}</span>
                  <span className={cn('shrink-0 font-mono text-[9px] uppercase', STANCE[s.stance].text)}>
                    {STANCE[s.stance].label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExtensionSection() {
  return (
    <section
      id="extension"
      className="relative isolate overflow-hidden border-t border-border px-gutter py-32 md:px-6 md:py-40"
      aria-labelledby="extension-title"
    >
      <div className="relative mx-auto grid max-w-shell grid-cols-1 items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="eyebrow">Extensión de navegador</p>
          <h2 id="extension-title" className="mt-4 text-balance font-display text-h2-fluid text-display">
            Verificá sin salir de la nota
          </h2>
          <p className="mt-4 max-w-texto text-pretty text-muted">
            AletheIA se abre en un panel al costado de la página que estás leyendo. Un clic y
            tenés el veredicto, la confianza y las fuentes al lado del texto, sin copiar enlaces ni
            cambiar de pestaña.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/registro" className="btn-primary">
              <PanelRight aria-hidden="true" size={16} />
              Crear cuenta y empezar
            </Link>
          </div>
          <p className="mt-4 font-mono text-micro uppercase text-disabled">
            La extensión de Chrome está en camino — [LINK DE DESCARGA]
          </p>
        </div>

        <MaquetaPanel />
      </div>
    </section>
  )
}
