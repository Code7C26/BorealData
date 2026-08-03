export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-navy px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          © 2026 Boreal Data — AletheIA
        </p>
        <div className="flex items-center gap-6">
          <a
            href="#"
            className="text-sm text-muted-foreground transition-colors hover:text-ice"
          >
            Privacidad
          </a>
          <a
            href="#"
            className="text-sm text-muted-foreground transition-colors hover:text-ice"
          >
            Términos
          </a>
          <a
            href="#"
            className="text-sm text-muted-foreground transition-colors hover:text-ice"
          >
            Contacto
          </a>
        </div>
      </div>
    </footer>
  )
}
