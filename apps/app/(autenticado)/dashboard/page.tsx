"use client";

import { useEffect, useState } from "react";
import { AnalisisInput } from "@/components/analisis-input";
import { BarChart3, ShieldCheck, Link2, Lightbulb } from "lucide-react";
import {
  obtenerUsuarioMock,
  USUARIO_POR_DEFECTO,
  type UsuarioMock,
} from "@/lib/mock-usuario";

// Mock — reemplazar por datos reales del backend cuando esté disponible.
const ESTADISTICAS = [
  { icon: BarChart3, valor: "12", label: "Análisis realizados" },
  { icon: ShieldCheck, valor: "78%", label: "Confiabilidad promedio" },
  { icon: Link2, valor: "34", label: "Fuentes consultadas" },
];

const TIP_DEL_DIA =
  "Antes de compartir una noticia, fijate si otros medios independientes están reportando lo mismo. Si solo una fuente lo dice, tomalo con cautela.";

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<UsuarioMock>(USUARIO_POR_DEFECTO);

  useEffect(() => {
    setUsuario(obtenerUsuarioMock() ?? USUARIO_POR_DEFECTO);
  }, []);

  const primerNombre = usuario.nombre.split(" ")[0];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-ice sm:text-4xl">
          Hola, {primerNombre} 👋
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
              className="rounded-2xl border border-border bg-card p-6 text-center"
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
  );
}