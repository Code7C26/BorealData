"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, User, Mail, Lock } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import { mensajeErrorFirebase } from "@/lib/firebase-errors";
import { AuthRedirect } from "@/components/auth-redirect";

export default function RegistroPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const emailValido = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !email || !password || !confirmPassword) {
      setError("Por favor completá todos los campos.");
      return;
    }

    if (!emailValido(email)) {
      setError("Ingresá un email válido.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!aceptaTerminos) {
      setError("Debés aceptar los Términos y Condiciones para continuar.");
      return;
    }

    setError("");
    setEnviando(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: nombre.trim() });
      await apiFetch("/me", { method: "POST", body: { fullName: nombre.trim() } });
      router.push("/dashboard");
    } catch (err) {
      setError(mensajeErrorFirebase(err, "No pudimos crear la cuenta. Intentá de nuevo."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-navy flex flex-col items-center justify-center px-4 py-12">
      <AuthRedirect to="/dashboard" />

      <div aria-hidden="true" className="grid-overlay pointer-events-none absolute inset-0 -z-20" />
      <div
        aria-hidden="true"
        className="glow-blob animate-float -top-24 left-[4%] h-96 w-96 -z-10 bg-blue/55"
      />
      <div
        aria-hidden="true"
        className="glow-blob animate-float-delayed bottom-[-4rem] right-[4%] h-80 w-80 -z-10 bg-blue-light/40"
      />

      {/* Logo */}
      <Link href="/" className="relative flex items-center gap-3 mb-10">
        <Image
          src="/logoAletheia.png"
          alt="AletheIA"
          width={40}
          height={40}
          className="object-contain"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-ice font-bold text-sm tracking-widest uppercase">
            Boreal Data
          </span>
          <span className="text-blue-light text-xs tracking-wider">AletheIA</span>
        </div>
      </Link>

      {/* Card */}
      <div className="auth-card animate-fade-up">
        {/* Header */}
        <div className="mb-8">
          <span className="eyebrow-badge mb-3">
            <UserPlus size={14} aria-hidden="true" />
            Crear cuenta
          </span>
          <h1 className="font-serif text-2xl font-bold text-ice">Registrate</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Guardá tu historial de análisis y accedé desde cualquier dispositivo.
          </p>
        </div>

        {/* Error */}
        {error && <div className="alert-error mb-6">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Nombre</label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
                className="field-input pl-11"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Email</label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="field-input pl-11"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Contraseña</label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="field-input pl-11 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ice transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Confirmar contraseña</label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí tu contraseña"
                className="field-input pl-11 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ice transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Términos y condiciones */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terminos"
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-blue cursor-pointer"
            />
            <label
              htmlFor="terminos"
              className="text-muted-foreground text-sm cursor-pointer leading-snug"
            >
              Acepto los{" "}
              <Link
                href="/terminos"
                className="text-blue-light hover:text-ice transition-colors"
              >
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacidad"
                className="text-blue-light hover:text-ice transition-colors"
              >
                Política de Privacidad
              </Link>
              .
            </label>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={enviando}
            className="btn-primary mt-2 w-full py-3"
          >
            {enviando ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        {/* Footer de la card */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-blue-light hover:text-ice transition-colors"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="relative text-muted-foreground text-xs mt-8">
        © 2026 Boreal Data — AletheIA
      </p>
    </main>
  );
}
