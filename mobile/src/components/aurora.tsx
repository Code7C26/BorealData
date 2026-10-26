import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTema } from '@/theme';
import { cortinas } from '@/theme/tokens';

/**
 * El fondo de aurora — la firma visual de la V1.
 *
 * Tres cortinas que se desplazan y respiran a distinta velocidad sobre Noche.
 * No es un gradiente quieto: la decisión de diseño de Renzo es que el fondo se
 * mueva SIEMPRE, incluso con "reducir movimiento" activado en el sistema (está
 * documentada igual en `apps/app/global.css`, no es un descuido de
 * accesibilidad). De ahí el `ReduceMotion.Never` de abajo: sin eso, Reanimated
 * congela la animación solo en los teléfonos que tienen la opción activada.
 *
 * Cada cortina es un gradiente RADIAL de SVG y no un círculo con gradiente
 * lineal: el lineal deja el borde del círculo a la vista (se ven discos
 * recortados), el radial se desvanece hasta desaparecer.
 *
 * El movimiento corre en el hilo de UI (Reanimated anima el contenedor, no el
 * SVG), así que sigue fluido mientras JS está ocupado esperando el análisis —
 * que es justo la pantalla donde más se mira el fondo.
 */

interface CortinaProps {
  color: string;
  opacidad: number;
  /** Segundos del ciclo completo de ida y vuelta. */
  duracion: number;
  tamano: number;
  x: number;
  y: number;
  id: string;
}

function Cortina({ color, opacidad, duracion, tamano, x, y, id }: CortinaProps) {
  const avance = useSharedValue(0);

  useEffect(() => {
    avance.value = withRepeat(
      withTiming(1, {
        duration: duracion * 1000,
        easing: Easing.inOut(Easing.sin),
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      true,
    );
  }, [avance, duracion]);

  const estilo = useAnimatedStyle(() => {
    const t = avance.value;
    return {
      transform: [
        { translateX: (t - 0.5) * tamano * 0.28 },
        { translateY: (0.5 - t) * tamano * 0.2 },
        { scale: 0.85 + t * 0.3 },
      ],
      opacity: 0.6 + t * 0.4,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x, top: y, width: tamano, height: tamano }, estilo]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacidad} />
            <Stop offset="0.55" stopColor={color} stopOpacity={opacidad * 0.45} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function Aurora() {
  const { c, esquema } = useTema();
  const { width, height } = useWindowDimensions();
  const lado = Math.max(width, height);
  const paleta = cortinas[esquema];

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]} pointerEvents="none">
      <Cortina
        id="aurora-a"
        color={paleta[0].color}
        opacidad={paleta[0].opacidad}
        duracion={14}
        tamano={lado * 1.2}
        x={-lado * 0.4}
        y={-lado * 0.45}
      />
      <Cortina
        id="aurora-b"
        color={paleta[1].color}
        opacidad={paleta[1].opacidad}
        duracion={19}
        tamano={lado}
        x={width - lado * 0.55}
        y={height * 0.05}
      />
      <Cortina
        id="aurora-c"
        color={paleta[2].color}
        opacidad={paleta[2].opacidad}
        duracion={25}
        tamano={lado * 0.9}
        x={-lado * 0.3}
        y={height * 0.55}
      />
    </View>
  );
}
