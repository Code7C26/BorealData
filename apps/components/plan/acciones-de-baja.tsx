'use client'

import { useState } from 'react'
import { AlertTriangle, RotateCcw, XCircle } from 'lucide-react'
import { mensajeDeError } from '@/lib/errores-api'
import { TAG_IDIOMA, traducciones } from '@/lib/idioma'
import { cancelarPlan, type EstadoPlan, type ResultadoBaja, type TipoBaja } from '@/lib/plan'
import { useIdioma, useTextos } from '@/lib/use-idioma'

const TEXTOS = traducciones({
  es: {
    baja: 'Botón de baja',
    bajaBajada: 'Cancelás la suscripción: no se te cobra más y tu cuenta vuelve al plan Gratuito.',
    arrepentimiento: 'Botón de arrepentimiento',
    arrepentimientoBajada: (dias: number, hasta: string) =>
      `Dentro de los ${dias} días desde que contrataste (hasta el ${hasta}) podés arrepentirte: cancelamos la suscripción y te devolvemos lo cobrado.`,
    confirmarBaja: '¿Cancelar la suscripción ahora?',
    confirmarArrepentimiento: '¿Arrepentirte y pedir el reintegro?',
    si: 'Sí, confirmar',
    no: 'Volver',
    procesando: 'Procesando…',
    noPudimos: 'No pudimos procesar el pedido. Probá de nuevo en un rato.',
  },
  en: {
    baja: 'Cancel subscription',
    bajaBajada: "You cancel the subscription: you won't be charged again and your account goes back to the Free plan.",
    arrepentimiento: 'Withdraw from the purchase',
    arrepentimientoBajada: (dias: number, hasta: string) =>
      `Within ${dias} days of subscribing (until ${hasta}) you can withdraw: we cancel the subscription and refund what you paid.`,
    confirmarBaja: 'Cancel the subscription now?',
    confirmarArrepentimiento: 'Withdraw and ask for a refund?',
    si: 'Yes, confirm',
    no: 'Go back',
    procesando: 'Processing…',
    noPudimos: "We couldn't process the request. Try again in a while.",
  },
})

/**
 * Los dos botones que exige la Disposición 954/2025 para una suscripción: el de baja y,
 * dentro de los primeros días, el de arrepentimiento. Un solo paso de confirmación y
 * nada más: la norma pide que darse de baja no cueste más que suscribirse.
 */
export function AccionesDeBaja({
  estado,
  onListo,
}: {
  estado: EstadoPlan
  onListo: (resultado: ResultadoBaja) => void
}) {
  const t = useTextos(TEXTOS)
  const { idioma } = useIdioma()
  const [confirmando, setConfirmando] = useState<TipoBaja | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const hastaArrepentimiento = estado.planDesde
    ? new Date(
        new Date(estado.planDesde).getTime() + estado.diasArrepentimiento * 24 * 60 * 60 * 1000,
      ).toLocaleDateString(TAG_IDIOMA[idioma], { day: 'numeric', month: 'long' })
    : ''

  async function confirmar(tipo: TipoBaja) {
    setEnviando(true)
    setError('')
    try {
      onListo(await cancelarPlan(tipo))
    } catch (err) {
      setError(mensajeDeError(err, idioma, t.noPudimos))
    } finally {
      setEnviando(false)
      setConfirmando(null)
    }
  }

  const opciones: { tipo: TipoBaja; titulo: string; bajada: string; Icon: typeof XCircle }[] = [
    ...(estado.puedeArrepentirse
      ? [
          {
            tipo: 'arrepentimiento' as const,
            titulo: t.arrepentimiento,
            bajada: t.arrepentimientoBajada(estado.diasArrepentimiento, hastaArrepentimiento),
            Icon: RotateCcw,
          },
        ]
      : []),
    { tipo: 'baja', titulo: t.baja, bajada: t.bajaBajada, Icon: XCircle },
  ]

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="alert-form">
          <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {opciones.map(({ tipo, titulo, bajada, Icon }) => (
        <div
          key={tipo}
          id={tipo}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface-sunk p-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-body-sm font-medium text-ink">
              <Icon aria-hidden="true" size={16} className="text-subtle" />
              {titulo}
            </p>
            <p className="mt-1 text-caption tracking-normal text-subtle">{bajada}</p>
          </div>

          {confirmando === tipo ? (
            <div className="flex shrink-0 flex-col gap-2 md:items-end">
              <p className="text-caption tracking-normal text-ink">
                {tipo === 'baja' ? t.confirmarBaja : t.confirmarArrepentimiento}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setConfirmando(null)}
                  disabled={enviando}
                >
                  {t.no}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => confirmar(tipo)}
                  disabled={enviando}
                >
                  {enviando ? t.procesando : t.si}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => setConfirmando(tipo)}
              disabled={enviando}
            >
              {titulo}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

const TEXTOS_CONSTANCIA = traducciones({
  es: {
    titulo: (tipo: TipoBaja): string =>
      tipo === 'baja' ? 'Listo: cancelamos tu suscripción.' : 'Listo: registramos tu arrepentimiento.',
    bajada: 'Tu cuenta volvió al plan Gratuito y no se te va a cobrar más.',
    reintegro: (n: number) =>
      n > 0
        ? `Pedimos el reintegro de ${n === 1 ? 'tu pago' : `tus ${n} pagos`} a Mercado Pago.`
        : 'No había cobros aprobados para reintegrar.',
    reintegroPendiente:
      'El reintegro automático no salió: lo hacemos a mano con este código y te avisamos por email.',
    codigo: 'Código de tu pedido',
    guardalo: 'Guardalo: es tu constancia.',
  },
  en: {
    titulo: (tipo: TipoBaja) =>
      tipo === 'baja' ? 'Done: we cancelled your subscription.' : 'Done: we registered your withdrawal.',
    bajada: "Your account is back on the Free plan and you won't be charged again.",
    reintegro: (n: number) =>
      n > 0
        ? `We asked Mercado Pago to refund ${n === 1 ? 'your payment' : `your ${n} payments`}.`
        : 'There were no approved charges to refund.',
    reintegroPendiente:
      "The automatic refund didn't go through: we'll do it by hand with this code and let you know by email.",
    codigo: 'Your request code',
    guardalo: 'Keep it: it is your receipt.',
  },
})

/** Constancia que se muestra después de una baja o un arrepentimiento. */
export function ConstanciaDeBaja({ resultado }: { resultado: ResultadoBaja }) {
  const t = useTextos(TEXTOS_CONSTANCIA)
  return (
    <div role="status" className="flex flex-col gap-2 rounded-lg border border-border bg-surface-sunk p-4">
      <p className="text-body-sm font-medium text-ink">{t.titulo(resultado.tipo)}</p>
      <p className="text-caption tracking-normal text-subtle">{t.bajada}</p>
      {resultado.tipo === 'arrepentimiento' && (
        <p className="text-caption tracking-normal text-subtle">
          {resultado.reintegroPendiente ? t.reintegroPendiente : t.reintegro(resultado.reintegrados)}
        </p>
      )}
      <CodigoDePedido codigo={resultado.codigo} etiqueta={t.codigo} nota={t.guardalo} />
    </div>
  )
}

export function CodigoDePedido({
  codigo,
  etiqueta,
  nota,
}: {
  codigo: string
  etiqueta: string
  nota: string
}) {
  return (
    <p className="mt-1 flex flex-col gap-1">
      <span className="field-label">{etiqueta}</span>
      <span className="select-all break-all font-mono text-body-sm text-display">{codigo}</span>
      <span className="text-caption tracking-normal text-subtle">{nota}</span>
    </p>
  )
}
