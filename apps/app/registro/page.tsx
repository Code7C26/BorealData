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
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
      <AuthRedirect to="/dashboard" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-10">
        <Image
          src="/logoAletheia.png"
          alt="AletheIA"
          width={40}
          height={40}
          className="object-contain"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-white font-bold text-sm tracking-widest uppercase">
            Boreal Data
          </span>
          <span className="text-blue-400 text-xs tracking-wider">AletheIA</span>
        </div>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-[#0D2037] border border-[#1A3A5C] rounded-2xl p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus size={16} className="text-blue-400" />
            <span className="text-blue-400 text-xs tracking-widest uppercase">
              Crear cuenta
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Registrate</h1>
          <p className="text-[#4A7A9B] text-sm mt-1">
            Guardá tu historial de análisis y accedé desde cualquier dispositivo.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Nombre
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A7A9B]"
              />
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full bg-[#0B1929] border border-[#1A3A5C] rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-[#4A7A9B] outline-none focus:border-[#1A6DB5] transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A7A9B]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-[#0B1929] border border-[#1A3A5C] rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-[#4A7A9B] outline-none focus:border-[#1A6DB5] transition-colors"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Contraseña
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A7A9B]"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-[#0B1929] border border-[#1A3A5C] rounded-lg pl-11 pr-12 py-3 text-sm text-white placeholder-[#4A7A9B] outline-none focus:border-[#1A6DB5] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4A7A9B] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A7A9B]"
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí tu contraseña"
                className="w-full bg-[#0B1929] border border-[#1A3A5C] rounded-lg pl-11 pr-12 py-3 text-sm text-white placeholder-[#4A7A9B] outline-none focus:border-[#1A6DB5] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4A7A9B] hover:text-white transition-colors"
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
              className="w-4 h-4 mt-0.5 accent-[#1A6DB5] cursor-pointer"
            />
            <label
              htmlFor="terminos"
              className="text-[#7EB8DC] text-sm cursor-pointer leading-snug"
            >
              Acepto los{" "}
              <Link
                href="/terminos"
                className="text-[#60B8F0] hover:text-white transition-colors"
              >
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacidad"
                className="text-[#60B8F0] hover:text-white transition-colors"
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
            className="w-full bg-[#1A6DB5] hover:bg-[#1557A0] disabled:opacity-60 text-white font-medium py-3 rounded-lg text-sm transition-colors mt-2"
          >
            {enviando ? "Creando cuenta…" : "Crear cuenta"}
          </button>

        </form>

        {/* Footer de la card */}
        <p className="text-center text-[#4A7A9B] text-sm mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-[#60B8F0] hover:text-white transition-colors"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="text-[#4A7A9B] text-xs mt-8">
        © 2026 Boreal Data — AletheIA
      </p>
    </main>
  );
}
