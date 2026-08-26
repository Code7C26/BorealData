"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import {
  HistorialStateSwitcher,
  VISTAS_DISPONIBLES,
} from "@/components/historial-state-switcher";

type Veredicto = "confiable" | "dudosa" | "desinformacion" | "no_verificable";

type ItemHistorial = {
  id: string;
  titulo: string;
  fecha: string;
  fuente: string;
  veredicto: Veredicto;
  confianza: number;
  resumen: string;
};

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

// Mock — reemplazar por el historial real del backend cuando esté disponible.
const HISTORIAL_MOCK: ItemHistorial[] = [
  {
    id: "1",
    titulo: "El Banco Central anuncia una reducción en la tasa de interés de referencia",
    fecha: "10 ago 2026",
    fuente: "diarioeconomico-ejemplo.com",
    veredicto: "confiable",
    confianza: 92,
    resumen:
      "El artículo cita textualmente el comunicado oficial y coincide con tres fuentes independientes.",
  },
  {
    id: "2",
    titulo: "Un suplemento alimenticio viral promete triplicar la energía en 24 horas",
    fecha: "9 ago 2026",
    fuente: "blog-bienestar-ejemplo.com",
    veredicto: "dudosa",
    confianza: 54,
    resumen:
      "Mezcla testimonios reales con cifras de efectividad que no están respaldadas por estudios citables.",
  },
  {
    id: "3",
    titulo: "Circula una imagen que asegura que una vacuna fue retirada del mercado mundial",
    fecha: "8 ago 2026",
    fuente: "cadena-mensajes-ejemplo.com",
    veredicto: "desinformacion",
    confianza: 8,
    resumen:
      "La imagen fue editada a partir de un comunicado real de 2019 sobre un lote específico, no un retiro mundial.",
  },
  {
    id: "4",
    titulo: "Un usuario asegura haber presenciado un fenómeno inusual en un barrio de la ciudad",
    fecha: "7 ago 2026",
    fuente: "red-social-ejemplo.com",
    veredicto: "no_verificable",
    confianza: 31,
    resumen:
      "No existen fuentes independientes ni registros oficiales que confirmen o desmientan el hecho relatado.",
  },
  {
    id: "5",
    titulo: "Nueva normativa vial entrará en vigencia el próximo mes según fuentes oficiales",
    fecha: "5 ago 2026",
    fuente: "gobierno-ejemplo.gob",
    veredicto: "confiable",
    confianza: 88,
    resumen:
      "El boletín oficial confirma la fecha y el contenido exacto de la normativa mencionada.",
  },
  {
    id: "6",
    titulo: "Video muestra supuesto avistamiento que se viralizó en redes esta semana",
    fecha: "3 ago 2026",
    fuente: "clips-virales-ejemplo.com",
    veredicto: "dudosa",
    confianza: 46,
    resumen:
      "El video original no incluye la ubicación ni fecha verificable, y fue reeditado varias veces.",
  },
];

function TarjetaHistorial({ item }: { item: ItemHistorial }) {
  const estilo = ESTILO_VEREDICTO[item.veredicto];
  const Icon = estilo.icon;

  return (
    <Link
      href={`/resultado?estado=${item.veredicto}`}
      className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-blue-light/50"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${estilo.fondo} ${estilo.borde} ${estilo.texto}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {estilo.label}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {item.confianza}%
        </span>
      </div>

      <h3 className="mt-4 line-clamp-2 font-serif text-base font-bold leading-snug text-ice">
        {item.titulo}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {item.resumen}
      </p>

      <div className="mt-4 flex items-center gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {item.fecha}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.fuente}</span>
        </span>
      </div>
    </Link>
  );
}

function VistaConContenido() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {HISTORIAL_MOCK.map((item) => (
        <TarjetaHistorial key={item.id} item={item} />
      ))}
    </div>
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

function VistaErrorHistorial() {
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
      <Link
        href="/historial"
        className="mt-8 flex items-center gap-2 rounded-lg bg-blue px-5 py-3 text-sm font-semibold text-ice shadow-lg shadow-blue/20 transition-all hover:bg-blue-light hover:text-navy"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reintentar
      </Link>
    </div>
  );
}

function HistorialInner({ vista }: { vista: string }) {
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

      {vista === "vacio" ? (
        <VistaVacia />
      ) : vista === "cargando" ? (
        <VistaCargando />
      ) : vista === "error" ? (
        <VistaErrorHistorial />
      ) : (
        <VistaConContenido />
      )}
    </div>
  );
}

function HistorialWrapper() {
  const searchParams = useSearchParams();
  const vistaParam = searchParams.get("vista") ?? "contenido";
  const vistaValida = VISTAS_DISPONIBLES.some((v) => v.value === vistaParam)
    ? vistaParam
    : "contenido";

  return (
    <>
      <HistorialStateSwitcher vistaActual={vistaValida} />
      {/* key fuerza remount al cambiar de vista, mismo fix que /analizando y /resultado */}
      <HistorialInner key={vistaValida} vista={vistaValida} />
    </>
  );
}

export default function HistorialPage() {
  return (
    <Suspense fallback={null}>
      <HistorialWrapper />
    </Suspense>
  );
}
