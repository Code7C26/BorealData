import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, ExternalLink, Share2, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, View } from 'react-native';

import { Aviso, Boton, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { ChipVeredicto, FilaFuente, MedidorConfianza } from '@/components/veredicto';
import { analisis, ID_LOCAL } from '@/lib/analisis-store';
import { borrarAnalisis, getAnalisis, type AnalyzeResponse } from '@/lib/api';
import { WEB_ORIGIN } from '@/lib/config';
import { normalize } from '@/lib/verdict';
import { radio, space, useTema } from '@/theme';

/**
 * La pantalla de resultado.
 *
 * El análisis puede llegar de dos lados: recién hecho (queda en el store, se
 * pinta al instante) o abierto desde el historial (se trae por id). El id
 * `ultimo` es el caso sin fila pública — un análisis de captura, que solo ve su
 * dueño —, así que ahí no se ofrece compartir: el link daría 404 del otro lado.
 */
export default function Resultado() {
  const { c } = useTema();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [resultado, setResultado] = useState<AnalyzeResponse | null>(() => analisis.verResultado(id));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(!analisis.verResultado(id));

  useEffect(() => {
    if (resultado || id === ID_LOCAL) {
      if (!resultado) setError('Este análisis ya no está disponible.');
      setCargando(false);
      return;
    }

    let vivo = true;
    void (async () => {
      try {
        const traido = await getAnalisis(id);
        if (vivo) setResultado(traido);
      } catch (err) {
        if (vivo) setError(err instanceof Error ? err.message : 'No se pudo traer el análisis.');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id, resultado]);

  if (cargando) {
    return (
      <Pantalla scroll={false} contentStyle={styles.centro}>
        <ActivityIndicator color={c.accentText} size="large" />
      </Pantalla>
    );
  }

  if (!resultado) {
    return (
      <Pantalla>
        <Aviso>{error ?? 'No encontramos ese análisis.'}</Aviso>
        <Boton titulo="Volver" icono={ArrowLeft} variante="secundario" onPress={() => router.back()} />
      </Pantalla>
    );
  }

  // Última defensa contra una combinación veredicto × confianza fuera de tabla
  // (una fila vieja, por ejemplo): se degrada a "sin datos" en vez de mostrar
  // una contradicción.
  const { verdict, confidence } = normalize(resultado.verdict, resultado.confidence);
  const colorVeredicto = c[
    verdict === 'sin-datos' ? 'sindatos' : (verdict as 'verificado' | 'dudoso' | 'falso')
  ];
  const compartible = resultado.shareable !== false && !!resultado.id && id !== ID_LOCAL;

  async function compartir() {
    if (!compartible || !resultado?.id) return;
    await Share.share({
      message: `Verifiqué esto con AletheIA: ${WEB_ORIGIN}/resultado/${resultado.id}`,
    });
  }

  function borrar() {
    Alert.alert('Borrar este análisis', 'No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            if (resultado?.id) await borrarAnalisis(resultado.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/historial');
          } catch (err) {
            Alert.alert('No se pudo borrar', err instanceof Error ? err.message : 'Probá de nuevo.');
          }
        },
      },
    ]);
  }

  return (
    <Pantalla>
      <Boton titulo="Volver" icono={ArrowLeft} variante="fantasma" onPress={() => router.back()} style={styles.volver} />

      {/* El veredicto: chip + titular en lenguaje natural. El titular NUNCA
          repite la etiqueta — dice qué pasa, el chip dice cómo se clasifica. */}
      <Tarjeta acento={colorVeredicto} style={{ gap: space[4] }}>
        <ChipVeredicto verdict={verdict} />
        <Texto variante="title" rol="display">
          {resultado.headline}
        </Texto>
        {resultado.lead ? (
          <Texto variante="body" rol="muted">
            {resultado.lead}
          </Texto>
        ) : null}
        <MedidorConfianza confidence={confidence} color={colorVeredicto} />
      </Tarjeta>

      <View style={styles.acciones}>
        {compartible ? (
          <Boton titulo="Compartir" icono={Share2} variante="secundario" onPress={compartir} style={{ flex: 1 }} />
        ) : null}
        {resultado.url ? (
          <Boton
            titulo="Ver la nota"
            icono={ExternalLink}
            variante="secundario"
            style={{ flex: 1 }}
            onPress={() => {
              void WebBrowser.openBrowserAsync(resultado.url, {
                toolbarColor: c.bg,
                controlsColor: c.accentText,
              });
            }}
          />
        ) : null}
      </View>

      {resultado.reasoning?.length ? (
        <Tarjeta style={{ gap: space[4] }}>
          <Texto variante="overline" rol="subtle">
            RAZONAMIENTO
          </Texto>
          {resultado.reasoning.map((paso, i) => (
            <View key={i} style={styles.paso}>
              <View style={[styles.numero, { borderColor: c.border, backgroundColor: c.surfaceSunk }]}>
                <Texto variante="caption" rol="accent">
                  {i + 1}
                </Texto>
              </View>
              <Texto variante="body" style={{ flex: 1 }}>
                {paso}
              </Texto>
            </View>
          ))}
        </Tarjeta>
      ) : null}

      {resultado.sources?.length ? (
        <View style={{ gap: space[3] }}>
          <Texto variante="overline" rol="subtle">
            FUENTES CONSULTADAS ({resultado.sources.length})
          </Texto>
          {resultado.sources.map((fuente, i) => (
            <FilaFuente key={`${fuente.domain}-${i}`} fuente={fuente} />
          ))}
        </View>
      ) : null}

      {resultado.toneFlags?.length ? (
        <Tarjeta style={{ gap: space[3] }}>
          <Texto variante="overline" rol="subtle">
            SEÑALES DE TONO
          </Texto>
          <View style={styles.tonos}>
            {resultado.toneFlags.map((senal) => (
              <View key={senal} style={[styles.tono, { borderColor: c.border, backgroundColor: c.overlay }]}>
                <Texto variante="caption" rol="muted">
                  {senal}
                </Texto>
              </View>
            ))}
          </View>
        </Tarjeta>
      ) : null}

      {resultado.summary ? (
        <Tarjeta style={{ gap: space[2] }}>
          <Texto variante="overline" rol="subtle">
            DE QUÉ TRATA
          </Texto>
          <Texto variante="small" rol="muted">
            {resultado.summary}
          </Texto>
        </Tarjeta>
      ) : null}

      {resultado.id ? (
        <Boton titulo="Borrar este análisis" icono={Trash2} variante="peligro" onPress={borrar} />
      ) : null}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  volver: { alignSelf: 'flex-start', height: 40, paddingHorizontal: space[2] },
  acciones: { flexDirection: 'row', gap: space[3] },
  paso: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  numero: {
    width: 26,
    height: 26,
    borderRadius: radio.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tonos: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  tono: {
    borderWidth: 1,
    borderRadius: radio.pill,
    paddingVertical: 5,
    paddingHorizontal: space[3],
  },
});
