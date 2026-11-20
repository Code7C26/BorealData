'use client'

import Link from 'next/link'
import { ArrowRight, Check, Clock } from 'lucide-react'
import { TAG_IDIOMA, traducciones } from '@/lib/idioma'
import { CUPOS, PAGOS_PREMIUM_ABIERTOS, PRECIO_PREMIUM_ARS, type IdPlan } from '@/lib/plan'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   PRECIOS — único lugar a tocar cuando cambien. En pesos argentinos, por mes.
   Fuente: docs/negocio/viabilidad-comercial.md, §1.4 (Freemium + SaaS).

   Criterio (12-nov-2026): el Gratuito es una herramienta completa —enlaces E
   imágenes, veredicto, confianza y fuentes— con un tope diario. Premium no le
   saca nada al Gratuito: suma volumen, velocidad y herramientas de trabajo.
   Institucional no va como tercera columna: es una venta conversada, así que
   vive en una franja corta debajo de las dos tarjetas, sin precio (a medida).

   Cupos y precio de Premium salen de lib/plan.ts, espejo del backend
   (backend/src/plan/config.ts): son los que el backend aplica de verdad.
   Lo que todavía no existe va en `proximamente`, marcado como tal: la landing no
   promete nada que el producto no haga (auditoría del 19-nov-2026).
   ───────────────────────────────────────────────────────────────────────────── */
const MONEDA = 'ARS'
// Institucional no tiene precio: se negocia con cada institución (cuentas,
// volumen de análisis y soporte) y es un sistema dedicado a ella.
const PRECIOS: Record<IdPlan, number> = { gratuito: 0, premium: PRECIO_PREMIUM_ARS }

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
    proximamente: 'Próximamente',
    planes: {
      gratuito: {
        nombre: 'Gratuito',
        para: 'Todo lo que necesitás para chequear lo que te llega.',
        cta: 'Crear cuenta gratis',
        encabezado: null,
        items: [
          `${CUPOS.gratuito.limite} análisis por día`,
          'Enlaces, textos e imágenes',
          'Veredicto, confianza y fuentes con su postura',
          'Historial con búsqueda y filtros',
          'Extensión de Chrome y app para el celular',
        ],
        proximamente: [],
      },
      premium: {
        nombre: 'Premium',
        para: 'Para quien verifica como parte de su trabajo.',
        cta: 'Empezar con Premium',
        encabezado: 'Todo lo del Gratuito, y además:',
        items: [
          `Hasta ${CUPOS.premium.limite} análisis por mes (uso justo)`,
          'Sin anuncios',
          'Baja en un paso, cuando quieras',
        ],
        proximamente: [
          'Procesamiento prioritario',
          'Informes en PDF y CSV',
          'Carpetas compartidas para trabajar en equipo',
        ],
      },
    },
    institucional: {
      titulo: 'Institucional',
      texto:
        'Un sistema dedicado a cada escuela, medio u ONG: cuentas, volumen de análisis y soporte se definen con ustedes.',
      precio: 'A medida',
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
    proximamente: 'Coming soon',
    planes: {
      gratuito: {
        nombre: 'Free',
        para: 'Everything you need to check what lands on your phone.',
        cta: 'Create a free account',
        encabezado: null,
        items: [
          `${CUPOS.gratuito.limite} analyses per day`,
          'Links, text and images',
          'Verdict, confidence and sources with their stance',
          'History with search and filters',
          'Chrome extension and phone app',
        ],
        proximamente: [],
      },
      premium: {
        nombre: 'Premium',
        para: 'For people who fact-check as part of their job.',
        cta: 'Start with Premium',
        encabezado: 'Everything in Free, plus:',
        items: [
          `Up to ${CUPOS.premium.limite} analyses per month (fair use)`,
          'No ads',
          'Cancel in one step, whenever you want',
        ],
        proximamente: ['Priority processing', 'PDF and CSV reports', 'Shared folders for teamwork'],
      },
    },
    institucional: {
      titulo: 'Institutional',
      texto:
        'A dedicated system for each school, newsroom or NGO: accounts, analysis volume and support are agreed with you.',
      precio: 'Custom',
      cta: 'Talk to us',
    },
  },
})

// Premium: registro (o login, el link conserva el plan) y de ahí directo al checkout
// de Mercado Pago (destinoTrasEntrar en lib/plan.ts).
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
      className="border-t border-border px-gutter py-20 md:px-6 md:py-32"
      aria-labelledby="planes-title"
    >
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="eyebrow justify-center">{t.eyebrow}</p>
          <h2 id="planes-title" className="mt-5 text-balance font-display text-h2-fluid text-display">
            {t.titulo} <span className="text-aurora">{t.destacado}</span>
          </h2>
        </div>

        <ul className="mt-10 grid md:mt-14 grid-cols-1 gap-6 md:grid-cols-2">
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

                {id === 'premium' && !PAGOS_PREMIUM_ABIERTOS ? (
                  // Pagos cerrados (ver PAGOS_PREMIUM_ABIERTOS en lib/plan.ts).
                  <button type="button" disabled className="btn-secondary mt-7 w-full">
                    <Clock aria-hidden="true" size={16} />
                    {t.proximamente}
                  </button>
                ) : (
                  <Link
                    href={HREF[id]}
                    className={cn('mt-7 w-full', recomendado ? 'btn-primary' : 'btn-secondary')}
                  >
                    {plan.cta}
                  </Link>
                )}

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
                    {plan.proximamente.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-body-sm text-subtle">
                        <Clock aria-hidden="true" size={16} className="mt-[3px] shrink-0 text-disabled" />
                        <span>
                          {item}{' '}
                          <span className="ml-1 whitespace-nowrap rounded-pill border border-border px-2 py-0.5 font-mono text-[0.625rem] uppercase text-subtle">
                            {t.proximamente}
                          </span>
                        </span>
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
                {t.institucional.precio}
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
