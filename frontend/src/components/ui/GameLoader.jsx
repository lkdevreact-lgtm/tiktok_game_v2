import { useState, useEffect, useRef, useMemo } from "react";

const GameLoader = ({ ready, onFadeComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const startTime = useRef(0);

  // Random particles - memoized once (deterministic, no Math.random)
  const particles = useMemo(
    () =>
      [...Array(20)].map((_, i) => ({
        w: 2 + (((i * 7 + 3) * 13) % 6),
        left: ((i * 31 + 17) * 7) % 100,
        top: ((i * 43 + 11) * 3) % 100,
        color: i % 2 === 0 ? "#ef4444" : "#3b82f6",
        delay: ((i * 17) % 30) / 10,
        dur: 2 + ((i * 13) % 30) / 10,
      })),
    []
  );

  // Initialize startTime in effect (performance.now is impure)
  useEffect(() => {
    startTime.current = performance.now();
  }, []);

  // Animate progress: tăng dần lên ~90 rồi chờ ready để nhảy lên 100
  useEffect(() => {
    let raf;
    const tick = () => {
      const elapsed = performance.now() - startTime.current;
      if (ready) {
        setProgress(100);
      } else {
        // Tăng nhanh đầu, chậm dần, tối đa 90%
        const t = Math.min(1, elapsed / 8000);
        const eased = 1 - Math.pow(1 - t, 2);
        setProgress(Math.round(eased * 90));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  // Khi progress = 100 → fade out
  useEffect(() => {
    if (progress >= 100 && !fadeOut) {
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          onFadeComplete?.();
        }, 800);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [progress, fadeOut, onFadeComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-pulse"
            style={{
              width: `${p.w}px`,
              height: `${p.w}px`,
              left: `${p.left}%`,
              top: `${p.top}%`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}
      </div>

      {/* User hero web decoration lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-white/10 via-transparent to-white/10" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-white/10 via-transparent to-white/10" />
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: `
              linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.03) 49%, rgba(255,255,255,0.03) 51%, transparent 52%),
              linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.03) 49%, rgba(255,255,255,0.03) 51%, transparent 52%)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Logo / Title */}
      <div className="relative mb-10 select-none">
        <h1
          className="text-6xl font-black tracking-wider"
          style={{
            fontFamily: "'Lato', sans-serif",
            background:
              "linear-gradient(135deg, #ef4444 0%, #dc2626 40%, #3b82f6 60%, #2563eb 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 30px rgba(239, 68, 68, 0.4))",
          }}
        >
          WIBU COMBAT
        </h1>
        <p
          className="text-center text-lg tracking-[0.5em] mt-1 font-light"
          style={{
            color: "#94a3b8",
            fontFamily: "'Lato', sans-serif",
          }}
        >
          VS Monster
        </p>
      </div>

      {/* Loading spinner */}
      <div className="relative w-24 h-24 mb-10">
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderTopColor: "#ef4444",
            borderRightColor: "#ef444466",
            animationDuration: "1.2s",
          }}
        />
        <div
          className="absolute inset-3 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderBottomColor: "#3b82f6",
            borderLeftColor: "#3b82f666",
            animationDuration: "1.8s",
            animationDirection: "reverse",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{
              background: "radial-gradient(circle, #ef4444, #3b82f6)",
              boxShadow: "0 0 15px rgba(239, 68, 68, 0.5)",
            }}
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-72 relative">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden backdrop-blur-sm">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, #ef4444, #8b5cf6, #3b82f6)",
              boxShadow:
                "0 0 12px rgba(239, 68, 68, 0.5), 0 0 24px rgba(59, 130, 246, 0.3)",
            }}
          />
        </div>
        <div className="flex justify-between items-center mt-3">
          <span
            className="text-xs tracking-widest uppercase"
            style={{
              color: "#64748b",
              fontFamily: "'Lato', sans-serif",
            }}
          >
            {progress >= 100 ? "Ready" : "Loading"}
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{
              background: "linear-gradient(90deg, #ef4444, #3b82f6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "'Lato', sans-serif",
            }}
          >
            {progress}%
          </span>
        </div>
      </div>

      {/* Bottom tip */}
      <p
        className="absolute bottom-8 text-xs tracking-wider animate-pulse"
        style={{
          color: "#475569",
          fontFamily: "'Lato', sans-serif",
        }}
      >
        {progress >= 100 ? "Entering the battle..." : "Preparing the battlefield..."}
      </p>
    </div>
  );
};

export default GameLoader;
