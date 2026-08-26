"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import {
  DevStateSwitcher,
  ESTADOS_DISPONIBLES,
} from "@/components/dev-state-switcher";

type Veredicto = "confiable" | "dudosa" | "desinformacion" | "no_verificable";

type Fuente = {
  nombre: string;
  url: string;
  postura: "respalda" | "contradice" | "relacionada";
};

type Comparacion = {
  afirmacion: string;
  evidencia: string;
  coincide: boolean;
};

type ResultadoMock = {
  titular: string;
  fuenteUrl: string;
  fecha: string;
  confianza: number;
  resumen: string;
  explicacion: string;
  fuentesConsultadas: Fuente[];
  comparaciones: Comparacion[];
};

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

const MOCK_POR_VEREDICTO: Record<Veredicto, ResultadoMock> = {
  confiable: {
    titular:
      "El Banco Central anuncia una reducción en la tasa de interés de referencia",
    fuenteUrl: "https://www.diarioeconomico-ejemplo.com/tasas-interes-2026",
    fecha: "10 de agosto de 2026",
    confianza: 92,
    resumen:
      "La noticia reporta correctamente el comunicado oficial del Banco Central. Los números citados coinciden con el documento publicado en el sitio institucional.",
    explicacion:
      "El artículo cita textualmente el comunicado oficial, incluye la fecha exacta de la medida y no contiene afirmaciones adicionales sin respaldo. Tres fuentes independientes reportan la misma cifra.",
    fuentesConsultadas: [
      {
        nombre: "Comunicado oficial del Banco Central",
        url: "https://www.bancocentral-ejemplo.gob/comunicados/2026-08",
        postura: "respalda",
      },
      {
        nombre: "Agencia de noticias Reuters (ejemplo)",
        url: "https://www.agencia-ejemplo.com/economia/tasas",
        postura: "respalda",
      },
      {
        nombre: "Diario Financiero Regional (ejemplo)",
        url: "https://www.financiero-regional-ejemplo.com/nota",
        postura: "relacionada",
      },
    ],
    comparaciones: [
      {
        afirmacion: "La tasa bajó del 48% al 45%.",
        evidencia: "El comunicado oficial confirma la baja a 45%.",
        coincide: true,
      },
      {
        afirmacion: "La medida entra en vigencia el 15 de agosto.",
        evidencia: "El documento oficial fija esa misma fecha de entrada en vigencia.",
        coincide: true,
      },
    ],
  },
  dudosa: {
    titular:
      "Un suplemento alimenticio viral promete triplicar la energía en 24 horas",
    fuenteUrl: "https://www.blog-bienestar-ejemplo.com/suplemento-viral",
    fecha: "9 de agosto de 2026",
    confianza: 54,
    resumen:
      "El artículo mezcla testimonios reales de usuarios con afirmaciones sobre efectividad que no están respaldadas por estudios citables. Parte de la información es verificable, otra parte no.",
    explicacion:
      "Los testimonios individuales pueden ser genuinos, pero las cifras de efectividad ('triplica la energía') no aparecen en ningún estudio publicado. El artículo no cita metodología ni fuente científica.",
    fuentesConsultadas: [
      {
        nombre: "Registro sanitario del producto (ejemplo)",
        url: "https://www.registro-sanitario-ejemplo.gob/producto",
        postura: "relacionada",
      },
      {
        nombre: "Base de estudios PubMed (ejemplo)",
        url: "https://www.pubmed-ejemplo.gov/search",
        postura: "contradice",
      },
    ],
    comparaciones: [
      {
        afirmacion: "Triplica la energía en 24 horas.",
        evidencia: "No se encontró ningún estudio que respalde esa cifra específica.",
        coincide: false,
      },
      {
        afirmacion: "Contiene vitaminas del complejo B.",
        evidencia: "El registro sanitario confirma esa composición.",
        coincide: true,
      },
    ],
  },
  desinformacion: {
    titular:
      "Circula una imagen que asegura que una vacuna fue retirada del mercado mundial",
    fuenteUrl: "https://www.cadena-mensajes-ejemplo.com/alerta-vacuna",
    fecha: "8 de agosto de 2026",
    confianza: 8,
    resumen:
      "La imagen que acompaña la publicación fue editada a partir de un comunicado real de 2019 sobre un lote específico en un solo país, no un retiro mundial. Los organismos de salud citados desmienten la versión viral.",
    explicacion:
      "El comunicado original solo hacía referencia a un lote defectuoso en un país puntual, no a la vacuna en general. La fecha del documento fue alterada digitalmente para simular actualidad.",
    fuentesConsultadas: [
      {
        nombre: "Organización de Salud (ejemplo) — Sala de prensa",
        url: "https://www.organizacion-salud-ejemplo.org/prensa",
        postura: "contradice",
      },
      {
        nombre: "Verificador de datos independiente (ejemplo)",
        url: "https://www.verificador-ejemplo.org/nota-vacuna",
        postura: "contradice",
      },
    ],
    comparaciones: [
      {
        afirmacion: "La vacuna fue retirada del mercado mundial.",
        evidencia: "El comunicado original habla de un lote en un solo país, en 2019.",
        coincide: false,
      },
    ],
  },
  no_verificable: {
    titular:
      "Un usuario asegura haber presenciado un fenómeno inusual en un barrio de la ciudad",
    fuenteUrl: "https://www.red-social-ejemplo.com/publicacion/38291",
    fecha: "7 de agosto de 2026",
    confianza: 31,
    resumen:
      "No existen fuentes independientes, registros oficiales ni cobertura periodística que confirmen o desmientan el hecho relatado. Se trata de un único testimonio sin evidencia adicional.",
    explicacion:
      "AletheIA no encontró fotos, videos, notas de prensa ni reportes oficiales relacionados con el evento descrito. Esto no significa que sea falso: significa que, por ahora, no hay forma de confirmarlo.",
    fuentesConsultadas: [
      {
        nombre: "Portal de noticias locales (ejemplo)",
        url: "https://www.noticias-locales-ejemplo.com/buscar",
        postura: "relacionada",
      },
    ],
    comparaciones: [
      {
        afirmacion: "El hecho ocurrió en la fecha indicada.",
        evidencia: "No se encontraron registros que lo confirmen ni lo desmientan.",
        coincide: false,
      },
    ],
  },
};

