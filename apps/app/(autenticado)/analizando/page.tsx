"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSearch,
  ShieldCheck,
  Scale,
  Sparkles,
  Check,
} from "lucide-react";
import { apiFetch, ApiError, type AnalyzeResponse } from "@/lib/api";
import { guardarResultado, type ResultadoGuardado } from "@/lib/resultado-storage";

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
  const [respuestaLista, setRespuestaLista] = useState(false);
  const resultadoRef = useRef<ResultadoGuardado | null>(null);
  const iniciadoRef = useRef(false);

  // Dispara el análisis real una única vez (el ref evita el doble fetch que
  // provoca React Strict Mode en dev al montar el efecto dos veces — acá
  // importa de verdad porque cada llamada gasta una consulta real a Gemini).
  useEffect(() => {
    if (iniciadoRef.current) return;
    iniciadoRef.current = true;

    if (tipo !== "url" || !valor) {
      resultadoRef.current = { status: "error", tipo, valor };
      setRespuestaLista(true);
      return;
    }

    apiFetch<AnalyzeResponse>("/analyze", { method: "POST", body: { url: valor } })
      .then((data) => {
        resultadoRef.current = {
          status: "ok",
          tipo,
          valor,
          data,
          fecha: new Date().toISOString(),
        };
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        const status = err instanceof ApiError && err.status === 422 ? "insuficiente" : "error";
        resultadoRef.current = {
          status,
          tipo,
          valor,
          mensaje: err instanceof Error ? err.message : undefined,
        };
      })
      .finally(() => setRespuestaLista(true));
  }, [tipo, valor, router]);

  // Animación de etapas — puramente visual, se detiene en la última.
  useEffect(() => {
    if (etapaActual >= ETAPAS.length) return;
    const timeout = setTimeout(() => {
      setEtapaActual((prev) => prev + 1);
    }, DURACION_POR_ETAPA_MS);
    return () => clearTimeout(timeout);
  }, [etapaActual]);

  // Recién navega cuando terminó la animación Y ya llegó la respuesta real.
  useEffect(() => {
    if (etapaActual < ETAPAS.length || !respuestaLista || !resultadoRef.current) return;
    guardarResultado(resultadoRef.current);
    const timeout = setTimeout(() => router.push("/resultado"), 400);
    return () => clearTimeout(timeout);
  }, [etapaActual, respuestaLista, router]);

  // Artículos largos con búsqueda real pueden tardar bastante más que la
  // animación de 4 etapas (hasta 90s, ver timeout de Gemini en el backend).
  // Por eso el progreso nunca llega a "100%" hasta que la respuesta real
  // está lista — mostrar 100% antes de tiempo hace que la pantalla parezca
  // trabada cuando en realidad sigue esperando al backend.
  const esperandoRespuesta = etapaActual >= ETAPAS.length && !respuestaLista;
  const progreso = respuestaLista
    ? 100
    : Math.min(95, Math.round((etapaActual / ETAPAS.length) * 100));

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
            const esUltima = index === ETAPAS.length - 1;
            const Icon = etapa.icon;
            // La última etapa se queda "activa" (no completada) mientras
            // seguimos esperando la respuesta real, en vez de mostrar un
            // check prematuro.
            const completada = esUltima ? respuestaLista : index < etapaActual;
            const activa = esUltima ? esperandoRespuesta || index === etapaActual : index === etapaActual;

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
          {esperandoRespuesta && (
            <p className="text-[#4A7A9B] text-xs mt-2 text-center italic motion-safe:animate-pulse">
              Los artículos extensos pueden tardar un poco más — seguimos trabajando…
            </p>
          )}
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
