'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Eye, EyeOff } from 'lucide-react'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api'
import { mensajeErrorFirebase } from '@/lib/firebase-errors'
import { iniciales } from '@/lib/usuario'
import { Campo } from '@/components/auth-shell'
import { CerrarSesionBoton } from '@/components/cerrar-sesion-boton'

const MIN_PASSWORD = 8
/** Cuánto queda visible el "Guardado" antes de volver al estado normal. */
const FEEDBACK_MS = 2500

function Guardado({ texto }: { texto: string }) {
  return (
    <span className="flex animate-rise items-center gap-2 text-body-sm text-verdict-verificado">
      <Check aria-hidden="true" size={16} />
      {texto}
    </span>
  )
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p role="alert" className="alert-form">
      <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      {texto}
    </p>
  )
}

export default function PerfilPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorInfo, setErrorInfo] = useState('')

  const email = user?.email ?? ''
  const nombreMostrado = profile?.fullName || user?.displayName || email

  /**
   * El campo no copia el nombre del perfil a un estado propio: muestra lo que la persona
   * escribió, y si no escribió nada todavía, lo que dice el perfil. Antes eso se hacía
   * con un efecto que pisaba el estado cada vez que cambiaba `profile`, lo que además
   * tenía un problema real: al guardar, `refreshProfile()` disparaba el efecto y podía
   * sobrescribir lo que estabas tipeando.
   *
   * `null` significa "sin editar": después de guardar se vuelve a null para que el campo
   * siga al perfil ya actualizado.
   */
  const nombreDelPerfil = profile?.fullName || user?.displayName || ''
  const [nombreEditado, setNombreEditado] = useState<string | null>(null)
  const nombre = nombreEditado ?? nombreDelPerfil

  const handleGuardarInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) return

    setErrorInfo('')
    setGuardando(true)
    try {
      await apiFetch('/me', { method: 'POST', body: { fullName: nombreLimpio } })
      if (user) await updateProfile(user, { displayName: nombreLimpio })
      await refreshProfile()
      // Vuelve a "sin editar": el campo pasa a seguir el perfil ya actualizado.
      setNombreEditado(null)
      setGuardado(true)
      setTimeout(() => setGuardado(false), FEEDBACK_MS)
    } catch (err) {
      setErrorInfo(mensajeErrorFirebase(err, 'No pudimos guardar el cambio. Probá de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  // --- Cambiar contraseña ---
  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [passActual, setPassActual] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passConfirmar, setPassConfirmar] = useState('')
  const [errorPass, setErrorPass] = useState('')
  const [cambiandoPass, setCambiandoPass] = useState(false)
  const [passActualizada, setPassActualizada] = useState(false)

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passActual || !passNueva || !passConfirmar) {
      setErrorPass('Faltan campos por completar.')
      return
    }
    if (passNueva.length < MIN_PASSWORD) {
      setErrorPass(`La contraseña nueva necesita al menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (passNueva !== passConfirmar) {
      setErrorPass('Las dos contraseñas nuevas no coinciden.')
      return
    }
    if (!user || !user.email) {
      setErrorPass('No pudimos identificar tu cuenta. Volvé a entrar.')
      return
    }

    setErrorPass('')
    setCambiandoPass(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, passActual)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, passNueva)
      setPassActual('')
      setPassNueva('')
      setPassConfirmar('')
      setPassActualizada(true)
      setTimeout(() => setPassActualizada(false), FEEDBACK_MS)
    } catch (err) {
      setErrorPass(mensajeErrorFirebase(err, 'No pudimos cambiar la contraseña. Probá de nuevo.'))
    } finally {
      setCambiandoPass(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-6 px-gutter py-12 md:px-6 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">Tu cuenta</p>
        <h1 className="font-display text-h2-fluid text-display">Mi perfil</h1>
      </header>

      {/* Avatar + resumen */}
      <div className="panel flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-pill bg-accent font-mono text-body-sm font-medium text-bruma">
          {iniciales(nombreMostrado)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-body font-semibold text-display">
            {nombreMostrado}
          </span>
          <span className="block truncate font-mono text-caption tracking-normal text-subtle">
            {email}
          </span>
        </span>
      </div>

      {/* Información personal */}
      <section className="panel flex flex-col gap-5">
        <h2 className="font-mono text-caption uppercase text-subtle">Información personal</h2>

        {errorInfo && <Aviso texto={errorInfo} />}

        <form onSubmit={handleGuardarInfo} className="flex flex-col gap-5">
          <Campo label="Nombre" htmlFor="nombre">
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombreEditado(e.target.value)}
              className="field-input"
            />
          </Campo>

          <Campo label="Email" htmlFor="email">
            <input id="email" type="email" value={email} disabled className="field-input" />
            <p className="text-caption tracking-normal text-disabled">
              El email de la cuenta no se cambia desde acá.
            </p>
          </Campo>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {guardado && <Guardado texto="Guardado" />}
          </div>
        </form>
      </section>

      {/* Seguridad */}
      <section className="panel flex flex-col gap-5">
        <h2 className="font-mono text-caption uppercase text-subtle">Cambiar contraseña</h2>

        {errorPass && <Aviso texto={errorPass} />}

        <form onSubmit={handleCambiarPassword} className="flex flex-col gap-5">
          <Campo label="Contraseña actual" htmlFor="pass-actual">
            <div className="relative">
              <input
                id="pass-actual"
                type={showActual ? 'text' : 'password'}
                autoComplete="current-password"
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="••••••••"
                className="field-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowActual((v) => !v)}
                aria-label={showActual ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
              >
                {showActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Campo>

          <Campo label="Contraseña nueva" htmlFor="pass-nueva">
            <div className="relative">
              <input
                id="pass-nueva"
                type={showNueva ? 'text' : 'password'}
                autoComplete="new-password"
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
                className="field-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNueva((v) => !v)}
                aria-label={showNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
              >
                {showNueva ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Campo>

          <Campo label="Repetir la nueva" htmlFor="pass-confirmar">
            <input
              id="pass-confirmar"
              type={showNueva ? 'text' : 'password'}
              autoComplete="new-password"
              value={passConfirmar}
              onChange={(e) => setPassConfirmar(e.target.value)}
              placeholder="La misma de arriba"
              className="field-input"
            />
          </Campo>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={cambiandoPass} className="btn-primary">
              {cambiandoPass ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
            {passActualizada && <Guardado texto="Contraseña cambiada" />}
          </div>
        </form>
      </section>

      {/* Cerrar sesión */}
      <section className="panel flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-ink">Cerrar sesión</p>
          <p className="mt-1 text-caption tracking-normal text-subtle">
            Tu historial queda guardado; vas a tener que entrar de nuevo para verlo.
          </p>
        </div>
        <CerrarSesionBoton />
      </section>
    </div>
  )
}
