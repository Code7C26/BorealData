import { FileSearch, Target, ShieldCheck } from 'lucide-react'

const stats = [
  { icon: FileSearch, value: '+12.000', label: 'Noticias analizadas' },
  { icon: Target, value: '94%', label: 'Precisión del análisis' },
  { icon: ShieldCheck, value: '6', label: 'Fuentes verificadoras' },
]

export function StatsBar() {
  return (
    <section className="relative px-6 pb-6 -mt-14 sm:-mt-16">
      <div className="relative mx-auto max-w-5xl">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-blue via-[#1560a0] to-navy-light opacity-90 shadow-2xl shadow-blue/30"
        />
        <div className="grid grid-cols-1 gap-6 rounded-3xl border border-white/10 p-8 sm:grid-cols-3 sm:gap-4 sm:p-10">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-2 text-center sm:border-r sm:border-white/15 sm:last:border-r-0"
            >
              <stat.icon className="h-5 w-5 text-ice/70" aria-hidden="true" />
              <span className="font-serif text-4xl font-bold text-ice sm:text-5xl">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-ice/80">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
