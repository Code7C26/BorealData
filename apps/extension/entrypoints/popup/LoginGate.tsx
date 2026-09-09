import { FlaskConical, LogIn } from 'lucide-react';
import { WEB_APP_URL } from './config';
import { devSimulateLogin } from './auth';
import type { AuthState } from './types';

interface LoginGateProps {
  onDevLogin: (auth: AuthState) => void;
}

function LoginGate({ onDevLogin }: LoginGateProps) {
  const handleLogin = () => {
    browser.tabs.create({ url: `${WEB_APP_URL}/login?from=extension` });
  };

  const handleDevLogin = async () => {
    const auth = await devSimulateLogin();
    onDevLogin(auth);
  };

  return (
    <div className="login-gate">
      <h1 className="app-header">
        alethe<span className="brand-ia">IA</span>
      </h1>
      <p className="subtitle">Iniciá sesión para analizar contenido</p>

      <button className="analyze-btn" onClick={handleLogin}>
        <LogIn size={16} />
        Iniciar sesión
      </button>

      <button className="dev-login-btn" onClick={handleDevLogin}>
        <FlaskConical size={13} />
        Simular sesión (solo dev)
      </button>

      <p className="hint">
        El login real todavía no está conectado a la web ni al backend. El
        botón de arriba abre la página de login (que tampoco existe todavía);
        el de "simular sesión" es solo para poder probar esta pantalla
        mientras tanto.
      </p>
    </div>
  );
}

export default LoginGate;
