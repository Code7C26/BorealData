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
export function AuthRedirect({ to }: { to: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(to);
    }
  }, [loading, user, to, router]);

  return null;
}
