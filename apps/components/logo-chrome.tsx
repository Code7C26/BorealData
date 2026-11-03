import { cn } from '@/lib/utils'

/**
 * El logo de Chrome para los botones de "Agregar a Chrome".
 *
 * lucide sacó los íconos de marca en la 1.x, así que va dibujado: un
 * conic-gradient con los tres sectores y el centro azul con su aro blanco.
 * Los colores son los de la marca y no tokens del sistema a propósito —
 * es un logo ajeno, no cambia con el tema.
 */
export function LogoChrome({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-block size-5 shrink-0 rounded-pill', className)}
      style={{
        background: 'conic-gradient(from -60deg, #ea4335 0 120deg, #fbbc04 120deg 240deg, #34a853 240deg 360deg)',
      }}
    >
      <span className="absolute inset-[27%] rounded-pill bg-white" />
      <span className="absolute inset-[33%] rounded-pill" style={{ background: '#4285f4' }} />
    </span>
  )
}
