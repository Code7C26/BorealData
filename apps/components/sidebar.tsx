"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Plus,
  History,
  Settings,
  Mail,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  obtenerUsuarioMock,
  USUARIO_POR_DEFECTO,
  iniciales,
  type UsuarioMock,
} from "@/lib/mock-usuario";

type Veredicto = "confiable" | "dudosa" | "desinformacion" | "no_verificable";

type AnalisisReciente = {
  id: string;
  titulo: string;
  veredicto: Veredicto;
};

// Mock — reemplazar por datos reales del backend cuando esté disponible.
const ANALISIS_RECIENTES: AnalisisReciente[] = [
  {
    id: "1",
    titulo: "Banco Central anuncia baja de tasas de interés",
    veredicto: "confiable",
  },
  {
    id: "2",
    titulo: "Suplemento viral promete triplicar la energía",
    veredicto: "dudosa",
  },
  {
    id: "3",
    titulo: "Imagen sobre retiro mundial de una vacuna",
    veredicto: "desinformacion",
  },
  {
    id: "4",
    titulo: "Fenómeno inusual reportado en un barrio",
    veredicto: "no_verificable",
  },
];

const PUNTO_VEREDICTO: Record<Veredicto, string> = {
  confiable: "bg-emerald-400",
  dudosa: "bg-amber-400",
  desinformacion: "bg-red-400",
  no_verificable: "bg-slate-400",
};

// Perfil se accede desde el bloque de usuario (arriba), no se repite acá.
const NAV_INFERIOR = [
  { href: "/historial", label: "Historial", icon: History },
  { href: "/configuracion", label: "Configuración", icon: Settings },
  { href: "/contacto", label: "Contacto", icon: Mail },
];

const COLAPSO_STORAGE_KEY = "aletheia_sidebar_colapsada";

