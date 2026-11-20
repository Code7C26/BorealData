'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Eye, EyeOff, MailCheck } from 'lucide-react'
import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword } from 'firebase/auth'
import { apiFetch, ApiError } from '@/lib/api'
import { auth } from '@/lib/firebase'
import { traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { AuthRedirect } from '@/components/auth-redirect'
import { AuthShell, Campo } from '@/components/auth-shell'

/** Igual que el registro y el backend (MIN_PASSWORD en routes/passwordReset.ts). */
const MIN_PASSWORD = 8
/** Cuánto hay que esperar para pedir otro código. */
const ESPERA_REENVIO_S = 60

const TEXTOS = traducciones({
  es: {
    eyebrow: 'Recuperar contraseña',
    tituloEmail: '¿Olvidaste tu contraseña?',
    bajadaEmail: 'Escribí el email de tu cuenta y te mandamos un código de 6 dígitos para elegir una nueva.',
    tituloCodigo: 'Revisá tu email',
    bajadaCodigo: (email: string) =>
      `Si hay una cuenta con ${email}, te llegó un código. Puede tardar un minuto; fijate también en spam.`,
    email: 'Email',
    emailPlaceholder: 'tu@email.com',
    enviarCodigo: 'Enviar código',
    enviando: 'Enviando…',
    codigo: 'Código',
    nueva: 'Contraseña nueva',
    nuevaPlaceholder: (min: number) => `Mínimo ${min} caracteres`,
    repetir: 'Repetí la contraseña',
    cambiar: 'Cambiar contraseña',
    cambiando: 'Cambiando…',
    reenviar: 'Reenviar código',
    reenviarEn: (s: number) => `Reenviar en ${s} s`,
    reenviado: 'Te mandamos un código nuevo. El anterior ya no sirve.',
    otroEmail: 'Usar otro email',
    ocultar: 'Ocultar contraseña',
    mostrar: 'Mostrar contraseña',
    volverLogin: '¿Te acordaste?',
    entrar: 'Entrá',
    emailInvalido: 'Escribí un email válido.',
    codigoIncompleto: 'El código tiene 6 dígitos.',
    contrasenaCorta: (min: number) => `La contraseña necesita al menos ${min} caracteres.`,
    noCoinciden: 'Las dos contraseñas no coinciden.',
    codigoIncorrecto: 'El código no es correcto. Revisalo y probá de nuevo.',
    codigoVencido: 'El código venció o se usó demasiadas veces. Pedí uno nuevo.',
    demasiados: 'Pediste demasiados códigos. Esperá unos minutos y probá de nuevo.',
    noHabilitado: 'La recuperación de contraseña todavía no está disponible. Escribinos a soporte@aletheiainc.online.',
    errorGenerico: 'Algo falló. Probá de nuevo en unos minutos.',
    listoTitulo: 'Contraseña cambiada',
    listoBajada: 'Ya podés entrar con tu contraseña nueva. Cerramos la sesión en tus otros dispositivos.',
    irLogin: 'Ir a entrar',
  },
  en: {
    eyebrow: 'Reset password',
    tituloEmail: 'Forgot your password?',
    bajadaEmail: "Enter your account's email and we'll send you a 6-digit code to choose a new one.",
    tituloCodigo: 'Check your email',
    bajadaCodigo: (email: string) =>
      `If there's an account for ${email}, a code is on its way. It can take a minute; check spam too.`,
    email: 'Email',
    emailPlaceholder: 'you@email.com',
    enviarCodigo: 'Send code',
    enviando: 'Sending…',
    codigo: 'Code',
    nueva: 'New password',
    nuevaPlaceholder: (min: number) => `At least ${min} characters`,
    repetir: 'Repeat the password',
    cambiar: 'Change password',
    cambiando: 'Changing…',
    reenviar: 'Resend code',
    reenviarEn: (s: number) => `Resend in ${s} s`,
    reenviado: "We sent you a new code. The previous one won't work anymore.",
    otroEmail: 'Use another email',
    ocultar: 'Hide password',
    mostrar: 'Show password',
    volverLogin: 'Remembered it?',
    entrar: 'Log in',
    emailInvalido: 'Enter a valid email.',
    codigoIncompleto: 'The code has 6 digits.',
    contrasenaCorta: (min: number) => `The password needs at least ${min} characters.`,
    noCoinciden: "The two passwords don't match.",
    codigoIncorrecto: "That code isn't right. Check it and try again.",
    codigoVencido: 'The code expired or was tried too many times. Ask for a new one.',
    demasiados: 'You asked for too many codes. Wait a few minutes and try again.',
    noHabilitado: "Password reset isn't available yet. Write to us at soporte@aletheiainc.online.",
    errorGenerico: 'Something went wrong. Try again in a few minutes.',
    listoTitulo: 'Password changed',
    listoBajada: 'You can log in with your new password. We logged you out on your other devices.',
    irLogin: 'Go to log in',
  },
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Paso = 'email' | 'codigo' | 'listo'

/**
 * "Me olvidé la contraseña", en tres pasos sobre la misma pantalla:
 *  1. email → POST /auth/password-reset/request manda un código de 6 dígitos.
 *  2. código + contraseña nueva → POST /auth/password-reset/confirm la cambia.
 *  3. Entra solo con la contraseña nueva y va al dashboard (si eso falla, botón a /login).
 *
 * El backend responde igual exista o no la cuenta (para no revelar quién tiene una), así
 * que el texto del paso 2 dice "si hay una cuenta con…".
 */
function Recuperar() {
  const router = useRouter()
  const params = useSearchParams()
  const { idioma } = useIdioma()
  const t = useTextos(TEXTOS)

  const [paso, setPaso] = useState<Paso>('email')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [espera, setEspera] = useState(0)

  useEffect(() => {
    if (espera <= 0) return
    const id = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [espera])

  function mensajeDe(err: unknown): string {
    if (!(err instanceof ApiError)) return t.errorGenerico
    if (err.status === 429) return t.demasiados
    if (err.status === 503) return t.noHabilitado
    const reason = (err.body as { reason?: string } | null)?.reason
    if (reason === 'incorrecto') return t.codigoIncorrecto
    if (reason === 'vencido' || reason === 'sin-intentos') return t.codigoVencido
    if (err.status === 400 && paso === 'email') return t.emailInvalido
    return t.errorGenerico
  }

  async function pedirCodigo(reenvio: boolean) {
    const limpio = email.trim()
    if (!EMAIL_RE.test(limpio)) {
      setError(t.emailInvalido)
      return
    }
    setError('')
    setAviso('')
    setEnviando(true)
    try {
      await apiFetch('/auth/password-reset/request', {
        method: 'POST',
        body: { email: limpio, language: idioma },
      })
      setPaso('codigo')
      setEspera(ESPERA_REENVIO_S)
      if (reenvio) {
        setCodigo('')
        setAviso(t.reenviado)
      }
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setEnviando(false)
    }
  }

  async function cambiar(e: React.FormEvent) {
    e.preventDefault()
    if (codigo.length !== 6) return setError(t.codigoIncompleto)
    if (password.length < MIN_PASSWORD) return setError(t.contrasenaCorta(MIN_PASSWORD))
    if (password !== repetir) return setError(t.noCoinciden)

    setError('')
    setAviso('')
    setEnviando(true)
    try {
      await apiFetch('/auth/password-reset/confirm', {
        method: 'POST',
        body: { email: email.trim(), code: codigo, password },
      })
    } catch (err) {
      setError(mensajeDe(err))
      setEnviando(false)
      return
    }

    // La contraseña ya cambió: entrar con ella ahorra volver a tipearla en /login.
    try {
      await setPersistence(auth, browserLocalPersistence)
      await signInWithEmailAndPassword(auth, email.trim(), password)
      router.push('/dashboard')
    } catch {
      setPaso('listo')
      setEnviando(false)
    }
  }

  const titulo = paso === 'email' ? t.tituloEmail : paso === 'codigo' ? t.tituloCodigo : t.listoTitulo
  const bajada =
    paso === 'email' ? t.bajadaEmail : paso === 'codigo' ? t.bajadaCodigo(email.trim()) : t.listoBajada

  return (
    <AuthShell
      eyebrow={t.eyebrow}
      titulo={titulo}
      bajada={bajada}
      pie={
        <>
          {t.volverLogin}{' '}
          <Link
            href="/login"
            className="text-accent-text underline-offset-4 transition-colors duration-150 ease-boreal hover:underline"
          >
            {t.entrar}
          </Link>
        </>
      }
    >
      {/* Con sesión no hay nada que recuperar. Excepto justo después de cambiarla: ahí
          el propio formulario navega al dashboard. */}
      {paso === 'email' && <AuthRedirect to="/dashboard" />}

      {error && (
        <p role="alert" className="alert-form">
          <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="flex items-start gap-2 text-body-sm text-muted">
          <MailCheck aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-accent-text" />
          {aviso}
        </p>
      )}

      {paso === 'email' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void pedirCodigo(false)
          }}
          className="flex flex-col gap-5"
        >
          <Campo label={t.email} htmlFor="email">
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="field-input"
            />
          </Campo>
          <button type="submit" disabled={enviando} className="btn-primary mt-2 w-full">
            {enviando ? t.enviando : t.enviarCodigo}
          </button>
        </form>
      )}

      {paso === 'codigo' && (
        <form onSubmit={cambiar} className="flex flex-col gap-5">
          <Campo label={t.codigo} htmlFor="codigo">
            <input
              id="codigo"
              // one-time-code: iOS y Android ofrecen pegar el código del mail en el teclado.
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="field-input text-center font-mono text-[1.5rem] tracking-[0.5em]"
            />
          </Campo>

          <Campo label={t.nueva} htmlFor="password">
            <div className="relative">
              <input
                id="password"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.nuevaPlaceholder(MIN_PASSWORD)}
                className="field-input pr-12"
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                aria-label={mostrar ? t.ocultar : t.mostrar}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
              >
                {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Campo>

          <Campo label={t.repetir} htmlFor="repetir">
            <input
              id="repetir"
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              placeholder="••••••••"
              className="field-input"
            />
          </Campo>

          <button type="submit" disabled={enviando} className="btn-primary mt-2 w-full">
            {enviando ? t.cambiando : t.cambiar}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={espera > 0 || enviando}
              onClick={() => void pedirCodigo(true)}
              className="font-mono text-micro uppercase text-accent-text underline-offset-4 hover:underline disabled:text-disabled disabled:no-underline"
            >
              {espera > 0 ? t.reenviarEn(espera) : t.reenviar}
            </button>
            <button
              type="button"
              onClick={() => {
                setPaso('email')
                setCodigo('')
                setError('')
                setAviso('')
              }}
              className="font-mono text-micro uppercase text-subtle underline-offset-4 hover:text-ink hover:underline"
            >
              {t.otroEmail}
            </button>
          </div>
        </form>
      )}

      {paso === 'listo' && (
        <Link href="/login" className="btn-primary w-full">
          {t.irLogin}
        </Link>
      )}
    </AuthShell>
  )
}

export default function RecuperarPage() {
  // useSearchParams pide un Suspense por encima para poder prerenderizar la página.
  return (
    <Suspense>
      <Recuperar />
    </Suspense>
  )
}
