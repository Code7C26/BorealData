'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { TAG_IDIOMA, traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   PRECIOS — único lugar a tocar cuando cambien. En pesos argentinos, por mes.
   Fuente: docs/negocio/viabilidad-comercial.md, §1.4 (Freemium + SaaS).

   Criterio (12-nov-2026): el Gratuito es una herramienta completa —enlaces E
   imágenes, veredicto, confianza y fuentes— con un tope mensual. Premium no le
   saca nada al Gratuito: suma volumen, velocidad y herramientas de trabajo.
   Institucional no va como tercera columna: es una venta conversada, así que
   vive en una franja corta debajo de las dos tarjetas.
   ───────────────────────────────────────────────────────────────────────────── */
const MONEDA = 'ARS'
const PRECIOS = { gratuito: 0, premium: 6999, institucional: 180000 } as const

type IdPlan = 'gratuito' | 'premium'
const ORDEN: IdPlan[] = ['gratuito', 'premium']
const RECOMENDADO: IdPlan = 'premium'

const TEXTOS = traducciones({
  es: {
    eyebrow: 'Planes',
    titulo: 'Empezá gratis.',
    destacado: 'Pasate cuando verifiques todos los días.',
    porMes: '/ mes',
    masPopular: 'Más popular',
    enPesos: 'Precios finales en pesos argentinos.',
    planes: {
      gratuito: {
        nombre: 'Gratuito',
        para: 'Todo lo que necesitás para chequear lo que te llega.',
        cta: 'Crear cuenta gratis',
        encabezado: null,
        items: [
          '150 análisis por mes',
          'Enlaces, textos e imágenes',
          'Veredicto, confianza y fuentes con su postura',
          'Extensión de Chrome y app móvil',
        ],
      },
      premium: {
        nombre: 'Premium',
        para: 'Para quien verifica como parte de su trabajo.',
        cta: 'Empezar con Premium',
        encabezado: 'Todo lo del Gratuito, y además:',
        items: [
          'Análisis ilimitados',
          'Procesamiento prioritario',
          'Informes en PDF y CSV',
          'Historial completo con búsqueda y filtros',
          'Carpetas compartidas para trabajar en equipo',
        ],
      },
    },
    institucional: {
      titulo: 'Institucional',
      texto:
        'Todo lo de Premium para escuelas, medios y ONG: 3.000 análisis por mes, cuentas para todo el equipo, panel de control y soporte.',
      desde: (precio: string) => `${precio} / mes`,
      cta: 'Hablar con nosotros',
    },
  },
  en: {
    eyebrow: 'Plans',
    titulo: 'Start for free.',
    destacado: 'Upgrade once you check every day.',
    porMes: '/ month',
    masPopular: 'Most popular',
    enPesos: 'Final prices in Argentine pesos.',
    planes: {
      gratuito: {
        nombre: 'Free',
        para: 'Everything you need to check what lands on your phone.',
        cta: 'Create a free account',
        encabezado: null,
        items: [
          '150 analyses per month',
          'Links, text and images',
          'Verdict, confidence and sources with their stance',
          'Chrome extension and mobile app',
        ],
      },
      premium: {
        nombre: 'Premium',
        para: 'For people who fact-check as part of their job.',
        cta: 'Start with Premium',
        encabezado: 'Everything in Free, plus:',
        items: [
          'Unlimited analyses',
          'Priority processing',
          'PDF and CSV reports',
          'Full history with search and filters',
          'Shared folders for teamwork',
        ],
      },
    },
    institucional: {
      titulo: 'Institutional',
      texto:
        'Everything in Premium for schools, newsrooms and NGOs: 3,000 analyses per month, accounts for the whole team, a control panel and support.',
      desde: (precio: string) => `${precio} / month`,
      cta: 'Talk to us',
    },
  },
})

const HREF: Record<IdPlan, string> = {
  gratuito: '/registro',
  premium: '/registro?plan=premium',
}

export function Planes() {
  const t = useTextos(TEXTOS)
  const tag = TAG_IDIOMA[useIdioma().idioma]

  const formato = (n: number) =>
    new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: MONEDA,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <section
      id="planes"
      className="border-t border-border px-gutter py-24 md:px-6 md:py-32"
      aria-labelledby="planes-title"
    >
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="eyebrow justify-center">{t.eyebrow}</p>
          <h2 id="planes-title" className="mt-5 text-balance font-display text-h2-fluid text-display">
            {t.titulo} <span className="text-aurora">{t.destacado}</span>
          </h2>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {ORDEN.map((id) => {
            const plan = t.planes[id]
            const precio = PRECIOS[id]
            const recomendado = id === RECOMENDADO

            return (
              <li
                key={id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-7 md:p-8',
                  recomendado
                    ? 'border-transparent bg-surface shadow-lg [background:linear-gradient(var(--surface),var(--surface))_padding-box,linear-gradient(135deg,var(--aurora-500),var(--aurora-300),var(--luz))_border-box]'
                    : 'border-border bg-surface/70',
                )}
              >
                {recomendado && (
                  <span className="absolute -top-3.5 left-7 rounded-pill bg-accent-solid px-3 py-1 font-mono text-micro uppercase text-accent-ink shadow-md md:left-8">
                    {t.masPopular}
                  </span>
                )}

                <h3 className="font-display text-h3 text-display">{plan.nombre}</h3>
                <p className="mt-1 text-body-sm text-muted">{plan.para}</p>

                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-[2.75rem] leading-none font-bold tracking-[-0.03em] text-display tabular-nums">
                    {formato(precio)}
                  </span>
                  {precio > 0 && <span className="text-body-sm text-subtle">{t.porMes}</span>}
                </p>

                <Link
                  href={HREF[id]}
                  className={cn('mt-7 w-full', recomendado ? 'btn-primary' : 'btn-secondary')}
                >
                  {plan.cta}
                </Link>

                <div className="mt-7 border-t border-border pt-6">
                  {plan.encabezado && (
                    <p className="mb-4 text-body-sm font-medium text-display">{plan.encabezado}</p>
                  )}
                  <ul className="flex flex-col gap-3">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-body-sm text-ink">
                        <Check
                          aria-hidden="true"
                          size={16}
                          strokeWidth={2.5}
                          className={cn(
                            'mt-[3px] shrink-0',
                            recomendado ? 'text-accent-text' : 'text-verdict-verificado',
                          )}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Institucional: una franja, no una tercera columna. */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface/70 px-7 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex flex-col gap-1">
            <p className="flex flex-wrap items-baseline gap-x-3 font-display text-body-sm font-semibold text-display">
              {t.institucional.titulo}
              <span className="font-mono text-caption font-normal tracking-normal text-subtle">
                {t.institucional.desde(formato(PRECIOS.institucional))}
              </span>
            </p>
            <p className="text-body-sm text-muted">{t.institucional.texto}</p>
          </div>
          <Link
            href="/contacto"
            className="group inline-flex shrink-0 items-center gap-2 font-display text-body-sm font-medium text-accent-text transition-colors duration-150 ease-boreal hover:text-accent-hover"
          >
            {t.institucional.cta}
            <ArrowRight
              aria-hidden="true"
              size={16}
              className="transition-transform duration-150 ease-boreal group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <p className="mt-6 text-center font-mono text-micro uppercase text-disabled">{t.enPesos}</p>
      </div>
    </section>
  )
}
