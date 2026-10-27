import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';

import { useTema } from '@/theme';
import { boreal, type TonoBoreal } from '@/theme/tokens';

/**
 * La aurora boreal de verdad: cortinas de luz, no manchas redondas.
 *
 * Es el puerto de `apps/components/aurora-boreal.tsx`, con la misma geometría
 * (el dobladillo ondulado sale de la misma fórmula) y los mismos colores. Tres
 * cortinas violetas más un velo verde que se enciende cada tanto.
 *
 * Qué cambia respecto de la web, y por qué:
 *
 * - **Sin filtros gaussianos.** Allá cada capa lleva tres `feGaussianBlur` para
 *   que no se vea el contorno. Acá cuatro capas con blur sobre un teléfono de
 *   8 GB se arrastran, así que la suavidad sale del propio gradiente (que
 *   arranca y termina transparente) y de apilar varios trazos cada vez más
 *   anchos y tenues en el dobladillo, que imita el halo sin costar nada.
 * - **La animación corre en Reanimated** en vez de CSS, pero es la misma idea:
 *   solo se mueven `transform` y `opacity` del contenedor. El SVG se dibuja una
 *   vez y no se vuelve a tocar.
 */

const ANCHO = 1600;
const ALTO = 900;

/** Generador determinístico: los mismos rayos en cada render. */
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Onda {
  base: number;
  amp: number;
  largo: number;
  fase: number;
}

/** Y del dobladillo en x: dos senos superpuestos para que no se vea "de manual". */
function hem(x: number, o: Onda) {
  return (
    o.base +
    o.amp * Math.sin((x / o.largo) * Math.PI * 2 + o.fase) +
    o.amp * 0.45 * Math.sin((x / (o.largo * 0.43)) * Math.PI * 2 + o.fase * 1.7)
  );
}

const XS = Array.from({ length: 49 }, (_, i) => (ANCHO * i) / 48);

/** Cortina cerrada: el dobladillo abajo y el mismo trazo corrido hacia arriba. */
function cortina(o: Onda, alto: number) {
  const abajo = XS.map((x) => [x, hem(x, o)] as const);
  const arriba = [...abajo]
    .reverse()
    .map(([x, y]) => [x, y - alto - 40 * Math.sin(x / 260 + o.fase)] as const);
  return (
    'M' + [...abajo, ...arriba].map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z'
  );
}

function dobladillo(o: Onda) {
  return 'M' + XS.map((x) => `${x.toFixed(1)} ${hem(x, o).toFixed(1)}`).join('L');
}

/** Rayos: franjas verticales de ancho y brillo irregulares, como la aurora real. */
const RAYOS = (() => {
  const r = azar(7);
  const rayos: { x: number; w: number; o: number }[] = [];
  let x = 0;
  while (x < ANCHO) {
    const w = 4 + r() * 22;
    rayos.push({ x, w, o: 0.25 + r() * 0.75 });
    x += w + r() * 14;
  }
  return rayos;
})();

interface Capa {
  onda: Onda;
  alto: number;
  tono: TonoBoreal;
  /** Segundos del vaivén completo. */
  dur: number;
  /** Desfasaje inicial, para que las capas no se muevan al unísono. */
  desfase: number;
}

/**
 * Las bases están más abajo que en la web (310 → 420, etc.) por una razón
 * concreta: allá la cortina vive en un hero enorme y que su borde de arriba
 * quede cortado por el viewBox no se nota. Acá la caja es de 340 px y el corte
 * plano se veía como una línea recta arriba de todo. Con estas bases, el techo
 * de la cortina más alta cae en y≈20 y el gradiente alcanza a desvanecerse
 * antes del borde.
 */
const CAPAS: Capa[] = [
  // Fondo: la más alta y tenue, violeta profundo.
  { onda: { base: 420, amp: 60, largo: 1300, fase: 0 }, alto: 300, tono: 'b', dur: 34, desfase: 0 },
  // Principal: violeta aurora con el dobladillo en Luz Boreal.
  { onda: { base: 520, amp: 90, largo: 1000, fase: 0.8 }, alto: 340, tono: 'a', dur: 26, desfase: 0.35 },
  // Frente: una lengua más corta y clara.
  { onda: { base: 400, amp: 70, largo: 720, fase: 3.2 }, alto: 190, tono: 'c', dur: 22, desfase: 0.68 },
  // El verde: casi siempre apagado; cada tanto se enciende y se va. Su ciclo es
  // el más largo de todos a propósito — con 32 segundos entraba y salía cada
  // pocos segundos y se veía como un parpadeo, no como un velo.
  { onda: { base: 470, amp: 85, largo: 880, fase: 2.1 }, alto: 280, tono: 'verde', dur: 58, desfase: 0.1 },
];

