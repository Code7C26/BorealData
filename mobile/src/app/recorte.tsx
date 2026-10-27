import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Maximize2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Aviso, Boton, Pantalla, Texto } from '@/components/ui';
import { analisis } from '@/lib/analisis-store';
import { traducciones } from '@/lib/idioma';
import { useTextos } from '@/lib/use-idioma';
import { radio, space, useTema } from '@/theme';

/**
 * "Esto es lo que vamos a leer": la imagen con un marco que se ajusta antes de
 * mandarla. Gemelo de `apps/components/recorte-imagen.tsx`.
 *
 * El recorte no es cosmético. Una captura de pantalla de un feed trae seis
 * posteos: sin recortar, el modelo lee un collage y el veredicto no vale nada.
 * Es además la pantalla de consentimiento — se ve exactamente lo que se va a
 * mandar, antes de mandarlo.
 *
 * El marco vive en píxeles de la imagen MOSTRADA y se pasa a fracciones (0 a 1)
 * recién al confirmar, igual que en la web: así el recorte no depende del
 * tamaño de la pantalla.
 */

/** Lado máximo de la imagen que se manda. Mismo valor que `apps/lib/imagen.ts`. */
const MAX_LADO_PX = 1568;

/** Lado mínimo del marco, en píxeles mostrados: menos que esto y no se puede agarrar. */
const MIN_LADO = 56;

/** Tamaño del área táctil de cada esquina. 44 es el mínimo cómodo en un dedo. */
const AGARRADERA = 44;

const T = traducciones({
  es: {
    titulo: 'Esto es lo que vamos a leer',
    bajada:
      'Arrastrá el marco para dejar solo el posteo. Si quedan varios a la vista, el veredicto cambia.',
    todo: 'Usar la imagen entera',
    confirmar: 'Usar este recorte',
    volver: 'Elegir otra',
    sinImagen: 'No hay ninguna imagen para recortar.',
    falla: 'No se pudo preparar la imagen. Probá con otra.',
  },
  en: {
    titulo: 'This is what we are going to read',
    bajada:
      'Drag the frame to leave only the post. If several are still in view, the verdict changes.',
    todo: 'Use the whole image',
    confirmar: 'Use this crop',
    volver: 'Choose another',
    sinImagen: 'There is no image to crop.',
    falla: "The image couldn't be prepared. Try another one.",
  },
});

