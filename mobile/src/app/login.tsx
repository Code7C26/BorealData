import { Link, Redirect } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Marca } from '@/components/marca';
import { Aviso, Boton, Campo, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/lib/auth';
import { FIREBASE_SIN_CONFIGURAR } from '@/lib/config';
import { mensajeErrorFirebase } from '@/lib/firebase-errors';
import { traducciones } from '@/lib/idioma';
import { useIdioma, useTextos } from '@/lib/use-idioma';
import { space } from '@/theme';

const T = traducciones({
  es: {
    bajada: 'Verificá lo que te llega antes de compartirlo.',
    sinFirebase: 'Falta completar mobile/.env.local con los datos de Firebase.',
    email: 'EMAIL',
    emailPlaceholder: 'vos@ejemplo.com',
    password: 'CONTRASEÑA',
    entrar: 'Entrar',
    error: 'No pudimos iniciar sesión. Probá de nuevo.',
    sinCuenta: '¿Todavía no tenés cuenta?',
    crear: 'Crear una',
  },
  en: {
    bajada: 'Check what reaches you before you share it.',
    sinFirebase: 'Fill in mobile/.env.local with your Firebase settings.',
    email: 'EMAIL',
    emailPlaceholder: 'you@example.com',
    password: 'PASSWORD',
    entrar: 'Sign in',
    error: "We couldn't sign you in. Please try again.",
    sinCuenta: "Don't have an account yet?",
    crear: 'Create one',
  },
});

export default function Login() {
  const { user, iniciarSesion } = useSesion();
  const { idioma } = useIdioma();
  const t = useTextos(T);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // La sesión persiste en el teléfono, así que al volver a abrir la app esto ya
  // es true antes del primer frame: nunca se ve el login de refilón.
  if (user) return <Redirect href="/" />;

  async function entrar() {
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion(email, password);
    } catch (err) {
      setError(mensajeErrorFirebase(err, t.error, idioma));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla contentStyle={styles.contenido}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.marca}>
          <Marca size={64} />
          <Texto variante="display" rol="display">
            AletheIA
          </Texto>
          <Texto variante="body" rol="muted" style={{ textAlign: 'center' }}>
            {t.bajada}
          </Texto>
        </View>

        <Tarjeta style={{ gap: space[4] }}>
          {FIREBASE_SIN_CONFIGURAR ? <Aviso>{t.sinFirebase}</Aviso> : null}

          <Campo
            etiqueta={t.email}
            placeholder={t.emailPlaceholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
          />
          <Campo
            etiqueta={t.password}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={entrar}
          />

          {error ? <Aviso>{error}</Aviso> : null}

          <Boton
            titulo={t.entrar}
            icono={LogIn}
            onPress={entrar}
            cargando={enviando}
            disabled={!email.trim() || !password}
          />
        </Tarjeta>

        <View style={styles.pie}>
          <Texto variante="small" rol="muted">
            {t.sinCuenta}
          </Texto>
          <Link href="/registro" asChild>
            <Texto variante="bodyMedium" rol="accent" accessibilityRole="link">
              {t.crear}
            </Texto>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  contenido: {
    justifyContent: 'center',
    flexGrow: 1,
    gap: space[6],
  },
  marca: {
    alignItems: 'center',
    gap: space[3],
    marginBottom: space[6],
  },
  pie: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[5],
  },
});
