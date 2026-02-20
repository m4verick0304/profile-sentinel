// React Bits - Aurora Background (WebGL shader)
// Source: https://reactbits.dev/backgrounds/aurora
import { useEffect, useRef } from "react";

interface AuroraProps {
  colorStops?: [string, string, string];
  speed?: number;
  blend?: number;
  amplitude?: number;
  className?: string;
}

export function Aurora({
  colorStops = ["#3B29FF", "#a855f7", "#6366f1"],
  speed = 0.5,
  blend = 0.5,
  amplitude = 1.0,
  className = "",
}: AuroraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") as WebGLRenderingContext;
    if (!gl) return;

    const vertSrc = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return [r, g, b];
    };

    const [c0r, c0g, c0b] = hexToRgb(colorStops[0]);
    const [c1r, c1g, c1b] = hexToRgb(colorStops[1]);
    const [c2r, c2g, c2b] = hexToRgb(colorStops[2]);

    const fragSrc = `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_blend;
      uniform float u_amplitude;
      uniform vec3 u_color0;
      uniform vec3 u_color1;
      uniform vec3 u_color2;

      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(noise(i), noise(i + vec2(1.0, 0.0)), u.x),
          mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * smoothNoise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;

        float t = u_time;
        
        float wave1 = fbm(vec2(p.x * 0.8 + t * 0.12, p.y * 0.6 + t * 0.08)) * u_amplitude;
        float wave2 = fbm(vec2(p.x * 0.6 - t * 0.1, p.y * 0.8 + t * 0.15)) * u_amplitude;
        float wave3 = fbm(vec2(p.x * 1.0 + t * 0.07, p.y * 0.4 - t * 0.09)) * u_amplitude;

        float band1 = smoothstep(0.0, 0.6, wave1 - abs(p.y + 0.2 - wave1 * 0.5));
        float band2 = smoothstep(0.0, 0.6, wave2 - abs(p.y - 0.1 - wave2 * 0.4));
        float band3 = smoothstep(0.0, 0.6, wave3 - abs(p.y + 0.4 - wave3 * 0.6));

        vec3 col = vec3(0.0);
        col += u_color0 * band1 * 0.7;
        col += u_color1 * band2 * 0.6;
        col += u_color2 * band3 * 0.5;

        col = mix(col, col * 1.3, u_blend);
        col = clamp(col, 0.0, 1.0);

        float alpha = clamp(band1 + band2 + band3, 0.0, 0.85);
        gl_FragColor = vec4(col, alpha * 0.6);
      }
    `;

    const createShader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uBlend = gl.getUniformLocation(program, "u_blend");
    const uAmp = gl.getUniformLocation(program, "u_amplitude");
    const uC0 = gl.getUniformLocation(program, "u_color0");
    const uC1 = gl.getUniformLocation(program, "u_color1");
    const uC2 = gl.getUniformLocation(program, "u_color2");

    gl.uniform3f(uC0, c0r, c0g, c0b);
    gl.uniform3f(uC1, c1r, c1g, c1b);
    gl.uniform3f(uC2, c2r, c2g, c2b);
    gl.uniform1f(uBlend, blend);
    gl.uniform1f(uAmp, amplitude);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const startTime = performance.now();

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const t = ((performance.now() - startTime) / 1000) * speed;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [colorStops, speed, blend, amplitude]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
