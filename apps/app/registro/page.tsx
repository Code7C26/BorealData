'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { apiFetch } from '@/lib/api'
import { mensajeErrorFirebase } from '@/lib/firebase-errors'
import { traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { AuthRedirect } from '@/components/auth-redirect'
import { AuthShell, Campo } from '@/components/auth-shell'

const MIN_PASSWORD = 8

const TEXTOS = traducciones({
  es: {
    faltanCampos: 'Faltan campos por completar.',
    emailInvalido: 'Ese email no tiene un formato válido.',
    contrasenaCorta: (min: number) => `La contraseña necesita al menos ${min} caracteres.`,
    noCoinciden: 'Las dos contraseñas no coinciden.',
    faltaAceptar: 'Falta aceptar los términos y la política de privacidad.',
    noPudimos: 'No pudimos crear la cuenta. Probá de nuevo.',
    eyebrow: 'Crear cuenta',
    titulo: 'Guardá lo que verificás',
    bajada:
      'Tu historial queda disponible desde cualquier dispositivo, con las fuentes de cada análisis.',
    yaTenes: '¿Ya tenés cuenta?',
    entra: 'Entrá',
    nombre: 'Nombre',
    nombrePlaceholder: 'Tu nombre y apellido',
    email: 'Email',
    emailPlaceholder: 'tu@email.com',
    contrasena: 'Contraseña',
    contrasenaPlaceholder: (min: number) => `Mínimo ${min} caracteres`,
    repetir: 'Repetir contraseña',
    repetirPlaceholder: 'La misma de arriba',
    ocultar: 'Ocultar contraseña',
    mostrar: 'Mostrar contraseña',
    acepto: 'Acepto los',
    terminos: 'términos y condiciones',
    yLa: 'y la',
    privacidad: 'política de privacidad',
    creando: 'Creando la cuenta…',
    crear: 'Crear cuenta',
  },
  en: {
    faltanCampos: 'Some fields are still empty.',
    emailInvalido: "That email doesn't have a valid format.",
    contrasenaCorta: (min: number) => `The password needs at least ${min} characters.`,
    noCoinciden: "The two passwords don't match.",
    faltaAceptar: 'You need to accept the terms and the privacy policy.',
    noPudimos: "We couldn't create the account. Try again.",
    eyebrow: 'Create account',
    titulo: 'Keep what you check',
    bajada: 'Your history is available from any device, with the sources of every analysis.',
    yaTenes: 'Already have an account?',
    entra: 'Log in',
    nombre: 'Name',
    nombrePlaceholder: 'Your first and last name',
    email: 'Email',
    emailPlaceholder: 'you@email.com',
    contrasena: 'Password',
    contrasenaPlaceholder: (min: number) => `At least ${min} characters`,
    repetir: 'Repeat password',
    repetirPlaceholder: 'Same as above',
    ocultar: 'Hide password',
    mostrar: 'Show password',
    acepto: 'I accept the',
    terminos: 'terms and conditions',
    yLa: 'and the',
    privacidad: 'privacy policy',
    creando: 'Creating the account…',
    crear: 'Create account',
  },
})

export default function RegistroPage() {
  const router = useRouter()
  const { idioma } = useIdioma()
  const t = useTextos(TEXTOS)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)

  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const emailValido = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre || !email || !password || !confirmPassword) {
      setError(t.faltanCampos)
      return
    }
    if (!emailValido(email)) {
      setError(t.emailInvalido)
      return
    }
    if (password.length < MIN_PASSWORD) {
      setError(t.contrasenaCorta(MIN_PASSWORD))
      return
    }
    if (password !== confirmPassword) {
      setError(t.noCoinciden)
      return
    }
    if (!aceptaTerminos) {
      setError(t.faltaAceptar)
      return
    }

    setError('')
    setEnviando(true)

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: nombre.trim() })
      await apiFetch('/me', { method: 'POST', body: { fullName: nombre.trim() } })
      router.push('/dashboard')
    } catch (err) {
      setError(mensajeErrorFirebase(err, t.noPudimos, idioma))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell
      eyebrow={t.eyebrow}
      titulo={t.titulo}
      bajada={t.bajada}
      pie={
        <>
          {t.yaTenes}{' '}
          <Link
            href="/login"
            className="text-accent-text underline-offset-4 transition-colors duration-150 ease-boreal hover:underline"
          >
            {t.entra}
          </Link>
        </>
      }
    >
      <AuthRedirect to="/dashboard" />

      {error && (
        <p role="alert" className="alert-form">
          <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Campo label={t.nombre} htmlFor="nombre">
          <input
            id="nombre"
            type="text"
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t.nombrePlaceholder}
            className="field-input"
          />
        </Campo>

        <Campo label={t.email} htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className="field-input"
          />
        </Campo>

        <Campo label={t.contrasena} htmlFor="password">
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.contrasenaPlaceholder(MIN_PASSWORD)}
              className="field-input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t.ocultar : t.mostrar}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Campo>

        <Campo label={t.repetir} htmlFor="confirm">
          <div className="relative">
            <input
              id="confirm"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.repetirPlaceholder}
              className="field-input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? t.ocultar : t.mostrar}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Campo>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="terminos"
            checked={aceptaTerminos}
            onChange={(e) => setAceptaTerminos(e.target.checked)}
            className="mt-1 size-4 cursor-pointer accent-[var(--accent)]"
          />
          <label htmlFor="terminos" className="cursor-pointer text-body-sm leading-snug text-muted">
            {t.acepto}{' '}
            <Link href="/terminos" className="text-accent-text underline-offset-4 hover:underline">
              {t.terminos}
            </Link>{' '}
            {t.yLa}{' '}
            <Link href="/privacidad" className="text-accent-text underline-offset-4 hover:underline">
              {t.privacidad}
            </Link>
            .
          </label>
        </div>

        <button type="submit" disabled={enviando} className="btn-primary mt-2 w-full">
          {enviando ? t.creando : t.crear}
        </button>
      </form>
    </AuthShell>
  )
}
