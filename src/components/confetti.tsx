"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
  size: number;
}

export function ConfettiBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = ["#06B6D4", "#22D3EE", "#67E8F9", "#A5F3FC", "#ECFEFF", "#F59E0B", "#10B981"];
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: i,
        x: 0,
        y: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.5,
        speed: 40 + Math.random() * 60,
        size: 4 + Math.random() * 4,
      });
    }
    setParticles(newParticles);
    const timer = setTimeout(onDone, 600);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" style={{ left: x, top: y }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: 0,
            top: 0,
            transform: `translate(${Math.cos(p.angle) * p.speed}px, ${Math.sin(p.angle) * p.speed}px)`,
            opacity: 0,
            transition: "all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            animation: "confetti-pop 0.5s ease-out forwards",
          }}
        />
      ))}
    </div>
  );
}
