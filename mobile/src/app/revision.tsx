import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, Pencil, ScanSearch } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Aviso, Boton, Campo, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { analisis } from '@/lib/analisis-store';
import { leerImagen, MIN_CONTENT_CHARS, type CaptureReading } from '@/lib/api';
import { traducciones } from '@/lib/idioma';
import { useIdioma, useTextos } from '@/lib/use-idioma';
import { radio, space, useTema } from '@/theme';

const T = traducciones({
  es: {
    titulo: 'Esto fue lo que leí',
    bajada:
      'Corregí lo que haya quedado mal antes de verificar. El veredicto se emite sobre este texto.',
    altCaptura: 'La captura que elegiste',
    transcribiendo: 'Transcribiendo la imagen…',
    sinAfirmacion:
      'No encontré una afirmación verificable acá (puede ser un meme o una opinión). Si igual querés verificarlo, el veredicto va a decir que no hay datos suficientes.',
    lecturaDificil: 'La imagen se leyó con dificultad: revisá bien el texto antes de seguir.',
    textoEtiqueta: 'TEXTO DEL POSTEO',
    autorEtiqueta: 'AUTOR (OPCIONAL)',
    autorPlaceholder: 'Quién lo publicó',
    afirmacion: 'AFIRMACIÓN CENTRAL DETECTADA',
    verificar: 'Verificar este texto',
    corregir: 'Ver y corregir el texto',
    leidoBien: 'Lo leí sin dificultad. Si está bien, verificá directo.',
    otra: 'Elegir otra captura',
    volver: 'Volver',
    sinCaptura: 'No hay ninguna captura para revisar.',
    noLeida: 'No se pudo leer la captura.',
    muyCorto: (n: number) =>
      `Quedó muy poco texto (${n}). Completá lo que falte y volvé a intentar.`,
  },
  en: {
    titulo: 'This is what I read',
    bajada: 'Fix anything that came out wrong before checking. The verdict is issued on this text.',
    altCaptura: 'The screenshot you chose',
    transcribiendo: 'Transcribing the image…',
    sinAfirmacion:
      "I couldn't find a checkable claim here (it may be a meme or an opinion). If you check it anyway, the verdict will say there isn't enough data.",
    lecturaDificil: 'The image was hard to read: go over the text carefully before continuing.',
    textoEtiqueta: 'TEXT OF THE POST',
    autorEtiqueta: 'AUTHOR (OPTIONAL)',
    autorPlaceholder: 'Who posted it',
    afirmacion: 'MAIN CLAIM DETECTED',
    verificar: 'Check this text',
    corregir: 'Review and edit the text',
    leidoBien: 'I read it without trouble. If it looks right, go ahead and check it.',
    otra: 'Choose another screenshot',
    volver: 'Back',
    sinCaptura: 'There is no screenshot to review.',
    noLeida: "The screenshot couldn't be read.",
    muyCorto: (n: number) => `Too little text left (${n}). Fill in what's missing and try again.`,
  },
});

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
  const { idioma } = useIdioma();
  const t = useTextos(T);
  const captura = analisis.verCaptura();

  const [lectura, setLectura] = useState<CaptureReading | null>(analisis.verLectura());
  const [texto, setTexto] = useState('');
  const [autor, setAutor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(!analisis.verLectura());
  const [abierto, setAbierto] = useState(false);
  const pedido = useRef(false);

  /**
   * Cuando el modelo dice que leyó sin dificultad Y encontró una afirmación
   * verificable, la transcripción arranca colapsada: se ve, pero no obliga a
   * leerla entera para seguir. Un toque y se verifica.
   *
   * El paso no se elimina —que el veredicto se emita sobre un texto que la
   * persona aprobó es parte del producto, y recortar la imagen no evita que la
   * IA lea mal un número o un apellido—, pero deja de estorbar cuando no hace
   * falta. Si la lectura fue dudosa o no hay afirmación clara, se abre sola.
   */
  const confiable = lectura?.readingConfidence === 'alta' && lectura.hasVerifiableClaim;
  const editando = !confiable || abierto;

  useEffect(() => {
    if (!captura || pedido.current) return;
    pedido.current = true;

    let vivo = true;
    void (async () => {
      try {
        const resultado = await leerImagen(
          [{ mimeType: captura.mimeType, dataBase64: captura.dataBase64 }],
          idioma,
        );
        if (!vivo) return;
        analisis.ponerLectura(resultado);
        setLectura(resultado);
        setTexto(resultado.text);
        setAutor(resultado.author ?? '');
      } catch (err) {
        if (!vivo) return;
        setError(err instanceof Error ? err.message : t.noLeida);
      } finally {
        if (vivo) setLeyendo(false);
      }
    })();

    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captura]);

  if (!captura) {
    return (
      <Pantalla>
        <Aviso>{t.sinCaptura}</Aviso>
        <Boton
          titulo={t.volver}
          icono={ArrowLeft}
          variante="secundario"
          onPress={() => router.back()}
        />
      </Pantalla>
    );
  }

  function verificar() {
    const limpio = texto.trim();
    if (limpio.length < MIN_CONTENT_CHARS) {
      setError(t.muyCorto(limpio.length));
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
        {t.titulo}
      </Texto>
      <Texto variante="small" rol="muted">
        {t.bajada}
      </Texto>

      <Image
        source={{ uri: captura.uri }}
        style={[styles.captura, { borderColor: c.border, backgroundColor: c.surfaceSunk }]}
        contentFit="contain"
        accessibilityLabel={t.altCaptura}
      />

      {leyendo ? (
        <Tarjeta style={styles.cargando}>
          <ActivityIndicator color={c.accentText} />
          <Texto variante="body" rol="muted">
            {t.transcribiendo}
          </Texto>
        </Tarjeta>
      ) : (
        <Tarjeta style={{ gap: space[4] }}>
          {lectura && !lectura.hasVerifiableClaim ? <Aviso tono="info">{t.sinAfirmacion}</Aviso> : null}

          {lectura?.readingConfidence === 'baja' ? (
            <Aviso tono="info">{t.lecturaDificil}</Aviso>
          ) : null}

          {editando ? (
            <>
              <Campo
                etiqueta={t.textoEtiqueta}
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
                etiqueta={t.autorEtiqueta}
                placeholder={t.autorPlaceholder}
                value={autor}
                onChangeText={setAutor}
                autoCapitalize="none"
              />
            </>
          ) : (
            <View style={{ gap: space[2] }}>
              <Texto variante="caption" rol="muted">
                {t.textoEtiqueta}
              </Texto>
              <Texto variante="small" numberOfLines={4}>
                {texto}
              </Texto>
              <Texto variante="small" rol="subtle">
                {t.leidoBien}
              </Texto>
              <Boton
                titulo={t.corregir}
                icono={Pencil}
                variante="fantasma"
                onPress={() => setAbierto(true)}
              />
            </View>
          )}

          {lectura?.mainClaim ? (
            <View style={{ gap: space[2] }}>
              <Texto variante="caption" rol="subtle">
                {t.afirmacion}
              </Texto>
              <Texto variante="body">{lectura.mainClaim}</Texto>
            </View>
          ) : null}

          {error ? <Aviso>{error}</Aviso> : null}

          <Boton titulo={t.verificar} icono={ScanSearch} onPress={verificar} />
        </Tarjeta>
      )}

      <Boton
        titulo={t.otra}
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
