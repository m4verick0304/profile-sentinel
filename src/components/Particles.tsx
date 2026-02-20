// React Bits - Particles Background (Canvas 2D)
// Source: https://reactbits.dev/backgrounds/particles
import { useEffect, useRef } from "react";

interface ParticleConfig {
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  color?: string;
  vx?: number;
  vy?: number;
  opacity?: number;
}

export function Particles({
  quantity = 60,
  staticity = 50,
  ease = 50,
  size = 0.4,
  color = "#6366f1",
  vx = 0,
  vy = 0,
  opacity = 0.5,
}: ParticleConfig) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const mouseOnCanvas = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d")!;
    let dpr = window.devicePixelRatio || 1;
    let w = 0, h = 0;
    let particles: Particle[] = [];

    type Particle = {
      x: number; y: number;
      translateX: number; translateY: number;
      size: number; alpha: number;
      targetAlpha: number; dx: number; dy: number;
      magnetism: number;
    };

    const hexToRgb = (hex: string) => {
      const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 99, g: 102, b: 241 };
    };

    const rgb = hexToRgb(color);

    const resize = () => {
      w = container.offsetWidth;
      h = container.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.scale(dpr, dpr);
      particles = [];
      for (let i = 0; i < quantity; i++) initParticle();
    };

    const initParticle = () => {
      const p: Particle = {
        x: Math.random() * w,
        y: Math.random() * h,
        translateX: 0, translateY: 0,
        size: Math.random() * 2 + size,
        alpha: 0,
        targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
        dx: (Math.random() - 0.5) * 0.2 + vx,
        dy: (Math.random() - 0.5) * 0.2 + vy,
        magnetism: 0.1 + Math.random() * 4,
      };
      particles.push(p);
    };

    const drawParticle = (p: Particle) => {
      ctx.translate(p.translateX, p.translateY);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha})`;
      ctx.fill();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.translateX += (mouseOnCanvas.current ? ((mouseRef.current.x / (staticity / p.magnetism)) - p.translateX) : -p.translateX) / ease;
        p.translateY += (mouseOnCanvas.current ? ((mouseRef.current.y / (staticity / p.magnetism)) - p.translateY) : -p.translateY) / ease;

        if (p.alpha < p.targetAlpha) p.alpha = Math.min(p.alpha + 0.02, p.targetAlpha);

        if (p.x < -p.size || p.x > w + p.size || p.y < -p.size || p.y > h + p.size) {
          particles.splice(i, 1);
          initParticle();
          continue;
        }

        drawParticle(p);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", resize);
    canvas.addEventListener("mouseenter", () => (mouseOnCanvas.current = true));
    canvas.addEventListener("mouseleave", () => (mouseOnCanvas.current = false));

    resize();
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
    };
  }, [quantity, staticity, ease, size, color, vx, vy, opacity]);

  return (
    <div ref={canvasContainerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
