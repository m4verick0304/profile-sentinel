// React Bits - Pixel Trail Cursor (Canvas 2D implementation)
// Source: https://reactbits.dev/cursor/pixel-trail
import { useEffect, useRef } from "react";

interface PixelTrailProps {
  gridSize?: number;
  trailSize?: number;
  maxAge?: number;
  interpolate?: number;
  color?: string;
  className?: string;
}

export function PixelTrail({
  gridSize = 32,
  trailSize = 0.18,
  maxAge = 400,
  interpolate = 5,
  color = "hsl(var(--primary))",
  className = "",
}: PixelTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const cols = Math.ceil(w / gridSize);
    const rows = Math.ceil(h / gridSize);

    interface Pixel { x: number; y: number; age: number; born: number }
    const pixels: Map<string, Pixel> = new Map();

    let mouseX = -9999;
    let mouseY = -9999;
    let prevX = -9999;
    let prevY = -9999;

    const addPixel = (cx: number, cy: number) => {
      const col = Math.floor(cx / gridSize);
      const row = Math.floor(cy / gridSize);
      if (col < 0 || col >= cols || row < 0 || row >= rows) return;
      const key = `${col},${row}`;
      pixels.set(key, { x: col * gridSize, y: row * gridSize, age: 0, born: performance.now() });
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);

    const render = (now: number) => {
      ctx.clearRect(0, 0, w, h);

      // Interpolate cursor movement
      if (prevX === -9999) { prevX = mouseX; prevY = mouseY; }
      const steps = interpolate;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const ix = prevX + (mouseX - prevX) * t;
        const iy = prevY + (mouseY - prevY) * t;
        addPixel(ix, iy);
      }
      prevX = mouseX;
      prevY = mouseY;

      // Draw and age pixels
      pixels.forEach((px, key) => {
        const age = now - px.born;
        if (age > maxAge) { pixels.delete(key); return; }
        const life = 1 - age / maxAge;
        const size = gridSize * trailSize;
        ctx.save();
        ctx.globalAlpha = life * 0.85;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(px.x + (gridSize - size) / 2, px.y + (gridSize - size) / 2, size, size, size * 0.25);
        ctx.fill();
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, [gridSize, trailSize, maxAge, interpolate, color]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[9999] ${className}`}
      style={{ mixBlendMode: "screen" }}
    />
  );
}
