import React from "react";

const STATIC_CELLS = [
  { left: "10%", top: "15%", width: "22px", height: "19px", opacity: 0.13 },
  { left: "85%", top: "25%", width: "16px", height: "14px", opacity: 0.12 },
  { left: "78%", top: "65%", width: "24px", height: "20px", opacity: 0.14 },
  { left: "15%", top: "75%", width: "15px", height: "13px", opacity: 0.1 },
];

export default function FloatingParticles() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {STATIC_CELLS.map((cell, index) => (
        <div
          key={index}
          className="floating-cell"
          style={{
            left: cell.left,
            top: cell.top,
            width: cell.width,
            height: cell.height,
            opacity: cell.opacity,
          }}
        />
      ))}
    </div>
  );
}

