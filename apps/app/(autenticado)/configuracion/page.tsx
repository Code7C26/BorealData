"use client";

import { useState } from "react";
import { Globe, Moon, Bell, ShieldCheck } from "lucide-react";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";

function ToggleSwitch({
  checked,
  onChange,
  label,
  descripcion,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  label: string;
  descripcion?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ice">{label}</p>
        {descripcion && (
          <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#1A6DB5]" : "bg-[#1A3A5C]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function ConfiguracionPage() {
  // Mock — sin persistencia real todavía, solo estado local de UI.
  const [emailAnalisis, setEmailAnalisis] = useState(true);
  const [novedades, setNovedades] = useState(false);
  const [guardarHistorial, setGuardarHistorial] = useState(true);
  const [compartirAnonimo, setCompartirAnonimo] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-serif text-2xl font-bold text-ice sm:text-3xl">
        Configuración
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preferencias de tu cuenta en AletheIA.
      </p>

      {/* Preferencias de cuenta */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-lg font-bold text-ice">
          Preferencias de cuenta
        </h2>
        <div className="mt-4 divide-y divide-border/60">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-ice">Idioma</p>
            </div>
            <span className="text-sm text-muted-foreground">
              Español (Argentina)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-ice">Tema</p>
            </div>
            <span className="text-sm text-muted-foreground">Oscuro</span>
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-8">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-light" aria-hidden="true" />
          <h2 className="font-serif text-lg font-bold text-ice">
            Notificaciones
          </h2>
        </div>
        <div className="mt-2 divide-y divide-border/60">
          <ToggleSwitch
            checked={emailAnalisis}
            onChange={setEmailAnalisis}
            label="Avisarme cuando termine un análisis"
            descripcion="Recibí un email cuando AletheIA termine de procesar tu noticia."
          />
          <ToggleSwitch
            checked={novedades}
            onChange={setNovedades}
            label="Novedades del producto"
            descripcion="Enterate de nuevas funciones de AletheIA."
          />
        </div>
      </div>

      {/* Privacidad */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-light" aria-hidden="true" />
          <h2 className="font-serif text-lg font-bold text-ice">Privacidad</h2>
        </div>
        <div className="mt-2 divide-y divide-border/60">
          <ToggleSwitch
            checked={guardarHistorial}
            onChange={setGuardarHistorial}
            label="Guardar mi historial de análisis"
            descripcion="Si lo desactivás, tus próximos análisis no se guardan en tu cuenta."
          />
          <ToggleSwitch
            checked={compartirAnonimo}
            onChange={setCompartirAnonimo}
            label="Compartir análisis de forma anónima"
            descripcion="Ayudanos a mejorar el modelo de IA con datos anonimizados."
          />
        </div>
      </div>

      {/* Cerrar sesión */}
      <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-sm font-medium text-ice">Cerrar sesión</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Vas a tener que volver a iniciar sesión para acceder a tu cuenta.
          </p>
        </div>
        <CerrarSesionBoton />
      </div>
    </div>
  );
}