function BotonesAccion({ tipo, valor }: { tipo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        href="/dashboard"
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue py-3 text-sm font-semibold text-ice shadow-lg shadow-blue/20 transition-all hover:bg-blue-light hover:text-navy"
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
  veredicto,
  tipo,
  valor,
}: {
  veredicto: Veredicto;
  tipo: string;
  valor: string;
}) {
  const data = MOCK_POR_VEREDICTO[veredicto];
  const estilo = ESTILO_VEREDICTO[veredicto];
  const Icono = ICONO_VEREDICTO[veredicto];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
      {/* Encabezado de la noticia */}
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="font-serif text-2xl font-bold leading-snug text-ice sm:text-3xl">
          {data.titular}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {tipo === "url" && valor ? valor : data.fuenteUrl}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {data.fecha}
          </span>
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
              <span className="font-semibold">{data.confianza}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#0B1929] overflow-hidden">
              <div
                className={`h-full rounded-full ${estilo.barra}`}
                style={{ width: `${data.confianza}%` }}
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
          {data.resumen}
        </p>
      </div>

      {/* Explicación */}
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-lg font-bold text-ice">
          ¿Por qué se obtuvo este resultado?
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {data.explicacion}
        </p>
      </div>

      {/* Comparación afirmaciones vs evidencia */}
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-lg font-bold text-ice">
          Afirmaciones vs. evidencia
        </h2>
        <div className="mt-5 flex flex-col gap-4">
          {data.comparaciones.map((comp, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/80 bg-navy p-5"
            >
              <div className="flex items-start gap-2">
                <Quote
                  className="h-4 w-4 shrink-0 mt-0.5 text-blue-light"
                  aria-hidden="true"
                />
                <p className="text-sm text-ice">{comp.afirmacion}</p>
              </div>
              <div className="mt-3 flex items-start gap-2 pl-6">
                {comp.coincide ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle
                    className="h-4 w-4 shrink-0 mt-0.5 text-red-400"
                    aria-hidden="true"
                  />
                )}
                <p className="text-sm text-muted-foreground">
                  {comp.evidencia}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fuentes consultadas */}
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-lg font-bold text-ice">
          Fuentes consultadas
        </h2>
        <div className="mt-5 flex flex-col gap-3">
          {data.fuentesConsultadas.map((fuente) => (
            <a
              key={fuente.url}
              href={fuente.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-navy px-4 py-3 transition-colors hover:border-blue-light/50"
            >
              <span className="flex items-center gap-2 truncate text-sm text-ice">
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{fuente.nombre}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  fuente.postura === "respalda"
                    ? "bg-emerald-900/30 text-emerald-300"
                    : fuente.postura === "contradice"
                    ? "bg-red-900/30 text-red-300"
                    : "bg-slate-500/15 text-slate-300"
                }`}
              >
                {fuente.postura === "respalda"
                  ? "Respalda"
                  : fuente.postura === "contradice"
                  ? "Contradice"
                  : "Relacionada"}
              </span>
            </a>
          ))}
        </div>
      </div>

      <BotonesAccion tipo={tipo} valor={valor} />
    </div>
  );
}

function VistaInsuficiente({ tipo, valor }: { tipo: string; valor: string }) {
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
        <BotonesAccion tipo={tipo} valor={valor} />
      </div>
    </div>
  );
}

function VistaError({ tipo, valor }: { tipo: string; valor: string }) {
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
        <BotonesAccion tipo={tipo} valor={valor} />
      </div>
    </div>
  );
}

function ResultadoContent({
  estadoValido,
  tipo,
  valor,
}: {
  estadoValido: string;
  tipo: string;
  valor: string;
}) {
  return (
    <div className="min-h-screen">
      <DevStateSwitcher estadoActual={estadoValido} />

      {estadoValido === "insuficiente" ? (
        <VistaInsuficiente tipo={tipo} valor={valor} />
      ) : estadoValido === "error" ? (
        <VistaError tipo={tipo} valor={valor} />
      ) : (
        <VistaVeredicto
          veredicto={estadoValido as Veredicto}
          tipo={tipo}
          valor={valor}
        />
      )}
    </div>
  );
}

function ResultadoWrapper() {
  const searchParams = useSearchParams();
  const estadoParam = searchParams.get("estado") ?? "confiable";
  const tipo = searchParams.get("tipo") ?? "url";
  const valor = searchParams.get("valor") ?? "";

  const estadoValido = ESTADOS_DISPONIBLES.some((e) => e.value === estadoParam)
    ? estadoParam
    : "confiable";

  // key = searchParams.toString() fuerza un remount completo cada vez que
  // cambia el estado/tipo/valor, evitando que quede contenido viejo pegado.
  return (
    <ResultadoContent
      key={searchParams.toString()}
      estadoValido={estadoValido}
      tipo={tipo}
      valor={valor}
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
