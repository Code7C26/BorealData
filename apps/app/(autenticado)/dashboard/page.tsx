"use client";

import { AnalisisInput } from "@/components/analisis-input";
import { BarChart3, ShieldCheck, Link2, Lightbulb } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// Mock — reemplazar por datos reales del backend cuando esté disponible.
const ESTADISTICAS = [
  { icon: BarChart3, valor: "12", label: "Análisis realizados" },
  { icon: ShieldCheck, valor: "78%", label: "Confiabilidad promedio" },
  { icon: Link2, valor: "34", label: "Fuentes consultadas" },
];

const TIP_DEL_DIA =
  "Antes de compartir una noticia, fijate si otros medios independientes están reportando lo mismo. Si solo una fuente lo dice, tomalo con cautela.";

export default function DashboardPage() {
  const { user, profile } = useAuth();

  const nombre = profile?.fullName || user?.displayName || user?.email?.split("@")[0] || "";
  const primerNombre = nombre.split(" ")[0];

  return (
    <div className="relative isolate overflow-hidden">
      {/* halo detrás del saludo — el ambiente general vive en el layout (sidebar.tsx) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[560px] w-[1100px] max-w-[160%] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(96,184,240,0.35) 0%, rgba(26,109,181,0.16) 45%, transparent 75%)',
        }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16 animate-fade-up">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-ice sm:text-4xl">
            Hola, <span className="text-gradient">{primerNombre}</span> 👋
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Pegá una URL o texto y AletheIA analiza la fuente, verifica los datos
            y te explica por qué es confiable o no.
          </p>
        </div>

        <div className="mt-10">
          <AnalisisInput />
        </div>

        {/* Estadísticas de actividad */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ESTADISTICAS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:border-blue-light/50 hover:shadow-xl hover:shadow-blue/10"
              >
                <Icon className="mx-auto h-5 w-5 text-blue-light" aria-hidden="true" />
                <p className="mt-3 font-serif text-2xl font-bold text-ice">
                  {stat.valor}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Tip */}
        <div className="mt-6 flex items-start gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/15 text-blue-light">
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-light">
              Tip para detectar desinformación
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {TIP_DEL_DIA}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}