// React Bits - Text Pressure (variable font cursor interaction)
// Source: https://reactbits.dev/text-animations/text-pressure
import { useEffect, useRef, useState, useCallback } from "react";

interface TextPressureProps {
  text?: string;
  fontUrl?: string;
  width?: boolean;
  weight?: boolean;
  italic?: boolean;
  alpha?: boolean;
  flex?: boolean;
  stroke?: boolean;
  scale?: boolean;
  textColor?: string;
  strokeColor?: string;
  className?: string;
  minFontSize?: number;
}

export function TextPressure({
  text = "ProfileGuard",
  fontUrl = "https://fonts.gstatic.com/s/raleway/v28/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvao9SKWvO1d7ktqA.woff2",
  width = true,
  weight = true,
  italic = true,
  alpha = false,
  flex = true,
  stroke = false,
  scale = false,
  textColor = "currentColor",
  strokeColor = "hsl(var(--primary))",
  className = "",
  minFontSize = 24,
}: TextPressureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const spansRef = useRef<(HTMLSpanElement | null)[]>([]);

  const mouseRef = useRef({ x: 0, y: 0 });
  const [fontSize, setFontSize] = useState(72);
  const [scaleY, setScaleY] = useState(1);

  const chars = text.split("");

  const calcFontSize = useCallback(() => {
    if (!containerRef.current || !titleRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    let fs = Math.max(minFontSize, containerWidth / (chars.length * 0.6));
    if (scale) {
      const containerHeight = containerRef.current.offsetHeight;
      titleRef.current.style.fontSize = fs + "px";
      const titleHeight = titleRef.current.offsetHeight;
      if (titleHeight > 0) setScaleY(containerHeight / titleHeight);
    }
    setFontSize(fs);
  }, [chars.length, minFontSize, scale]);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const setProperties = useCallback(() => {
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    spansRef.current.forEach((span) => {
      if (!span) return;
      const rect = span.getBoundingClientRect();
      const charCX = rect.left + rect.width / 2;
      const charCY = rect.top + rect.height / 2;

      const dx = mx - charCX;
      const dy = my - charCY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 300;

      const proximity = Math.max(0, 1 - dist / maxDist);

      if (weight) span.style.fontVariationSettings = `"wght" ${lerp(100, 900, proximity)}`;
      if (width) {
        const widthVal = lerp(75, 125, proximity);
        span.style.fontVariationSettings += `, "wdth" ${widthVal}`;
      }
      if (italic) {
        const italicVal = lerp(0, 1, proximity);
        span.style.fontStyle = `oblique ${italicVal * 12}deg`;
      }
      if (alpha) {
        span.style.opacity = String(lerp(0.3, 1, proximity));
      }
      if (stroke) {
        span.style.webkitTextStrokeWidth = `${lerp(0, 3, proximity)}px`;
      }
    });
  }, [weight, width, italic, alpha, stroke]);

  useEffect(() => {
    calcFontSize();
    window.addEventListener("resize", calcFontSize);
    return () => window.removeEventListener("resize", calcFontSize);
  }, [calcFontSize]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      setProperties();
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [setProperties]);

  return (
    <div ref={containerRef} className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <h1
        ref={titleRef}
        className="select-none leading-none"
        style={{
          fontSize: `${fontSize}px`,
          transform: scale ? `scaleY(${scaleY})` : undefined,
          display: flex ? "flex" : "block",
          justifyContent: flex ? "center" : undefined,
          flexWrap: flex ? "nowrap" : undefined,
          color: textColor,
          WebkitTextStrokeColor: strokeColor,
        }}
      >
        {chars.map((char, i) => (
          <span
            key={i}
            ref={(el) => { spansRef.current[i] = el; }}
            style={{
              display: "inline-block",
              fontVariationSettings: `"wght" 100`,
              transition: "font-variation-settings 0.1s ease, opacity 0.1s ease",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </h1>
    </div>
  );
}
