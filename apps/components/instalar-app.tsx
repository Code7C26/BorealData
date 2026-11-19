'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  CircleCheck,
  Compass,
  Download,
  EllipsisVertical,
  ExternalLink,
  Monitor,
  Share,
  Smartphone,
  SquarePlus,
  type LucideIcon,
} from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { pedirInstalacion, storeInstalacion } from '@/lib/instalar-app'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'

type Paso = { icono: LucideIcon; texto: string }

const TEXTOS = traducciones({
  es: {
    instalar: 'Instalar app',
    instalando: 'Abriendo…',
    promptBajada: 'Se instala en segundos, sin pasar por ninguna tienda. Queda en tu pantalla de inicio como cualquier app.',
    instaladaTitulo: 'Ya la tenés instalada',
    instaladaBajada: 'Estás usando AletheIA como app. Buscala en tu pantalla de inicio cuando la necesites.',
    irAlInicio: 'Ir al inicio',
    iosTitulo: 'En iPhone se agrega desde Safari',
    iosBajada: 'Apple no deja instalar con un botón, pero son dos toques:',
    inAppTitulo: 'Abrí este link en tu navegador',
    inAppBajada:
      'Desde el navegador de Instagram, Facebook o TikTok no se pueden instalar apps. Tocá el menú (⋯) y elegí «Abrir en el navegador» o «Abrir en Safari/Chrome».',
    manualTitulo: 'Instalala desde el menú del navegador',
    manualBajada: 'Tu navegador no muestra el botón automático, pero la opción está en el menú:',
    otrosTitulo: 'En otros dispositivos',
    pasosIos: [
      { icono: Share, texto: 'Tocá el botón Compartir, abajo en el centro (o arriba a la derecha en iPad).' },
      { icono: SquarePlus, texto: 'Bajá y elegí «Agregar a pantalla de inicio». Después, «Agregar».' },
    ] as Paso[],
    pasosAndroid: [
      { icono: Compass, texto: 'Abrí aletheiainc.online en Chrome.' },
      { icono: EllipsisVertical, texto: 'Tocá el menú (⋮) arriba a la derecha y elegí «Instalar app» o «Agregar a pantalla principal».' },
    ] as Paso[],
    pasosEscritorio: [
      { icono: Compass, texto: 'Abrí la web en Chrome o Edge.' },
      { icono: Download, texto: 'Hacé clic en el ícono de instalar, a la derecha de la barra de direcciones.' },
    ] as Paso[],
    iphone: 'iPhone y iPad',
    android: 'Android',
    escritorio: 'Computadora',
  },
  en: {
    instalar: 'Install app',
    instalando: 'Opening…',
    promptBajada: 'It installs in seconds, no app store involved. It sits on your home screen like any other app.',
    instaladaTitulo: 'You already have it installed',
    instaladaBajada: "You're using AletheIA as an app. Find it on your home screen whenever you need it.",
    irAlInicio: 'Go home',
    iosTitulo: 'On iPhone you add it from Safari',
    iosBajada: "Apple doesn't allow a one-tap install button, but it's two taps:",
    inAppTitulo: 'Open this link in your browser',
    inAppBajada:
      "Apps can't be installed from inside Instagram, Facebook or TikTok. Tap the menu (⋯) and choose “Open in browser” or “Open in Safari/Chrome”.",
    manualTitulo: "Install it from your browser's menu",
    manualBajada: "Your browser doesn't show the automatic button, but the option is in the menu:",
    otrosTitulo: 'On other devices',
    pasosIos: [
      { icono: Share, texto: 'Tap the Share button, at the bottom center (top right on iPad).' },
      { icono: SquarePlus, texto: 'Scroll down and choose “Add to Home Screen”. Then “Add”.' },
    ] as Paso[],
    pasosAndroid: [
      { icono: Compass, texto: 'Open aletheiainc.online in Chrome.' },
      { icono: EllipsisVertical, texto: 'Tap the menu (⋮) at the top right and choose “Install app” or “Add to Home screen”.' },
    ] as Paso[],
    pasosEscritorio: [
      { icono: Compass, texto: 'Open the site in Chrome or Edge.' },
      { icono: Download, texto: 'Click the install icon on the right side of the address bar.' },
    ] as Paso[],
    iphone: 'iPhone & iPad',
    android: 'Android',
    escritorio: 'Computer',
  },
})

function Pasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {pasos.map(({ icono: Icono, texto }, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-pill border border-border text-accent-text">
            <Icono aria-hidden="true" size={16} />
          </span>
          <p className="pt-1.5 text-body-sm text-muted">
            <span className="mr-1.5 font-mono text-micro text-subtle">{i + 1}.</span>
            {texto}
          </p>
        </li>
      ))}
    </ol>
  )
}

/**
 * El bloque de /instalar: arriba lo que sirve en ESTE dispositivo (el botón nativo en
 * Android y escritorio, los pasos en iPhone), abajo cómo hacerlo en los demás, para
 * quien abre el link en la compu y quiere la app en el celular.
 */
export function InstalarApp() {
  const t = useTextos(TEXTOS)
  const estado = useSyncExternalStore(
    storeInstalacion.suscribir,
    storeInstalacion.leer,
    storeInstalacion.leerServidor,
  )
  const [abriendo, setAbriendo] = useState(false)

  async function instalar() {
    setAbriendo(true)
    try {
      await pedirInstalacion()
    } finally {
      setAbriendo(false)
    }
  }

  const principal = (() => {
    switch (estado) {
      case 'cargando':
        // Mismo alto aproximado que la card real, para que no salte al hidratar.
        return <div className="card-shell min-h-48" aria-hidden="true" />
      case 'instalada':
        return (
          <section className="card-shell border-t-accent">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-bruma">
              <CircleCheck aria-hidden="true" size={22} />
            </span>
            <h2 className="font-display text-h3 font-semibold text-display">{t.instaladaTitulo}</h2>
            <p className="text-body-sm text-muted">{t.instaladaBajada}</p>
            <Link href="/" className="btn-secondary self-start">
              {t.irAlInicio}
            </Link>
          </section>
        )
      case 'prompt':
        return (
          <section className="card-shell border-t-accent">
            <span className="flex size-14 items-center justify-center rounded-xl border border-border bg-surface-sunk">
              <LogoMark className="size-8" />
            </span>
            <p className="text-body-sm text-muted">{t.promptBajada}</p>
            <button type="button" onClick={instalar} disabled={abriendo} className="btn-primary self-start">
              <Download aria-hidden="true" size={16} />
              {abriendo ? t.instalando : t.instalar}
            </button>
          </section>
        )
      case 'ios':
        return (
          <section className="card-shell border-t-accent">
            <h2 className="font-display text-h3 font-semibold text-display">{t.iosTitulo}</h2>
            <p className="text-body-sm text-muted">{t.iosBajada}</p>
            <Pasos pasos={t.pasosIos} />
          </section>
        )
      case 'in-app':
        return (
          <section className="card-shell border-t-accent">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-bruma">
              <ExternalLink aria-hidden="true" size={22} />
            </span>
            <h2 className="font-display text-h3 font-semibold text-display">{t.inAppTitulo}</h2>
            <p className="text-body-sm text-muted">{t.inAppBajada}</p>
          </section>
        )
      case 'manual':
        return (
          <section className="card-shell border-t-accent">
            <h2 className="font-display text-h3 font-semibold text-display">{t.manualTitulo}</h2>
            <p className="text-body-sm text-muted">{t.manualBajada}</p>
            <Pasos pasos={t.pasosAndroid.slice(1)} />
          </section>
        )
    }
  })()

  const otros: { titulo: string; icono: LucideIcon; pasos: Paso[]; oculto: boolean }[] = [
    { titulo: t.iphone, icono: Smartphone, pasos: t.pasosIos, oculto: estado === 'ios' },
    { titulo: t.android, icono: Smartphone, pasos: t.pasosAndroid, oculto: false },
    { titulo: t.escritorio, icono: Monitor, pasos: t.pasosEscritorio, oculto: false },
  ]

  return (
    <div className="flex flex-col gap-8">
      {principal}

      {estado !== 'cargando' && estado !== 'instalada' && (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-micro uppercase text-subtle">{t.otrosTitulo}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {otros
              .filter((o) => !o.oculto)
              .map(({ titulo, icono: Icono, pasos }) => (
                <div key={titulo} className="panel flex flex-col gap-4">
                  <h3 className="flex items-center gap-2 font-display text-body font-semibold text-display">
                    <Icono aria-hidden="true" size={16} className="text-accent-text" />
                    {titulo}
                  </h3>
                  <Pasos pasos={pasos} />
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
