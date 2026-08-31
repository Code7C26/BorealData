"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import {
  obtenerUsuarioMock,
  guardarUsuarioMock,
  USUARIO_POR_DEFECTO,
  iniciales,
  type UsuarioMock,
} from "@/lib/mock-usuario";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<UsuarioMock>(USUARIO_POR_DEFECTO);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    const actual = obtenerUsuarioMock() ?? USUARIO_POR_DEFECTO;
    setUsuario(actual);
    setNombre(actual.nombre);
    setEmail(actual.email);
  }, []);

  const handleGuardarInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const actualizado: UsuarioMock = {
      nombre: nombre.trim() || usuario.nombre,
      email: email.trim() || usuario.email,
    };
    // TODO: actualizar usuario real en backend va acá.
    guardarUsuarioMock(actualizado);
    setUsuario(actualizado);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  };

  // --- Cambiar contraseña (mock, sin backend) ---
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passConfirmar, setPassConfirmar] = useState("");
  const [errorPass, setErrorPass] = useState("");
  const [passActualizada, setPassActualizada] = useState(false);

  const handleCambiarPassword = (e: React.FormEvent) => {
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
    setErrorPass("");
    // TODO: cambio de contraseña real (Firebase Auth) va acá.
    setPassActual("");
    setPassNueva("");
    setPassConfirmar("");
    setPassActualizada(true);
    setTimeout(() => setPassActualizada(false), 2500);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-serif text-2xl font-bold text-ice sm:text-3xl">
        Mi perfil
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gestioná tu información personal y tu seguridad.
      </p>

      {/* Avatar + resumen */}
      <div className="mt-8 flex items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1A6DB5] text-lg font-semibold text-white">
          {iniciales(usuario.nombre)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ice">
            {usuario.nombre}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {usuario.email}
          </p>
        </div>
      </div>

      {/* Información personal */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-lg font-bold text-ice">
          Información personal
        </h2>
        <form onSubmit={handleGuardarInfo} className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="bg-[#0B1929] border border-[#1A3A5C] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#1A6DB5] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#0B1929] border border-[#1A3A5C] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#1A6DB5] transition-colors"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-[#1A6DB5] hover:bg-[#1557A0] text-white font-medium px-5 py-2.5 text-sm transition-colors"
            >
              Guardar cambios
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

        {errorPass && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-lg mt-4">
            {errorPass}
          </div>
        )}

        <form
          onSubmit={handleCambiarPassword}
          className="mt-5 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showActual ? "text" : "password"}
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0B1929] border border-[#1A3A5C] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4A7A9B] outline-none focus:border-[#1A6DB5] transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowActual(!showActual)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4A7A9B] hover:text-white transition-colors"
              >
                {showActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNueva ? "text" : "password"}
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-[#0B1929] border border-[#1A3A5C] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4A7A9B] outline-none focus:border-[#1A6DB5] transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNueva(!showNueva)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4A7A9B] hover:text-white transition-colors"
              >
                {showNueva ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Confirmar nueva contraseña
            </label>
            <input
              type={showNueva ? "text" : "password"}
              value={passConfirmar}
              onChange={(e) => setPassConfirmar(e.target.value)}
              placeholder="Repetí la nueva contraseña"
              className="w-full bg-[#0B1929] border border-[#1A3A5C] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4A7A9B] outline-none focus:border-[#1A6DB5] transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-[#1A6DB5] hover:bg-[#1557A0] text-white font-medium px-5 py-2.5 text-sm transition-colors"
            >
              Actualizar contraseña
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
