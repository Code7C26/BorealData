import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui';
import type { AnalysisSource } from '@/lib/api';
import { traducciones } from '@/lib/idioma';
import { useTextos } from '@/lib/use-idioma';
import { useVocabulario } from '@/lib/use-vocabulario';
import { type Confidence, type Verdict } from '@/lib/verdict';
import { radio, space, useTema } from '@/theme';

const T = traducciones({
  es: {
    confianza: 'CONFIANZA',
    valor: (nivel: string, n: number) => `Confianza ${nivel}, ${n} de 5`,
    abrir: (fuente: string, postura: string) => `${fuente}. ${postura}. Abrir fuente.`,
  },
  en: {
    confianza: 'CONFIDENCE',
    valor: (nivel: string, n: number) => `${nivel} confidence, ${n} out of 5`,
    abrir: (fuente: string, postura: string) => `${fuente}. ${postura}. Open source.`,
  },
});

/**
 * El chip del veredicto: ícono + etiqueta, nunca color solo.
 *
 * Es la regla de accesibilidad de la V1 — el color no puede ser el único
 * portador del significado, así que el chip siempre lleva texto, y el
 * `accessibilityLabel` suma lo que el color quiere decir.
 */
export function ChipVeredicto({
  verdict,
  tamano = 'normal',
}: {
  verdict: Verdict;
  tamano?: 'normal' | 'chico';
}) {
  const { c } = useTema();
  const { VERDICT } = useVocabulario();
  const meta = VERDICT[verdict];
  const color = c[meta.color];
  const chico = tamano === 'chico';

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${meta.label}. ${meta.meaning}`}
      style={[
        styles.chip,
        {
          borderColor: color,
          backgroundColor: c.overlay,
          paddingVertical: chico ? 4 : 7,
          paddingHorizontal: chico ? space[2] : space[3],
        },
      ]}>
      <meta.icon size={chico ? 14 : 17} color={color} strokeWidth={2.2} />
      <Texto variante={chico ? 'caption' : 'bodyMedium'} color={color}>
        {meta.label}
      </Texto>
    </View>
  );
}

/**
 * Nivel de confianza en cinco segmentos, no un porcentaje sin cuerpo: comunica
 * orden de magnitud sin fingir una precisión que el análisis no tiene.
 *
 * La etiqueta ("Muy alta") y la nota de abajo salen del MISMO nivel. Para el
 * lector de pantalla se expone como un medidor cuyo valor hablado es la
 * etiqueta más el número, nunca el número solo.
 */
export function MedidorConfianza({
  confidence,
  color,
  conNota = true,
}: {
  confidence: Confidence;
  /** El color del veredicto: el medidor no tiene color propio. */
  color: string;
  conNota?: boolean;
}) {
  const { c } = useTema();
  const { CONFIDENCE } = useVocabulario();
  const t = useTextos(T);
  const meta = CONFIDENCE[confidence];

  return (
    <View style={{ gap: space[2] }}>
      <View style={styles.filaEtiqueta}>
        <Texto variante="overline" rol="subtle">
          {t.confianza}
        </Texto>
        <Texto variante="bodyMedium" color={color}>
          {meta.label}
        </Texto>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 1,
          max: 5,
          now: confidence,
          text: t.valor(meta.label.toLowerCase(), confidence),
        }}
        style={styles.segmentos}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.segmento,
              { backgroundColor: i <= confidence ? color : c.border },
            ]}
          />
        ))}
      </View>

      {conNota ? (
        <Texto variante="small" rol="muted">
          {meta.note}
        </Texto>
      ) : null}
    </View>
  );
}

/**
 * Una fuente del análisis. Si tiene URL abre el navegador del sistema (in-app
 * browser): sacar a la persona de la app para leer una fuente y que después
 * tenga que volver a buscar el resultado es perder el hilo.
 *
 * El `url` que manda Google es un redirect de vertexaisearch — es la única que
 * da y la que pide para la atribución; el dominio que se muestra sale del
 * título de la fuente, no de esa URL (ver el fix de grounding en el backend).
 */
export function FilaFuente({ fuente }: { fuente: AnalysisSource }) {
  const { c } = useTema();
  const { STANCE } = useVocabulario();
  const t = useTextos(T);
  const postura = STANCE[fuente.stance];
  const color = c[postura.color];
  const abrible = !!fuente.url;

  const contenido = (
    <>
      <View style={styles.filaEtiqueta}>
        <Texto variante="caption" color={color}>
          {postura.label.toUpperCase()}
        </Texto>
        {abrible ? <ExternalLink size={14} color={c.textSubtle} /> : null}
      </View>
      <Texto variante="bodyMedium" numberOfLines={2}>
        {fuente.title || fuente.domain}
      </Texto>
      {fuente.domain ? (
        <Texto variante="mono" rol="subtle">
          {fuente.domain}
        </Texto>
      ) : null}
      {fuente.note ? (
        <Texto variante="small" rol="muted">
          {fuente.note}
        </Texto>
      ) : null}
    </>
  );

  if (!abrible) {
    return <View style={[styles.fuente, { borderColor: c.border }]}>{contenido}</View>;
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t.abrir(fuente.title || fuente.domain, postura.label)}
      onPress={() => {
        void WebBrowser.openBrowserAsync(fuente.url!, {
          toolbarColor: c.bg,
          controlsColor: c.accentText,
        });
      }}
      style={({ pressed }) => [
        styles.fuente,
        { borderColor: pressed ? color : c.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[2],
    borderWidth: 1,
    borderRadius: radio.pill,
  },
  filaEtiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  segmentos: {
    flexDirection: 'row',
    gap: 5,
  },
  segmento: {
    flex: 1,
    height: 7,
    borderRadius: radio.pill,
  },
  fuente: {
    borderWidth: 1,
    borderRadius: radio.lg,
    padding: space[4],
    gap: space[1],
  },
});
