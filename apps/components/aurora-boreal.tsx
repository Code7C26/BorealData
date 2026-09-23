/**
 * La aurora boreal del fondo de la home: el elemento visual de la marca.
 *
 * Tres cortinas de luz violeta con sus rayos verticales y el borde inferior
 * encendido y, cada tanto, un velo verde que aparece y se apaga (el color
 * clásico de la aurora, usado como acento). Las estrellas no van acá: las pone
 * `components/cielo-estrellado.tsx`, que cubre la página entera.
 *
 * Rendimiento: cada capa es un SVG ESTÁTICO (se rasteriza una sola vez, con sus
 * blurs y máscaras) dentro de un div. Lo único que se anima es `transform` y
 * `opacity` de esos divs, que el navegador resuelve en el compositor sin volver
 * a pintar. Nada de morfear paths ni animar filtros: eso trababa el scroll.
 *
 * Va como hijo de un contenedor `relative isolate overflow-hidden`, por debajo
 * del contenido. Como el resto del ambiente, se anima siempre (ver la
 * excepción de `.aurora-boreal` al final de global.css).
 */

import { cn } from '@/lib/utils'

const ANCHO = 1600
const ALTO = 900

/** Generador determinístico: mismas estrellas y rayos en server y client. */
function azar(semilla: number) {
  let s = semilla
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

type Onda = { base: number; amp: number; largo: number; fase: number }

/** Y del dobladillo en x: dos senos superpuestos para que no se vea "de manual". */
function hem(x: number, o: Onda) {
  return (
    o.base +
    o.amp * Math.sin((x / o.largo) * Math.PI * 2 + o.fase) +
    o.amp * 0.45 * Math.sin((x / (o.largo * 0.43)) * Math.PI * 2 + o.fase * 1.7)
  )
}

const XS = Array.from({ length: 49 }, (_, i) => (ANCHO * i) / 48)

/** Cortina cerrada: dobladillo abajo y el mismo trazo corrido hacia arriba. */
function cortina(o: Onda, alto: number) {
  const abajo = XS.map((x) => [x, hem(x, o)] as const)
  const arriba = [...abajo]
    .reverse()
    .map(([x, y]) => [x, y - alto - 40 * Math.sin(x / 260 + o.fase)] as const)
  return 'M' + [...abajo, ...arriba].map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z'
}

function dobladillo(o: Onda) {
  return 'M' + XS.map((x) => `${x.toFixed(1)} ${hem(x, o).toFixed(1)}`).join('L')
}

type Tono = 'a' | 'b' | 'c' | 'verde'

type Capa = {
  onda: Onda
  alto: number
  tono: Tono
  /** Clase de animación (definidas en global.css). */
  anim: string
  dur: number
  delay: number
}

const CAPAS: Capa[] = [
  // Fondo: la más alta y tenue, violeta profundo.
  { onda: { base: 310, amp: 60, largo: 1300, fase: 0 }, alto: 300, tono: 'b', anim: 'ab-ondula', dur: 34, delay: 0 },
  // Principal: violeta aurora con el dobladillo en Luz Boreal.
  { onda: { base: 420, amp: 90, largo: 1000, fase: 0.8 }, alto: 340, tono: 'a', anim: 'ab-ondula', dur: 26, delay: -9 },
  // Frente: una lengua más corta y clara.
  { onda: { base: 255, amp: 70, largo: 720, fase: 3.2 }, alto: 190, tono: 'c', anim: 'ab-ondula', dur: 22, delay: -15 },
  // El verde: casi siempre apagado; cada tanto se enciende y se va.
  { onda: { base: 360, amp: 85, largo: 880, fase: 2.1 }, alto: 280, tono: 'verde', anim: 'ab-verde', dur: 32, delay: -6 },
]

/** Rayos: franjas de ancho y brillo irregulares. */
const RAYOS = (() => {
  const r = azar(7)
  const rayos: { x: number; w: number; o: number }[] = []
  let x = 0
  while (x < ANCHO) {
    const w = 4 + r() * 22
    rayos.push({ x, w, o: 0.25 + r() * 0.75 })
    x += w + r() * 14
  }
  return rayos
})()

function CapaCortina({ capa, i }: { capa: Capa; i: number }) {
  const t = capa.tono
  return (
    <div
      className={`ab-capa ${capa.anim}${t === 'verde' ? ' ab-capa-verde' : ''}`}
      style={{ animationDuration: `${capa.dur}s`, animationDelay: `${capa.delay}s` }}
    >
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" className="size-full">
        <defs>
          <linearGradient id={`ab-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: `var(--ab-${t}-top)`, stopOpacity: 0 }} />
            <stop offset="40%" style={{ stopColor: `var(--ab-${t}-top)`, stopOpacity: 0.45 }} />
            <stop offset="76%" style={{ stopColor: `var(--ab-${t}-mid)`, stopOpacity: 0.8 }} />
            <stop offset="92%" style={{ stopColor: `var(--ab-${t}-low)`, stopOpacity: 0.7 }} />
            <stop offset="100%" style={{ stopColor: `var(--ab-${t}-low)`, stopOpacity: 0 }} />
          </linearGradient>
          <filter id={`ab-rayo-blur-${i}`} x="-5%" y="0" width="110%" height="100%">
            <feGaussianBlur stdDeviation="6 0" />
          </filter>
          {/* Difuminado fuerte: la cortina no tiene que tener contorno, solo luz. */}
          <filter id={`ab-suave-${i}`} x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id={`ab-halo-${i}`} x="-20%" y="-150%" width="140%" height="400%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <mask id={`ab-rayos-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width={ANCHO} height={ALTO}>
            <rect width={ANCHO} height={ALTO} fill={t === 'verde' ? '#7a7a7a' : '#5a5a5a'} />
            <g filter={`url(#ab-rayo-blur-${i})`}>
              {RAYOS.map((r, j) => (
                <rect key={j} x={r.x.toFixed(1)} y="0" width={r.w.toFixed(1)} height={ALTO} fill="#fff" opacity={r.o.toFixed(2)} />
              ))}
            </g>
          </mask>
        </defs>
        <path
          d={cortina(capa.onda, capa.alto)}
          fill={`url(#ab-grad-${i})`}
          mask={`url(#ab-rayos-${i})`}
          filter={`url(#ab-suave-${i})`}
        />
        {/* El dobladillo: el borde inferior es donde la aurora quema. */}
        <path
          d={dobladillo(capa.onda)}
          fill="none"
          stroke={`var(--ab-${t}-low)`}
          strokeWidth="34"
          strokeOpacity="0.3"
          filter={`url(#ab-halo-${i})`}
        />
      </svg>
    </div>
  )
}

export function AuroraBoreal({ discreta = false }: { discreta?: boolean } = {}) {
  /* En las pantallas de trabajo va una sola cortina, la principal: el ambiente
     tiene que estar —es la marca— pero no competir con una card de resultado.
     El velo verde y las dos cortinas de apoyo quedan para la landing. */
  const capas = discreta ? [CAPAS[1]] : CAPAS

  return (
    <div className={cn('aurora-boreal', discreta && 'ab-discreta')} aria-hidden="true">
      <div className="ab-cielo" />

      {capas.map((capa, i) => (
        <CapaCortina key={i} capa={capa} i={i} />
      ))}
    </div>
  )
}
