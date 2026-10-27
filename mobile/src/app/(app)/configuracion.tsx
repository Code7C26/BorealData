import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  Building2,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  Languages,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Shield,
  Sun,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Boton, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { borrarCuenta, borrarHistorial } from '@/lib/api';
import { useSesion } from '@/lib/auth';
import { API_URL, WEB_ORIGIN } from '@/lib/config';
import { IDIOMAS, NOMBRE_IDIOMA, traducciones } from '@/lib/idioma';
import { useIdioma, useTextos } from '@/lib/use-idioma';
import { radio, space, useTema, type Modo } from '@/theme';

const MODOS: { id: Modo; icono: typeof Sun }[] = [
  { id: 'sistema', icono: Monitor },
  { id: 'dark', icono: Moon },
  { id: 'light', icono: Sun },
];

const T = traducciones({
  es: {
    titulo: 'Configuración',
    cuenta: 'CUENTA',
    perfil: 'Perfil',
    sinNombre: 'Sin nombre',
    preferencias: 'PREFERENCIAS',
    apariencia: 'Apariencia',
    modos: { sistema: 'Sistema', dark: 'Noche', light: 'Claro' },
    idioma: 'Idioma',
    sobre: 'SOBRE ALETHEIA',
    privacidad: 'Política de privacidad',
    terminos: 'Términos de uso',
    contacto: 'Contacto',
    boreal: 'Boreal Data',
    web: 'Abrir la web',
    sinWeb: 'Cuando la web esté publicada',
    cerrarSesion: 'Cerrar sesión',
    datos: 'BORRAR TUS DATOS',
    datosBajada:
      'Se borran del servidor, no solo de este teléfono. Lo que borres no se puede recuperar.',
    borrarHistorial: 'Borrar todo el historial',
    borrarCuenta: 'Borrar la cuenta',
    confirmarHistorialBajada: 'Se borran todos tus análisis. No se puede deshacer.',
    confirmarCuentaBajada: 'Se borran la cuenta y todos sus análisis. No se puede deshacer.',
    cancelar: 'Cancelar',
    borrarTodo: 'Borrar todo',
    listo: 'Listo',
    borrados: (n: number) => `Se borraron ${n} análisis.`,
    noSePudoBorrar: 'No se pudo borrar',
    probaDeNuevo: 'Probá de nuevo.',
  },
  en: {
    titulo: 'Settings',
    cuenta: 'ACCOUNT',
    perfil: 'Profile',
    sinNombre: 'No name',
    preferencias: 'PREFERENCES',
    apariencia: 'Appearance',
    modos: { sistema: 'System', dark: 'Night', light: 'Light' },
    idioma: 'Language',
    sobre: 'ABOUT ALETHEIA',
    privacidad: 'Privacy policy',
    terminos: 'Terms of use',
    contacto: 'Contact',
    boreal: 'Boreal Data',
    web: 'Open the website',
    sinWeb: 'Once the site is published',
    cerrarSesion: 'Sign out',
    datos: 'DELETE YOUR DATA',
    datosBajada:
      "This deletes from the server, not just from this phone. What you delete can't be recovered.",
    borrarHistorial: 'Delete all history',
    borrarCuenta: 'Delete account',
    confirmarHistorialBajada: 'All your analyses will be deleted. This cannot be undone.',
    confirmarCuentaBajada:
      'Your account and all its analyses will be deleted. This cannot be undone.',
    cancelar: 'Cancel',
    borrarTodo: 'Delete all',
    listo: 'Done',
    borrados: (n: number) => `${n} analyses deleted.`,
    noSePudoBorrar: "Couldn't delete",
    probaDeNuevo: 'Please try again.',
  },
});

