"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cerrarSesionMock } from "@/lib/mock-usuario";

export function CerrarSesionBoton() {
  const router = useRouter();

  const handleClick = () => {
    const confirmado = window.confirm("¿Seguro que querés cerrar sesión?");
    if (!confirmado) return;

    // TODO: cerrar sesión real (Firebase Auth) va acá.
    cerrarSesionMock();
    router.push("/");
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-900/30"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Cerrar sesión
    </button>
  );
}
