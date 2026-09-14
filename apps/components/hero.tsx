import { AnalisisInput } from '@/components/analisis-input'
import { Aurora } from '@/components/aurora'
import { PalabraRotativa } from '@/components/palabra-rotativa'
import { VERDICT, type Verdict } from '@/lib/verdict'
import { cn } from '@/lib/utils'

const ORDEN: Verdict[] = ['verificado', 'dudoso', 'falso', 'sin-datos']

/** Notas de utilería para el muro del fondo: ancho de las barras + veredicto. */
const COLUMNAS: { anchos: [string, string]; verdict: Verdict }[][] = [
  [
    { anchos: ['82%', '54%'], verdict: 'falso' },
    { anchos: ['70%', '46%'], verdict: 'verificado' },
    { anchos: ['90%', '62%'], verdict: 'dudoso' },
    { anchos: ['64%', '40%'], verdict: 'sin-datos' },
    { anchos: ['86%', '58%'], verdict: 'verificado' },
  ],
  [
    { anchos: ['74%', '50%'], verdict: 'dudoso' },
    { anchos: ['88%', '58%'], verdict: 'falso' },
    { anchos: ['66%', '44%'], verdict: 'verificado' },
    { anchos: ['92%', '60%'], verdict: 'sin-datos' },
    { anchos: ['78%', '48%'], verdict: 'dudoso' },
  ],
]

/** Solo dos columnas, contra los bordes: enmarcan sin invadir el centro. */
const POSICION_COLUMNA = [
  'left-[2%] top-[-15%] h-[130%] w-[190px] [animation-duration:38s]',
  'right-[2%] top-[-25%] h-[140%] w-[190px] [animation-duration:32s]',
]

function NotaDeUtileria({ anchos, verdict }: { anchos: [string, string]; verdict: Verdict }) {
  const meta = VERDICT[verdict]
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border border-t-[3px] bg-surface p-3.5',
        meta.borderTop,
      )}
    >
      <span className="h-[7px] rounded-sm bg-border-strong" style={{ width: anchos[0] }} />
      <span className="h-[7px] rounded-sm bg-border-strong" style={{ width: anchos[1] }} />
      <span
        className={cn(
          'self-start rounded-pill border border-current px-2 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.1em]',
          meta.text,
        )}
      >
        {meta.label}
      </span>
    </div>
  )
}

/** El muro se duplica en cada columna para que el loop cierre sin salto. */
function MuroDeNotas() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-0 opacity-30 [mask-image:radial-gradient(ellipse_70%_62%_at_50%_46%,transparent_42%,black_88%)] [-webkit-mask-image:radial-gradient(ellipse_70%_62%_at_50%_46%,transparent_42%,black_88%)]"
    >
      {COLUMNAS.map((notas, columna) => (
        <div
          key={columna}
          className={cn('absolute flex animate-drift-y flex-col gap-4', POSICION_COLUMNA[columna])}
        >
          {[...notas, ...notas].map((nota, i) => (
            <NotaDeUtileria key={i} anchos={nota.anchos} verdict={nota.verdict} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[900px] flex-col items-center justify-center overflow-hidden px-gutter pb-28 pt-24 md:px-6">
      <Aurora intensity="loud" />
      <MuroDeNotas />
      <div aria-hidden="true" className="noise-field z-[2]" />

      {/* Scrim: deja el muro de fondo visible pero devuelve contraste al texto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[46%] z-[2] h-[640px] w-[min(980px,96%)] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--bg) 0%, color-mix(in oklab, var(--bg) 82%, transparent) 44%, transparent 72%)',
        }}
      />

      <div className="relative z-[3] max-w-3xl animate-rise text-center">
        <p className="eyebrow justify-center">Verificación que se deja auditar</p>

        <h1 className="mt-8 font-display text-[clamp(3rem,7.4vw,6rem)] leading-[1.02] font-bold tracking-[-0.03em] text-display">
          ¿Es verdad?
          <span className="mt-2 block text-aurora">Te mostramos cómo lo supimos.</span>
        </h1>

        <p className="mx-auto mt-7 max-w-texto text-pretty text-muted">
          Pegá el enlace de una nota. Te devolvemos el veredicto, qué tan sólida es la evidencia,
          las fuentes que consultamos —con su postura, incluso las que lo contradicen— y los pasos
          del razonamiento.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <PalabraRotativa />
          <p className="font-mono text-micro uppercase text-disabled">
            Cuatro veredictos · cinco niveles de confianza · ningún porcentaje
          </p>
        </div>
      </div>

      <div className="relative z-[3] mt-12 flex w-full justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -inset-y-6 -z-10 mx-auto max-w-card rounded-[2rem] blur-3xl"
          style={{
            background:
              'linear-gradient(135deg, var(--aurora-a) 0%, var(--aurora-b) 55%, transparent 100%)',
          }}
        />
        <AnalisisInput />
      </div>

      {/* La leyenda de los cuatro estados, con su color y qué significa cada
          uno. Vive acá y no en una sección aparte porque es el vocabulario que
          hay que tener antes de leer el primer resultado. */}
      <ul className="relative z-[3] mt-16 grid w-full max-w-shell grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
        {ORDEN.map((v) => {
          const meta = VERDICT[v]
          const Icon = meta.icon
          return (
            <li key={v} className="flex flex-col gap-2 border-t border-border pt-4">
              <span className={cn('flex items-center gap-2 font-mono text-micro uppercase', meta.text)}>
                <Icon aria-hidden="true" size={13} strokeWidth={2.25} />
                {meta.label}
              </span>
              <span className="text-caption tracking-normal text-subtle">{meta.meaning}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
