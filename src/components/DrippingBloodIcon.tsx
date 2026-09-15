import React from "react";

export default function DrippingBloodIcon({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size * 1.3 }}>
      {/* Background soft glowing aura without blur or pulse */}
      <span className="absolute inset-0 bg-white/20 rounded-full pointer-events-none scale-110" />

      {/* Main Vector Blood Drop (Static Body) */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10 drop-shadow-[0_4px_10px_rgba(255,77,109,0.8)]"
        fill="currentColor"
      >
        <path
          d="M50,10 C50,10 82,45 82,68 C82,85 68,96 50,96 C32,96 18,85 18,68 C18,45 50,10 50,10 Z"
          className="text-[#ff4d6d]"
        />
        {/* Bright white glossy highlight for clear pop & depth */}
        <path
          d="M40,32 C35,45 32,55 35,65 C36,68 33,68 32,65 C29,55 32,45 37,30 C38,27 41,29 40,32 Z"
          fill="rgba(255, 255, 255, 0.95)"
        />
        {/* Little gold crest for VIP premium decoration */}
        <circle cx="50" cy="68" r="4.5" fill="#ffd700" />
      </svg>
    </div>
  );
}