export default function Configuracion() {
  const { c, modo, setModo } = useTema();
  const { idioma, setIdioma } = useIdioma();
  const { user, profile, cerrarSesion } = useSesion();
  const router = useRouter();
  const t = useTextos(T);

  function abrirWeb(ruta = '') {
    if (!WEB_ORIGIN) return;
    void WebBrowser.openBrowserAsync(`${WEB_ORIGIN}${ruta}`, {
      toolbarColor: c.bg,
      controlsColor: c.accentText,
    });
  }

  /** Las filas que llevan a la web solo se ofrecen si hay web adonde llevar. */
  const haciaWeb = (ruta: string) => (WEB_ORIGIN ? () => abrirWeb(ruta) : undefined);

  function confirmarBorrarHistorial() {
    Alert.alert(t.borrarHistorial, t.confirmarHistorialBajada, [
      { text: t.cancelar, style: 'cancel' },
      {
        text: t.borrarTodo,
        style: 'destructive',
        onPress: async () => {
          try {
            const { deleted } = await borrarHistorial();
            Alert.alert(t.listo, t.borrados(deleted));
          } catch (err) {
            Alert.alert(t.noSePudoBorrar, err instanceof Error ? err.message : t.probaDeNuevo);
          }
        },
      },
    ]);
  }

  function confirmarBorrarCuenta() {
    Alert.alert(t.borrarCuenta, t.confirmarCuentaBajada, [
      { text: t.cancelar, style: 'cancel' },
      {
        text: t.borrarCuenta,
        style: 'destructive',
        onPress: async () => {
          try {
            await borrarCuenta();
            await cerrarSesion();
          } catch (err) {
            Alert.alert(t.noSePudoBorrar, err instanceof Error ? err.message : t.probaDeNuevo);
          }
        },
      },
    ]);
  }

  return (
    <Pantalla>
      <Texto variante="title" rol="display">
        {t.titulo}
      </Texto>

      <Grupo titulo={t.cuenta}>
        <Fila
          icono={UserRound}
          etiqueta={profile?.fullName ?? user?.displayName ?? t.sinNombre}
          nota={profile?.email ?? user?.email ?? undefined}
          onPress={() => router.push('/cuenta')}
        />
      </Grupo>

      <Tarjeta style={{ gap: space[4] }}>
        <Texto variante="overline" rol="subtle">
          {t.preferencias}
        </Texto>

        <View style={{ gap: space[2] }}>
          <Texto variante="caption" rol="muted">
            {t.apariencia}
          </Texto>
          <Selector
            opciones={MODOS.map(({ id, icono }) => ({ id, etiqueta: t.modos[id], icono }))}
            activo={modo}
            onElegir={(id) => setModo(id as Modo)}
          />
        </View>

        <View style={{ gap: space[2] }}>
          <Texto variante="caption" rol="muted">
            {t.idioma}
          </Texto>
          {/* Cada idioma se nombra en su propio idioma ("English", no "Inglés"):
              el que lo busca porque no entiende la interfaz igual lo reconoce. */}
          <Selector
            opciones={IDIOMAS.map((id) => ({ id, etiqueta: NOMBRE_IDIOMA[id], icono: Languages }))}
            activo={idioma}
            onElegir={(id) => setIdioma(id as typeof idioma)}
          />
        </View>
      </Tarjeta>

      <Grupo titulo={t.sobre}>
        <Fila
          icono={Shield}
          etiqueta={t.privacidad}
          nota={WEB_ORIGIN ? undefined : t.sinWeb}
          externa
          onPress={haciaWeb('/privacidad')}
        />
        <Fila
          icono={FileText}
          etiqueta={t.terminos}
          nota={WEB_ORIGIN ? undefined : t.sinWeb}
          externa
          onPress={haciaWeb('/terminos')}
        />
        <Fila
          icono={Mail}
          etiqueta={t.contacto}
          nota={WEB_ORIGIN ? undefined : t.sinWeb}
          externa
          onPress={haciaWeb('/contacto')}
        />
        <Fila icono={Building2} etiqueta={t.boreal} onPress={() => router.push('/acerca-de')} />
        <Fila
          icono={Globe}
          etiqueta={t.web}
          nota={WEB_ORIGIN ? undefined : t.sinWeb}
          externa
          onPress={haciaWeb('')}
        />
      </Grupo>

      <Boton
        titulo={t.cerrarSesion}
        icono={LogOut}
        variante="secundario"
        onPress={() => void cerrarSesion()}
      />

      {/* El borrado va al final y en tono bajo: es lo último que alguien busca
          al entrar a sus ajustes, y antes era lo primero que veía. Sigue a dos
          toques, porque la política de privacidad lo promete, pero no grita. */}
      <View style={{ gap: space[2], marginTop: space[4] }}>
        <Texto variante="overline" color={c.falso}>
          {t.datos}
        </Texto>
        <Texto variante="small" rol="subtle">
          {t.datosBajada}
        </Texto>
        <View style={[styles.grupo, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Fila
            icono={Trash2}
            etiqueta={t.borrarHistorial}
            color={c.falso}
            onPress={confirmarBorrarHistorial}
          />
          <Fila
            icono={Trash2}
            etiqueta={t.borrarCuenta}
            color={c.falso}
            onPress={confirmarBorrarCuenta}
          />
        </View>
      </View>

      {/* En desarrollo decir contra qué backend está pegando ahorra la mitad de
          los "no me anda": casi siempre es la IP o el servidor apagado. */}
      {__DEV__ ? (
        <Texto variante="mono" rol="subtle" style={{ textAlign: 'center' }}>
          API: {API_URL}
        </Texto>
      ) : null}
    </Pantalla>
  );
}

/** Un bloque de filas con su encabezado, como una sección de ajustes. */
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { c } = useTema();
  return (
    <View style={{ gap: space[2] }}>
      <Texto variante="overline" rol="subtle">
        {titulo}
      </Texto>
      <View style={[styles.grupo, { borderColor: c.border, backgroundColor: c.surface }]}>
        {children}
      </View>
    </View>
  );
}

/** Una fila de ajustes: ícono, etiqueta, nota opcional y el chevron si es tocable. */
export function Fila({
  icono: Icono,
  etiqueta,
  nota,
  color,
  externa,
  onPress,
}: {
  icono: typeof Shield;
  etiqueta: string;
  nota?: string;
  color?: string;
  /** Marca las filas que sacan de la app, con otro ícono al final. */
  externa?: boolean;
  onPress?: () => void;
}) {
  const { c } = useTema();
  const tinta = color ?? c.text;
  const apagada = !onPress;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={apagada}
      onPress={onPress}
      style={({ pressed }) => [styles.fila, { opacity: apagada ? 0.45 : pressed ? 0.6 : 1 }]}>
      <Icono size={19} color={tinta} />
      <View style={{ flex: 1 }}>
        <Texto variante="body" color={tinta} numberOfLines={1}>
          {etiqueta}
        </Texto>
        {nota ? (
          <Texto variante="caption" rol="subtle" numberOfLines={1}>
            {nota}
          </Texto>
        ) : null}
      </View>
      {apagada ? null : externa ? (
        <ExternalLink size={16} color={c.textSubtle} />
      ) : (
        <ChevronRight size={18} color={c.textSubtle} />
      )}
    </Pressable>
  );
}

/** El selector de pastillas que usan Apariencia e Idioma. */
function Selector({
  opciones,
  activo,
  onElegir,
}: {
  opciones: { id: string; etiqueta: string; icono: typeof Sun }[];
  activo: string;
  onElegir: (id: string) => void;
}) {
  const { c } = useTema();
  return (
    <View style={[styles.selector, { backgroundColor: c.surfaceSunk, borderColor: c.border }]}>
      {opciones.map(({ id, etiqueta, icono: Icono }) => {
        const esActivo = activo === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ selected: esActivo }}
            onPress={() => onElegir(id)}
            style={[
              styles.opcion,
              esActivo && { backgroundColor: c.surface, borderColor: c.borderStrong },
            ]}>
            <Icono size={16} color={esActivo ? c.accentText : c.textSubtle} />
            <Texto variante="caption" color={esActivo ? c.text : c.textSubtle}>
              {etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: {
    borderWidth: 1,
    borderRadius: radio.xl,
    paddingHorizontal: space[4],
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[4],
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
    paddingVertical: space[2],
    borderRadius: radio.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
