"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Calendar,
  Link2,
  ExternalLink,
  RotateCcw,
  Share2,
  SearchX,
  AlertOctagon,
  Quote,
  ArrowLeft,
} from "lucide-react";
import { mapLabelToVeredicto, type AnalyzeResponse, type Veredicto } from "@/lib/api";
import { leerResultado, type ResultadoGuardado } from "@/lib/resultado-storage";

const ESTILO_VEREDICTO: Record<
  Veredicto,
  { label: string; badge: string; icon: string; barra: string }
> = {
  confiable: {
    label: "Confiable",
    badge: "bg-emerald-900/20 border-emerald-500/40 text-emerald-300",
    icon: "text-emerald-400",
    barra: "bg-emerald-500",
  },
  dudosa: {
    label: "Dudosa",
    badge: "bg-amber-900/20 border-amber-500/40 text-amber-300",
    icon: "text-amber-400",
    barra: "bg-amber-500",
  },
  desinformacion: {
    label: "Posible desinformación",
    badge: "bg-red-900/20 border-red-500/40 text-red-300",
    icon: "text-red-400",
    barra: "bg-red-500",
  },
  no_verificable: {
    label: "No verificable",
    badge: "bg-slate-500/10 border-slate-400/30 text-slate-300",
    icon: "text-slate-400",
    barra: "bg-slate-400",
  },
};

const ICONO_VEREDICTO: Record<Veredicto, typeof CheckCircle2> = {
  confiable: CheckCircle2,
  dudosa: AlertTriangle,
  desinformacion: XCircle,
  no_verificable: HelpCircle,
};

function BotonesAccion({ desdeHistorial }: { desdeHistorial?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {desdeHistorial && (
        <Link
          href="/historial"
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-ice transition-all hover:border-blue-light/50 sm:order-first sm:flex-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al historial
        </Link>
      )}
      <Link
        href="/dashboard"
        className="btn-primary flex-1"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Analizar otra noticia
      </Link>
      <button
        onClick={() => {
          if (typeof window !== "undefined") {
            navigator.clipboard?.writeText(window.location.href);
          }
        }}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card py-3 text-sm font-semibold text-ice transition-all hover:border-blue-light/50"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Compartir resultado
      </button>
    </div>
  );
}

function VistaVeredicto({
  resultado,
  fecha,
  desdeHistorial,
}: {
  resultado: AnalyzeResponse;
  fecha?: string;
  desdeHistorial?: boolean;
}) {
  const veredicto = mapLabelToVeredicto(resultado.label);
  const estilo = ESTILO_VEREDICTO[veredicto];
  const Icono = ICONO_VEREDICTO[veredicto];
  const fechaMostrada = fecha
    ? new Date(fecha).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12 animate-fade-up">
      {/* Encabezado de la noticia */}
      <div className="rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-lg hover:shadow-navy/40">
        <h1 className="font-serif text-2xl font-bold leading-snug text-ice sm:text-3xl">
          {resultado.title || resultado.url}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{resultado.url}</span>
          </span>
          {fechaMostrada && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              {fechaMostrada}
            </span>
          )}
        </div>
      </div>

      {/* Veredicto */}
      <div className={`rounded-2xl border p-8 ${estilo.badge}`}>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Icono className={`h-10 w-10 shrink-0 ${estilo.icon}`} aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                Veredicto
              </p>
              <p className="text-2xl font-bold text-ice">{estilo.label}</p>
            </div>
          </div>
          <div className="w-full sm:w-56">
            <div className="flex items-center justify-between text-xs opacity-80 mb-1.5">
              <span>Nivel de confiabilidad</span>
              <span className="font-semibold">{resultado.score}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-navy overflow-hidden">
              <div
                className={`h-full rounded-full ${estilo.barra}`}
                style={{ width: `${resultado.score}%` }}
              />
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm leading-relaxed opacity-90">
          Este resultado es una evaluación basada en la evidencia disponible al
          momento del análisis, no una certeza absoluta. Te recomendamos
          revisar las fuentes consultadas antes de sacar conclusiones.
        </p>
      </div>

      {/* Resumen IA */}
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-lg font-bold text-ice">
          Resumen generado por IA
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {resultado.summary}
        </p>
      </div>

      {/* Explicación */}
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-lg font-bold text-ice">
          ¿Por qué se obtuvo este resultado?
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {resultado.explanation}
        </p>
      </div>

      {/* Afirmación vs. evidencia */}
      {resultado.claimVsEvidence && (
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="font-serif text-lg font-bold text-ice">
            Afirmación vs. evidencia
          </h2>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/80 bg-navy p-5">
            <Quote
              className="h-4 w-4 shrink-0 mt-0.5 text-blue-light"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {resultado.claimVsEvidence}
            </p>
          </div>
        </div>
      )}

      {/* Fuentes consultadas */}
      {resultado.sources.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="font-serif text-lg font-bold text-ice">
            Fuentes consultadas
          </h2>
          <div className="mt-5 flex flex-col gap-3">
            {resultado.sources.map((fuente, i) => {
              const contenido = (
                <>
                  <span className="flex items-center gap-2 truncate text-sm text-ice">
                    <ExternalLink
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">{fuente.title}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      fuente.stance === "respalda"
                        ? "bg-emerald-900/30 text-emerald-300"
                        : fuente.stance === "contradice"
                        ? "bg-red-900/30 text-red-300"
                        : "bg-slate-500/15 text-slate-300"
                    }`}
                  >
                    {fuente.stance === "respalda"
                      ? "Respalda"
                      : fuente.stance === "contradice"
                      ? "Contradice"
                      : "Relacionada"}
                  </span>
                </>
              );

              return fuente.url ? (
                <a
                  key={`${fuente.title}-${i}`}
                  href={fuente.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-navy px-4 py-3 transition-colors hover:border-blue-light/50"
                >
                  {contenido}
                </a>
              ) : (
                <div
                  key={`${fuente.title}-${i}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-navy px-4 py-3"
                >
                  {contenido}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BotonesAccion desdeHistorial={desdeHistorial} />
    </div>
  );
}

function VistaInsuficiente({ desdeHistorial }: { desdeHistorial?: boolean }) {
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
        <BotonesAccion desdeHistorial={desdeHistorial} />
      </div>
    </div>
  );
}

function VistaError({ desdeHistorial }: { desdeHistorial?: boolean }) {
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
        <BotonesAccion desdeHistorial={desdeHistorial} />
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
      {resultado.status === "insuficiente" ? (
        <VistaInsuficiente desdeHistorial={desdeHistorial} />
      ) : resultado.status === "error" || !resultado.data ? (
        <VistaError desdeHistorial={desdeHistorial} />
      ) : (
        <VistaVeredicto
          resultado={resultado.data}
          fecha={resultado.fecha}
          desdeHistorial={desdeHistorial}
        />
      )}
    </div>
  );
}

function ResultadoWrapper() {
  const searchParams = useSearchParams();

  // key = searchParams.toString() fuerza un remount cada vez que cambia el
  // identificador en la URL (ver sidebar/historial), aunque la ruta en sí
  // sea siempre "/resultado" — sin esto, abrir un segundo análisis reciente
  // mientras ya estás en /resultado no releía sessionStorage (Next no
  // remonta si el pathname no cambia).
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
