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
import { traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { iniciales } from '@/lib/usuario'
import { Campo } from '@/components/auth-shell'
import { CerrarSesionBoton } from '@/components/cerrar-sesion-boton'

const MIN_PASSWORD = 8

const TEXTOS = traducciones({
  es: {
    noGuardamos: 'No pudimos guardar el cambio. Probá de nuevo.',
    faltanCampos: 'Faltan campos por completar.',
    nuevaCorta: (min: number) => `La contraseña nueva necesita al menos ${min} caracteres.`,
    noCoinciden: 'Las dos contraseñas nuevas no coinciden.',
    sinCuenta: 'No pudimos identificar tu cuenta. Volvé a entrar.',
    noCambiamos: 'No pudimos cambiar la contraseña. Probá de nuevo.',
    eyebrow: 'Tu cuenta',
    titulo: 'Mi perfil',
    info: 'Información personal',
    nombre: 'Nombre',
    email: 'Email',
    emailFijo: 'El email de la cuenta no se cambia desde acá.',
    guardando: 'Guardando…',
    guardar: 'Guardar cambios',
    guardado: 'Guardado',
    cambiarContrasena: 'Cambiar contraseña',
    actual: 'Contraseña actual',
    ocultar: 'Ocultar contraseña',
    mostrar: 'Mostrar contraseña',
    nueva: 'Contraseña nueva',
    minimo: (min: number) => `Mínimo ${min} caracteres`,
    repetir: 'Repetir la nueva',
    laMisma: 'La misma de arriba',
    cambiando: 'Cambiando…',
    cambiada: 'Contraseña cambiada',
    cerrarSesion: 'Cerrar sesión',
    cerrarSesionBajada: 'Tu historial queda guardado; vas a tener que entrar de nuevo para verlo.',
  },
  en: {
    noGuardamos: "We couldn't save the change. Try again.",
    faltanCampos: 'Some fields are still empty.',
    nuevaCorta: (min: number) => `The new password needs at least ${min} characters.`,
    noCoinciden: "The two new passwords don't match.",
    sinCuenta: "We couldn't identify your account. Log in again.",
    noCambiamos: "We couldn't change the password. Try again.",
    eyebrow: 'Your account',
    titulo: 'My profile',
    info: 'Personal information',
    nombre: 'Name',
    email: 'Email',
    emailFijo: "The account's email can't be changed from here.",
    guardando: 'Saving…',
    guardar: 'Save changes',
    guardado: 'Saved',
    cambiarContrasena: 'Change password',
    actual: 'Current password',
    ocultar: 'Hide password',
    mostrar: 'Show password',
    nueva: 'New password',
    minimo: (min: number) => `At least ${min} characters`,
    repetir: 'Repeat the new one',
    laMisma: 'Same as above',
    cambiando: 'Changing…',
    cambiada: 'Password changed',
    cerrarSesion: 'Log out',
    cerrarSesionBajada: "Your history stays saved; you'll need to log in again to see it.",
  },
})
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
  const { idioma } = useIdioma()
  const t = useTextos(TEXTOS)
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
      setErrorInfo(mensajeErrorFirebase(err, t.noGuardamos, idioma))
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
      setErrorPass(t.faltanCampos)
      return
    }
    if (passNueva.length < MIN_PASSWORD) {
      setErrorPass(t.nuevaCorta(MIN_PASSWORD))
      return
    }
    if (passNueva !== passConfirmar) {
      setErrorPass(t.noCoinciden)
      return
    }
    if (!user || !user.email) {
      setErrorPass(t.sinCuenta)
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
      setErrorPass(mensajeErrorFirebase(err, t.noCambiamos, idioma))
    } finally {
      setCambiandoPass(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-6 px-gutter py-12 md:px-6 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="font-display text-h2-fluid text-display">{t.titulo}</h1>
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
        <h2 className="font-mono text-caption uppercase text-subtle">{t.info}</h2>

        {errorInfo && <Aviso texto={errorInfo} />}

        <form onSubmit={handleGuardarInfo} className="flex flex-col gap-5">
          <Campo label={t.nombre} htmlFor="nombre">
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombreEditado(e.target.value)}
              className="field-input"
            />
          </Campo>

          <Campo label={t.email} htmlFor="email">
            <input id="email" type="email" value={email} disabled className="field-input" />
            <p className="text-caption tracking-normal text-disabled">{t.emailFijo}</p>
          </Campo>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? t.guardando : t.guardar}
            </button>
            {guardado && <Guardado texto={t.guardado} />}
          </div>
        </form>
      </section>

      {/* Seguridad */}
      <section className="panel flex flex-col gap-5">
        <h2 className="font-mono text-caption uppercase text-subtle">{t.cambiarContrasena}</h2>

        {errorPass && <Aviso texto={errorPass} />}

        <form onSubmit={handleCambiarPassword} className="flex flex-col gap-5">
          <Campo label={t.actual} htmlFor="pass-actual">
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
                aria-label={showActual ? t.ocultar : t.mostrar}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
              >
                {showActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Campo>

          <Campo label={t.nueva} htmlFor="pass-nueva">
            <div className="relative">
              <input
                id="pass-nueva"
                type={showNueva ? 'text' : 'password'}
                autoComplete="new-password"
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder={t.minimo(MIN_PASSWORD)}
                className="field-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNueva((v) => !v)}
                aria-label={showNueva ? t.ocultar : t.mostrar}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
              >
                {showNueva ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Campo>

          <Campo label={t.repetir} htmlFor="pass-confirmar">
            <input
              id="pass-confirmar"
              type={showNueva ? 'text' : 'password'}
              autoComplete="new-password"
              value={passConfirmar}
              onChange={(e) => setPassConfirmar(e.target.value)}
              placeholder={t.laMisma}
              className="field-input"
            />
          </Campo>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={cambiandoPass} className="btn-primary">
              {cambiandoPass ? t.cambiando : t.cambiarContrasena}
            </button>
            {passActualizada && <Guardado texto={t.cambiada} />}
          </div>
        </form>
      </section>

      {/* Cerrar sesión */}
      <section className="panel flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-ink">{t.cerrarSesion}</p>
          <p className="mt-1 text-caption tracking-normal text-subtle">{t.cerrarSesionBajada}</p>
        </div>
        <CerrarSesionBoton />
      </section>
    </div>
  )
}
