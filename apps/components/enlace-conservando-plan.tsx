'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Props = { href: string; className?: string; children: React.ReactNode }

function EnlaceConPlan({ href, className, children }: Props) {
  const premium = useSearchParams().get('plan') === 'premium'
  return (
    <Link href={premium ? `${href}?plan=premium` : href} className={className}>
      {children}
    </Link>
  )
}

/**
 * Link entre login y registro que conserva `?plan=premium`: quien tocó "Empezar con
 * Premium" y ya tenía cuenta pasa al login sin perder el camino al checkout.
 * useSearchParams necesita su propio Suspense; mientras tanto, el link sin el plan.
 */
export function EnlaceConservandoPlan(props: Props) {
  return (
    <Suspense
      fallback={
        <Link href={props.href} className={props.className}>
          {props.children}
        </Link>
      }
    >
      <EnlaceConPlan {...props} />
    </Suspense>
  )
}
