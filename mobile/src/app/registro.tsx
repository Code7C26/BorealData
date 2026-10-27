import { Link, Redirect } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Marca } from '@/components/marca';
import { Aviso, Boton, Campo, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/lib/auth';
import { mensajeErrorFirebase } from '@/lib/firebase-errors';
import { traducciones } from '@/lib/idioma';
import { useIdioma, useTextos } from '@/lib/use-idioma';
import { space } from '@/theme';

/** Mismo mínimo que pide la web (y que Firebase rechaza por su cuenta a los 6). */
const MIN_PASSWORD = 8;

const T = traducciones({
  es: {
    titulo: 'Crear cuenta',
    nombre: 'NOMBRE',
    nombrePlaceholder: 'Cómo te llamamos',
    email: 'EMAIL',
    emailPlaceholder: 'vos@ejemplo.com',
    password: 'CONTRASEÑA',
    passwordPlaceholder: `Al menos ${MIN_PASSWORD} caracteres`,
    passwordCorta: `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`,
    crear: 'Crear cuenta',
    error: 'No pudimos crear la cuenta. Probá de nuevo.',
    legal:
      'Al crear la cuenta aceptás los términos y la política de privacidad de AletheIA: guardamos los análisis que hacés en tu historial y el contenido que verificás viaja a Gemini para ser analizado.',
    conCuenta: '¿Ya tenés cuenta?',
    entrar: 'Entrar',
  },
  en: {
    titulo: 'Create account',
    nombre: 'NAME',
    nombrePlaceholder: 'What should we call you',
    email: 'EMAIL',
    emailPlaceholder: 'you@example.com',
    password: 'PASSWORD',
    passwordPlaceholder: `At least ${MIN_PASSWORD} characters`,
    passwordCorta: `The password must be at least ${MIN_PASSWORD} characters long.`,
    crear: 'Create account',
    error: "We couldn't create the account. Please try again.",
    legal:
      "By creating an account you accept AletheIA's terms and privacy policy: we store the analyses you run in your history, and the content you check is sent to Gemini to be analysed.",
    conCuenta: 'Already have an account?',
    entrar: 'Sign in',
  },
});

export default function Registro() {
  const { user, registrar } = useSesion();
  const { idioma } = useIdioma();
  const t = useTextos(T);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (user) return <Redirect href="/" />;

  async function crear() {
    if (password.length < MIN_PASSWORD) {
      setError(t.passwordCorta);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await registrar(nombre, email, password);
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
          <Marca size={56} />
          <Texto variante="title" rol="display">
            {t.titulo}
          </Texto>
        </View>

        <Tarjeta style={{ gap: space[4] }}>
          <Campo
            etiqueta={t.nombre}
            placeholder={t.nombrePlaceholder}
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
            autoComplete="name"
          />
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
            placeholder={t.passwordPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={crear}
          />

          {error ? <Aviso>{error}</Aviso> : null}

          <Boton
            titulo={t.crear}
            icono={UserPlus}
            onPress={crear}
            cargando={enviando}
            disabled={!nombre.trim() || !email.trim() || !password}
          />

          <Texto variante="small" rol="subtle">
            {t.legal}
          </Texto>
        </Tarjeta>

        <View style={styles.pie}>
          <Texto variante="small" rol="muted">
            {t.conCuenta}
          </Texto>
          <Link href="/login" asChild>
            <Texto variante="bodyMedium" rol="accent" accessibilityRole="link">
              {t.entrar}
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
