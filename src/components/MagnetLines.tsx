// React Bits - Magnet Lines Background
// Source: https://reactbits.dev/backgrounds/magnet-lines
import { useEffect, useRef } from "react";

interface MagnetLinesProps {
  rows?: number;
  columns?: number;
  containerSize?: string;
  lineColor?: string;
  lineWidth?: string;
  lineHeight?: string;
  baseAngle?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function MagnetLines({
  rows = 12,
  columns = 16,
  containerSize = "100%",
  lineColor = "hsl(var(--primary) / 0.35)",
  lineWidth = "1.5px",
  lineHeight = "28px",
  baseAngle = -5,
  className = "",
  style = {},
}: MagnetLinesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spansRef = useRef<HTMLSpanElement[]>([]);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      mouse.current = { x: clientX - rect.left, y: clientY - rect.top };
      updateLines();
    };

    const updateLines = () => {
      spansRef.current.forEach((span) => {
        if (!span) return;
        const rect = span.getBoundingClientRect();
        const parentRect = container.getBoundingClientRect();
        const cx = rect.left - parentRect.left + rect.width / 2;
        const cy = rect.top - parentRect.top + rect.height / 2;
        const dx = mouse.current.x - cx;
        const dy = mouse.current.y - cy;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        span.style.transform = `rotate(${angle}deg)`;
      });
    };

    // Set initial angles
    spansRef.current.forEach((span) => {
      if (span) span.style.transform = `rotate(${baseAngle}deg)`;
    });

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove as EventListener);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove as EventListener);
    };
  }, [baseAngle, rows, columns]);

  const total = rows * columns;

  return (
    <div
      ref={containerRef}
      className={`grid pointer-events-none ${className}`}
      style={{
        width: containerSize,
        height: containerSize,
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        ...style,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          <span
            ref={(el) => { if (el) spansRef.current[i] = el; }}
            style={{
              display: "block",
              width: lineWidth,
              height: lineHeight,
              backgroundColor: lineColor,
              borderRadius: "9999px",
              transform: `rotate(${baseAngle}deg)`,
              transition: "transform 0.08s ease-out",
            }}
          />
        </div>
      ))}
    </div>
  );
}
