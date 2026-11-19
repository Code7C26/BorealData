'use client'

import { useEffect } from 'react'
import { registrarServiceWorker } from '@/lib/instalar-app'

/**
 * Registra el service worker en todas las páginas. Importar lib/instalar-app desde acá
 * (que está en el root layout) también deja escuchando `beforeinstallprompt` desde la
 * primera carga, así /instalar tiene el botón aunque se llegue navegando desde otra página.
 */
export function RegistrarSW() {
  useEffect(() => {
    registrarServiceWorker()
  }, [])
  return null
}
