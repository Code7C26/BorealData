"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchX, AlertOctagon } from "lucide-react";
import { BotonesAccion, VistaVeredicto } from "@/components/resultado-veredicto";
import { leerResultado, type ResultadoGuardado } from "@/lib/resultado-storage";

function VistaInsuficiente() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
        <SearchX className="h-7 w-7 text-blue-light" aria-hidden="true" />
      </div>
      <h1 className="mt-6 font-serif text-2xl font-bold text-ice">
        No pudimos completar el análisis
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        No encontramos suficiente información pública sobre esta noticia como
        para determinar su confiabilidad. Esto puede pasar cuando el contenido
        es muy reciente, muy específico de una comunidad local, o cuando la
        fuente original no está disponible.
      </p>
      <div className="mt-8 w-full">
        <BotonesAccion />
      </div>
    </div>
  );
}

function VistaError() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/40 bg-red-900/20">
        <AlertOctagon className="h-7 w-7 text-red-400" aria-hidden="true" />
      </div>
      <h1 className="mt-6 font-serif text-2xl font-bold text-ice">
        Ocurrió un error al analizar la noticia
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        Algo falló mientras procesábamos tu solicitud. Puede ser un problema
        temporal de conexión con la fuente o del servidor de análisis. Podés
        intentarlo de nuevo en unos segundos.
      </p>
      <div className="mt-8 w-full">
        <BotonesAccion />
      </div>
    </div>
  );
}

function ResultadoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resultado, setResultado] = useState<ResultadoGuardado | null>();

  useEffect(() => {
    const guardado = leerResultado();
    if (!guardado) {
      // No hay ningún análisis para mostrar (ej. se entró directo a /resultado
      // sin pasar por /analizando ni por el historial) — no hay nada que
      // renderizar acá.
      router.replace("/dashboard");
      return;
    }
    setResultado(guardado);
    // searchParams entra a propósito: /resultado se puede pedir varias veces
    // seguidas (ej. dos "recientes" del sidebar, uno detrás del otro) sin
    // cambiar de ruta — Next no re-navega ni re-corre este efecto si la URL
    // no cambia, así que quien navega hasta acá agrega un query param
    // distinto cada vez (ver sidebar.tsx / historial/page.tsx) para forzarlo.
  }, [router, searchParams]);

  if (!resultado) return null;

  return (
    <div className="min-h-screen">
      {resultado.status === "insuficiente" ? (
        <VistaInsuficiente />
      ) : resultado.status === "error" || !resultado.data ? (
        <VistaError />
      ) : (
        <VistaVeredicto resultado={resultado.data} fecha={resultado.fecha} />
      )}
    </div>
  );
}

export default function ResultadoPage() {
  return (
    <Suspense fallback={null}>
      <ResultadoContent />
    </Suspense>
  );
}
