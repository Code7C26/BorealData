

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-navy/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" aria-label="Boreal Data — inicio">
         <div className="flex items-center gap-3">
  <img 
    src="/logoAletheia.png" 
    alt="AletheIA" 
    className="h-10 object-contain" 
  />
  <div className="flex flex-col leading-tight">
    <span className="text-white font-bold text-sm tracking-widest uppercase">
      Boreal Data
    </span>
    <span className="text-blue-400 text-xs tracking-wider">
      by AletheIA
    </span>
  </div>
</div>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#como-funciona"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-ice"
          >
            Cómo funciona
          </a>
          <a
            href="#acerca-de"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-ice"
          >
            Acerca de
          </a>
        </div>

        <button className="rounded-lg bg-blue px-5 py-2 text-sm font-semibold text-ice shadow-lg shadow-blue/20 transition-all hover:bg-blue-light hover:text-navy hover:shadow-blue-light/30">
          Iniciar sesión
        </button>
      </nav>
    </header>
  )
}
