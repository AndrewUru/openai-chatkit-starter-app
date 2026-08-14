"use client";

import { CSSProperties, memo, useEffect, useRef } from "react";

type FutureWheelWebGLProps = {
  labels: string[];
  rotation: number;
  spinning: boolean;
};

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_rotation;
uniform float u_time;
uniform float u_spinning;

const float TAU = 6.28318530718;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 sectorColor(float sector) {
  if (sector < 0.5) return vec3(1.0, 0.36, 0.21);
  if (sector < 1.5) return vec3(0.84, 1.0, 0.32);
  if (sector < 2.5) return vec3(0.27, 0.41, 1.0);
  if (sector < 3.5) return vec3(0.95, 0.65, 0.76);
  if (sector < 4.5) return vec3(1.0, 0.79, 0.23);
  return vec3(0.31, 0.78, 0.66);
}

void main() {
  vec2 point = (v_uv - 0.5) * 2.0;
  point.x *= u_resolution.x / max(u_resolution.y, 1.0);
  float radius = length(point);
  if (radius > 1.0) discard;

  float visualAngle = mod(atan(point.x, point.y) + TAU, TAU);
  float sourceAngle = mod(visualAngle - u_rotation + TAU * 2.0, TAU);
  float sectorSize = TAU / 6.0;
  float sector = floor(sourceAngle / sectorSize);
  float localAngle = fract(sourceAngle / sectorSize);

  vec3 color = sectorColor(sector);
  float paper = hash(floor(gl_FragCoord.xy * 0.58)) - 0.5;
  float pulse = sin(u_time * (0.65 + u_spinning * 1.8) + radius * 14.0) * 0.018;
  float sweep = pow(max(cos(visualAngle - u_time * (0.22 + u_spinning * 0.9)), 0.0), 18.0);
  float radialLight = 1.0 - smoothstep(0.08, 1.12, radius);

  color *= 0.91 + radialLight * 0.12 + pulse;
  color += sweep * (0.035 + u_spinning * 0.08);
  color += paper * 0.026;

  float edgeDistance = min(localAngle, 1.0 - localAngle);
  float divider = 1.0 - smoothstep(0.0, 0.012, edgeDistance);
  color = mix(color, vec3(0.067, 0.067, 0.059), divider * 0.92);

  float innerHalo = 1.0 - smoothstep(0.30, 0.39, radius);
  color = mix(color, vec3(0.96, 0.94, 0.88), innerHalo * 0.08);

  float alpha = 1.0 - smoothstep(0.985, 1.0, radius);
  gl_FragColor = vec4(color, alpha);
}
`;

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export const FutureWheelWebGL = memo(function FutureWheelWebGL({
  labels,
  rotation,
  spinning,
}: FutureWheelWebGLProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const displayedRotationRef = useRef(0);
  const animationRef = useRef({ from: 0, to: 0, startedAt: 0, duration: 1 });
  const spinningRef = useRef(spinning);

  useEffect(() => {
    spinningRef.current = spinning;
  }, [spinning]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    animationRef.current = {
      from: displayedRotationRef.current,
      to: rotation,
      startedAt: performance.now(),
      duration: reduceMotion ? 1 : 1650,
    };
  }, [rotation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    const labelLayer = labelsRef.current;
    if (!canvas || !fallback || !labelLayer) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    const program = gl ? createProgram(gl) : null;
    const buffer = gl?.createBuffer() ?? null;

    if (!gl || !program || !buffer) {
      canvas.style.opacity = "0";
    }

    let frame = 0;
    let isOnScreen = true;
    let isDocumentVisible = !document.hidden;
    let positionLocation = -1;
    let resolutionLocation: WebGLUniformLocation | null = null;
    let rotationLocation: WebGLUniformLocation | null = null;
    let timeLocation: WebGLUniformLocation | null = null;
    let spinningLocation: WebGLUniformLocation | null = null;

    if (gl && program && buffer) {
      positionLocation = gl.getAttribLocation(program, "a_position");
      resolutionLocation = gl.getUniformLocation(program, "u_resolution");
      rotationLocation = gl.getUniformLocation(program, "u_rotation");
      timeLocation = gl.getUniformLocation(program, "u_time");
      spinningLocation = gl.getUniformLocation(program, "u_spinning");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(0, 0, 0, 0);
    }

    const handleContextLoss = (event: Event) => {
      event.preventDefault();
      canvas.style.opacity = "0";
    };
    canvas.addEventListener("webglcontextlost", handleContextLoss);

    const render = (now: number) => {
      if (!isOnScreen || !isDocumentVisible) {
        frame = 0;
        return;
      }

      const animation = animationRef.current;
      const progress = Math.min(
        1,
        Math.max(0, (now - animation.startedAt) / animation.duration)
      );
      const eased = reduceMotion ? 1 : 1 - Math.pow(1 - progress, 4);
      const displayedRotation =
        animation.from + (animation.to - animation.from) * eased;
      displayedRotationRef.current = displayedRotation;

      const cssRotation = `rotate(${displayedRotation}deg)`;
      fallback.style.transform = cssRotation;
      labelLayer.style.transform = cssRotation;

      if (gl && program && buffer && !gl.isContextLost()) {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
        const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniform2f(resolutionLocation, width, height);
        gl.uniform1f(rotationLocation, (displayedRotation * Math.PI) / 180);
        gl.uniform1f(timeLocation, reduceMotion ? 0 : now / 1000);
        gl.uniform1f(spinningLocation, spinningRef.current ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      frame = window.requestAnimationFrame(render);
    };

    const resume = () => {
      if (isOnScreen && isDocumentVisible && frame === 0) {
        frame = window.requestAnimationFrame(render);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      isOnScreen = entry.isIntersecting;
      resume();
    });
    const handleVisibility = () => {
      isDocumentVisible = !document.hidden;
      resume();
    };
    observer.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibility);
    frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      if (gl && program) gl.deleteProgram(program);
      if (gl && buffer) gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div className="future-wheel" aria-hidden="true">
      <div ref={fallbackRef} className="future-wheel-fallback" />
      <canvas ref={canvasRef} className="future-wheel-canvas" />
      <div ref={labelsRef} className="wheel-labels">
        {labels.map((label, index) => {
          const angle = index * 60 + 30;
          return (
            <span
              key={label}
              className="wheel-number"
              style={
                { "--wheel-angle": `${angle}deg` } as CSSProperties
              }
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
});
