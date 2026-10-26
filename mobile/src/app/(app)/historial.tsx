import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aurora } from '@/components/aurora';
import { Aviso, Texto } from '@/components/ui';
import { ChipVeredicto } from '@/components/veredicto';
import { getHistorial, type HistoryItem } from '@/lib/api';
import { normalize } from '@/lib/verdict';
import { radio, space, useTema } from '@/theme';

/** Cuántos análisis se piden de una. El backend pagina por limit/offset. */
const POR_PAGINA = 20;

export default function Historial() {
  const { c } = useTema();
  const router = useRouter();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const traer = useCallback(async () => {
    try {
      const { analyses } = await getHistorial({ limit: POR_PAGINA });
      setItems(analyses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo traer el historial.');
    }
  }, []);

  useEffect(() => {
    void traer().finally(() => setCargando(false));
  }, [traer]);

  return (
    <View style={{ flex: 1 }}>
      <Aurora />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              tintColor={c.accentText}
              colors={[c.accentText]}
              progressBackgroundColor={c.surface}
              onRefresh={() => {
                setRefrescando(true);
                void traer().finally(() => setRefrescando(false));
              }}
            />
          }
          ListHeaderComponent={
            <View style={{ gap: space[2], marginBottom: space[2] }}>
              <Texto variante="title" rol="display">
                Historial
              </Texto>
              <Texto variante="small" rol="muted">
                Todo lo que verificaste con esta cuenta.
              </Texto>
              {error ? <Aviso>{error}</Aviso> : null}
            </View>
          }
          ListEmptyComponent={
            cargando ? (
              <ActivityIndicator color={c.accentText} style={{ marginTop: space[10] }} />
            ) : (
              <View style={styles.vacio}>
                <Texto variante="heading" rol="display" style={{ textAlign: 'center' }}>
                  Todavía no verificaste nada
                </Texto>
                <Texto variante="small" rol="muted" style={{ textAlign: 'center' }}>
                  Pegá un enlace en la pestaña Verificar y el análisis va a aparecer acá.
                </Texto>
              </View>
            )
          }
          renderItem={({ item }) => {
            const { verdict } = normalize(item.verdict, item.confidence);
            const fecha = new Date(item.createdAt).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.headline}. ${fecha}.`}
                onPress={() => router.push({ pathname: '/resultado/[id]', params: { id: item.id } })}
                style={({ pressed }) => [
                  styles.fila,
                  {
                    backgroundColor: c.surface,
                    borderColor: pressed ? c.borderStrong : c.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}>
                <ChipVeredicto verdict={verdict} tamano="chico" />
                <Texto variante="bodyMedium" numberOfLines={2}>
                  {item.headline}
                </Texto>
                <View style={styles.pieFila}>
                  <Texto variante="mono" rol="subtle" numberOfLines={1} style={{ flex: 1 }}>
                    {item.title ?? item.url}
                  </Texto>
                  <Texto variante="caption" rol="subtle">
                    {fecha}
                  </Texto>
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[10],
    gap: space[3],
  },
  fila: {
    borderWidth: 1,
    borderRadius: radio.xl,
    padding: space[4],
    gap: space[2],
  },
  pieFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  vacio: {
    alignItems: 'center',
    gap: space[3],
    marginTop: space[12],
  },
});
