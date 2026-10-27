import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ClipboardPaste, ImageDown, Link2, ScanSearch, Type } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Marca } from '@/components/marca';
import { NumerosPlataforma } from '@/components/numeros-plataforma';
import { Aviso, Boton, Campo, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { analisis } from '@/lib/analisis-store';
import { MAX_CONTENT_CHARS, MIN_CONTENT_CHARS } from '@/lib/api';
import { useSesion } from '@/lib/auth';
import { traducciones } from '@/lib/idioma';
import { useTag, useTextos } from '@/lib/use-idioma';
import { radio, space, useTema } from '@/theme';

/** Las tres formas de entrar un contenido. La captura es la propia del teléfono. */
type Modo = 'enlace' | 'texto' | 'captura';


const T = traducciones({
  es: {
    hola: (nombre: string) => `Hola, ${nombre}`,
    titulo: '¿Qué vas a verificar?',
    modos: { enlace: 'Enlace', texto: 'Pregunta', captura: 'Captura' },
    enlaceEtiqueta: 'ENLACE DE LA NOTA',
    textoEtiqueta: '¿QUÉ QUERÉS COMPROBAR?',
    textoPlaceholder: '¿Es verdad que…? · Escuché que… · O pegá el mensaje que te llegó.',
    textoAyuda:
      'No hace falta que sea una noticia. Si te lo contaron, lo escuchaste o te llegó por un grupo, escribilo con tus palabras.',
    pegar: 'Pegar del portapapeles',
    verificar: 'Verificar',
    capturaTitulo: 'CAPTURA DE UN POSTEO',
    capturaAyuda:
      'Para lo que no tiene enlace público: una historia, un grupo de WhatsApp, un posteo privado. Primero te muestro lo que leí de la imagen para que lo corrijas, y recién después se verifica.',
    elegir: 'Elegir captura',
    privacidad:
      'Los enlaces que verificás quedan guardados en tu historial. El contenido viaja a Gemini para ser analizado.',
    urlInvalida: 'Eso no parece un enlace. Pegá la dirección completa, con https://',
    urlProtocolo: 'Solo se pueden verificar enlaces http o https.',
    textoCorto: (min: number) => `Escribí al menos ${min} caracteres para poder verificar algo.`,
    textoLargo: (max: string) => `El texto no puede superar los ${max} caracteres.`,
    sinPermiso: 'Necesito permiso a tus fotos para leer la captura. Se puede dar desde Ajustes.',
    imagenIlegible: 'No se pudo leer esa imagen. Probá con otra.',
    sinGaleria:
      'No se pudo leer esa imagen. Si está guardada en iCloud y no bajada al teléfono, abrila primero en Fotos y volvé a intentar.',
  },
  en: {
    hola: (nombre: string) => `Hi, ${nombre}`,
    titulo: 'What are you checking?',
    modos: { enlace: 'Link', texto: 'Question', captura: 'Screenshot' },
    enlaceEtiqueta: 'LINK TO THE STORY',
    textoEtiqueta: 'WHAT DO YOU WANT TO CHECK?',
    textoPlaceholder: 'Is it true that…? · I heard that… · Or paste the message you received.',
    textoAyuda:
      "It doesn't have to be a news story. If someone told you, you overheard it or it reached you in a group chat, write it in your own words.",
    pegar: 'Paste from clipboard',
    verificar: 'Check',
    capturaTitulo: 'SCREENSHOT OF A POST',
    capturaAyuda:
      "For things with no public link: a story, a WhatsApp group, a private post. First I'll show you what I read from the image so you can correct it, and only then it gets checked.",
    elegir: 'Choose a screenshot',
    privacidad:
      'The links you check are saved to your history. The content is sent to Gemini to be analysed.',
    urlInvalida: "That doesn't look like a link. Paste the full address, including https://",
    urlProtocolo: 'Only http and https links can be checked.',
    textoCorto: (min: number) => `Write at least ${min} characters so there's something to check.`,
    textoLargo: (max: string) => `The text cannot be longer than ${max} characters.`,
    sinPermiso: 'I need access to your photos to read the screenshot. You can grant it in Settings.',
    imagenIlegible: "I couldn't read that image. Try another one.",
    sinGaleria:
      "I couldn't read that image. If it lives in iCloud and isn't downloaded to the phone, open it in Photos first and try again.",
  },
});

export default function Verificar() {
  const { c } = useTema();
  const router = useRouter();
  const { profile, user } = useSesion();
  const t = useTextos(T);
  const tag = useTag();

  const [modo, setModo] = useState<Modo>('enlace');
  const [url, setUrl] = useState('');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [abriendoGaleria, setAbriendoGaleria] = useState(false);

  const nombre = (profile?.fullName ?? user?.displayName ?? '').split(' ')[0];

  const MODOS: { id: Modo; icono: typeof Link2 }[] = [
    { id: 'enlace', icono: Link2 },
    { id: 'texto', icono: Type },
    { id: 'captura', icono: ImageDown },
  ];

  function verificarEnlace() {
    const limpia = url.trim();
    let valida: URL;
    try {
      valida = new URL(limpia);
    } catch {
      setError(t.urlInvalida);
      return;
    }
    if (valida.protocol !== 'http:' && valida.protocol !== 'https:') {
      setError(t.urlProtocolo);
      return;
    }
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analisis.ponerPendiente({ tipo: 'url', url: limpia });
    router.push('/analizando');
  }

  function verificarTexto() {
    const limpio = texto.trim();
    if (limpio.length < MIN_CONTENT_CHARS) {
      setError(t.textoCorto(MIN_CONTENT_CHARS));
      return;
    }
    if (limpio.length > MAX_CONTENT_CHARS) {
      setError(t.textoLargo(MAX_CONTENT_CHARS.toLocaleString(tag)));
      return;
    }
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // `question` y no `text`: le dice al backend que la persona está preguntando,
    // no afirmando. Cambia el encuadre del análisis y cómo se escribe el titular.
    analisis.ponerPendiente({ tipo: 'contenido', kind: 'question', text: limpio });
    router.push('/analizando');
  }

  async function pegar() {
    const contenido = await Clipboard.getStringAsync();
    if (!contenido) return;
    if (modo === 'enlace') setUrl(contenido.trim());
    else setTexto(contenido);
    setError(null);
  }

  /**
   * Elige una captura de la galería y va al recorte.
   *
   * Acá NO se toca la imagen: recortar y achicar pasa en `/recorte`, sobre el
   * original. Procesarla antes perdería el detalle justo donde más hace falta,
   * que es el texto chico del posteo.
   */
  async function elegirCaptura() {
    setError(null);
    setAbriendoGaleria(true);
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        setError(t.sinPermiso);
        return;
      }

      const elegida = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        // iOS: pedirle al selector la representación MÁS COMPATIBLE en vez de
        // la original. Sin esto, una foto que vive en iCloud y no está bajada
        // al teléfono falla con "Cannot load representation of type public.png":
        // el sistema no logra producir el formato original y aborta. Pidiendo
        // la compatible, iOS la transcodifica a JPEG y la baja si hace falta.
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (elegida.canceled) return;
      const asset = elegida.assets[0];
      if (!asset) return;

      if (!asset.width || !asset.height) {
        setError(t.imagenIlegible);
        return;
      }

      analisis.ponerElegida({ uri: asset.uri, width: asset.width, height: asset.height });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/recorte');
    } catch (err) {
      // El mensaje de verdad, no un "no se pudo" genérico: cuando esto falla en
      // un teléfono real, el único que puede contar qué pasó es este texto.
      // Además queda en el log de Metro, que es donde se puede leer sin tener
      // el teléfono en la mano.
      console.error('[captura] falló elegirCaptura:', err);
      setError(err instanceof Error ? `${t.sinGaleria} ${err.message}` : t.sinGaleria);
    } finally {
      setAbriendoGaleria(false);
    }
  }

  return (
    <Pantalla>
      <View style={styles.encabezado}>
        <Marca size={44} />
        <View style={{ flex: 1 }}>
          <Texto variante="caption" rol="subtle">
            {nombre ? t.hola(nombre) : 'AletheIA'}
          </Texto>
          <Texto variante="title" rol="display">
            {t.titulo}
          </Texto>
        </View>
      </View>

      <View style={[styles.selector, { backgroundColor: c.surfaceSunk, borderColor: c.border }]}>
        {MODOS.map(({ id, icono: Icono }) => {
          const activo = modo === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              onPress={() => {
                setModo(id);
                setError(null);
              }}
              style={[
                styles.opcion,
                activo && { backgroundColor: c.surface, borderColor: c.borderStrong },
              ]}>
              <Icono size={17} color={activo ? c.accentText : c.textSubtle} />
              <Texto variante="caption" color={activo ? c.text : c.textSubtle}>
                {t.modos[id]}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      <Tarjeta style={{ gap: space[4] }}>
        {modo === 'enlace' ? (
          <>
            <Campo
              etiqueta={t.enlaceEtiqueta}
              placeholder="https://..."
              value={url}
              onChangeText={(valor) => {
                setUrl(valor);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              inputMode="url"
              returnKeyType="go"
              onSubmitEditing={verificarEnlace}
            />
            <Boton titulo={t.pegar} icono={ClipboardPaste} variante="fantasma" onPress={pegar} />
            <Boton
              titulo={t.verificar}
              icono={ScanSearch}
              onPress={verificarEnlace}
              disabled={!url.trim()}
            />
          </>
        ) : null}

        {modo === 'texto' ? (
          <>
            <Texto variante="small" rol="muted">
              {t.textoAyuda}
            </Texto>
            <Campo
              etiqueta={t.textoEtiqueta}
              placeholder={t.textoPlaceholder}
              value={texto}
              onChangeText={(valor) => {
                setTexto(valor);
                setError(null);
              }}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              style={{ minHeight: 160 }}
            />
            <View style={styles.contador}>
              <Texto variante="mono" rol="subtle">
                {texto.trim().length} / {MAX_CONTENT_CHARS.toLocaleString(tag)}
              </Texto>
            </View>
            <Boton titulo={t.pegar} icono={ClipboardPaste} variante="fantasma" onPress={pegar} />
            <Boton
              titulo={t.verificar}
              icono={ScanSearch}
              onPress={verificarTexto}
              disabled={texto.trim().length < MIN_CONTENT_CHARS}
            />
          </>
        ) : null}

        {modo === 'captura' ? (
          <>
            <Texto variante="caption" rol="muted">
              {t.capturaTitulo}
            </Texto>
            <Texto variante="small" rol="muted">
              {t.capturaAyuda}
            </Texto>
            <Boton
              titulo={t.elegir}
              icono={ImageDown}
              onPress={elegirCaptura}
              cargando={abriendoGaleria}
            />
          </>
        ) : null}

        {error ? <Aviso>{error}</Aviso> : null}
      </Tarjeta>

      <NumerosPlataforma />

      <Texto variante="small" rol="subtle" style={{ textAlign: 'center' }}>
        {t.privacidad}
      </Texto>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    marginBottom: space[1],
  },
  selector: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: radio.pill,
    borderWidth: 1,
  },
  opcion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[3],
    borderRadius: radio.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contador: {
    alignItems: 'flex-end',
    marginTop: -space[2],
  },
});