export default function Recorte() {
  const { c } = useTema();
  const router = useRouter();
  const t = useTextos(T);
  const { width: anchoVentana, height: altoVentana } = useWindowDimensions();
  const elegida = analisis.verElegida();

  const [error, setError] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);

  // La caja donde se dibuja la imagen: ancho disponible, alto proporcional, y
  // con tope para que el marco entre en pantalla junto con los botones.
  const anchoCaja = anchoVentana - space[5] * 2;
  const relacion = elegida ? elegida.height / elegida.width : 1;
  const altoCaja = Math.min(anchoCaja * relacion, altoVentana * 0.52);
  const anchoDibujo = altoCaja / relacion < anchoCaja ? altoCaja / relacion : anchoCaja;

  // El marco, en píxeles de la imagen mostrada. Arranca cubriéndola entera.
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const ancho = useSharedValue(anchoDibujo);
  const alto = useSharedValue(altoCaja);

  const estiloMarco = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: ancho.value,
    height: alto.value,
  }));

  /**
   * La imagen de adentro del marco se corre al revés que el marco, así queda
   * alineada con la de abajo y el marco funciona como una ventana sin velo
   * sobre el original. Sin esto, al mover el marco la porción visible se
   * desplaza con él y el recorte se ve mal.
   */
  const estiloVentana = useAnimatedStyle(() => ({
    left: -x.value,
    top: -y.value,
  }));

  /** Mover el marco entero: arrastrar adentro. */
  const mover = Gesture.Pan()
    .onChange((e) => {
      x.value = Math.min(Math.max(0, x.value + e.changeX), anchoDibujo - ancho.value);
      y.value = Math.min(Math.max(0, y.value + e.changeY), altoCaja - alto.value);
    })
    .minDistance(2);

  /**
   * Redimensionar desde una esquina. Cada una mueve el borde que le toca y deja
   * el opuesto fijo, que es lo que uno espera al agarrar una esquina.
   */
  function esquina(horizontal: 'izq' | 'der', vertical: 'arr' | 'aba') {
    return Gesture.Pan()
      .onChange((e) => {
        if (horizontal === 'izq') {
          const nuevoX = Math.min(Math.max(0, x.value + e.changeX), x.value + ancho.value - MIN_LADO);
          ancho.value += x.value - nuevoX;
          x.value = nuevoX;
        } else {
          ancho.value = Math.min(
            Math.max(MIN_LADO, ancho.value + e.changeX),
            anchoDibujo - x.value,
          );
        }
        if (vertical === 'arr') {
          const nuevoY = Math.min(Math.max(0, y.value + e.changeY), y.value + alto.value - MIN_LADO);
          alto.value += y.value - nuevoY;
          y.value = nuevoY;
        } else {
          alto.value = Math.min(Math.max(MIN_LADO, alto.value + e.changeY), altoCaja - y.value);
        }
      })
      .minDistance(0);
  }

  function usarTodo() {
    x.value = 0;
    y.value = 0;
    ancho.value = anchoDibujo;
    alto.value = altoCaja;
    void Haptics.selectionAsync();
  }

  /**
   * Recorta sobre el ORIGINAL (no sobre lo que se muestra), lo achica a
   * `MAX_LADO_PX` y lo pasa a JPEG en base64, que es lo que espera
   * `POST /analyze/read`.
   */
  async function confirmar() {
    if (!elegida) return;
    setPreparando(true);
    setError(null);
    try {
      // De píxeles mostrados a píxeles del original.
      const escalaX = elegida.width / anchoDibujo;
      const escalaY = elegida.height / altoCaja;
      const recorte = {
        originX: Math.round(x.value * escalaX),
        originY: Math.round(y.value * escalaY),
        width: Math.max(1, Math.round(ancho.value * escalaX)),
        height: Math.max(1, Math.round(alto.value * escalaY)),
      };

      const contexto = ImageManipulator.manipulate(elegida.uri).crop(recorte);
      const ladoMayor = Math.max(recorte.width, recorte.height);
      if (ladoMayor > MAX_LADO_PX) {
        contexto.resize(
          recorte.width >= recorte.height ? { width: MAX_LADO_PX } : { height: MAX_LADO_PX },
        );
      }
      const render = await contexto.renderAsync();
      const lista = await render.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.75,
        base64: true,
      });
      if (!lista.base64) {
        setError(t.falla);
        return;
      }

      analisis.ponerCaptura({ mimeType: 'image/jpeg', dataBase64: lista.base64, uri: lista.uri });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.replace('/revision');
    } catch (err) {
      console.error('[recorte] falló al preparar la imagen:', err);
      setError(err instanceof Error ? `${t.falla} ${err.message}` : t.falla);
    } finally {
      setPreparando(false);
    }
  }

  if (!elegida) {
    return (
      <Pantalla>
        <Aviso>{t.sinImagen}</Aviso>
        <Boton
          titulo={t.volver}
          icono={ArrowLeft}
          variante="secundario"
          onPress={() => router.back()}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Texto variante="title" rol="display">
        {t.titulo}
      </Texto>
      <Texto variante="small" rol="muted">
        {t.bajada}
      </Texto>

      <View
        style={[
          styles.caja,
          { width: anchoDibujo, height: altoCaja, borderColor: c.border, alignSelf: 'center' },
        ]}>
        <Image source={{ uri: elegida.uri }} style={StyleSheet.absoluteFill} contentFit="fill" />

        {/* Velo: lo que queda afuera del marco se ve apagado, así se entiende
            de un vistazo qué se manda y qué no. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: 0.5 }]} />

        {/* El marco va en DOS capas a propósito. La de adentro recorta la
            imagen con `overflow: hidden`; las agarraderas viven en la de
            afuera, que no recorta. Estaban las dos juntas y el `overflow`
            cortaba por la mitad cada agarradera —sobresalen del borde—, así que
            la mitad del área táctil no existía y costaba agarrarlas. */}
        <Animated.View style={[styles.marco, estiloMarco]}>
          <GestureDetector gesture={mover}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.ventana, { borderColor: c.accentSolid }]}>
              <Animated.View
                style={[
                  { position: 'absolute', width: anchoDibujo, height: altoCaja },
                  estiloVentana,
                ]}>
                <Image
                  source={{ uri: elegida.uri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="fill"
                />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          {(['izq', 'der'] as const).map((h) =>
            (['arr', 'aba'] as const).map((v) => (
              <GestureDetector key={`${h}${v}`} gesture={esquina(h, v)}>
                <View
                  hitSlop={12}
                  style={[
                    styles.agarradera,
                    h === 'izq' ? { left: -AGARRADERA / 2 } : { right: -AGARRADERA / 2 },
                    v === 'arr' ? { top: -AGARRADERA / 2 } : { bottom: -AGARRADERA / 2 },
                  ]}>
                  <View style={[styles.cubo, { backgroundColor: c.accentSolid, borderColor: c.accentInk }]} />
                </View>
              </GestureDetector>
            )),
          )}
        </Animated.View>
      </View>

      {error ? <Aviso>{error}</Aviso> : null}

      <Boton titulo={t.todo} icono={Maximize2} variante="fantasma" onPress={usarTodo} />
      <Boton titulo={t.confirmar} icono={Check} onPress={confirmar} cargando={preparando} />
      <Boton
        titulo={t.volver}
        icono={ArrowLeft}
        variante="secundario"
        onPress={() => {
          analisis.limpiarCaptura();
          router.back();
        }}
      />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  caja: {
    borderWidth: 1,
    borderRadius: radio.lg,
    overflow: 'hidden',
  },
  /** Capa de afuera: posiciona el marco y NO recorta, para que las esquinas se agarren. */
  marco: {
    position: 'absolute',
  },
  /** Capa de adentro: la ventana sobre la imagen, esta sí recorta. */
  ventana: {
    borderWidth: 2,
    overflow: 'hidden',
  },
  agarradera: {
    position: 'absolute',
    width: AGARRADERA,
    height: AGARRADERA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cubo: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
  },
});
