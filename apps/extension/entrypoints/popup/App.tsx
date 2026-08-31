import { useEffect, useState } from 'react';
import './App.css';

type Status = 'idle' | 'loading' | 'done' | 'error';

function App() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  // Al abrir el popup, precargamos la URL de la pestaña activa.
  // "activeTab" (ver wxt.config.ts) alcanza para leer esta URL sin pedir
  // permiso sobre todas las páginas.
  useEffect(() => {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (tab?.url && tab.url.startsWith('http')) {
          setInput(tab.url);
        }
      })
      .catch(() => {
        // Si falla, el usuario igual puede pegar la URL o el texto a mano.
      });
  }, []);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setStatus('loading');
    try {
      // TODO: reemplazar por el fetch real al backend (Cloud Run) cuando
      // esté definido el endpoint y el formato de respuesta del análisis.
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="app">
      <h1 className="app-header">
        alethe<span className="brand-ia">IA</span>
      </h1>
      <p className="subtitle">Analizá esta página o pegá una URL/texto</p>

      <textarea
        className="input"
        rows={4}
        placeholder="https://... o pegá el texto de la noticia"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        className="analyze-btn"
        onClick={handleAnalyze}
        disabled={status === 'loading' || !input.trim()}
      >
        {status === 'loading' ? 'Analizando...' : 'Analizar'}
      </button>

      {status === 'done' && (
        <p className="result-placeholder">
          Popup funcionando. Falta conectar el endpoint real del backend.
        </p>
      )}
      {status === 'error' && (
        <p className="result-error">Ocurrió un error al analizar.</p>
      )}
    </div>
  );
}

export default App;
