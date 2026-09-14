'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { apiFetch } from '@/lib/api'
import { mensajeErrorFirebase } from '@/lib/firebase-errors'
import { AuthRedirect } from '@/components/auth-redirect'
import { AuthShell, Campo } from '@/components/auth-shell'

const MIN_PASSWORD = 8

export default function RegistroPage() {
  const router = useRouter()
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
      setError('Faltan campos por completar.')
      return
    }
    if (!emailValido(email)) {
      setError('Ese email no tiene un formato válido.')
      return
    }
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Las dos contraseñas no coinciden.')
      return
    }
    if (!aceptaTerminos) {
      setError('Falta aceptar los términos y la política de privacidad.')
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
      setError(mensajeErrorFirebase(err, 'No pudimos crear la cuenta. Probá de nuevo.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Crear cuenta"
      titulo="Guardá lo que verificás"
      bajada="Tu historial queda disponible desde cualquier dispositivo, con las fuentes de cada análisis."
      pie={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/login"
            className="text-accent-text underline-offset-4 transition-colors duration-150 ease-boreal hover:underline"
          >
            Entrá
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
        <Campo label="Nombre" htmlFor="nombre">
          <input
            id="nombre"
            type="text"
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre y apellido"
            className="field-input"
          />
        </Campo>

        <Campo label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="field-input"
          />
        </Campo>

        <Campo label="Contraseña" htmlFor="password">
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
              className="field-input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Campo>

        <Campo label="Repetir contraseña" htmlFor="confirm">
          <div className="relative">
            <input
              id="confirm"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="La misma de arriba"
              className="field-input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
            Acepto los{' '}
            <Link href="/terminos" className="text-accent-text underline-offset-4 hover:underline">
              términos y condiciones
            </Link>{' '}
            y la{' '}
            <Link href="/privacidad" className="text-accent-text underline-offset-4 hover:underline">
              política de privacidad
            </Link>
            .
          </label>
        </div>

        <button type="submit" disabled={enviando} className="btn-primary mt-2 w-full">
          {enviando ? 'Creando la cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthShell>
  )
}
