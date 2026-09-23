'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * El cielo de la home: un campo de estrellas fijo al viewport, detrás de todo
 * el contenido, que acompaña la página entera al scrollear.
 *
 * Interacción con el cursor, dos gestos a la vez:
 *   · Linterna — las estrellas cercanas al puntero se encienden. Es una
 *     segunda capa, más brillante, revelada por una máscara radial centrada en
 *     el cursor (`--cx` / `--cy`). Ninguna estrella se toca de a una.
 *   · Paralaje — el cielo se corre unos píxeles hacia el lado contrario al
 *     cursor (`--px` / `--py`), y las dos capas se mueven distinto, así el
 *     fondo gana profundidad.
 *
 * Rendimiento: el puntero solo escribe cuatro custom properties, una vez por
 * frame (rAF). El navegador resuelve el resto con transform y máscara, sin
 * re-renderizar React ni volver a pintar las estrellas. En pantallas táctiles
 * (sin puntero fino) no se engancha nada: queda el cielo quieto titilando.
 */

const ANCHO = 1600
const ALTO = 1000

function azar(semilla: number) {
  let s = semilla
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Tres tandas: cada una titila entera, desfasada de las otras. */
const TANDAS = (() => {
  const r = azar(1337)
  const todas = Array.from({ length: 220 }, () => ({
    cx: +(r() * ANCHO).toFixed(1),
    cy: +(r() * ALTO).toFixed(1),
    r: +(0.5 + r() * 1.5).toFixed(2),
    o: +(0.25 + r() * 0.7).toFixed(2),
  }))
  return [0, 1, 2].map((k) => todas.filter((_, i) => i % 3 === k))
})()

function Estrellas({ brillo }: { brillo?: boolean }) {
  return (
    <>
      {TANDAS.map((tanda, k) => (
        <svg
          key={k}
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          preserveAspectRatio="xMidYMid slice"
          className="ce-tanda"
          style={{ animationDelay: `${-k * 2.6}s` }}
        >
          {tanda.map((e, i) => (
            <circle
              key={i}
              cx={e.cx}
              cy={e.cy}
              /* En la capa encendida la misma estrella es un poco más grande. */
              r={brillo ? +(e.r * 1.9).toFixed(2) : e.r}
              fill="var(--ce-estrella)"
              opacity={brillo ? Math.min(1, e.o + 0.3) : e.o}
            />
          ))}
        </svg>
      ))}
    </>
  )
}

export function CieloEstrellado({
  linterna = true,
  tenue = false,
}: {
  /** La capa que se enciende con el cursor. Se apaga donde el fondo no debe robar atención. */
  linterna?: boolean
  /** Menos estrellas visibles: para las pantallas de trabajo. */
  tenue?: boolean
} = {}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!linterna) return
    // Sin puntero fino (celular, tablet) no hay linterna que seguir.
    if (!window.matchMedia('(pointer: fine)').matches) return

    let x = 0
    let y = 0
    let pedido = 0

    const pintar = () => {
      pedido = 0
      el.style.setProperty('--cx', `${x}px`)
      el.style.setProperty('--cy', `${y}px`)
      // -1 a 1 desde el centro: de ahí sale el desplazamiento del paralaje.
      el.style.setProperty('--px', `${(x / window.innerWidth) * 2 - 1}`)
      el.style.setProperty('--py', `${(y / window.innerHeight) * 2 - 1}`)
    }

    const mover = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      if (!pedido) pedido = requestAnimationFrame(pintar)
    }

    el.dataset.cursor = 'on'
    window.addEventListener('pointermove', mover, { passive: true })
    return () => {
      window.removeEventListener('pointermove', mover)
      if (pedido) cancelAnimationFrame(pedido)
    }
  }, [linterna])

  return (
    <div
      ref={ref}
      className={cn('cielo-estrellado', tenue && 'ce-tenue')}
      aria-hidden="true"
    >
      <div className="ce-capa ce-base">
        <Estrellas />
      </div>
      {linterna && (
        <div className="ce-capa ce-brillo">
          <Estrellas brillo />
        </div>
      )}
    </div>
  )
}
