"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { mensajeErrorFirebase } from "@/lib/firebase-errors";
import { iniciales } from "@/lib/usuario";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";

export default function PerfilPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [nombre, setNombre] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorInfo, setErrorInfo] = useState("");

  const email = user?.email ?? "";
  const nombreMostrado = profile?.fullName || user?.displayName || email;

  useEffect(() => {
    setNombre(profile?.fullName || user?.displayName || "");
  }, [profile, user]);

  const handleGuardarInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;

    setErrorInfo("");
    setGuardando(true);
    try {
      await apiFetch("/me", { method: "POST", body: { fullName: nombreLimpio } });
      if (user) await updateProfile(user, { displayName: nombreLimpio });
      await refreshProfile();
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (err) {
      setErrorInfo(mensajeErrorFirebase(err, "No pudimos guardar los cambios. Intentá de nuevo."));
    } finally {
      setGuardando(false);
    }
  };

  // --- Cambiar contraseña ---
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passConfirmar, setPassConfirmar] = useState("");
  const [errorPass, setErrorPass] = useState("");
  const [cambiandoPass, setCambiandoPass] = useState(false);
  const [passActualizada, setPassActualizada] = useState(false);

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passActual || !passNueva || !passConfirmar) {
      setErrorPass("Completá todos los campos.");
      return;
    }
    if (passNueva.length < 8) {
      setErrorPass("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (passNueva !== passConfirmar) {
      setErrorPass("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (!user || !user.email) {
      setErrorPass("No pudimos identificar tu cuenta. Volvé a iniciar sesión.");
      return;
    }

    setErrorPass("");
    setCambiandoPass(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passActual);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passNueva);
      setPassActual("");
      setPassNueva("");
      setPassConfirmar("");
      setPassActualizada(true);
      setTimeout(() => setPassActualizada(false), 2500);
    } catch (err) {
      setErrorPass(mensajeErrorFirebase(err, "No pudimos actualizar la contraseña. Intentá de nuevo."));
    } finally {
      setCambiandoPass(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 animate-fade-up">
      <h1 className="font-serif text-2xl font-bold text-ice sm:text-3xl">
        Mi perfil
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gestioná tu información personal y tu seguridad.
      </p>

      {/* Avatar + resumen */}
      <div className="mt-8 flex items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue text-lg font-semibold text-ice">
          {iniciales(nombreMostrado)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ice">
            {nombreMostrado}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {email}
          </p>
        </div>
      </div>

      {/* Información personal */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-lg font-bold text-ice">
          Información personal
        </h2>

        {errorInfo && <div className="alert-error mt-4">{errorInfo}</div>}

        <form onSubmit={handleGuardarInfo} className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="field-input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="field-input text-ice/60"
            />
            <p className="text-xs text-muted-foreground">
              El email de tu cuenta no se puede cambiar desde acá.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="btn-primary px-5 py-2.5"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            {guardado && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <Check className="h-4 w-4" aria-hidden="true" />
                Guardado
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Seguridad */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-lg font-bold text-ice">
          Cambiar contraseña
        </h2>

        {errorPass && <div className="alert-error mt-4">{errorPass}</div>}

        <form
          onSubmit={handleCambiarPassword}
          className="mt-5 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Contraseña actual</label>
            <div className="relative">
              <input
                type={showActual ? "text" : "password"}
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="••••••••"
                className="field-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowActual(!showActual)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ice transition-colors"
              >
                {showActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="field-label">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showNueva ? "text" : "password"}
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="field-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNueva(!showNueva)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ice transition-colors"
              >
                {showNueva ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="field-label">Confirmar nueva contraseña</label>
            <input
              type={showNueva ? "text" : "password"}
              value={passConfirmar}
              onChange={(e) => setPassConfirmar(e.target.value)}
              placeholder="Repetí la nueva contraseña"
              className="field-input"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={cambiandoPass}
              className="btn-primary px-5 py-2.5"
            >
              {cambiandoPass ? "Actualizando…" : "Actualizar contraseña"}
            </button>
            {passActualizada && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <Check className="h-4 w-4" aria-hidden="true" />
                Contraseña actualizada
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Cerrar sesión */}
      <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-sm font-medium text-ice">Cerrar sesión</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Vas a tener que volver a iniciar sesión para acceder a tu cuenta.
          </p>
        </div>
        <CerrarSesionBoton />
      </div>
    </div>
  );
}
