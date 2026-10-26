import { LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Aviso, Boton, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { borrarCuenta, borrarHistorial, getStats, type GlobalStats } from '@/lib/api';
import { useSesion } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { radio, space, useTema, type Modo } from '@/theme';

const MODOS: { id: Modo; etiqueta: string; icono: typeof Sun }[] = [
  { id: 'sistema', etiqueta: 'Sistema', icono: Monitor },
  { id: 'dark', etiqueta: 'Noche', icono: Moon },
  { id: 'light', etiqueta: 'Claro', icono: Sun },
];

export default function Perfil() {
  const { c, modo, setModo } = useTema();
  const { user, profile, errorPerfil, cerrarSesion } = useSesion();
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    // Los totales son de toda la plataforma, no de esta cuenta: si fallan, la
    // pantalla sigue siendo útil, así que el error se traga a propósito.
    void getStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  function confirmarBorrarHistorial() {
    Alert.alert('Borrar todo el historial', 'Se borran todos tus análisis. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar todo',
        style: 'destructive',
        onPress: async () => {
          try {
            const { deleted } = await borrarHistorial();
            Alert.alert('Listo', `Se borraron ${deleted} análisis.`);
          } catch (err) {
            Alert.alert('No se pudo borrar', err instanceof Error ? err.message : 'Probá de nuevo.');
          }
        },
      },
    ]);
  }

  function confirmarBorrarCuenta() {
    Alert.alert(
      'Borrar la cuenta',
      'Se borran la cuenta y todos sus análisis. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar cuenta',
          style: 'destructive',
          onPress: async () => {
            try {
              await borrarCuenta();
              await cerrarSesion();
            } catch (err) {
              Alert.alert('No se pudo borrar', err instanceof Error ? err.message : 'Probá de nuevo.');
            }
          },
        },
      ],
    );
  }

  return (
    <Pantalla>
      <Texto variante="title" rol="display">
        Perfil
      </Texto>

      <Tarjeta style={{ gap: space[2] }}>
        <Texto variante="overline" rol="subtle">
          CUENTA
        </Texto>
        <Texto variante="heading">{profile?.fullName ?? user?.displayName ?? 'Sin nombre'}</Texto>
        <Texto variante="small" rol="muted">
          {profile?.email ?? user?.email}
        </Texto>
        {errorPerfil ? <Aviso tono="info">{errorPerfil}</Aviso> : null}
      </Tarjeta>

      <Tarjeta style={{ gap: space[3] }}>
        <Texto variante="overline" rol="subtle">
          APARIENCIA
        </Texto>
        <View style={[styles.selector, { backgroundColor: c.surfaceSunk, borderColor: c.border }]}>
          {MODOS.map(({ id, etiqueta, icono: Icono }) => {
            const activo = modo === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
                onPress={() => setModo(id)}
                style={[
                  styles.opcion,
                  activo && { backgroundColor: c.surface, borderColor: c.borderStrong },
                ]}>
                <Icono size={16} color={activo ? c.accentText : c.textSubtle} />
                <Texto variante="caption" color={activo ? c.text : c.textSubtle}>
                  {etiqueta}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      </Tarjeta>

      {stats ? (
        <Tarjeta style={{ gap: space[3] }}>
          <Texto variante="overline" rol="subtle">
            ALETHEIA EN NÚMEROS
          </Texto>
          <View style={styles.numeros}>
            <Dato valor={stats.totalAnalyses.toLocaleString('es-AR')} etiqueta="análisis" />
            <Dato valor={stats.totalSources.toLocaleString('es-AR')} etiqueta="fuentes" />
            <Dato valor={`${stats.averageConfidence.toFixed(1)}/5`} etiqueta="confianza media" />
          </View>
        </Tarjeta>
      ) : null}

      <Tarjeta style={{ gap: space[3] }}>
        <Texto variante="overline" rol="subtle">
          TUS DATOS
        </Texto>
        <Texto variante="small" rol="muted">
          Los análisis quedan guardados en tu historial. Podés borrarlos cuando quieras: se borran
          del servidor, no solo de la app.
        </Texto>
        <Boton titulo="Borrar todo el historial" icono={Trash2} variante="peligro" onPress={confirmarBorrarHistorial} />
        <Boton titulo="Borrar la cuenta" icono={Trash2} variante="peligro" onPress={confirmarBorrarCuenta} />
      </Tarjeta>

      <Boton titulo="Cerrar sesión" icono={LogOut} variante="secundario" onPress={() => void cerrarSesion()} />

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

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Texto variante="heading" rol="display">
        {valor}
      </Texto>
      <Texto variante="caption" rol="subtle">
        {etiqueta}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
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
  numeros: {
    flexDirection: 'row',
    gap: space[3],
  },
});
