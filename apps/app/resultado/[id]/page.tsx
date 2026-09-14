'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, SearchX } from 'lucide-react'
import { Aurora } from '@/components/aurora'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { ResultCard } from '@/components/result/result-card'
import { apiFetch, type HistoryItem } from '@/lib/api'
import { historyItemToAnalyzeResponse } from '@/lib/resultado-storage'

/**
 * Página pública detrás del botón "Compartir verificación" — sin login y sin
 * sidebar. Cualquiera con el link (un uuid, no adivinable) puede ver ese
 * análisis puntual; el endpoint que lo sirve tampoco pide auth
 * (backend/src/routes/analyses.ts).
 *
 * Es la superficie por la que AletheIA sale de la app: alguien recibe una nota
 * por WhatsApp, se la mandan verificada, y lo primero que ve es la card entera
 * con las fuentes. Por eso muestra el análisis completo y no un preview.
 */
export default function ResultadoCompartidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [estado, setEstado] = useState<'cargando' | 'no-encontrado' | 'listo'>('cargando')
  const [item, setItem] = useState<HistoryItem | null>(null)

  useEffect(() => {
    apiFetch<HistoryItem>(`/analyses/${id}`)
      .then((data) => {
        setItem(data)
        setEstado('listo')
      })
      .catch(() => setEstado('no-encontrado'))
  }, [id])

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <Aurora intensity="soft" />

      <div className="mx-auto flex w-full max-w-card flex-col gap-8 px-gutter py-8 md:px-6 md:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="AletheIA — inicio">
            <Logo showParent />
          </Link>
          <ThemeToggle />
        </div>

        {estado === 'cargando' && (
          <section aria-busy="true" className="card-shell border-t-border">
            <span className="h-3 w-24 animate-pulse-soft rounded-sm bg-border" />
            <span className="h-6 w-4/5 animate-pulse-soft rounded-sm bg-border" />
            <span className="h-3 w-3/5 animate-pulse-soft rounded-sm bg-border" />
          </section>
        )}

        {estado === 'no-encontrado' && (
          <section role="alert" className="card-shell border-t-verdict-dudoso">
            <p className="chip self-start text-verdict-dudoso">
              <SearchX aria-hidden="true" size={14} /> No encontrado
            </p>
            <h1 className="font-display text-h3 font-semibold text-display">
              No encontramos esta verificación
            </h1>
            <p className="text-body-sm text-muted">
              El link puede haber quedado cortado al copiarlo, o el análisis ya no está
              disponible. Podés verificar la nota vos mismo en unos segundos.
            </p>
            <Link href="/" className="btn-primary self-start">
              <Search aria-hidden="true" size={16} />
              Verificar una nota
            </Link>
          </section>
        )}

        {estado === 'listo' && item && (
          <>
            <ResultCard
              analysis={historyItemToAnalyzeResponse(item)}
              fecha={item.createdAt}
            />
            <div className="flex flex-col gap-3 md:flex-row">
              <Link href="/" className="btn-primary w-full md:w-auto">
                <Search aria-hidden="true" size={16} />
                Verificar una nota tuya
              </Link>
            </div>
            <p className="font-mono text-micro uppercase text-disabled">
              Verificación hecha con AletheIA — Boreal Data
            </p>
          </>
        )}
      </div>
    </main>
  )
}
