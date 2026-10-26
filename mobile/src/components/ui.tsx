import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aurora } from '@/components/aurora';
import { radio, space, type as tipo, useTema } from '@/theme';

/**
 * Los componentes base del Design System V1 en React Native.
 *
 * Lo que en la web son clases de Tailwind (`text-muted`, `bg-surface`,
 * `rounded-xl`) acá son props tipadas: `<Texto rol="muted">`, `<Tarjeta>`. El
 * contrato es el mismo — ningún componente de pantalla escribe un hex ni un
 * número de radio suelto.
 */

type Variante = keyof typeof tipo;
type RolTexto = 'display' | 'text' | 'muted' | 'subtle' | 'accent' | 'inverso';

export function Texto({
  variante = 'body',
  rol = 'text',
  color,
  style,
  ...props
}: TextProps & {
  variante?: Variante;
  rol?: RolTexto;
  /** Un color del tema ya resuelto (el del veredicto, por ejemplo). Gana sobre `rol`. */
  color?: string;
  children?: ReactNode;
}) {
  const { c } = useTema();
  const porRol: Record<RolTexto, string> = {
    display: c.display,
    text: c.text,
    muted: c.textMuted,
    subtle: c.textSubtle,
    accent: c.accentText,
    inverso: c.accentInk,
  };
  return <Text style={[tipo[variante], { color: color ?? porRol[rol] }, style]} {...props} />;
}

/**
 * Contenedor de pantalla: aurora de fondo, safe area y scroll opcional.
 * Toda pantalla de la app entra por acá, así el fondo nunca queda plano.
 */
export function Pantalla({
  children,
  scroll = true,
  contentStyle,
  bordes = ['top', 'left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  bordes?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const contenido = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.contenido, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.contenido, { flex: 1 }, contentStyle]}>{children}</View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Aurora />
      <SafeAreaView style={{ flex: 1 }} edges={bordes}>
        {contenido}
      </SafeAreaView>
    </View>
  );
}

/** Superficie elevada. La elevación la da el borde + el salto bg → surface. */
export function Tarjeta({
  children,
  style,
  acento,
  ...props
}: ViewProps & { children?: ReactNode; acento?: string }) {
  const { c } = useTema();
  return (
    <View
      style={[
        styles.tarjeta,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          // El borde de color a la izquierda es el que marca el veredicto en la
          // web; acá se pasa resuelto porque no hay clases que generar.
          ...(acento ? { borderLeftWidth: 3, borderLeftColor: acento } : null),
        },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';

export function Boton({
  titulo,
  icono: Icono,
  variante = 'primario',
  cargando = false,
  style,
  disabled,
  ...props
}: PressableProps & {
  titulo: string;
  icono?: LucideIcon;
  variante?: VarianteBoton;
  cargando?: boolean;
}) {
  const { c } = useTema();
  const apagado = disabled || cargando;

  const fondo: Record<VarianteBoton, string> = {
    primario: c.accentSolid,
    secundario: c.surface,
    fantasma: 'transparent',
    peligro: 'transparent',
  };
  const tinta: Record<VarianteBoton, string> = {
    primario: c.accentInk,
    secundario: c.text,
    fantasma: c.accentText,
    peligro: c.falso,
  };
  const borde: Record<VarianteBoton, string | undefined> = {
    primario: undefined,
    secundario: c.borderStrong,
    fantasma: undefined,
    peligro: c.falso,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!apagado, busy: cargando }}
      disabled={apagado}
      style={({ pressed }) => [
        styles.boton,
        {
          backgroundColor: fondo[variante],
          opacity: apagado ? 0.5 : pressed ? 0.82 : 1,
          ...(borde[variante] ? { borderWidth: 1, borderColor: borde[variante] } : null),
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style as StyleProp<ViewStyle>,
      ]}
      {...props}>
      {cargando ? (
        <ActivityIndicator color={tinta[variante]} />
      ) : (
        <>
          {Icono ? <Icono size={19} color={tinta[variante]} strokeWidth={2} /> : null}
          <Text style={[tipo.bodyMedium, { color: tinta[variante] } as TextStyle]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

/**
 * El campo de texto del sistema. No usa `forwardRef`: desde React 19 `ref` es
 * una prop común, y el tipo sale del propio `TextInputProps` — que en React
 * Native 0.88 (API estricta de TypeScript) ya no coincide con el del
 * `forwardRef<TextInput>` de siempre.
 */
export function Campo({
  etiqueta,
  error,
  style,
  ...props
}: TextInputProps & { etiqueta?: string; error?: string | null }) {
  const { c } = useTema();
  return (
    <View style={{ gap: space[2] }}>
      {etiqueta ? (
        <Texto variante="caption" rol="muted">
          {etiqueta}
        </Texto>
      ) : null}
      <TextInput
        placeholderTextColor={c.textDisabled}
        style={[
          styles.campo,
          tipo.body,
          {
            backgroundColor: c.surfaceSunk,
            borderColor: error ? c.falso : c.border,
            color: c.text,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Texto variante="small" color={c.falso}>
          {error}
        </Texto>
      ) : null}
    </View>
  );
}

/** Mensaje de error de pantalla completa o de sección. */
export function Aviso({
  children,
  tono = 'error',
}: {
  children: ReactNode;
  tono?: 'error' | 'info';
}) {
  const { c } = useTema();
  const color = tono === 'error' ? c.falso : c.accentText;
  return (
    <View
      style={[
        styles.aviso,
        { borderColor: color, backgroundColor: c.overlay },
      ]}>
      <Texto variante="small" color={color}>
        {children}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[12],
    gap: space[5],
  },
  tarjeta: {
    borderRadius: radio.xl,
    borderWidth: 1,
    padding: space[5],
    gap: space[3],
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    height: 52,
    paddingHorizontal: space[5],
    borderRadius: radio.pill,
  },
  campo: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radio.lg,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  aviso: {
    borderWidth: 1,
    borderRadius: radio.lg,
    padding: space[4],
  },
});
