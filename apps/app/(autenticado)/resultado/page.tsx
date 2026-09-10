"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, SearchX, AlertOctagon } from "lucide-react";
import { BotonesAccion, VistaVeredicto } from "@/components/resultado-veredicto";
import { leerResultado, type ResultadoGuardado } from "@/lib/resultado-storage";

/**
 * Botón fijo para volver al historial cuando se llegó a /resultado desde ahí.
 * Vive FUERA de la columna centrada (`max-w-4xl`) de cada vista — no es hijo
 * de ese contenedor, sino un hermano suyo dentro de <main> — para que en
 * pantallas anchas caiga en el margen vacío entre el sidebar y la columna de
 * contenido en vez de quedar pegado al mismo borde izquierdo que las tarjetas
 * (que es donde estaba antes: al hacer scroll, el botón fijo terminaba tapando
 * el título/ícono de lo que fuera que hubiera debajo). `<main>` ya tiene el
 * padding-left que esquiva el sidebar (`lg:pl-72` / colapsado `lg:pl-[76px]`),
 * así que alcanza con NO centrar este botón para que caiga en ese margen —
 * sin necesidad de saber el ancho exacto del sidebar ni si está colapsado.
 * `sticky` (no `fixed`) para que siga sin problema esa posición horizontal
 * de flujo normal en vez de tener que fijarla a mano.
 */
function BotonVolverHistorialSticky() {
  return (
    <div className="px-6 pt-6">
      <Link
        href="/historial"
        className="sticky top-4 z-10 inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-card/90 px-4 py-2 text-sm font-semibold text-ice shadow-lg shadow-navy/40 backdrop-blur-md transition-all hover:border-blue-light/50"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al historial
      </Link>
    </div>
  );
}

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
        {/* Sin id no hay nada que compartir — BotonesAccion ya oculta el botón solo. */}
        <BotonesAccion />
      </div>
    </div>
  );
}

function ResultadoContent({ desdeHistorial }: { desdeHistorial: boolean }) {
  const router = useRouter();
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
  }, [router]);

  if (!resultado) return null;

  return (
    <div className="min-h-screen">
      {desdeHistorial && <BotonVolverHistorialSticky />}
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

function ResultadoWrapper() {
  const searchParams = useSearchParams();

  // key = searchParams.toString() fuerza un remount cada vez que cambia el
  // identificador en la URL (ver sidebar.tsx / historial/page.tsx: agregan
  // ?item=<id>, y desde el historial también &from=historial), aunque la
  // ruta en sí sea siempre "/resultado" — sin esto, abrir un segundo análisis
  // reciente mientras ya estás parado en /resultado no releía sessionStorage
  // (Next no remonta si el pathname no cambia).
  return (
    <ResultadoContent
      key={searchParams.toString()}
      desdeHistorial={searchParams.get("from") === "historial"}
    />
  );
}

export default function ResultadoPage() {
  return (
    <Suspense fallback={null}>
      <ResultadoWrapper />
    </Suspense>
  );
}