function ContenidoSidebar({
  colapsada,
  usuario,
  onNavigate,
}: {
  colapsada: boolean;
  usuario: UsuarioMock;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-5 py-5 ${colapsada ? "justify-center px-0" : ""}`}
      >
        <Image
          src="/logoAletheia.png"
          alt="AletheIA"
          width={32}
          height={32}
          className="shrink-0 object-contain"
        />
        {!colapsada && (
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold text-sm tracking-widest uppercase">
              Boreal Data
            </span>
            <span className="text-blue-400 text-xs tracking-wider">
              AletheIA
            </span>
          </div>
        )}
      </div>

      {/* Usuario — arriba, siempre visible, único punto de entrada a Perfil */}
      <div className={`px-4 pb-4 ${colapsada ? "px-2" : ""}`}>
        <Link
          href="/perfil"
          onClick={onNavigate}
          title="Ver perfil"
          className={`flex items-center gap-3 rounded-lg border border-[#1A3A5C] bg-[#0D2037] px-3 py-3 transition-colors hover:border-[#1A6DB5]/60 ${
            colapsada ? "justify-center px-0" : ""
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1A6DB5] text-xs font-semibold text-white">
            {iniciales(usuario.nombre)}
          </div>
          {!colapsada && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-white">
                {usuario.nombre}
              </span>
              <span className="truncate text-xs text-[#4A7A9B]">
                {usuario.email}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nuevo análisis */}
      <div className={`px-4 ${colapsada ? "px-2" : ""}`}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          title="Nuevo análisis"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A6DB5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1557A0]"
        >
          <Plus size={16} className="shrink-0" />
          {!colapsada && "Nuevo análisis"}
        </Link>
      </div>

      {/* Análisis recientes — se ocultan colapsada, no entran en un riel de íconos */}
      {!colapsada && (
        <div className="mt-6 flex min-h-0 flex-1 flex-col px-4">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-[#4A7A9B]">
            Recientes
          </p>
          <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
            {ANALISIS_RECIENTES.map((analisis) => (
              <Link
                key={analisis.id}
                href={`/resultado?estado=${analisis.veredicto}`}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[#7EB8DC] transition-colors hover:bg-[#0D2037] hover:text-white"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${PUNTO_VEREDICTO[analisis.veredicto]}`}
                />
                <span className="truncate">{analisis.titulo}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {colapsada && <div className="flex-1" />}

      {/* Navegación inferior */}
      <div className={`border-t border-[#1A3A5C] px-4 py-4 ${colapsada ? "px-2" : ""}`}>
        <div className="space-y-1">
          {NAV_INFERIOR.map((item) => {
            const activo = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={item.label}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  colapsada ? "justify-center px-0" : ""
                } ${
                  activo
                    ? "bg-[#1A6DB5]/15 text-white"
                    : "text-[#7EB8DC] hover:bg-[#0D2037] hover:text-white"
                }`}
              >
                <Icon size={16} className={`shrink-0 ${activo ? "text-[#60B8F0]" : ""}`} />
                {!colapsada && item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [mobileAbierto, setMobileAbierto] = useState(false);
  const [colapsada, setColapsada] = useState(false);
  const [listo, setListo] = useState(false);
  const [usuario, setUsuario] = useState<UsuarioMock>(USUARIO_POR_DEFECTO);
  const pathname = usePathname();

  // Carga preferencia de colapso + usuario mock una vez montado (localStorage es client-only)
  useEffect(() => {
    const guardada = window.localStorage.getItem(COLAPSO_STORAGE_KEY);
    if (guardada === "true") setColapsada(true);
    setUsuario(obtenerUsuarioMock() ?? USUARIO_POR_DEFECTO);
    setListo(true);
  }, []);

  useEffect(() => {
    setMobileAbierto(false);
  }, [pathname]);

  const alternarColapso = () => {
    setColapsada((prev) => {
      const nuevo = !prev;
      window.localStorage.setItem(COLAPSO_STORAGE_KEY, String(nuevo));
      return nuevo;
    });
  };

  // Evita un flash de contenido incorrecto mientras se lee localStorage
  if (!listo) {
    return <div className="min-h-screen bg-navy" />;
  }

  return (
    <div className="min-h-screen bg-navy">
      {/* Barra superior mobile */}
      <div className="flex items-center justify-between border-b border-[#1A3A5C] bg-[#0B1929] px-4 py-3 lg:hidden">
        <button
          onClick={() => setMobileAbierto(true)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7EB8DC] transition-colors hover:bg-[#0D2037] hover:text-white"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/logoAletheia.png"
            alt="AletheIA"
            width={24}
            height={24}
            className="object-contain"
          />
          <span className="text-white font-bold text-xs tracking-widest uppercase">
            AletheIA
          </span>
        </div>
        <div className="w-9" aria-hidden="true" />
      </div>

      {/* Sidebar fijo — desktop */}
      <aside
        className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col lg:border-r lg:border-[#1A3A5C] lg:bg-[#0B1929] lg:transition-[width] lg:duration-200 ${
          colapsada ? "lg:w-[76px]" : "lg:w-72"
        }`}
      >
        <ContenidoSidebar colapsada={colapsada} usuario={usuario} />

        {/* Toggle colapsar/expandir */}
        <button
          onClick={alternarColapso}
          aria-label={colapsada ? "Expandir menú" : "Colapsar menú"}
          className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-[#1A3A5C] bg-[#0D2037] text-[#7EB8DC] transition-colors hover:border-[#1A6DB5] hover:text-white"
        >
          {colapsada ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Drawer — mobile */}
      {mobileAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileAbierto(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-[#1A3A5C] bg-[#0B1929]">
            <button
              onClick={() => setMobileAbierto(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#7EB8DC] hover:bg-[#0D2037] hover:text-white"
            >
              <X size={18} />
            </button>
            <ContenidoSidebar
              colapsada={false}
              usuario={usuario}
              onNavigate={() => setMobileAbierto(false)}
            />
          </aside>
        </div>
      )}

      {/* Contenido de la página — el padding reacciona al colapso */}
      <main
        className={`min-h-screen transition-[padding] duration-200 ${
          colapsada ? "lg:pl-[76px]" : "lg:pl-72"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
