import type { AuthState } from './types';

const AUTH_KEY = 'auth';

export async function getStoredAuth(): Promise<AuthState | null> {
  const result = await browser.storage.local.get(AUTH_KEY);
  return (result?.[AUTH_KEY] as AuthState | undefined) ?? null;
}

export async function clearStoredAuth(): Promise<void> {
  await browser.storage.local.remove(AUTH_KEY);
}

/**
 * SOLO PARA DESARROLLO — simula un login exitoso sin pasar por la web ni el
 * backend real (que todavía no existen). Sacar este atajo del LoginGate
 * cuando el login real esté conectado de punta a punta.
 */
export async function devSimulateLogin(): Promise<AuthState> {
  const fake: AuthState = {
    token: 'dev-fake-token',
    user: { name: 'Usuario de prueba' },
  };
  await browser.storage.local.set({ [AUTH_KEY]: fake });
  return fake;
}
