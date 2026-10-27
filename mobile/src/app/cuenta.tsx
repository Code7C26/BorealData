import { useRouter } from 'expo-router';
import { ArrowLeft, AtSign, CalendarDays, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Marca } from '@/components/marca';
import { Aviso, Boton, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/lib/auth';
import { traducciones } from '@/lib/idioma';
import { useTag, useTextos } from '@/lib/use-idioma';
import { space, useTema } from '@/theme';

const T = traducciones({
  es: {
    titulo: 'Perfil',
    nombre: 'Nombre',
    email: 'Email',
    desde: 'Cuenta creada',
    sinNombre: 'Sin nombre',
    sinDato: 'No disponible',
    volver: 'Volver',
  },
  en: {
    titulo: 'Profile',
    nombre: 'Name',
    email: 'Email',
    desde: 'Account created',
    sinNombre: 'No name',
    sinDato: 'Not available',
    volver: 'Back',
  },
});

export default function Cuenta() {
  const router = useRouter();
  const t = useTextos(T);
  const tag = useTag();
  const { user, profile, errorPerfil } = useSesion();

  const creada = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(tag, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : t.sinDato;

  return (
    <Pantalla>
      <Boton
        titulo={t.volver}
        icono={ArrowLeft}
        variante="fantasma"
        onPress={() => router.back()}
        style={styles.volver}
      />

      <View style={styles.encabezado}>
        <Marca size={52} />
        <Texto variante="title" rol="display">
          {t.titulo}
        </Texto>
      </View>

      {errorPerfil ? <Aviso tono="info">{errorPerfil}</Aviso> : null}

      <Tarjeta style={{ gap: space[4] }}>
        <Dato
          icono={UserRound}
          etiqueta={t.nombre}
          valor={profile?.fullName ?? user?.displayName ?? t.sinNombre}
        />
        <Dato icono={AtSign} etiqueta={t.email} valor={profile?.email ?? user?.email ?? t.sinDato} />
        <Dato icono={CalendarDays} etiqueta={t.desde} valor={creada} />
      </Tarjeta>
    </Pantalla>
  );
}

function Dato({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: typeof UserRound;
  etiqueta: string;
  valor: string;
}) {
  const { c } = useTema();
  return (
    <View style={styles.fila}>
      <Icono size={19} color={c.textSubtle} />
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="caption" rol="subtle">
          {etiqueta}
        </Texto>
        <Texto variante="body">{valor}</Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  volver: { alignSelf: 'flex-start', height: 40, paddingHorizontal: space[2] },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
});
