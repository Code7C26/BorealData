import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, Globe } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Marca } from '@/components/marca';
import { Boton, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { WEB_ORIGIN } from '@/lib/config';
import { traducciones } from '@/lib/idioma';
import { useTextos } from '@/lib/use-idioma';
import { space, useTema } from '@/theme';

const T = traducciones({
  es: {
    volver: 'Volver',
    titulo: 'Boreal Data',
    bajada: 'AletheIA es el producto de Boreal Data.',
    queEs: 'QUÉ HACE ALETHEIA',
    queEsTexto:
      'Analiza una noticia, un posteo o una captura y devuelve un veredicto con su razonamiento: qué fuentes se consultaron, cuáles confirman y cuáles contradicen. No da un puntaje sin cuerpo — da cuatro veredictos posibles y cinco niveles de confianza, que son cosas distintas: el veredicto es la conclusión, la confianza dice qué tan sólida es la evidencia.',
    comoFunciona: 'CÓMO FUNCIONA',
    comoFuncionaTexto:
      'Extrae el contenido de la página, lo manda a un modelo de IA que busca y cruza fuentes reales en el momento, y muestra el camino completo. Si no hay evidencia suficiente, lo dice: "sin datos" es un resultado válido, no un error.',
    equipo: 'EQUIPO',
    equipoTexto: 'Renzo Lanata — frontend y diseño\nCiro Di Marsico — backend, IA e infraestructura',
    proyecto: 'Proyecto Final de Secundaria, FAT 2026.',
    version: 'Versión',
    web: 'Abrir aletheia.borealdata',
  },
  en: {
    volver: 'Back',
    titulo: 'Boreal Data',
    bajada: 'AletheIA is a Boreal Data product.',
    queEs: 'WHAT ALETHEIA DOES',
    queEsTexto:
      'It analyses a news story, a post or a screenshot and returns a verdict along with its reasoning: which sources were consulted, which confirm it and which contradict it. It does not give a hollow score — it gives four possible verdicts and five confidence levels, which are different things: the verdict is the conclusion, the confidence says how solid the evidence is.',
    comoFunciona: 'HOW IT WORKS',
    comoFuncionaTexto:
      'It extracts the page content, sends it to an AI model that searches and cross-checks real sources on the spot, and shows the whole path. If there is not enough evidence, it says so: "not enough data" is a valid result, not a failure.',
    equipo: 'TEAM',
    equipoTexto: 'Renzo Lanata — frontend and design\nCiro Di Marsico — backend, AI and infrastructure',
    proyecto: 'Secondary school final project, FAT 2026.',
    version: 'Version',
    web: 'Open aletheia.borealdata',
  },
});

export default function AcercaDe() {
  const { c } = useTema();
  const router = useRouter();
  const t = useTextos(T);

  return (
    <Pantalla>
      <Boton
        titulo={t.volver}
        icono={ArrowLeft}
        variante="fantasma"
        onPress={() => router.back()}
        style={styles.volver}
      />

      <View style={styles.marca}>
        <Marca size={64} />
        <Texto variante="title" rol="display">
          {t.titulo}
        </Texto>
        <Texto variante="small" rol="muted" style={{ textAlign: 'center' }}>
          {t.bajada}
        </Texto>
      </View>

      <Tarjeta style={{ gap: space[2] }}>
        <Texto variante="overline" rol="subtle">
          {t.queEs}
        </Texto>
        <Texto variante="small" rol="muted">
          {t.queEsTexto}
        </Texto>
      </Tarjeta>

      <Tarjeta style={{ gap: space[2] }}>
        <Texto variante="overline" rol="subtle">
          {t.comoFunciona}
        </Texto>
        <Texto variante="small" rol="muted">
          {t.comoFuncionaTexto}
        </Texto>
      </Tarjeta>

      <Tarjeta style={{ gap: space[2] }}>
        <Texto variante="overline" rol="subtle">
          {t.equipo}
        </Texto>
        <Texto variante="small" rol="muted">
          {t.equipoTexto}
        </Texto>
        <Texto variante="caption" rol="subtle">
          {t.proyecto}
        </Texto>
      </Tarjeta>

      {WEB_ORIGIN ? (
        <Boton
          titulo={t.web}
          icono={Globe}
          variante="secundario"
          onPress={() => {
            if (!WEB_ORIGIN) return;
            void WebBrowser.openBrowserAsync(WEB_ORIGIN, {
              toolbarColor: c.bg,
              controlsColor: c.accentText,
            });
          }}
        />
      ) : null}

      <Texto variante="mono" rol="subtle" style={{ textAlign: 'center' }}>
        {t.version} {Constants.expoConfig?.version ?? '—'}
      </Texto>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  volver: { alignSelf: 'flex-start', height: 40, paddingHorizontal: space[2] },
  marca: { alignItems: 'center', gap: space[3], marginBottom: space[2] },
});
