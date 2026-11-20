'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Check, FlaskConical, Sparkles } from 'lucide-react'
import { AccionesDeBaja, ConstanciaDeBaja } from '@/components/plan/acciones-de-baja'
import { mensajeDeError } from '@/lib/errores-api'
import { TAG_IDIOMA, traducciones, type Idioma } from '@/lib/idioma'
import {
  iniciarCheckout,
  obtenerPlan,
  PAGOS_PREMIUM_ABIERTOS,
  RUTA_PLAN,
  sincronizarPlan,
  type EstadoPlan,
  type ResultadoBaja,
  type Ventana,
} from '@/lib/plan'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: {
    volver: 'Configuración',
    eyebrow: 'Configuración',
    titulo: 'Tu plan',
    cargando: 'Cargando tu plan…',
    noPudimos: 'No pudimos cargar tu plan. Probá de nuevo en un rato.',
    reintentar: 'Reintentar',
    nombres: { gratuito: 'Gratuito', premium: 'Premium' },
    planActual: 'Plan actual',
    usoDel: (ventana: Ventana): string => (ventana === 'dia' ? 'Uso de hoy' : 'Uso de este mes'),
    usados: (usados: number, limite: number) => `${usados} de ${limite} análisis`,
    renueva: (ventana: Ventana, fecha: string) =>
      ventana === 'dia' ? 'Se renueva mañana a la medianoche.' : `Se renueva el ${fecha}.`,
    usoJusto: 'Tope de uso justo: alto para una persona, frena el uso automatizado.',
    activoHasta: (fecha: string) => `Activo hasta el ${fecha}; se renueva solo con cada cobro.`,
    tope: (limite: number) =>
      `Usaste los ${limite} análisis gratis de hoy. Se renuevan mañana a la medianoche.`,
    topeUpsell: 'Si verificás todos los días, Premium te da mucho más margen y sin anuncios.',
    premiumTitulo: 'Pasate a Premium',
    porMes: '/ mes',
    beneficios: (premium: number, gratis: number) => [
      `Hasta ${premium} análisis por mes, en vez de ${gratis} por día`,
      'Sin anuncios',
      'Todo lo del Gratuito: enlaces, textos, imágenes y fuentes',
      'Te das de baja cuando quieras, desde acá',
    ],
    pasarme: 'Pasarme a Premium',
    redirigiendo: 'Te llevamos a Mercado Pago…',
    pagosDeshabilitados: 'Los pagos todavía no están habilitados.',
    proximamente: 'Próximamente',
    premiumProximamente: 'Premium va a estar disponible muy pronto.',
    pagoSeguro: 'Pagás en Mercado Pago: tus datos de tarjeta nunca pasan por AletheIA.',
    modoPrueba:
      'Modo prueba de Mercado Pago: no se cobra plata real. Entrá al checkout con la cuenta compradora de prueba y pagá con una tarjeta de prueba.',
    confirmando: 'Estamos confirmando tu pago con Mercado Pago…',
    pendiente:
      'Mercado Pago todavía no confirmó el pago. Si ya pagaste, en unos minutos tu cuenta pasa sola a Premium.',
    bienvenida: '¡Listo! Ya tenés Premium.',
    administrar: 'Tu suscripción',
    bajaSinSesion: 'También podés pedir la baja o arrepentirte desde',
    paginaBaja: 'la página de baja',
  },
  en: {
    volver: 'Settings',
    eyebrow: 'Settings',
    titulo: 'Your plan',
    cargando: 'Loading your plan…',
    noPudimos: "We couldn't load your plan. Try again in a while.",
    reintentar: 'Retry',
    nombres: { gratuito: 'Free', premium: 'Premium' },
    planActual: 'Current plan',
    usoDel: (ventana: Ventana) => (ventana === 'dia' ? 'Usage today' : 'Usage this month'),
    usados: (usados: number, limite: number) => `${usados} of ${limite} analyses`,
    renueva: (ventana: Ventana, fecha: string) =>
      ventana === 'dia' ? 'Renews tomorrow at midnight.' : `Renews on ${fecha}.`,
    usoJusto: 'Fair-use cap: generous for a person, it stops automated use.',
    activoHasta: (fecha: string) => `Active until ${fecha}; it renews with each charge.`,
    tope: (limite: number) =>
      `You've used your ${limite} free analyses for today. They renew tomorrow at midnight.`,
    topeUpsell: 'If you fact-check every day, Premium gives you much more room and no ads.',
    premiumTitulo: 'Upgrade to Premium',
    porMes: '/ month',
    beneficios: (premium: number, gratis: number) => [
      `Up to ${premium} analyses per month instead of ${gratis} per day`,
      'No ads',
      'Everything in Free: links, text, images and sources',
      'Cancel whenever you want, right here',
    ],
    pasarme: 'Upgrade to Premium',
    redirigiendo: 'Taking you to Mercado Pago…',
    pagosDeshabilitados: 'Payments are not enabled yet.',
    proximamente: 'Coming soon',
    premiumProximamente: 'Premium will be available very soon.',
    pagoSeguro: 'You pay on Mercado Pago: your card details never go through AletheIA.',
    modoPrueba:
      'Mercado Pago test mode: no real money is charged. Log in to the checkout with the test buyer account and pay with a test card.',
    confirmando: 'Confirming your payment with Mercado Pago…',
    pendiente:
      "Mercado Pago hasn't confirmed the payment yet. If you already paid, your account will switch to Premium in a few minutes.",
    bienvenida: "Done! You're on Premium now.",
    administrar: 'Your subscription',
    bajaSinSesion: 'You can also cancel or withdraw from',
    paginaBaja: 'the cancellation page',
  },
})

