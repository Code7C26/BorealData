/**
 * Identidad autenticada de Firebase, adjuntada a `req.user` por los middlewares de
 * auth/verifyAuth.ts cuando el ID token es válido.
 */
export interface AuthenticatedUser {
  uid: string;
  email: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Este export vacío fuerza a TypeScript a tratar el archivo como módulo (necesario
// para que el `declare global` de arriba haga merge con el namespace Express real).
export {};
