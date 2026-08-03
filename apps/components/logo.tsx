export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center">
        <svg
          viewBox="0 0 40 40"
          className="h-10 w-10"
          fill="none"
          aria-hidden="true"
        >
          {/* Hexagon */}
          <path
            d="M20 2L34.6 10.5V27.5L20 36L5.4 27.5V10.5L20 2Z"
            fill="#10233a"
            stroke="#1a6db5"
            strokeWidth="1.5"
          />
          {/* Light arc lines */}
          <path
            d="M12 24C13.5 17 17 13.5 24 13"
            stroke="#60b8f0"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M15 26C16.5 20.5 19 18 24.5 17"
            stroke="#60b8f0"
            strokeWidth="1.75"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M18 27.5C19 23.5 21 21.5 25 20.5"
            stroke="#60b8f0"
            strokeWidth="1.75"
            strokeLinecap="round"
            opacity="0.45"
          />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-serif text-lg font-bold tracking-wide text-ice">
          BOREAL
        </span>
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.35em] text-blue-light">
          Data
        </span>
      </div>
    </div>
  )
}
