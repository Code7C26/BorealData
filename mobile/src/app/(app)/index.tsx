import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ClipboardPaste, ImageDown, Link2, ScanSearch, Type } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Marca } from '@/components/marca';
import { Aviso, Boton, Campo, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { analisis } from '@/lib/analisis-store';
import { MAX_CONTENT_CHARS, MIN_CONTENT_CHARS } from '@/lib/api';
import { useSesion } from '@/lib/auth';
import { radio, space, useTema } from '@/theme';

/** Las tres formas de entrar un contenido. La captura es la propia del teléfono. */
type Modo = 'enlace' | 'texto' | 'captura';

const MODOS: { id: Modo; etiqueta: string; icono: typeof Link2 }[] = [
  { id: 'enlace', etiqueta: 'Enlace', icono: Link2 },
  { id: 'texto', etiqueta: 'Texto', icono: Type },
  { id: 'captura', etiqueta: 'Captura', icono: ImageDown },
];

/** Ancho máximo al que se achica una captura antes de mandarla a transcribir. */
const ANCHO_MAX = 1280;

export default function Verificar() {
  const { c } = useTema();
  const router = useRouter();
  const { profile, user } = useSesion();

  const [modo, setModo] = useState<Modo>('enlace');
  const [url, setUrl] = useState('');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [abriendoGaleria, setAbriendoGaleria] = useState(false);

  const nombre = (profile?.fullName ?? user?.displayName ?? '').split(' ')[0];

  function verificarEnlace() {
    const limpia = url.trim();
    let valida: URL;
    try {
      valida = new URL(limpia);
    } catch {
      setError('Eso no parece un enlace. Pegá la dirección completa, con https://');
      return;
    }
    if (valida.protocol !== 'http:' && valida.protocol !== 'https:') {
      setError('Solo se pueden verificar enlaces http o https.');
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
      setError(`Escribí al menos ${MIN_CONTENT_CHARS} caracteres para poder verificar algo.`);
      return;
    }
    if (limpio.length > MAX_CONTENT_CHARS) {
      setError(`El texto no puede superar los ${MAX_CONTENT_CHARS.toLocaleString('es-AR')} caracteres.`);
      return;
    }
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analisis.ponerPendiente({ tipo: 'contenido', kind: 'text', text: limpio });
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
   * Elige una captura de la galería y la deja lista para el paso 1.
   *
   * Se achica a `ANCHO_MAX` y se guarda en JPEG antes de mandarla: una captura
   * de un celular moderno pasa los 3 MB que acepta `POST /analyze/read`, y el
   * texto de un posteo se lee perfecto a 1280 px de ancho.
   */
  async function elegirCaptura() {
    setError(null);
    setAbriendoGaleria(true);
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        setError('Necesito permiso a tus fotos para leer la captura. Se puede dar desde Ajustes.');
        return;
      }

      const elegida = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (elegida.canceled || !elegida.assets[0]) return;

      const imagen = await ImageManipulator.manipulate(elegida.assets[0].uri)
        .resize({ width: ANCHO_MAX })
        .renderAsync();
      const lista = await imagen.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.75,
        base64: true,
      });
      if (!lista.base64) {
        setError('No se pudo leer esa imagen. Probá con otra.');
        return;
      }

      analisis.ponerCaptura({
        mimeType: 'image/jpeg',
        dataBase64: lista.base64,
        uri: lista.uri,
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/revision');
    } catch {
      setError('No se pudo abrir la galería.');
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
            {nombre ? `Hola, ${nombre}` : 'AletheIA'}
          </Texto>
          <Texto variante="title" rol="display">
            ¿Qué vas a verificar?
          </Texto>
        </View>
      </View>

      <View style={[styles.selector, { backgroundColor: c.surfaceSunk, borderColor: c.border }]}>
        {MODOS.map(({ id, etiqueta, icono: Icono }) => {
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
                {etiqueta}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      <Tarjeta style={{ gap: space[4] }}>
        {modo === 'enlace' ? (
          <>
            <Campo
              etiqueta="ENLACE DE LA NOTA"
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
            <Boton titulo="Pegar del portapapeles" icono={ClipboardPaste} variante="fantasma" onPress={pegar} />
            <Boton titulo="Verificar" icono={ScanSearch} onPress={verificarEnlace} disabled={!url.trim()} />
          </>
        ) : null}

        {modo === 'texto' ? (
          <>
            <Campo
              etiqueta="TEXTO A VERIFICAR"
              placeholder="Pegá acá el mensaje, el posteo o el fragmento que te llegó."
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
                {texto.trim().length} / {MAX_CONTENT_CHARS.toLocaleString('es-AR')}
              </Texto>
            </View>
            <Boton titulo="Pegar del portapapeles" icono={ClipboardPaste} variante="fantasma" onPress={pegar} />
            <Boton
              titulo="Verificar"
              icono={ScanSearch}
              onPress={verificarTexto}
              disabled={texto.trim().length < MIN_CONTENT_CHARS}
            />
          </>
        ) : null}

        {modo === 'captura' ? (
          <>
            <Texto variante="caption" rol="muted">
              CAPTURA DE UN POSTEO
            </Texto>
            <Texto variante="small" rol="muted">
              Para lo que no tiene enlace público: una historia, un grupo de WhatsApp, un posteo
              privado. Primero te muestro lo que leí de la imagen para que lo corrijas, y recién
              después se verifica.
            </Texto>
            <Boton
              titulo="Elegir captura"
              icono={ImageDown}
              onPress={elegirCaptura}
              cargando={abriendoGaleria}
            />
          </>
        ) : null}

        {error ? <Aviso>{error}</Aviso> : null}
      </Tarjeta>

      <Texto variante="small" rol="subtle" style={{ textAlign: 'center' }}>
        Los enlaces que verificás quedan guardados en tu historial. El contenido viaja a Gemini
        para ser analizado.
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
