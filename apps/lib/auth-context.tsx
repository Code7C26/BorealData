"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch, type UserProfile } from "@/lib/api";
import { broadcastAuthState } from "@/lib/extension-bridge";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const data = await apiFetch<UserProfile>("/me");
      setProfile(data);
    } catch (err) {
      console.error("No se pudo cargar el perfil:", err);
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribeAuthState = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        await loadProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // onIdTokenChanged también dispara en cada refresh de token (no solo
    // login/logout) — es el gancho correcto para mantener sincronizada la
    // sesión que la extensión guarda en su propio storage.
    const unsubscribeIdToken = onIdTokenChanged(auth, (nextUser) => {
      void broadcastAuthState(nextUser);
    });

    return () => {
      unsubscribeAuthState();
      unsubscribeIdToken();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
