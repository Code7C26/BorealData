'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { mensajeErrorFirebase } from '@/lib/firebase-errors'
import { AuthRedirect } from '@/components/auth-redirect'
import { AuthShell, Campo } from '@/components/auth-shell'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Arranca en true a propósito. Con `false` Firebase usa sessionStorage, que
  // es POR PESTAÑA: cualquier pestaña nueva (por ejemplo la que abre la
  // extensión) nacía deslogueada y parecía que se había cerrado la sesión.
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Falta completar el email o la contraseña.')
      return
    }
    setError('')
    setEnviando(true)

    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(mensajeErrorFirebase(err, 'No pudimos iniciar sesión. Probá de nuevo.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Entrar"
      titulo="Volvé a tus verificaciones"
      bajada="Tu historial, con el veredicto y las fuentes de cada nota que analizaste."
      pie={
        <>
          ¿No tenés cuenta?{' '}
          <Link
            href="/registro"
            className="text-accent-text underline-offset-4 transition-colors duration-150 ease-boreal hover:underline"
          >
            Creá una
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

        <Campo
          label="Contraseña"
          htmlFor="password"
          extra={
            <Link
              href="/recuperar"
              className="font-mono text-micro uppercase text-accent-text underline-offset-4 hover:underline"
            >
              ¿La olvidaste?
            </Link>
          }
        >
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--accent)]"
          />
          <label htmlFor="remember" className="cursor-pointer text-body-sm text-muted">
            Mantener la sesión abierta
          </label>
        </div>

        <button type="submit" disabled={enviando} className="btn-primary mt-2 w-full">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthShell>
  )
}
