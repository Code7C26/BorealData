"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Calendar,
  Link2,
  Inbox,
  AlertOctagon,
  RotateCcw,
  Search,
} from "lucide-react";
import { apiFetch, mapLabelToVeredicto, type HistoryItem, type Veredicto } from "@/lib/api";
import { guardarResultadoDesdeHistorial } from "@/lib/resultado-storage";

const ESTILO_VEREDICTO: Record<
  Veredicto,
  { label: string; icon: typeof CheckCircle2; texto: string; fondo: string; borde: string }
> = {
  confiable: {
    label: "Confiable",
    icon: CheckCircle2,
    texto: "text-emerald-300",
    fondo: "bg-emerald-900/20",
    borde: "border-emerald-500/30",
  },
  dudosa: {
    label: "Dudosa",
    icon: AlertTriangle,
    texto: "text-amber-300",
    fondo: "bg-amber-900/20",
    borde: "border-amber-500/30",
  },
  desinformacion: {
    label: "Posible desinformación",
    icon: XCircle,
    texto: "text-red-300",
    fondo: "bg-red-900/20",
    borde: "border-red-500/30",
  },
  no_verificable: {
    label: "No verificable",
    icon: HelpCircle,
    texto: "text-slate-300",
    fondo: "bg-slate-500/10",
    borde: "border-slate-400/30",
  },
};

function hostnameDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TarjetaHistorial({ item }: { item: HistoryItem }) {
  const router = useRouter();
  const veredicto = mapLabelToVeredicto(item.label);
  const estilo = ESTILO_VEREDICTO[veredicto];
  const Icon = estilo.icon;

  const abrir = () => {
    guardarResultadoDesdeHistorial(item);
    // El query param único fuerza la navegación aunque ya estés en /resultado
    // viendo otro análisis (misma ruta = Next no re-navega ni re-renderiza).
    router.push(`/resultado?t=${Date.now()}`);
  };

  return (
    <button
      onClick={abrir}
      className="flex flex-col rounded-2xl border border-border bg-card p-6 text-left transition-colors hover:border-blue-light/50"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${estilo.fondo} ${estilo.borde} ${estilo.texto}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {estilo.label}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {item.score}%
        </span>
      </div>

      <h3 className="mt-4 line-clamp-2 font-serif text-base font-bold leading-snug text-ice">
        {item.title ?? item.url}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {item.summary ?? ""}
      </p>

      <div className="mt-4 flex items-center gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {formatearFecha(item.createdAt)}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{hostnameDe(item.url)}</span>
        </span>
      </div>
    </button>
  );
}

function VistaVacia() {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
        <Inbox className="h-7 w-7 text-blue-light" aria-hidden="true" />
      </div>
      <h2 className="mt-6 font-serif text-xl font-bold text-ice">
        Todavía no analizaste ninguna noticia
      </h2>
      <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
        Cuando analices tu primera noticia, va a aparecer acá para que puedas
        volver a consultarla cuando quieras.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 flex items-center gap-2 rounded-lg bg-blue px-5 py-3 text-sm font-semibold text-ice shadow-lg shadow-blue/20 transition-all hover:bg-blue-light hover:text-navy"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        Analizar tu primera noticia
      </Link>
    </div>
  );
}

function VistaCargando() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-2xl border border-border bg-card p-6"
        >
          <div className="h-5 w-24 animate-pulse rounded-full bg-[#1A3A5C]" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-[#1A3A5C]" />
          <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-[#1A3A5C]" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-[#1A3A5C]/70" />
          <div className="mt-1 h-3 w-2/3 animate-pulse rounded bg-[#1A3A5C]/70" />
          <div className="mt-4 h-3 w-1/2 animate-pulse rounded bg-[#1A3A5C]/50" />
        </div>
      ))}
    </div>
  );
}

function VistaErrorHistorial({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/40 bg-red-900/20">
        <AlertOctagon className="h-7 w-7 text-red-400" aria-hidden="true" />
      </div>
      <h2 className="mt-6 font-serif text-xl font-bold text-ice">
        No pudimos cargar tu historial
      </h2>
      <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
        Hubo un problema de conexión con el servidor. Probá de nuevo en unos
        segundos.
      </p>
      <button
        onClick={onReintentar}
        className="mt-8 flex items-center gap-2 rounded-lg bg-blue px-5 py-3 text-sm font-semibold text-ice shadow-lg shadow-blue/20 transition-all hover:bg-blue-light hover:text-navy"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}

type Estado = "cargando" | "error" | "listo";

export default function HistorialPage() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [analyses, setAnalyses] = useState<HistoryItem[]>([]);

  const cargar = () => {
    setEstado("cargando");
    apiFetch<{ analyses: HistoryItem[] }>("/history")
      .then((res) => {
        setAnalyses(res.analyses);
        setEstado("listo");
      })
      .catch(() => setEstado("error"));
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-ice sm:text-3xl">
          Historial de análisis
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las noticias que analizaste, con su veredicto y nivel de
          confiabilidad.
        </p>
      </div>

      {estado === "cargando" ? (
        <VistaCargando />
      ) : estado === "error" ? (
        <VistaErrorHistorial onReintentar={cargar} />
      ) : analyses.length === 0 ? (
        <VistaVacia />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {analyses.map((item) => (
            <TarjetaHistorial key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
