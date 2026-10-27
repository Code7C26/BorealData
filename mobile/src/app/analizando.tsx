import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AuroraCortinas } from '@/components/aurora-cortinas';
import { Marca } from '@/components/marca';
import { Aviso, Boton, Pantalla, Texto } from '@/components/ui';
import { analisis, ID_LOCAL, type Pendiente } from '@/lib/analisis-store';
import { analizarContenido, analizarUrl, type AnalyzeResponse } from '@/lib/api';
import { traducciones } from '@/lib/idioma';
import { useIdioma, useTextos } from '@/lib/use-idioma';
import { space, useTema } from '@/theme';

/**
 * Los pasos que se van mostrando mientras se espera.
 *
 * No son barras de progreso falsas: son los pasos que el backend hace de
 * verdad, en el orden en que los hace (scrapear, leer, cruzar con grounding,
 * escribir el veredicto). Un análisis tarda entre 10 y 40 segundos y una
 * pantalla muda ahí se siente rota.
 */
const T = traducciones({
  es: {
    pasos: [
      'Buscando el contenido…',
      'Leyendo la nota entera…',
      'Cruzando con fuentes independientes…',
      'Escribiendo el razonamiento…',
    ],
    titulo: 'Verificando',
    paciencia:
      'Puede tardar hasta medio minuto: se consultan fuentes reales, no una base de datos de respuestas hechas.',
    falla: 'No se pudo analizar',
    sinNada: 'No había nada para analizar.',
    error: 'No se pudo completar el análisis.',
    volver: 'Volver',
  },
  en: {
    pasos: [
      'Looking for the content…',
      'Reading the whole story…',
      'Cross-checking independent sources…',
      'Writing the reasoning…',
    ],
    titulo: 'Checking',
    paciencia:
      'It can take up to half a minute: real sources are consulted, not a database of canned answers.',
    falla: "Couldn't check this",
    sinNada: 'There was nothing to check.',
    error: "The analysis couldn't be completed.",
    volver: 'Back',
  },
});

const CADA_PASO_MS = 6000;

export default function Analizando() {
  const { c } = useTema();
  const router = useRouter();
  const { idioma } = useIdioma();
  const t = useTextos(T);
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // El pendiente se toma UNA vez: en StrictMode/Fast Refresh el efecto puede
  // correr dos veces, y la segunda ya no habría nada que analizar.
  const pendiente = useRef<Pendiente | null>(null);
  if (pendiente.current === null) pendiente.current = analisis.tomarPendiente();

  const pulso = useSharedValue(0);
  useEffect(() => {
    // Mismo criterio que el fondo: el pulso tiene que latir aunque el sistema
    // pida reducir movimiento, porque es la única señal de que algo pasa.
    pulso.value = withRepeat(
      withTiming(1, {
        duration: 1600,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      true,
    );
  }, [pulso]);

  const estiloPulso = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + pulso.value * 0.2 }],
    opacity: 0.6 + pulso.value * 0.4,
  }));

  useEffect(() => {
    const reloj = setInterval(() => {
      setPaso((actual) => Math.min(actual + 1, T.es.pasos.length - 1));
    }, CADA_PASO_MS);
    return () => clearInterval(reloj);
  }, []);

  useEffect(() => {
    const trabajo = pendiente.current;
    if (!trabajo) {
      setError(t.sinNada);
      return;
    }

    let vivo = true;

    void (async () => {
      try {
        // El idioma activo viaja al backend: Gemini escribe el titular y el
        // razonamiento directamente en ese idioma, no se traducen después.
        const resultado: AnalyzeResponse =
          trabajo.tipo === 'url'
            ? await analizarUrl(trabajo.url, idioma)
            : await analizarContenido({
                kind: trabajo.kind,
                text: trabajo.text,
                platform: trabajo.platform,
                author: trabajo.author,
                idioma,
              });
        if (!vivo) return;

        // Un análisis de captura puede tener id y NO ser público: en ese caso
        // igual se muestra, pero por la ruta local, que no promete un link.
        const id = resultado.shareable === false ? ID_LOCAL : (resultado.id ?? ID_LOCAL);
        analisis.ponerResultado(id, resultado);
        analisis.limpiarCaptura();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: '/resultado/[id]', params: { id } });
      } catch (err) {
        if (!vivo) return;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err instanceof Error ? err.message : t.error);
      }
    })();

    return () => {
      vivo = false;
    };
    // `t` e `idioma` se leen al montar: cambiar de idioma a mitad de un análisis
    // no tiene que relanzarlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <Pantalla scroll={false} contentStyle={styles.centro}>
      {/* La aurora va anclada abajo y por detrás del contenido: nace del
          horizonte, como la de verdad. Antes estaba en el medio, atrás del
          texto, y el texto encima no se leía. */}
      {error ? null : <AuroraCortinas alto={380} intensidad={0.5} />}

      {error ? (
        <View style={styles.bloque}>
          <Texto variante="title" rol="display" style={{ textAlign: 'center' }}>
            {t.falla}
          </Texto>
          <Aviso>{error}</Aviso>
          <Boton
            titulo={t.volver}
            icono={ArrowLeft}
            variante="secundario"
            onPress={() => router.back()}
          />
        </View>
      ) : (
        <View style={styles.bloque}>
          <Animated.View style={estiloPulso}>
            <Marca size={76} />
          </Animated.View>
          <Texto variante="title" rol="display" style={{ textAlign: 'center' }}>
            {t.titulo}
          </Texto>
          <Texto variante="body" rol="muted" style={{ textAlign: 'center' }}>
            {t.pasos[paso]}
          </Texto>

          <View style={styles.pasos}>
            {t.pasos.map((_, i) => (
              <View
                key={i}
                style={[styles.punto, { backgroundColor: i <= paso ? c.accentText : c.border }]}
              />
            ))}
          </View>

          <Texto variante="small" rol="subtle" style={{ textAlign: 'center' }}>
            {t.paciencia}
          </Texto>
        </View>
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    justifyContent: 'center',
  },
  bloque: {
    alignItems: 'center',
    gap: space[4],
  },
  pasos: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  punto: {
    width: 28,
    height: 5,
    borderRadius: 999,
  },
});
