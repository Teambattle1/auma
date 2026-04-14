import { useState, useEffect } from 'react'

interface Props {
  onComplete: () => void
}

export default function AumaFlowIntro({ onComplete }: Props) {
  const [phase, setPhase] = useState(0)
  // 0=start, 1=AUMA in, 2=FLOW in, 3=pulse, 4=fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 3000),
      setTimeout(() => onComplete(), 3800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-red-700 transition-opacity duration-700 ${
        phase >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Animated background waves */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`auma-wave auma-wave-1 ${phase >= 1 ? 'auma-wave-active' : ''}`} />
        <div className={`auma-wave auma-wave-2 ${phase >= 1 ? 'auma-wave-active' : ''}`} />
        <div className={`auma-wave auma-wave-3 ${phase >= 2 ? 'auma-wave-active' : ''}`} />
      </div>

      {/* Flowing particles */}
      <div className="absolute inset-0 overflow-hidden">
        {phase >= 2 && Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="auma-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Center line that expands */}
      <div
        className={`absolute h-[2px] bg-white/60 top-1/2 left-1/2 -translate-x-1/2 transition-all duration-1000 ease-out ${
          phase >= 1 ? 'w-[300px] md:w-[500px]' : 'w-0'
        }`}
        style={{ marginTop: '40px' }}
      />

      {/* Main text */}
      <div className="relative z-10 text-center">
        {/* AUMA */}
        <div className="overflow-hidden">
          <h1
            className={`text-7xl md:text-9xl font-black tracking-[0.3em] text-white transition-all duration-700 ease-out ${
              phase >= 1
                ? 'translate-y-0 opacity-100'
                : 'translate-y-full opacity-0'
            }`}
          >
            {'AUMA'.split('').map((letter, i) => (
              <span
                key={i}
                className="inline-block transition-all duration-500"
                style={{
                  transitionDelay: `${i * 100 + 200}ms`,
                  transform: phase >= 1 ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.5)',
                  opacity: phase >= 1 ? 1 : 0,
                }}
              >
                {letter}
              </span>
            ))}
          </h1>
        </div>

        {/* FLOW */}
        <div className="overflow-hidden mt-[-10px]">
          <div
            className={`flex items-center justify-center gap-2 transition-all duration-700 ease-out ${
              phase >= 2
                ? 'translate-y-0 opacity-100'
                : 'translate-y-8 opacity-0'
            }`}
          >
            <div className={`h-[1px] bg-white/80 transition-all duration-700 ${phase >= 2 ? 'w-8 md:w-16' : 'w-0'}`} />
            <span
              className={`text-2xl md:text-4xl font-light tracking-[0.6em] text-white/90 transition-all duration-500 ${
                phase >= 2 ? 'tracking-[0.6em]' : 'tracking-[0.1em]'
              }`}
            >
              {'FLOW'.split('').map((letter, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    transitionDelay: `${i * 80 + 1000}ms`,
                    transition: 'all 0.5s ease-out',
                    opacity: phase >= 2 ? 1 : 0,
                    transform: phase >= 2 ? 'translateX(0)' : 'translateX(-20px)',
                  }}
                >
                  {letter}
                </span>
              ))}
            </span>
            <div className={`h-[1px] bg-white/80 transition-all duration-700 ${phase >= 2 ? 'w-8 md:w-16' : 'w-0'}`} />
          </div>
        </div>

        {/* Spacer where subtitle was */}
        <div className="mt-6" />

        {/* Glowing pulse ring */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 transition-all duration-1000 ${
            phase >= 3 ? 'w-[400px] h-[400px] md:w-[600px] md:h-[600px] opacity-0' : 'w-[100px] h-[100px] opacity-40'
          }`}
        />
      </div>
    </div>
  )
}
