import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SesionProvider, useSesion } from '@/lib/auth';
import { useTema, TemaProvider } from '@/theme';
import { useFuentes } from '@/theme/fonts';

// El splash se mantiene a mano hasta que están las fuentes Y Firebase ya dijo
// si había sesión guardada: así la app abre directo en la pantalla que
// corresponde, sin el parpadeo de ver el login un instante y saltar al home.
SplashScreen.preventAutoHideAsync();

export default function LayoutRaiz() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TemaProvider>
          <SesionProvider>
            <Navegacion />
          </SesionProvider>
        </TemaProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navegacion() {
  const { c, esquema } = useTema();
  const { loading } = useSesion();
  const fuentesListas = useFuentes();

  useEffect(() => {
    // El fondo de la ventana nativa, para que el rebote del scroll y las
    // transiciones no muestren blanco sobre Noche.
    void SystemUI.setBackgroundColorAsync(c.bg);
  }, [c.bg]);

  useEffect(() => {
    if (fuentesListas && !loading) void SplashScreen.hideAsync();
  }, [fuentesListas, loading]);

  if (!fuentesListas || loading) return null;

  return (
    <>
      <StatusBar style={esquema === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          animation: 'fade_from_bottom',
        }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
        <Stack.Screen name="analizando" options={{ gestureEnabled: false }} />
        <Stack.Screen name="resultado/[id]" />
      </Stack>
    </>
  );
}
