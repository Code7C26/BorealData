"use client";

/**
 * ⚠️ COMPONENTE TEMPORAL DE DESARROLLO ⚠️
 *
 * Igual que dev-state-switcher.tsx (el de /resultado): permite forzar
 * cualquier estado de la pantalla de Historial vía `?vista=`, porque
 * todavía no hay backend que traiga el historial real.
 *
 * PARA SACARLO cuando el backend esté listo:
 * 1. Borrar este archivo (historial-state-switcher.tsx)
 * 2. Borrar el <HistorialStateSwitcher /> y su import en
 *    app/(autenticado)/historial/page.tsx
 * 3. Que la vista dependa de la respuesta real del backend
 *    (sin datos → vacío, request en curso → cargando, request falló → error)
 *    en vez del query param.
 */

import { useRouter, useSearchParams } from "next/navigation";

export const VISTAS_DISPONIBLES = [
  { value: "contenido", label: "Con historial" },
  { value: "vacio", label: "Vacío" },
  { value: "cargando", label: "Cargando" },
  { value: "error", label: "Error" },
] as const;

export function HistorialStateSwitcher({ vistaActual }: { vistaActual: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cambiarVista = (nuevaVista: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("vista", nuevaVista);
    router.push(`/historial?${params.toString()}`);
  };

  return (
    <div className="border-b border-dashed border-amber-500/40 bg-amber-500/[0.06]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-400/90 mr-1">
          🧪 Modo prueba — sin backend:
        </span>
        {VISTAS_DISPONIBLES.map((vista) => (
          <button
            key={vista.value}
            onClick={() => cambiarVista(vista.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              vistaActual === vista.value
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : "text-amber-400/70 border border-transparent hover:border-amber-500/30 hover:text-amber-300"
            }`}
          >
            {vista.label}
          </button>
        ))}
      </div>
    </div>
  );
}