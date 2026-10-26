import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { IdiomaProvider } from './use-idioma';
import { leerIdioma } from '@/lib/idioma';
import './style.css';

// El idioma se resuelve ANTES del primer render (es una lectura de storage, unos pocos
// ms): renderizar con un valor provisorio y corregirlo pintaba un frame en el idioma
// equivocado.
leerIdioma().then((idioma) => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <IdiomaProvider inicial={idioma}>
        <App />
      </IdiomaProvider>
    </React.StrictMode>,
  );
});
