const stats = [
  { value: '+12.000', label: 'Noticias analizadas' },
  { value: '94%', label: 'Precisión del análisis' },
  { value: '6', label: 'Fuentes verificadoras' },
]

export function StatsBar() {
  return (
    <section className="bg-blue">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 text-center sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center">
            <span className="font-serif text-4xl font-bold text-ice sm:text-5xl">
              {stat.value}
            </span>
            <span className="mt-2 text-sm font-medium text-ice/80">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
