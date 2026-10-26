import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, ScanSearch } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Aviso, Boton, Campo, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { analisis } from '@/lib/analisis-store';
import { leerImagen, MIN_CONTENT_CHARS, type CaptureReading } from '@/lib/api';
import { radio, space, useTema } from '@/theme';

/**
 * Paso 1 del flujo de captura: lo que el modelo LEYÓ, para que la persona lo
 * corrija antes de que se emita un veredicto.
 *
 * Es el mismo contrato que el side panel de la extensión: la transcripción
 * nunca se verifica a ciegas. Corregir una palabra mal leída (un número, un
 * nombre) es lo que más sube la calidad del veredicto, y además deja claro que
 * el veredicto se emite sobre un texto que la persona aprobó.
 */
export default function Revision() {
  const { c } = useTema();
  const router = useRouter();
  const captura = analisis.verCaptura();

  const [lectura, setLectura] = useState<CaptureReading | null>(analisis.verLectura());
  const [texto, setTexto] = useState('');
  const [autor, setAutor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(!analisis.verLectura());
  const pedido = useRef(false);

  useEffect(() => {
    if (!captura || pedido.current) return;
    pedido.current = true;

    let vivo = true;
    void (async () => {
      try {
        const resultado = await leerImagen([
          { mimeType: captura.mimeType, dataBase64: captura.dataBase64 },
        ]);
        if (!vivo) return;
        analisis.ponerLectura(resultado);
        setLectura(resultado);
        setTexto(resultado.text);
        setAutor(resultado.author ?? '');
      } catch (err) {
        if (!vivo) return;
        setError(err instanceof Error ? err.message : 'No se pudo leer la captura.');
      } finally {
        if (vivo) setLeyendo(false);
      }
    })();

    return () => {
      vivo = false;
    };
  }, [captura]);

  if (!captura) {
    return (
      <Pantalla>
        <Aviso>No hay ninguna captura para revisar.</Aviso>
        <Boton titulo="Volver" icono={ArrowLeft} variante="secundario" onPress={() => router.back()} />
      </Pantalla>
    );
  }

  function verificar() {
    const limpio = texto.trim();
    if (limpio.length < MIN_CONTENT_CHARS) {
      setError(`Quedó muy poco texto (${limpio.length}). Completá lo que falte y volvé a intentar.`);
      return;
    }
    analisis.ponerPendiente({
      tipo: 'contenido',
      kind: 'capture',
      text: limpio,
      author: autor.trim() || null,
      platform: lectura?.platform ?? null,
    });
    router.replace('/analizando');
  }

  return (
    <Pantalla>
      <Texto variante="title" rol="display">
        Esto fue lo que leí
      </Texto>
      <Texto variante="small" rol="muted">
        Corregí lo que haya quedado mal antes de verificar. El veredicto se emite sobre este texto.
      </Texto>

      <Image
        source={{ uri: captura.uri }}
        style={[styles.captura, { borderColor: c.border, backgroundColor: c.surfaceSunk }]}
        contentFit="contain"
        accessibilityLabel="La captura que elegiste"
      />

      {leyendo ? (
        <Tarjeta style={styles.cargando}>
          <ActivityIndicator color={c.accentText} />
          <Texto variante="body" rol="muted">
            Transcribiendo la imagen…
          </Texto>
        </Tarjeta>
      ) : (
        <Tarjeta style={{ gap: space[4] }}>
          {lectura && !lectura.hasVerifiableClaim ? (
            <Aviso tono="info">
              No encontré una afirmación verificable acá (puede ser un meme o una opinión). Si
              igual querés verificarlo, el veredicto va a decir que no hay datos suficientes.
            </Aviso>
          ) : null}

          {lectura?.readingConfidence === 'baja' ? (
            <Aviso tono="info">
              La imagen se leyó con dificultad: revisá bien el texto antes de seguir.
            </Aviso>
          ) : null}

          <Campo
            etiqueta="TEXTO DEL POSTEO"
            value={texto}
            onChangeText={(valor) => {
              setTexto(valor);
              setError(null);
            }}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 180 }}
          />

          <Campo
            etiqueta="AUTOR (OPCIONAL)"
            placeholder="Quién lo publicó"
            value={autor}
            onChangeText={setAutor}
            autoCapitalize="none"
          />

          {lectura?.mainClaim ? (
            <View style={{ gap: space[2] }}>
              <Texto variante="caption" rol="subtle">
                AFIRMACIÓN CENTRAL DETECTADA
              </Texto>
              <Texto variante="body">{lectura.mainClaim}</Texto>
            </View>
          ) : null}

          {error ? <Aviso>{error}</Aviso> : null}

          <Boton titulo="Verificar este texto" icono={ScanSearch} onPress={verificar} />
        </Tarjeta>
      )}

      <Boton
        titulo="Elegir otra captura"
        icono={ArrowLeft}
        variante="fantasma"
        onPress={() => {
          analisis.limpiarCaptura();
          router.back();
        }}
      />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  captura: {
    width: '100%',
    height: 240,
    borderRadius: radio.lg,
    borderWidth: 1,
  },
  cargando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
});
