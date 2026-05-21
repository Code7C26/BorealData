export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-blue-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-900 rounded-sm flex items-center justify-center">
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <div>
            <p className="text-blue-900 font-bold text-sm tracking-widest font-serif">BOREAL</p>
            <p className="text-blue-600 text-xs tracking-widest">DATA</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-blue-400 text-sm">Cómo funciona</span>
          <span className="text-blue-400 text-sm">Acerca de</span>
          <button className="bg-blue-700 text-white text-sm px-4 py-2 rounded-md">
            Iniciar sesión
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center text-center px-8 py-16 bg-white">
        <span className="text-blue-600 bg-blue-50 border border-blue-200 text-xs px-4 py-1 rounded-full mb-6">
          Detector de noticias falsas con IA
        </span>
        <h1 className="text-4xl font-bold text-blue-900 font-serif mb-4 leading-tight">
          ¿Es esta noticia <br />
          <span className="text-blue-600">verdadera?</span>
        </h1>
        <p className="text-blue-400 text-sm max-w-md mb-10 leading-relaxed">
          Pegá una URL o texto y AletheIA analiza la fuente, 
          verifica los datos y te explica por qué es confiable o no.
        </p>

        {/* INPUT CARD */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 w-full max-w-xl mb-4">
          <div className="flex gap-2 mb-4">
            <button className="bg-blue-700 text-white text-xs px-4 py-2 rounded-md">URL</button>
            <button className="bg-white text-blue-400 text-xs px-4 py-2 rounded-md border border-blue-100">Texto</button>
          </div>
          <input
            type="text"
            placeholder="https://www.ejemplo.com/noticia..."
            className="w-full bg-white border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-300 mb-3 outline-none"
          />
          <button className="w-full bg-blue-700 text-white py-3 rounded-lg text-sm font-medium">
            Analizar con AletheIA
          </button>
        </div>
        <p className="text-xs text-blue-300">
          Ejemplo: pegá el link de una noticia de WhatsApp o redes sociales
        </p>
      </section>

      {/* STATS */}
      <div className="flex justify-center bg-blue-700">
        <div className="flex">
          <div className="text-center px-12 py-5 border-r border-blue-600">
            <p className="text-white text-2xl font-bold font-serif">+12.000</p>
            <p className="text-blue-200 text-xs mt-1">Noticias analizadas</p>
          </div>
          <div className="text-center px-12 py-5 border-r border-blue-600">
            <p className="text-white text-2xl font-bold font-serif">94%</p>
            <p className="text-blue-200 text-xs mt-1">Precisión del análisis</p>
          </div>
          <div className="text-center px-12 py-5">
            <p className="text-white text-2xl font-bold font-serif">6</p>
            <p className="text-blue-200 text-xs mt-1">Fuentes verificadoras</p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-blue-900 px-8 py-4 flex justify-between items-center mt-auto">
        <span className="text-blue-300 text-xs">© 2026 Boreal Data — AletheIA</span>
        <div className="flex gap-4">
          <span className="text-blue-300 text-xs">Privacidad</span>
          <span className="text-blue-300 text-xs">Términos</span>
          <span className="text-blue-300 text-xs">Contacto</span>
        </div>
      </footer>

    </main>
  );
}