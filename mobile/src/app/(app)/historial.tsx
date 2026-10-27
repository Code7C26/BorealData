import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aurora } from '@/components/aurora';
import { Aviso, Texto } from '@/components/ui';
import { ChipVeredicto } from '@/components/veredicto';
import { getHistorial, type HistoryItem } from '@/lib/api';
import { traducciones } from '@/lib/idioma';
import { useTag, useTextos } from '@/lib/use-idioma';
import { normalize } from '@/lib/verdict';
import { radio, space, useTema } from '@/theme';

/** Cuántos análisis se piden de una. El backend pagina por limit/offset. */
const POR_PAGINA = 20;

const T = traducciones({
  es: {
    titulo: 'Historial',
    bajada: 'Todo lo que verificaste con esta cuenta.',
    error: 'No se pudo traer el historial.',
    vacioTitulo: 'Todavía no verificaste nada',
    vacioBajada: 'Pegá un enlace en la pestaña Verificar y el análisis va a aparecer acá.',
  },
  en: {
    titulo: 'History',
    bajada: 'Everything you have checked with this account.',
    error: "The history couldn't be loaded.",
    vacioTitulo: "You haven't checked anything yet",
    vacioBajada: 'Paste a link in the Check tab and the analysis will show up here.',
  },
});

export default function Historial() {
  const { c } = useTema();
  const router = useRouter();
  const t = useTextos(T);
  const tag = useTag();

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
      setError(err instanceof Error ? err.message : t.error);
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
                {t.titulo}
              </Texto>
              <Texto variante="small" rol="muted">
                {t.bajada}
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
                  {t.vacioTitulo}
                </Texto>
                <Texto variante="small" rol="muted" style={{ textAlign: 'center' }}>
                  {t.vacioBajada}
                </Texto>
              </View>
            )
          }
          renderItem={({ item }) => {
            const { verdict } = normalize(item.verdict, item.confidence);
            const fecha = new Date(item.createdAt).toLocaleDateString(tag, {
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
