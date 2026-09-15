import React, { useEffect, useRef, useState } from "react";
import DrippingBloodIcon from "./DrippingBloodIcon";
import FloatingParticles from "./FloatingParticles";
import { Heart, Sparkles, ShieldCheck } from "lucide-react";

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const onFinishRef = useRef(onFinish);

  // Keep ref synchronized without triggering re-effects
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // Prevent scrolling while splash screen is active
    document.body.style.overflow = "hidden";

    // Stage 1: Trigger smooth fade-out + scale-out exit after ~4.4 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 4400);

    // Stage 2: Completely unmount and reveal site after animation finishes (exactly 5.0 seconds total)
    const finishTimer = setTimeout(() => {
      setIsDone(true);
      document.body.style.overflow = "";
      if (onFinishRef.current) {
        onFinishRef.current();
      }
    }, 5000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
      document.body.style.overflow = "";
    };
  }, []); // Run strictly once on mount

  // If unmounted completely, don't render anything
  if (isDone) return null;

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsDone(true);
      document.body.style.overflow = "";
      if (onFinishRef.current) {
        onFinishRef.current();
      }
    }, 350);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 w-full h-[100dvh] min-h-[100dvh] z-50 flex flex-col items-center justify-between px-6 select-none cursor-pointer overflow-hidden transition-all duration-700 ease-out bg-[#B71C1C] ${
        isExiting
          ? "opacity-0 scale-[1.04] pointer-events-none filter blur-sm"
          : "opacity-100 scale-100"
      }`}
      style={{
        backgroundColor: "#B71C1C",
        paddingTop: "max(1.5rem, env(safe-area-inset-top, 1.5rem))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
        paddingLeft: "max(1.5rem, env(safe-area-inset-left, 1.5rem))",
        paddingRight: "max(1.5rem, env(safe-area-inset-right, 1.5rem))"
      }}
      aria-label="Ghotki Blood Network Intro"
    >
      {/* Floating Blood Cell Ambient Particles */}
      <FloatingParticles />

      {/* Top spacer / VIP verified badge */}
      <div className="w-full flex justify-center pt-2 sm:pt-4 animate-splash-fade-1 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/30 border border-white/25 text-white text-[10px] font-bold uppercase tracking-widest shadow-md shadow-black/30 whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
          <span>District Ghotki Verified Blood Portal</span>
        </div>
      </div>

      {/* Central Hero Block: Blood Logo + Title + Tagline */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm sm:max-w-md mx-auto my-auto space-y-4 sm:space-y-5 px-2">
        
        {/* 1. Animated Blood Drop Logo Tile (#3d0000 with soft white/rose glow) */}
        <div className="relative animate-splash-fade-1">
          {/* Soft white/rose glow aura */}
          <div className="absolute -inset-2.5 bg-gradient-to-tr from-rose-400/40 via-white/30 to-rose-400/40 rounded-3xl blur-md animate-pulse pointer-events-none" />
          <div className="relative p-3.5 rounded-3xl bg-[#3d0000] border border-white/30 shadow-[0_0_25px_rgba(255,255,255,0.25)] flex items-center justify-center">
            <DrippingBloodIcon size={56} className="transform hover:scale-105 transition-transform" />
          </div>
        </div>

        {/* 2. Brand Name: GHOTKI BLOOD NETWORK (Pure White) */}
        <div className="space-y-1 animate-splash-fade-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black tracking-tight whitespace-nowrap text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            GHOTKI BLOOD NETWORK
          </h1>
        </div>

        {/* 3. Tagline: SAFE BLOOD • SAVE LIVES (Pure White) */}
        <div className="animate-splash-fade-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/30 border border-white/25 shadow-md shadow-black/20">
            <Heart className="w-3.5 h-3.5 text-rose-300 fill-white shrink-0 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-display font-extrabold tracking-[0.2em] text-white uppercase whitespace-nowrap">
              SAFE BLOOD • SAVE LIVES
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Developer Attribution & Loading Bar */}
      <div className="w-full max-w-xs flex flex-col items-center space-y-4 pb-3 sm:pb-6 relative z-10">
        
        {/* 4. Developer Credit: Premium & Pure White Text */}
        <div className="animate-splash-fade-4 text-center px-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/30 border border-white/25 shadow-md shadow-black/20">
            <span className="text-[9px] uppercase tracking-widest text-white font-semibold whitespace-nowrap">
              Developed By
            </span>
            <span className="w-1 h-1 rounded-full bg-white/70" />
            <span className="font-display font-bold text-[11px] sm:text-xs tracking-wide text-white whitespace-nowrap">
              Subhan Ali Kalhoro
            </span>
          </div>
        </div>

        {/* 5. Animated Loading Progress Bar & Single-Row Pure White Loading Text */}
        <div className="w-48 sm:w-56 space-y-2.5 animate-splash-fade-5">
          <div className="h-1.5 w-full bg-black/35 rounded-full overflow-hidden border border-white/25 p-[1px] shadow-inner">
            <div className="h-full w-full bg-gradient-to-r from-white via-rose-100 to-white rounded-full origin-left animate-splash-progress shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </div>
          <div className="w-full flex items-center justify-between text-[10px] font-mono font-medium text-white px-0.5 leading-none">
            <span className="animate-pulse text-white whitespace-nowrap">Loading verified donors...</span>
            <span className="font-bold text-white whitespace-nowrap pl-2">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
