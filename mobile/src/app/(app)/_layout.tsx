import { Redirect, Tabs } from 'expo-router';
import { Clock, ScanSearch, UserRound } from 'lucide-react-native';

import { useSesion } from '@/lib/auth';
import { font, useTema } from '@/theme';

/**
 * El área con sesión. Es también el portón: cualquier ruta de adentro pasa por
 * este layout, así que alcanza con un solo chequeo acá.
 *
 * `loading` ya se resolvió en el layout raíz (que mantiene el splash hasta que
 * Firebase contesta), así que en este punto `user` es la respuesta definitiva y
 * no hay riesgo de rebotar al login en el primer frame.
 */
export default function LayoutApp() {
  const { c } = useTema();
  const { user } = useSesion();

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accentText,
        tabBarInactiveTintColor: c.textSubtle,
        tabBarLabelStyle: { fontFamily: font.sansMedium, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          // La barra no compite con el contenido: el fondo de aurora sigue
          // vivo detrás de las pantallas y acá se corta en seco, como el
          // sidebar de la web.
          elevation: 0,
        },
        sceneStyle: { backgroundColor: 'transparent' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Verificar',
          tabBarIcon: ({ color, size }) => <ScanSearch size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <UserRound size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
