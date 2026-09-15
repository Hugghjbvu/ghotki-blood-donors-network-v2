import React, { useEffect, useState } from "react";

interface CounterProps {
  value: number;
  duration?: number; // duration in ms
}

export default function Counter({ value, duration = 1200 }: CounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setCount(0);
      return;
    }

    let start = 0;
    const end = value;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    
    // Fallback for safety or large ranges
    if (stepTime < 10) {
      const startTime = performance.now();
      let aniFrameId: number;

      const updateCount = (timestamp: number) => {
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCount(Math.floor(progress * range + start));
        
        if (progress < 1) {
          aniFrameId = requestAnimationFrame(updateCount);
        }
      };

      aniFrameId = requestAnimationFrame(updateCount);
      return () => cancelAnimationFrame(aniFrameId);
    } else {
      const timer = setInterval(() => {
        current += increment;
        setCount(current);
        if (current === end) {
          clearInterval(timer);
        }
      }, stepTime);

      return () => clearInterval(timer);
    }
  }, [value, duration]);

  return <span className="font-display font-extrabold tracking-tight">{count}</span>;
}
