"use client";

import { useState } from "react";
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
  Check,
  Quote,
} from "lucide-react";
import { mapLabelToVeredicto, type AnalyzeResponse, type Veredicto } from "@/lib/api";

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

/** Cuánto se muestra el estado "¡Enlace copiado!" antes de volver al botón normal. */
const DURACION_FEEDBACK_COPIADO_MS = 2000;

/**
 * `idCompartible` es el id real guardado en la DB (ver AnalyzeResponse.id) — sin él no
 * hay link público que armar (falló el guardado, o el resultado es un error/insuficiente
 * que nunca se llegó a guardar), así que el botón de compartir directamente no aparece
 * en vez de copiar un link roto.
 */
export function BotonesAccion({ idCompartible }: { idCompartible?: string | null }) {
  const [copiado, setCopiado] = useState(false);

  const compartir = async () => {
    if (!idCompartible || typeof window === "undefined") return;
    const link = `${window.location.origin}/resultado/${idCompartible}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), DURACION_FEEDBACK_COPIADO_MS);
    } catch (err) {
      console.error("No se pudo copiar el link:", err);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link href="/dashboard" className="btn-primary flex-1">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Analizar otra noticia
      </Link>
      {idCompartible && (
        <button onClick={compartir} className="btn-secondary flex-1">
          {copiado ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ¡Enlace copiado!
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Compartir resultado
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function VistaVeredicto({
  resultado,
  fecha,
}: {
  resultado: AnalyzeResponse;
  fecha?: string;
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

      <BotonesAccion idCompartible={resultado.id} />
    </div>
  );
}
