'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export function CerrarSesionBoton() {
  const router = useRouter()

  const handleClick = async () => {
    const confirmado = window.confirm('¿Cerrás la sesión?')
    if (!confirmado) return

    await signOut(auth)
    router.push('/')
  }

  /* Sin coral: el coral (--falso) es del veredicto de una noticia, no de una
     acción del producto. Cerrar sesión es reversible y no es un error. */
  return (
    <button onClick={handleClick} className="btn-secondary shrink-0">
      <LogOut aria-hidden="true" size={16} />
      Cerrar sesión
    </button>
  )
}
