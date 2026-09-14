import type { Metadata } from 'next'
import type { HistoryItem } from '@/lib/api'
import { VERDICT } from '@/lib/verdict'
import { ResultadoCompartidoView } from './resultado-compartido-view'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const METADATA_GENERICA = {
  title: 'Verificación compartida | AletheIA',
  description:
    'Alguien te compartió una verificación hecha con AletheIA — el detector de noticias falsas de Boreal Data.',
} as const

/**
 * Preview del link (WhatsApp, Twitter/X, Facebook, etc.) para un análisis
 * compartido. Se arma acá, en el servidor, ANTES de que `resultado-compartido-
 * view.tsx` haga su propio fetch para renderizar la card: los crawlers de
 * redes sociales no ejecutan JS, así que sin este `generateMetadata` el link
 * se compartía sin título ni descripción (solo el genérico de RootLayout).
 *
 * Pega contra el mismo endpoint público que la card, `GET /analyses/:id`
 * (backend/src/routes/analyses.ts, sin auth) — nunca revienta la página: un id
 * inválido o el backend caído caen a METADATA_GENERICA en vez de un error 500.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  try {
    const res = await fetch(`${API_URL}/analyses/${id}`, { cache: 'no-store' })
    if (!res.ok) return METADATA_GENERICA

    const analysis = (await res.json()) as HistoryItem
    const { label } = VERDICT[analysis.verdict]
    const titulo = `${label}: ${analysis.headline}`
    const descripcion = analysis.lead || METADATA_GENERICA.description

    return {
      title: `${titulo} | AletheIA`,
      description: descripcion,
      openGraph: {
        title: titulo,
        description: descripcion,
        siteName: 'AletheIA',
        type: 'article',
      },
      twitter: {
        card: 'summary',
        title: titulo,
        description: descripcion,
      },
    }
  } catch {
    return METADATA_GENERICA
  }
}

export default async function ResultadoCompartidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ResultadoCompartidoView id={id} />
}
