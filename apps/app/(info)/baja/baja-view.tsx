'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import {
  AccionesDeBaja,
  CodigoDePedido,
  ConstanciaDeBaja,
} from '@/components/plan/acciones-de-baja'
import { useAuth } from '@/lib/auth-context'
import { mensajeDeError } from '@/lib/errores-api'
import { traducciones } from '@/lib/idioma'
import {
  obtenerPlan,
  RUTA_PLAN,
  solicitarBajaSinSesion,
  type EstadoPlan,
  type ResultadoBaja,
  type TipoBaja,
} from '@/lib/plan'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: {
    eyebrow: 'Tu suscripción',
    titulo: 'Baja y arrepentimiento',
    bajada:
      'Cancelá AletheIA Premium cuando quieras, en un paso. Si contrataste hace 10 días o menos, también podés arrepentirte y te devolvemos lo cobrado.',
    cargando: 'Buscando tu suscripción…',
    sinSuscripcion: 'Tu cuenta está en el plan Gratuito: no tenés ninguna suscripción que cancelar.',
    verPlan: 'Ver tu plan',
    sinSesionTitulo: 'Sin iniciar sesión',
    sinSesionBajada:
      'Escribí el email de tu cuenta y elegí qué querés hacer. Te damos un código de pedido y lo resolvemos contra ese email. Si tenés la sesión abierta en otro dispositivo, desde ahí se hace en el momento.',
    email: 'Email de tu cuenta',
    emailPlaceholder: 'tu@email.com',
    queQueres: 'Qué querés hacer',
    opciones: {
      baja: 'Botón de baja: cancelar la suscripción',
      arrepentimiento: 'Botón de arrepentimiento: cancelar y pedir el reintegro',
    },
    enviar: 'Enviar pedido',
    enviando: 'Enviando…',
    noPudimos: 'No pudimos registrar el pedido. Probá de nuevo o escribinos a soporte@aletheiainc.online.',
    recibido: 'Recibimos tu pedido.',
    recibidoBajada: 'Lo resolvemos contra el email que escribiste y te avisamos por ese medio.',
    codigo: 'Código de tu pedido',
    guardalo: 'Guardalo: es tu constancia.',
    o: '¿Tenés cuenta en este dispositivo?',
    entrar: 'Entrá y hacelo en el momento',
  },
  en: {
    eyebrow: 'Your subscription',
    titulo: 'Cancel or withdraw',
    bajada:
      'Cancel AletheIA Premium whenever you want, in one step. If you subscribed 10 days ago or less, you can also withdraw and we refund what you paid.',
    cargando: 'Looking for your subscription…',
    sinSuscripcion: "Your account is on the Free plan: you don't have any subscription to cancel.",
    verPlan: 'See your plan',
    sinSesionTitulo: 'Without logging in',
    sinSesionBajada:
      "Write your account's email and choose what you want to do. We give you a request code and handle it against that email. If you're logged in on another device, you can do it instantly from there.",
    email: 'Account email',
    emailPlaceholder: 'you@email.com',
    queQueres: 'What do you want to do',
    opciones: {
      baja: 'Cancel the subscription',
      arrepentimiento: 'Withdraw: cancel and ask for a refund',
    },
    enviar: 'Send request',
    enviando: 'Sending…',
    noPudimos: "We couldn't register the request. Try again or write to soporte@aletheiainc.online.",
    recibido: 'We got your request.',
    recibidoBajada: "We'll handle it against the email you wrote and let you know there.",
    codigo: 'Your request code',
    guardalo: 'Keep it: it is your receipt.',
    o: 'Have an account on this device?',
    entrar: 'Log in and do it instantly',
  },
})

