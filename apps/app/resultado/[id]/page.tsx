"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { apiFetch, type HistoryItem } from "@/lib/api";
import { historyItemToAnalyzeResponse } from "@/lib/resultado-storage";
import { VistaVeredicto } from "@/components/resultado-veredicto";

/**
 * Página pública detrás del botón "Compartir resultado" — sin login, sin
 * sidebar. Cualquiera con el link puede ver este análisis puntual (ver
 * backend/src/routes/analyses.ts).
 */
export default function ResultadoPublicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [estado, setEstado] = useState<"cargando" | "no-encontrado" | "listo">("cargando");
  const [item, setItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    apiFetch<HistoryItem>(`/analyses/${id}`)
      .then((data) => {
        setItem(data);
        setEstado("listo");
      })
      .catch(() => setEstado("no-encontrado"));
  }, [id]);

  return (
    <main className="min-h-screen bg-navy">
      <header className="border-b border-[#1A3A5C] px-6 py-4">
        <Link href="/" className="flex w-fit items-center gap-3">
          <Image
            src="/logoAletheia.png"
            alt="AletheIA"
            width={32}
            height={32}
            className="object-contain"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold text-sm tracking-widest uppercase">
              Boreal Data
            </span>
            <span className="text-blue-400 text-xs tracking-wider">AletheIA</span>
          </div>
        </Link>
      </header>

      {estado === "cargando" && (
        <p className="py-24 text-center text-sm text-[#4A7A9B]">Cargando análisis…</p>
      )}

      {estado === "no-encontrado" && (
        <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
            <SearchX className="h-7 w-7 text-blue-light" aria-hidden="true" />
          </div>
          <h1 className="mt-6 font-serif text-2xl font-bold text-ice">
            No encontramos este análisis
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            El link puede estar mal copiado, o el análisis ya no existe.
          </p>
          <Link
            href="/"
            className="mt-8 rounded-lg bg-blue px-5 py-3 text-sm font-semibold text-ice shadow-lg shadow-blue/20 transition-all hover:bg-blue-light hover:text-navy"
          >
            Ir a AletheIA
          </Link>
        </div>
      )}

      {estado === "listo" && item && (
        <VistaVeredicto resultado={historyItemToAnalyzeResponse(item)} fecha={item.createdAt} />
      )}
    </main>
  );
}
