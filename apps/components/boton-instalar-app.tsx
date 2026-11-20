'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Download, Smartphone } from 'lucide-react'
import { pedirInstalacion, storeInstalacion, type EstadoInstalacion } from '@/lib/instalar-app'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: { instalar: 'Instalar app', abriendo: 'Abriendo…', comoInstalar: 'Cómo instalarla' },
  en: { instalar: 'Install app', abriendo: 'Opening…', comoInstalar: 'How to install it' },
})

/** En qué estado de instalación está este navegador (ver lib/instalar-app.ts). */
export function useEstadoInstalacion(): EstadoInstalacion {
  return useSyncExternalStore(storeInstalacion.suscribir, storeInstalacion.leer, storeInstalacion.leerServidor)
}

/**
 * El botón de "instalar la app" que usan la landing y el dashboard.
 *
 * Donde el navegador lo permite (Chrome y Edge en Android y computadora) abre el cartel
 * nativo y se instala con un toque. En el resto (iPhone, Firefox, el navegador de
 * Instagram…) lleva a /instalar, que explica los pasos de ese dispositivo.
 */
export function BotonInstalarApp({ className }: { className?: string }) {
  const t = useTextos(TEXTOS)
  const estado = useEstadoInstalacion()
  const [abriendo, setAbriendo] = useState(false)

  if (estado === 'prompt') {
    return (
      <button
        type="button"
        disabled={abriendo}
        onClick={async () => {
          setAbriendo(true)
          try {
            await pedirInstalacion()
          } finally {
            setAbriendo(false)
          }
        }}
        className={cn('btn-primary', className)}
      >
        <Download aria-hidden="true" size={16} />
        {abriendo ? t.abriendo : t.instalar}
      </button>
    )
  }

  return (
    <Link href="/instalar" className={cn('btn-primary', className)}>
      <Smartphone aria-hidden="true" size={16} />
      {t.comoInstalar}
    </Link>
  )
}
