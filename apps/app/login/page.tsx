"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield } from "lucide-react";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { mensajeErrorFirebase } from "@/lib/firebase-errors";
import { AuthRedirect } from "@/components/auth-redirect";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completá todos los campos.");
      return;
    }
    setError("");
    setEnviando(true);

    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(mensajeErrorFirebase(err, "No pudimos iniciar sesión. Intentá de nuevo."));
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
            <Shield size={14} aria-hidden="true" />
            Acceso seguro
          </span>
          <h1 className="font-serif text-2xl font-bold text-ice">Iniciá sesión</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Accedé a tu historial y análisis guardados.
          </p>
        </div>

        {/* Error */}
        {error && <div className="alert-error mb-6">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="field-input"
            />
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="field-label">Contraseña</label>
              <Link
                href="/recuperar"
                className="text-xs text-blue-light hover:text-ice transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field-input pr-12"
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

          {/* Recordarme */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-blue cursor-pointer"
            />
            <label
              htmlFor="remember"
              className="text-muted-foreground text-sm cursor-pointer"
            >
              Recordarme
            </label>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={enviando}
            className="btn-primary mt-2 w-full py-3"
          >
            {enviando ? "Iniciando sesión…" : "Iniciar sesión"}
          </button>
        </form>

        {/* Footer de la card */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          ¿No tenés cuenta?{" "}
          <Link
            href="/registro"
            className="text-blue-light hover:text-ice transition-colors"
          >
            Registrate
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
