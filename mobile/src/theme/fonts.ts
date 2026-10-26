import { Archivo_600SemiBold, Archivo_700Bold } from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans';
import { useFonts } from 'expo-font';

/**
 * Las dos familias de la V1: Archivo para titulares, IBM Plex Sans/Mono para
 * texto y datos. Los nombres de las claves son los que leen los estilos en
 * `src/theme/tokens.ts` (`font.display`, `font.sans`, …).
 *
 * Devuelve `true` cuando ya se pueden pintar textos con la tipografía final.
 * Mientras es `false`, el layout raíz mantiene el splash: con la fuente del
 * sistema los titulares miden distinto y se ve el salto.
 */
export function useFuentes(): boolean {
  const [cargadas] = useFonts({
    Archivo_600SemiBold,
    Archivo_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
  });
  return cargadas;
}
