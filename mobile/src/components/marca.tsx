import Svg, { Path, Rect } from 'react-native-svg';

import { raw, useTema } from '@/theme';

/**
 * El isotipo "Umbral": el disco (la verdad revelada) y el velo levantado.
 *
 * Va dibujado y no como PNG porque es la misma geometría que
 * `apps/public/logoAletheia-mark.svg` — así escala a cualquier tamaño, cambia
 * de color con el tema y no suma un asset más que mantener sincronizado.
 */
export function Marca({ size = 40 }: { size?: number }) {
  const { esquema } = useTema();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="AletheIA">
      <Path d="M12.51 22 A24 24 0 1 0 51.49 22 Z" fill={raw.aurora500} />
      <Rect
        x={8}
        y={6}
        width={48}
        height={8}
        rx={4}
        // En claro el velo color Luz desaparecería contra el papel.
        fill={esquema === 'dark' ? raw.luz : raw.aurora700}
      />
    </Svg>
  );
}
