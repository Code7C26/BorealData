"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSearch,
  ShieldCheck,
  Scale,
  Sparkles,
  Check,
} from "lucide-react";

const ETAPAS = [
  {
    icon: FileSearch,
    titulo: "Analizando contenido",
    descripcion: "Leyendo el texto y extrayendo las afirmaciones clave.",
  },
  {
    icon: ShieldCheck,
    titulo: "Verificando fuentes",
    descripcion: "Cruzando la información con fuentes periodísticas confiables.",
  },
  {
    icon: Scale,
    titulo: "Contrastando información",
    descripcion: "Comparando las afirmaciones contra la evidencia encontrada.",
  },
  {
    icon: Sparkles,
    titulo: "Generando resultado",
    descripcion: "Armando el veredicto y el razonamiento explicado.",
  },
];

const DURACION_POR_ETAPA_MS = 1800;

function AnalizandoContent({ tipo, valor }: { tipo: string; valor: string }) {
  const router = useRouter();
  const [etapaActual, setEtapaActual] = useState(0);

  useEffect(() => {
    if (etapaActual >= ETAPAS.length) {
      const timeout = setTimeout(() => {
        router.push(
          `/resultado?tipo=${tipo}&valor=${encodeURIComponent(valor)}`
        );
      }, 500);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => {
      setEtapaActual((prev) => prev + 1);
    }, DURACION_POR_ETAPA_MS);

    return () => clearTimeout(timeout);
  }, [etapaActual, router, tipo, valor]);

  const progreso = Math.min(
    100,
    Math.round((etapaActual / ETAPAS.length) * 100)
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Card */}
      <div className="w-full max-w-lg bg-[#0D2037] border border-[#1A3A5C] rounded-2xl p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
            </span>
            <span className="text-blue-400 text-xs tracking-widest uppercase">
              Analizando
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Estamos verificando tu noticia
          </h1>
          {valor && (
            <p className="text-[#4A7A9B] text-sm mt-1 truncate">
              {tipo === "url" ? "Fuente: " : "Texto: "}
              <span className="text-[#7EB8DC]">{valor}</span>
            </p>
          )}
        </div>

        {/* Etapas */}
        <div className="flex flex-col gap-5">
          {ETAPAS.map((etapa, index) => {
            const Icon = etapa.icon;
            const completada = index < etapaActual;
            const activa = index === etapaActual;

            return (
              <div key={etapa.titulo} className="flex items-start gap-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    completada
                      ? "border-[#1A6DB5] bg-[#1A6DB5] text-white"
                      : activa
                      ? "border-[#60B8F0] text-[#60B8F0] motion-safe:animate-pulse"
                      : "border-[#1A3A5C] text-[#4A7A9B]"
                  }`}
                >
                  {completada ? (
                    <Check size={16} />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>
                <div className="pt-1">
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      completada || activa ? "text-white" : "text-[#4A7A9B]"
                    }`}
                  >
                    {etapa.titulo}
                  </p>
                  <p className="text-[#4A7A9B] text-xs mt-0.5">
                    {etapa.descripcion}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra de progreso */}
        <div className="mt-8">
          <div className="h-1.5 w-full rounded-full bg-[#0B1929] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1A6DB5] transition-all duration-500 ease-out"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <p className="text-[#4A7A9B] text-xs mt-2 text-right">
            {progreso}%
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[#4A7A9B] text-xs mt-8">
        © 2026 Boreal Data — AletheIA
      </p>
    </div>
  );
}

function AnalizandoWrapper() {
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo") ?? "url";
  const valor = searchParams.get("valor") ?? "";

  // key = searchParams.toString() fuerza un remount completo cada vez que
  // cambia la URL, así el estado de las etapas siempre arranca de cero
  // (Next.js reutiliza el componente si solo cambian los query params).
  return <AnalizandoContent key={searchParams.toString()} tipo={tipo} valor={valor} />;
}

export default function AnalizandoPage() {
  return (
    <Suspense fallback={null}>
      <AnalizandoWrapper />
    </Suspense>
  );
}
