import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getPerfil, guardarNombre, type UserProfile } from '@/lib/api';
import { auth } from '@/lib/firebase';

/**
 * Sesión de la app — espejo de `apps/lib/auth-context.tsx`.
 *
 * Dos diferencias con la web:
 *
 * 1. No hay `setPersistence` ni checkbox de "recordarme": en un teléfono la
 *    sesión SIEMPRE persiste (lo resuelve `initializeAuth` en `firebase.ts`).
 *    El bug de la web — una pestaña nueva sin sesión disparando un logout que
 *    además se lo comía a la extensión — no tiene equivalente acá.
 * 2. El perfil del backend es opcional para que la app funcione: si `/me` falla
 *    (backend apagado, teléfono fuera de la red), `profile` queda en null y la
 *    sesión de Firebase sigue siendo válida. La app muestra el error donde
 *    corresponde en vez de echar a la persona al login.
 */
interface SesionContexto {
  user: User | null;
  profile: UserProfile | null;
  /** true mientras Firebase todavía no dijo si hay sesión guardada. */
  loading: boolean;
  /** Último error al traer el perfil del backend, para mostrarlo en pantalla. */
  errorPerfil: string | null;
  refrescarPerfil: () => Promise<void>;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrar: (nombre: string, email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const Contexto = createContext<SesionContexto | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);

  const refrescarPerfil = useCallback(async () => {
    try {
      setProfile(await getPerfil());
      setErrorPerfil(null);
    } catch (err) {
      setProfile(null);
      setErrorPerfil(err instanceof Error ? err.message : 'No se pudo cargar el perfil.');
    }
  }, []);

  useEffect(() => {
    // onAuthStateChanged dispara una primera vez con la sesión que estaba
    // guardada en AsyncStorage: hasta que eso pase, `loading` es true y el
    // layout no decide todavía entre login y app.
    return onAuthStateChanged(auth, async (siguiente) => {
      setUser(siguiente);
      if (siguiente) {
        await refrescarPerfil();
      } else {
        setProfile(null);
        setErrorPerfil(null);
      }
      setLoading(false);
    });
  }, [refrescarPerfil]);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const registrar = useCallback(async (nombre: string, email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const fullName = nombre.trim();
    await updateProfile(credential.user, { displayName: fullName });
    // El nombre también va al backend: es la fila de `users` que después usa el
    // historial. Si esto falla, la cuenta ya existe igual — no se revierte el
    // registro por un nombre, se puede corregir desde Perfil.
    try {
      await guardarNombre(fullName);
    } catch {
      // queda para el refresco del perfil
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    await signOut(auth);
  }, []);

  const valor = useMemo<SesionContexto>(
    () => ({
      user,
      profile,
      loading,
      errorPerfil,
      refrescarPerfil,
      iniciarSesion,
      registrar,
      cerrarSesion,
    }),
    [user, profile, loading, errorPerfil, refrescarPerfil, iniciarSesion, registrar, cerrarSesion],
  );

  return <Contexto value={valor}>{children}</Contexto>;
}

export function useSesion(): SesionContexto {
  const ctx = use(Contexto);
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return ctx;
}
