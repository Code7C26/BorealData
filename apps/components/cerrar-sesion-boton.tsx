'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'

const TEXTOS = traducciones({
  es: { confirmar: '¿Cerrás la sesión?', cerrar: 'Cerrar sesión' },
  en: { confirmar: 'Log out?', cerrar: 'Log out' },
})

export function CerrarSesionBoton() {
  const router = useRouter()
  const t = useTextos(TEXTOS)

  const handleClick = async () => {
    const confirmado = window.confirm(t.confirmar)
    if (!confirmado) return

    await signOut(auth)
    router.push('/')
  }

  /* Sin coral: el coral (--falso) es del veredicto de una noticia, no de una
     acción del producto. Cerrar sesión es reversible y no es un error. */
  return (
    <button onClick={handleClick} className="btn-secondary shrink-0">
      <LogOut aria-hidden="true" size={16} />
      {t.cerrar}
    </button>
  )
}