/** Con sesión: la suscripción de la cuenta y los dos botones, que actúan en el momento. */
function ConSesion() {
  const t = useTextos(TEXTOS)
  const { idioma } = useIdioma()
  const [estado, setEstado] = useState<EstadoPlan | null>(null)
  const [error, setError] = useState('')
  const [constancia, setConstancia] = useState<ResultadoBaja | null>(null)

  useEffect(() => {
    obtenerPlan()
      .then(setEstado)
      .catch((err) => setError(mensajeDeError(err, idioma, t.noPudimos)))
  }, [idioma, t.noPudimos])

  if (error) {
    return (
      <p role="alert" className="alert-form">
        <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
        {error}
      </p>
    )
  }
  if (!estado) return <p className="panel text-body-sm text-muted">{t.cargando}</p>

  return (
    <section className="panel flex flex-col gap-4">
      {constancia && <ConstanciaDeBaja resultado={constancia} />}
      {estado.plan === 'premium' ? (
        <AccionesDeBaja
          estado={estado}
          onListo={(resultado) => {
            setConstancia(resultado)
            setEstado(resultado)
          }}
        />
      ) : (
        !constancia && (
          <p className="text-body-sm text-muted">
            {t.sinSuscripcion}{' '}
            <Link href={RUTA_PLAN} className="text-accent-text underline-offset-4 hover:underline">
              {t.verPlan}
            </Link>
          </p>
        )
      )}
    </section>
  )
}

/** Sin sesión: no se puede probar de quién es la cuenta, así que queda un pedido con código. */
function SinSesion() {
  const t = useTextos(TEXTOS)
  const { idioma } = useIdioma()
  const [email, setEmail] = useState('')
  const [tipo, setTipo] = useState<TipoBaja>('baja')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const { codigo } = await solicitarBajaSinSesion(email.trim(), tipo)
      setCodigo(codigo)
    } catch (err) {
      setError(mensajeDeError(err, idioma, t.noPudimos))
    } finally {
      setEnviando(false)
    }
  }

  if (codigo) {
    return (
      <section role="status" className="panel flex flex-col gap-2">
        <p className="text-body-sm font-medium text-ink">{t.recibido}</p>
        <p className="text-caption tracking-normal text-subtle">{t.recibidoBajada}</p>
        <CodigoDePedido codigo={codigo} etiqueta={t.codigo} nota={t.guardalo} />
      </section>
    )
  }

  return (
    <section className="panel flex flex-col gap-5">
      <div>
        <h2 className="font-mono text-caption uppercase text-subtle">{t.sinSesionTitulo}</h2>
        <p className="mt-2 text-body-sm text-muted">{t.sinSesionBajada}</p>
      </div>

      {error && (
        <p role="alert" className="alert-form">
          <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <form onSubmit={enviar} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="field-label">{t.email}</span>
          <input
            type="email"
            required
            autoComplete="email"
            className="field-input"
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="field-label mb-2">{t.queQueres}</legend>
          {(['baja', 'arrepentimiento'] as const).map((opcion) => (
            <label
              key={opcion}
              id={opcion}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-body-sm transition-colors duration-150 ease-boreal',
                tipo === opcion ? 'border-accent-text text-ink' : 'border-border text-muted',
              )}
            >
              <input
                type="radio"
                name="tipo"
                value={opcion}
                checked={tipo === opcion}
                onChange={() => setTipo(opcion)}
                className="accent-[var(--accent-solid)]"
              />
              {t.opciones[opcion]}
            </label>
          ))}
        </fieldset>

        <button type="submit" className="btn-primary self-start" disabled={enviando}>
          {enviando ? t.enviando : t.enviar}
        </button>
      </form>

      <p className="text-caption tracking-normal text-subtle">
        {t.o}{' '}
        <Link href="/login" className="text-accent-text underline-offset-4 hover:underline">
          {t.entrar}
        </Link>
      </p>
    </section>
  )
}

export function BajaView() {
  const t = useTextos(TEXTOS)
  const { user, loading } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="font-display text-h2-fluid text-display">{t.titulo}</h1>
        <p className="max-w-texto text-muted">{t.bajada}</p>
      </header>

      {loading ? (
        <p className="panel text-body-sm text-muted">{t.cargando}</p>
      ) : user ? (
        <ConSesion />
      ) : (
        <SinSesion />
      )}
    </div>
  )
}
