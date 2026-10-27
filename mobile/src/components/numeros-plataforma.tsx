import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Tarjeta, Texto } from '@/components/ui';
import { getStats, type GlobalStats } from '@/lib/api';
import { traducciones } from '@/lib/idioma';
import { useTag, useTextos } from '@/lib/use-idioma';
import { radio, space, useTema } from '@/theme';

/**
 * Los totales de toda la plataforma, no los de esta cuenta.
 *
 * Vive en la pantalla de Verificar y no escondido en el perfil: es la prueba
 * social del producto — cuántas notas se verificaron y cuántas fuentes se
 * consultaron de verdad. Es lo primero que alguien quiere saber cuando le
 * preguntás si confía en un detector de noticias falsas.
 *
 * Si `/stats` falla no se muestra nada: una cifra en cero diría algo falso
 * sobre el producto, y un error ahí no aporta.
 */
const T = traducciones({
  es: {
    titulo: 'ALETHEIA EN NÚMEROS',
    analisis: 'análisis',
    fuentes: 'fuentes consultadas',
    confianza: 'confianza media',
  },
  en: {
    titulo: 'ALETHEIA IN NUMBERS',
    analisis: 'analyses',
    fuentes: 'sources consulted',
    confianza: 'average confidence',
  },
});

export function NumerosPlataforma() {
  const { c } = useTema();
  const t = useTextos(T);
  const tag = useTag();
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    void getStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <Tarjeta style={{ gap: space[3] }}>
      <Texto variante="overline" rol="subtle">
        {t.titulo}
      </Texto>

      <View style={styles.fila}>
        <Dato valor={stats.totalAnalyses.toLocaleString(tag)} etiqueta={t.analisis} />
        <Dato valor={stats.totalSources.toLocaleString(tag)} etiqueta={t.fuentes} />
        <Dato valor={`${stats.averageConfidence.toFixed(1)}/5`} etiqueta={t.confianza} />
      </View>

      {/* La barra de veredictos: de un vistazo se ve que la app no dice que
          todo es falso ni que todo es verdad. */}
      <View style={styles.barra}>
        {(['verificado', 'dudoso', 'falso', 'sin-datos'] as const).map((v) => {
          const n = stats.verdicts[v];
          if (!n) return null;
          const color = c[v === 'sin-datos' ? 'sindatos' : (v as 'verificado' | 'dudoso' | 'falso')];
          return <View key={v} style={{ flex: n, height: 6, backgroundColor: color }} />;
        })}
      </View>
    </Tarjeta>
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
  fila: { flexDirection: 'row', gap: space[3] },
  barra: {
    flexDirection: 'row',
    gap: 2,
    borderRadius: radio.pill,
    overflow: 'hidden',
  },
});
