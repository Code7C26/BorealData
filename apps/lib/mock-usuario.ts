/**
 * Mock de "sesión" en localStorage. Reemplazar por autenticación real
 * (Firebase Auth + JWT, según el CONTEXTO_PROYECTO.md) cuando el backend
 * esté listo. Todo lo que toca localStorage está aislado acá adentro.
 */

export type UsuarioMock = {
  nombre: string;
  email: string;
};

const STORAGE_KEY = "aletheia_usuario_mock";

export const USUARIO_POR_DEFECTO: UsuarioMock = {
  nombre: "Invitado",
  email: "invitado@aletheia.app",
};

export function obtenerUsuarioMock(): UsuarioMock | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UsuarioMock;
  } catch {
    return null;
  }
}

export function guardarUsuarioMock(usuario: UsuarioMock) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
}

export function cerrarSesionMock() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Deriva un nombre "presentable" a partir del email, para el login mock
 * cuando todavía no hay un nombre guardado (ej: alguien que nunca pasó
 * por Registro y entra directo por Login). */
export function nombreDesdeEmail(email: string): string {
  const prefijo = email.split("@")[0] ?? "Usuario";
  return prefijo
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(" ");
}

export function iniciales(nombre: string): string {
  const partes = nombre.split(" ").filter(Boolean).slice(0, 2);
  if (partes.length === 0) return "?";
  return partes.map((p) => p.charAt(0).toUpperCase()).join("");
}
