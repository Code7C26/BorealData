'use client'

import { Layers, Scale, ShieldCheck, type LucideIcon } from 'lucide-react'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'

/**
 * Los tres pilares: por qué AletheIA y no un chat al que le pegás un texto.
 *
 * Cada pilar cierra con una "prueba" en mono — el vocabulario concreto que lo
 * sostiene — para que no quede en adjetivos. Se escanea en tres líneas: número,
 * titular, prueba.
 */
const TEXTOS = traducciones({
  es: {
    eyebrow: 'Por qué AletheIA',
    titulo: 'No te pedimos que confíes.',
    destacado: 'Te mostramos el trabajo.',
    pilares: [
      {
        titulo: 'Un veredicto que se puede auditar',
        texto:
          'Cuatro veredictos y cinco niveles de confianza, separados. Sabés qué concluimos y qué tan sólida es la evidencia, sin porcentajes que fingen precisión.',
        prueba: '4 veredictos · 5 niveles · 0 %',
      },
      {
        titulo: 'Todas las fuentes, también las que contradicen',
        texto:
          'Cada fuente aparece con su postura y el enlace real. Si algo contradice el veredicto, lo ves igual. La última palabra es tuya.',
        prueba: 'Confirma · Contradice · Origen',
      },
      {
        titulo: 'Donde sea que estés leyendo',
        texto:
          'Un enlace, un texto suelto o la captura de una cadena de WhatsApp. Desde la web o desde el panel lateral de Chrome, sin cambiar de pestaña.',
        prueba: 'Enlace · Texto · Captura',
      },
    ],
  },
  en: {
    eyebrow: 'Why AletheIA',
    titulo: "We don't ask for your trust.",
    destacado: 'We show you the work.',
    pilares: [
      {
        titulo: 'A verdict you can audit',
        texto:
          'Four verdicts and five confidence levels, kept apart. You know what we concluded and how solid the evidence is, with no percentages faking precision.',
        prueba: '4 verdicts · 5 levels · 0 %',
      },
      {
        titulo: 'Every source, including the ones that disagree',
        texto:
          'Each source shows where it stands, with its real link. If something contradicts the verdict, you still see it. The last word is yours.',
        prueba: 'Confirms · Contradicts · Origin',
      },
      {
        titulo: 'Wherever you are reading',
        texto:
          'A link, a loose piece of text or a screenshot of a WhatsApp chain. From the web or from the Chrome side panel, without switching tabs.',
        prueba: 'Link · Text · Screenshot',
      },
    ],
  },
})

const ICONOS: LucideIcon[] = [ShieldCheck, Scale, Layers]

export function Pilares() {
  const t = useTextos(TEXTOS)

  return (
    <section id="por-que" className="px-gutter py-20 md:px-6 md:py-40" aria-labelledby="pilares-title">
      <div className="mx-auto max-w-shell">
        <div className="max-w-2xl">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="pilares-title" className="mt-5 text-balance font-display text-h2-fluid text-display">
            {t.titulo} <span className="text-aurora">{t.destacado}</span>
          </h2>
        </div>

        <ul className="mt-10 grid md:mt-16 grid-cols-1 gap-5 md:grid-cols-3">
          {t.pilares.map((p, i) => {
            const Icono = ICONOS[i]
            return (
              <li
                key={p.titulo}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-7 shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-boreal hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg md:p-8"
              >
                {/* Filo de aurora arriba: aparece entero al pasar el mouse. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-[0.18] bg-gradient-to-r from-aurora-500 via-aurora-300 to-luz transition-transform duration-300 ease-boreal group-hover:scale-x-100"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: 'var(--aurora-a)' }}
                />

                <div className="relative flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-xl border border-accent/40 bg-gradient-to-br from-aurora-500/25 to-transparent text-accent-text">
                    <Icono aria-hidden="true" size={22} strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-caption text-disabled">0{i + 1}</span>
                </div>

                <h3 className="relative mt-6 text-balance md:mt-8 font-display text-h3 text-display">{p.titulo}</h3>
                <p className="relative mt-3 hidden flex-1 text-pretty text-body-sm text-muted md:block">{p.texto}</p>
                <p className="relative mt-5 border-t md:mt-8 border-border pt-4 font-mono text-micro uppercase text-accent-text">
                  {p.prueba}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