/**
 * El halo del dobladillo, de afuera hacia adentro.
 *
 * Son ocho trazos y no cuatro porque ESTO es el difuminado. Sin filtros
 * gaussianos, la única forma de que un borde se vea blando es apilar muchos
 * pasos con una caída suave de ancho y opacidad: con pocos pasos se notan los
 * escalones y el dobladillo parece dibujado con marcador. La opacidad de cada
 * uno es mínima porque se suman entre sí.
 *
 * Los anchos van en el color del cuerpo y solo los finos en el del dobladillo,
 * que en modo noche es Luz Boreal (crema) y a lo ancho se veía gris.
 */
const HALO = [
  { ancho: 160, opacidad: 0.012, color: 'mid' as const },
  { ancho: 120, opacidad: 0.015, color: 'mid' as const },
  { ancho: 88, opacidad: 0.018, color: 'mid' as const },
  { ancho: 62, opacidad: 0.022, color: 'mid' as const },
  { ancho: 42, opacidad: 0.026, color: 'low' as const },
  { ancho: 28, opacidad: 0.03, color: 'low' as const },
  { ancho: 18, opacidad: 0.034, color: 'low' as const },
  { ancho: 10, opacidad: 0.038, color: 'low' as const },
];

function Capa({ capa, indice, esquema }: { capa: Capa; indice: number; esquema: 'dark' | 'light' }) {
  const t = boreal[esquema][capa.tono];
  const esVerde = capa.tono === 'verde';
  // Arranca SIEMPRE en cero: el desfase de cada capa se aplica abajo, en la
  // fase del seno. Si entrara acá, recortaría el recorrido de la animación.
  const avance = useSharedValue(0);
  const desfase = capa.desfase;

  useEffect(() => {
    // Un reloj lineal de 0 a 1 que se reinicia, SIN `reverse`.
    //
    // Las dos versiones anteriores estaban mal, cada una a su manera. La
    // primera envolvía el valor con `% 1` y eso lo llevaba de 0,99 a 0 en un
    // frame: ahí estaba el salto. La segunda usaba `reverse`, que devuelve el
    // valor al punto donde arrancó la repetición — es decir al desfase de cada
    // capa, no a cero —, así que cada cortina terminaba oscilando en un tramo
    // recortado y casi no se movía.
    //
    // Con un reloj lineal el salto de 1 a 0 existe igual, pero no se ve: abajo
    // el valor pasa por un seno, y el seno vale lo mismo en 0 que en 1. La
    // continuidad la da la función, no la animación.
    avance.value = withRepeat(
      withTiming(1, {
        duration: capa.dur * 1000,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      false,
    );
  }, [avance, capa.dur]);

  const estilo = useAnimatedStyle(() => {
    // El desfase entra acá, en la fase del seno, y no en el valor inicial: así
    // todas las capas recorren la amplitud COMPLETA y simplemente van
    // desacompasadas entre sí.
    const fase = (avance.value + desfase) * Math.PI * 2;
    const s = (Math.sin(fase) + 1) / 2;
    return {
      transform: [
        // La cortina se corre de costado y se estira: el movimiento real de una
        // aurora es ese, no un giro.
        { translateX: (s - 0.5) * 150 },
        { translateY: (0.5 - s) * 40 },
        { scaleY: 0.82 + s * 0.42 },
      ],
      // El verde es el acento: tiene que ENTRAR y SALIR, no prenderse de golpe.
      // Elevado al cubo pasa la mayor parte del ciclo cerca de cero y sube
      // despacio, así que aparece como un velo que crece y se va.
      // El pico del verde es bajo a propósito: medido en dos capturas, con 0,85
      // se comía la paleta entera y la aurora se veía turquesa en vez de
      // violeta. Es un acento de la aurora real, no el color de la marca.
      opacity: esVerde ? s * s * s * 0.4 : 0.5 + s * 0.5,
    };
  });

  const idGrad = `ab-grad-${indice}`;
  const idMask = `ab-rayos-${indice}`;
  const idRayo = `ab-rayo-${indice}`;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, estilo]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.top} stopOpacity={0} />
            <Stop offset="0.4" stopColor={t.top} stopOpacity={0.45} />
            <Stop offset="0.76" stopColor={t.mid} stopOpacity={0.8} />
            <Stop offset="0.92" stopColor={t.low} stopOpacity={0.7} />
            <Stop offset="1" stopColor={t.low} stopOpacity={0} />
          </LinearGradient>

          {/* Cada rayo se pinta con este gradiente en vez de un blanco plano.
              La web difumina los rayos con un `feGaussianBlur` horizontal; acá
              no hay filtros, así que el degradado transparente → blanco →
              transparente hace el mismo trabajo: bordes suaves en lugar de
              franjas duras, que se leían como un código de barras.

              Se define una sola vez y se usa en los 60 rayos: al ser unidades
              relativas a la caja de cada rect, cada rayo recibe su propia
              versión del degradado. */}
          <LinearGradient id={idRayo} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFF" stopOpacity={1} />
            <Stop offset="1" stopColor="#FFF" stopOpacity={0} />
          </LinearGradient>

          {/* La máscara de rayos es lo que le da textura de aurora en vez de
              mancha: franjas verticales de brillo desparejo. */}
          <Mask id={idMask} maskUnits="userSpaceOnUse" x="0" y="0" width={ANCHO} height={ALTO}>
            {/* El gris de base es qué tanto se ve la cortina ENTRE rayo y rayo.
                Más oscuro que esto y las franjas se leen como un código de
                barras en vez de como textura. */}
            <Rect width={ANCHO} height={ALTO} fill={esVerde ? '#C0C0C0' : '#B4B4B4'} />
            {RAYOS.map((r, j) => (
              <Rect
                key={j}
                // Más anchos que el paso entre rayos, para que se pisen entre
                // sí y no queden huecos nítidos.
                x={r.x - r.w * 0.6}
                y="0"
                width={r.w * 2.2}
                height={ALTO}
                fill={`url(#${idRayo})`}
                opacity={r.o}
              />
            ))}
          </Mask>
        </Defs>

        <Path d={cortina(capa.onda, capa.alto)} fill={`url(#${idGrad})`} mask={`url(#${idMask})`} />

        {/* El dobladillo: el borde de abajo es donde la aurora quema. Sin blur,
            el halo se arma apilando trazos cada vez más anchos y tenues. */}
        {HALO.map((h) => (
          <Path
            key={h.ancho}
            d={dobladillo(capa.onda)}
            fill="none"
            stroke={h.color === 'mid' ? t.mid : t.low}
            strokeWidth={h.ancho}
            strokeOpacity={h.opacidad}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

/**
 * `alto` es la altura de la caja donde se dibuja; el SVG se estira para
 * llenarla. `intensidad` la apaga entera: es ambiente, y abajo suele haber
 * texto que tiene que poder leerse por encima.
 *
 * Por defecto va anclada ABAJO, como en la web: una aurora nace del horizonte,
 * no flota en el medio de la pantalla. Eso además deja limpia la mitad de
 * arriba, que es donde va el contenido.
 */
export function AuroraCortinas({
  alto = 300,
  intensidad = 0.6,
}: {
  alto?: number;
  intensidad?: number;
}) {
  const { esquema } = useTema();
  return (
    <View style={[styles.caja, { height: alto, opacity: intensidad }]} pointerEvents="none">
      {CAPAS.map((capa, i) => (
        <Capa key={capa.tono} capa={capa} indice={i} esquema={esquema} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    position: 'absolute',
    bottom: 0,
    // Se desborda a los costados a propósito: el path va de borde a borde del
    // viewBox, así que el corte vertical de los extremos es recto. Sacándolo
    // fuera de la pantalla, ese corte no se ve y la aurora parece seguir.
    left: -90,
    right: -90,
    overflow: 'hidden',
  },
});
