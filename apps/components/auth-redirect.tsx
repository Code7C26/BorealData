"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Redirige lejos de páginas públicas (landing, login, registro) cuando ya
 * hay una sesión activa — evita que alguien logueado vea la landing de
 * marketing o intente loguearse/registrarse de nuevo. No renderiza nada; el
 * chequeo de auth es client-only, así que no bloquea el render inicial de
 * la página para el caso común (visitante anónimo).
 */
export function AuthRedirect({ to }: { to: string | (() => string) }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Una función se resuelve recién acá, en el cliente: login y registro la usan para
      // leer `?plan=premium` de la URL (ver destinoTrasEntrar en lib/plan.ts).
      router.replace(typeof to === "function" ? to() : to);
    }
  }, [loading, user, to, router]);

  return null;
}
