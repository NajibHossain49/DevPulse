export function HeroVisual() {
  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden bg-[oklch(0.2_0.035_230)] text-[oklch(0.96_0.01_210)] md:min-h-[420px]">
      <div className="absolute inset-0 marketing-aurora opacity-70" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.72 0.12 195 / 0.15) 1px, transparent 1px), linear-gradient(90deg, oklch(0.72 0.12 195 / 0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex h-full flex-col p-6 sm:p-8 lg:p-10">
        <div className="mb-6 flex items-center justify-between text-xs tracking-wide text-white/55">
          <span>Team velocity · last 30 days</span>
          <span className="text-[oklch(0.78_0.12_195)]">Live</span>
        </div>

        <div className="grid flex-1 grid-cols-12 gap-4">
          <div className="col-span-12 flex flex-col justify-between sm:col-span-4">
            <div>
              <p className="text-xs text-white/50">Cycle time</p>
              <p className="mt-1 font-heading text-4xl font-semibold tracking-tight">
                18.4
                <span className="ml-1 text-lg font-normal text-white/45">h</span>
              </p>
              <p className="mt-2 text-sm text-[oklch(0.78_0.12_160)]">
                ↓ 22% vs last sprint
              </p>
            </div>
            <div className="mt-8">
              <p className="text-xs text-white/50">PR quality</p>
              <p className="mt-1 font-heading text-4xl font-semibold tracking-tight">
                91
              </p>
            </div>
          </div>

          <div className="col-span-12 sm:col-span-8">
            <svg
              viewBox="0 0 480 180"
              className="h-full w-full animate-marketing-drift"
              fill="none"
              aria-hidden
            >
              <path
                d="M0 140 C40 132, 70 90, 110 95 S170 150, 210 120 S280 40, 320 70 S400 150, 480 60"
                stroke="oklch(0.72 0.12 195)"
                strokeWidth="2.5"
                className="animate-marketing-pulse-line"
              />
              <path
                d="M0 140 C40 132, 70 90, 110 95 S170 150, 210 120 S280 40, 320 70 S400 150, 480 60 V180 H0 Z"
                fill="url(#pulseFill)"
                opacity="0.35"
              />
              <defs>
                <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.12 195)" />
                  <stop offset="100%" stopColor="oklch(0.72 0.12 195 / 0)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-sm">
          <div>
            <p className="text-white/45">DORA</p>
            <p className="mt-1 font-medium">Elite</p>
          </div>
          <div>
            <p className="text-white/45">Reviews</p>
            <p className="mt-1 font-medium">2.1h avg</p>
          </div>
          <div>
            <p className="text-white/45">AI score</p>
            <p className="mt-1 font-medium">Stable</p>
          </div>
        </div>
      </div>
    </div>
  );
}
