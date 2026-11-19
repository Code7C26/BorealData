import type { Metadata } from 'next'
import { traducciones } from '@/lib/idioma'
import { leerIdioma } from '@/lib/idioma-servidor'
import { BajaView } from './baja-view'

const METADATA = traducciones({
  es: {
    title: 'Baja y arrepentimiento — AletheIA',
    description:
      'Cancelá tu suscripción a AletheIA Premium o arrepentite de la compra, en un paso y sin trámites extra.',
  },
  en: {
    title: 'Cancel or withdraw — AletheIA',
    description:
      'Cancel your AletheIA Premium subscription or withdraw from the purchase, in one step and with no extra hoops.',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return METADATA[await leerIdioma()]
}

/**
 * Botón de baja y botón de arrepentimiento (Disposición 954/2025).
 *
 * Vive en (info), que es pública, y se enlaza desde el pie de la landing: la norma pide
 * que estén a la vista desde el primer acceso y sin pedir un login extra. Con sesión, la
 * baja se hace en el momento; sin sesión, queda el pedido con su código (ver BajaView).
 */
export default function BajaPage() {
  return <BajaView />
}
