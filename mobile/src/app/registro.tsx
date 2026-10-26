import { Link, Redirect } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Marca } from '@/components/marca';
import { Aviso, Boton, Campo, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/lib/auth';
import { mensajeErrorFirebase } from '@/lib/firebase-errors';
import { space } from '@/theme';

/** Mismo mínimo que pide la web (y que Firebase rechaza por su cuenta a los 6). */
const MIN_PASSWORD = 8;

export default function Registro() {
  const { user, registrar } = useSesion();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (user) return <Redirect href="/" />;

  async function crear() {
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await registrar(nombre, email, password);
    } catch (err) {
      setError(mensajeErrorFirebase(err, 'No pudimos crear la cuenta. Probá de nuevo.'));
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
            Crear cuenta
          </Texto>
        </View>

        <Tarjeta style={{ gap: space[4] }}>
          <Campo
            etiqueta="NOMBRE"
            placeholder="Cómo te llamamos"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
            autoComplete="name"
          />
          <Campo
            etiqueta="EMAIL"
            placeholder="vos@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
          />
          <Campo
            etiqueta="CONTRASEÑA"
            placeholder={`Al menos ${MIN_PASSWORD} caracteres`}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={crear}
          />

          {error ? <Aviso>{error}</Aviso> : null}

          <Boton
            titulo="Crear cuenta"
            icono={UserPlus}
            onPress={crear}
            cargando={enviando}
            disabled={!nombre.trim() || !email.trim() || !password}
          />

          <Texto variante="small" rol="subtle">
            Al crear la cuenta aceptás los términos y la política de privacidad de AletheIA:
            guardamos los análisis que hacés en tu historial y el contenido que verificás viaja a
            Gemini para ser analizado.
          </Texto>
        </Tarjeta>

        <View style={styles.pie}>
          <Texto variante="small" rol="muted">
            ¿Ya tenés cuenta?
          </Texto>
          <Link href="/login" asChild>
            <Texto variante="bodyMedium" rol="accent" accessibilityRole="link">
              Entrar
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
