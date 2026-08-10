"use client";

/**
 * ⚠️ COMPONENTE TEMPORAL DE DESARROLLO ⚠️
 *
 * Este switcher existe solo porque todavía no hay backend que determine
 * el resultado real de un análisis. Permite forzar cualquier estado de
 * la pantalla de Resultado vía el query param `?estado=`.
 *
 * PARA SACARLO cuando el backend esté listo:
 * 1. Borrar este archivo (dev-state-switcher.tsx)
 * 2. Borrar el <DevStateSwitcher /> y su import en app/resultado/page.tsx
 * 3. En esa misma page, borrar el fallback a "confiable" y dejar que el
 *    estado venga siempre del backend.
 *
 * Nada de este archivo se importa desde ningún otro lado del proyecto,
 * así que sacarlo no rompe nada más.
 */

import { useRouter, useSearchParams } from "next/navigation";

export const ESTADOS_DISPONIBLES = [
  { value: "confiable", label: "Confiable" },
  { value: "dudosa", label: "Dudosa" },
  { value: "desinformacion", label: "Desinformación" },
  { value: "no_verificable", label: "No verificable" },
  { value: "insuficiente", label: "Insuficiente" },
  { value: "error", label: "Error" },
] as const;

export function DevStateSwitcher({ estadoActual }: { estadoActual: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cambiarEstado = (nuevoEstado: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("estado", nuevoEstado);
    router.push(`/resultado?${params.toString()}`);
  };

  return (
    <div className="border-b border-dashed border-amber-500/40 bg-amber-500/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-6 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-400/90 mr-1">
          🧪 Modo prueba — sin backend:
        </span>
        {ESTADOS_DISPONIBLES.map((estado) => (
          <button
            key={estado.value}
            onClick={() => cambiarEstado(estado.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              estadoActual === estado.value
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : "text-amber-400/70 border border-transparent hover:border-amber-500/30 hover:text-amber-300"
            }`}
          >
            {estado.label}
          </button>
        ))}
      </div>
    </div>
  );
}