/** 'YYYY-MM-DD' o ISO → "1 de diciembre". Mediodía para que el huso no corra el día. */
function fecha(valor: string, idioma: Idioma): string {
  const d = valor.length === 10 ? new Date(`${valor}T12:00:00`) : new Date(valor)
  return d.toLocaleDateString(TAG_IDIOMA[idioma], { day: 'numeric', month: 'long' })
}

function precio(monto: number, moneda: string, idioma: Idioma): string {
  return new Intl.NumberFormat(TAG_IDIOMA[idioma], {
    style: 'currency',
    currency: moneda,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(monto)
}

/** Hasta cuántas veces se relee la suscripción al volver del checkout, y cada cuánto. */
const INTENTOS_SINCRONIZAR = 4
const ESPERA_SINCRONIZAR_MS = 2500

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Aviso = 'tope' | 'bienvenida' | 'pendiente' | null

function TuPlan({ volverDeMp, suscribir, tope }: { volverDeMp: boolean; suscribir: boolean; tope: boolean }) {
  const t = useTextos(TEXTOS)
  const { idioma } = useIdioma()
  const router = useRouter()
  const [estado, setEstado] = useState<EstadoPlan | null>(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState<'confirmando' | 'redirigiendo' | null>(
    volverDeMp ? 'confirmando' : suscribir ? 'redirigiendo' : null,
  )
  const [aviso, setAviso] = useState<Aviso>(tope ? 'tope' : null)
  const [constancia, setConstancia] = useState<ResultadoBaja | null>(null)
  const [intento, setIntento] = useState(0)
  const iniciadoRef = useRef(-1)

  async function irAlCheckout() {
    setOcupado('redirigiendo')
    setError('')
    try {
      window.location.assign(await iniciarCheckout())
    } catch (err) {
      setOcupado(null)
      setError(mensajeDeError(err, idioma, t.noPudimos))
    }
  }

  // Una sola carga por intento (el ref evita el doble efecto de Strict Mode, que acá
  // crearía dos suscripciones en Mercado Pago).
  useEffect(() => {
    if (iniciadoRef.current === intento) return
    iniciadoRef.current = intento

    async function cargar() {
      try {
        if (volverDeMp) {
          // El webhook puede tardar (o no llegar, en local): se relee la suscripción
          // unas veces mientras siga "pending".
          let actual = await sincronizarPlan()
          for (let i = 1; i < INTENTOS_SINCRONIZAR && actual.plan !== 'premium'; i++) {
            if (actual.suscripcion.status !== 'pending') break
            await esperar(ESPERA_SINCRONIZAR_MS)
            actual = await sincronizarPlan()
          }
          setEstado(actual)
          setAviso(actual.plan === 'premium' ? 'bienvenida' : 'pendiente')
          setOcupado(null)
        } else {
          const actual = await obtenerPlan()
          setEstado(actual)
          if (suscribir && actual.plan !== 'premium' && actual.pagos.habilitados && PAGOS_PREMIUM_ABIERTOS) {
            window.location.assign(await iniciarCheckout())
            return
          }
          setOcupado(null)
        }
        // Los parámetros ya se usaron: recargar no tiene que volver a abrir el checkout.
        if (volverDeMp || suscribir) router.replace(RUTA_PLAN)
      } catch (err) {
        setOcupado(null)
        setError(mensajeDeError(err, idioma, t.noPudimos))
      }
    }
    cargar()
  }, [intento, volverDeMp, suscribir, router, idioma, t.noPudimos])

  const premium = estado?.plan === 'premium'
  const porcentaje = estado ? Math.min(100, Math.round((estado.uso.usados / estado.uso.limite) * 100)) : 0

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-6 px-gutter py-12 md:px-6 md:py-16">
      <header className="flex flex-col gap-3">
        <Link
          href="/configuracion"
          className="inline-flex items-center gap-1.5 self-start font-mono text-micro uppercase text-subtle transition-colors hover:text-accent-text"
        >
          <ArrowLeft aria-hidden="true" size={13} />
          {t.volver}
        </Link>
        <h1 className="font-display text-h2-fluid text-display">{t.titulo}</h1>
      </header>

      {PAGOS_PREMIUM_ABIERTOS && estado?.pagos.modoPrueba && (
        <p className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-sunk px-4 py-3 text-caption tracking-normal text-muted">
          <FlaskConical aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-accent-text" />
          {t.modoPrueba}
        </p>
      )}

      {aviso === 'tope' && estado && !premium && (
        <div role="alert" className="alert-form flex-col">
          <p className="flex items-start gap-2.5">
            <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {t.tope(estado.uso.limite)}
          </p>
          <p className="pl-6">{t.topeUpsell}</p>
        </div>
      )}
      {aviso === 'bienvenida' && (
        <p role="status" className="flex items-center gap-2.5 rounded-lg border border-verdict-verificado/45 bg-verdict-verificado/10 px-4 py-3 text-body-sm text-verdict-verificado">
          <Sparkles aria-hidden="true" size={16} className="shrink-0" />
          {t.bienvenida}
        </p>
      )}
      {aviso === 'pendiente' && !premium && (
        <p role="status" className="alert-form">
          <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {t.pendiente}
        </p>
      )}

      {error && (
        <div role="alert" className="alert-form flex-wrap items-center justify-between">
          <span className="flex items-start gap-2.5">
            <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {error}
          </span>
          {!estado && (
            <button type="button" className="btn-secondary" onClick={() => setIntento((n) => n + 1)}>
              {t.reintentar}
            </button>
          )}
        </div>
      )}

      {ocupado && (
        <p role="status" className="panel text-body-sm text-muted">
          {ocupado === 'confirmando' ? t.confirmando : t.redirigiendo}
        </p>
      )}
      {!estado && !error && !ocupado && <p className="panel text-body-sm text-muted">{t.cargando}</p>}

      {estado && (
        <section className="panel flex flex-col gap-5" aria-labelledby="plan-actual">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="plan-actual" className="font-mono text-caption uppercase text-subtle">
              {t.planActual}
            </h2>
            <span
              className={cn(
                'chip',
                premium ? 'text-accent-text' : 'text-subtle',
              )}
            >
              {t.nombres[estado.plan]}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-body-sm text-ink">{t.usoDel(estado.uso.ventana)}</p>
              <p className="font-mono text-caption tabular-nums text-display">
                {t.usados(estado.uso.usados, estado.uso.limite)}
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={estado.uso.limite}
              aria-valuenow={estado.uso.usados}
              aria-label={t.usoDel(estado.uso.ventana)}
              className="h-2 overflow-hidden rounded-pill bg-surface-sunk"
            >
              <div
                className={cn(
                  'h-full rounded-pill transition-[width] duration-300 ease-boreal',
                  porcentaje >= 100 ? 'bg-verdict-dudoso' : 'bg-accent',
                )}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <p className="text-caption tracking-normal text-subtle">
              {t.renueva(estado.uso.ventana, fecha(estado.uso.renueva, idioma))}
              {premium && ` ${t.usoJusto}`}
            </p>
          </div>

          {premium && estado.planHasta && (
            <p className="text-caption tracking-normal text-subtle">
              {t.activoHasta(fecha(estado.planHasta, idioma))}
            </p>
          )}
        </section>
      )}

      {estado && !premium && (
        <section
          className="panel flex flex-col gap-5 border-transparent [background:linear-gradient(var(--surface),var(--surface))_padding-box,linear-gradient(135deg,var(--aurora-500),var(--aurora-300),var(--luz))_border-box]"
          aria-labelledby="pasar-a-premium"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="pasar-a-premium" className="font-display text-h3 text-display">
              {t.premiumTitulo}
            </h2>
            <p className="flex items-baseline gap-2">
              <span className="font-display text-h3 font-bold tabular-nums text-display">
                {precio(estado.precio.monto, estado.precio.moneda, idioma)}
              </span>
              <span className="text-body-sm text-subtle">{t.porMes}</span>
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {t.beneficios(estado.cupos.premium.limite, estado.cupos.gratuito.limite).map((item) => (
              <li key={item} className="flex items-start gap-3 text-body-sm text-ink">
                <Check aria-hidden="true" size={16} strokeWidth={2.5} className="mt-[3px] shrink-0 text-accent-text" />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-primary w-full md:w-auto md:self-start"
            onClick={irAlCheckout}
            disabled={!PAGOS_PREMIUM_ABIERTOS || !estado.pagos.habilitados || ocupado !== null}
          >
            {!PAGOS_PREMIUM_ABIERTOS ? t.proximamente : ocupado === 'redirigiendo' ? t.redirigiendo : t.pasarme}
          </button>
          <p className="text-caption tracking-normal text-subtle">
            {!PAGOS_PREMIUM_ABIERTOS
              ? t.premiumProximamente
              : estado.pagos.habilitados
                ? t.pagoSeguro
                : t.pagosDeshabilitados}
          </p>
        </section>
      )}

      {constancia && <ConstanciaDeBaja resultado={constancia} />}

      {estado && premium && (
        <section className="panel flex flex-col gap-4" aria-labelledby="administrar">
          <h2 id="administrar" className="font-mono text-caption uppercase text-subtle">
            {t.administrar}
          </h2>
          <AccionesDeBaja
            estado={estado}
            onListo={(resultado) => {
              setConstancia(resultado)
              setEstado(resultado)
              setAviso(null)
            }}
          />
        </section>
      )}

      <p className="text-caption tracking-normal text-subtle">
        {t.bajaSinSesion}{' '}
        <Link href="/baja" className="text-accent-text underline-offset-4 hover:underline">
          {t.paginaBaja}
        </Link>
        .
      </p>
    </div>
  )
}

function TuPlanConParametros() {
  const params = useSearchParams()
  return (
    <TuPlan
      volverDeMp={params.get('volver') === 'mp'}
      suscribir={params.get('suscribir') === '1'}
      tope={params.get('tope') === '1'}
    />
  )
}

export default function TuPlanPage() {
  return (
    <Suspense fallback={null}>
      <TuPlanConParametros />
    </Suspense>
  )
}
