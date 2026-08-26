"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield } from "lucide-react";
import {
  obtenerUsuarioMock,
  guardarUsuarioMock,
  nombreDesdeEmail,
} from "@/lib/mock-usuario";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completá todos los campos.");
      return;
    }
    setError("");

    // TODO: lógica de auth real va acá. Por ahora simulamos login exitoso.
    // Si ya existe un usuario mock guardado (por ejemplo, se registró antes
    // en este navegador), lo respetamos. Si no, derivamos un nombre a
    // partir del email para no mostrar siempre el mismo usuario fijo.
    const existente = obtenerUsuarioMock();
    if (!existente) {
      guardarUsuarioMock({ nombre: nombreDesdeEmail(email), email });
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-4">

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
            <Shield size={16} className="text-blue-400" />
            <span className="text-blue-400 text-xs tracking-widest uppercase">
              Acceso seguro
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Iniciá sesión</h1>
          <p className="text-[#4A7A9B] text-sm mt-1">
            Accedé a tu historial y análisis guardados.
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

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="bg-[#0B1929] border border-[#1A3A5C] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4A7A9B] outline-none focus:border-[#1A6DB5] transition-colors"
            />
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[#7EB8DC] text-xs font-medium tracking-wide uppercase">
                Contraseña
              </label>
              <Link
                href="/recuperar"
                className="text-xs text-[#60B8F0] hover:text-white transition-colors"
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
                className="w-full bg-[#0B1929] border border-[#1A3A5C] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4A7A9B] outline-none focus:border-[#1A6DB5] transition-colors pr-12"
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

          {/* Recordarme */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-[#1A6DB5] cursor-pointer"
            />
            <label
              htmlFor="remember"
              className="text-[#7EB8DC] text-sm cursor-pointer"
            >
              Recordarme
            </label>
          </div>

          {/* Botón */}
          <button
            type="submit"
            className="w-full bg-[#1A6DB5] hover:bg-[#1557A0] text-white font-medium py-3 rounded-lg text-sm transition-colors mt-2"
          >
            Iniciar sesión
          </button>

        </form>

        {/* Footer de la card */}
        <p className="text-center text-[#4A7A9B] text-sm mt-6">
          ¿No tenés cuenta?{" "}
          <Link
            href="/registro"
            className="text-[#60B8F0] hover:text-white transition-colors"
          >
            Registrate
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

