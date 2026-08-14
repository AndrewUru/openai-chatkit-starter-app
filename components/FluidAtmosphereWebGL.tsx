"use client";

import { memo, useEffect, useRef } from "react";

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
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_scroll;
uniform float u_energy;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float fbm(vec2 point) {
  float value = 0.0;
  value += noise(point) * 0.5;
  point = point * 2.03 + vec2(13.7, 9.2);
  value += noise(point) * 0.25;
  point = point * 2.01 + vec2(8.3, 17.1);
  value += noise(point) * 0.125;
  point = point * 2.04 + vec2(19.4, 4.7);
  value += noise(point) * 0.0625;
  return value / 0.9375;
}

void main() {
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 point = (v_uv - 0.5) * aspect;
  vec2 pointer = (u_pointer - 0.5) * aspect;
  float time = u_time * 0.085;

  float largeFlow = fbm(point * 1.35 + vec2(time, -time * 0.72 + u_scroll * 2.2));
  float crossFlow = fbm(point.yx * 2.15 + vec2(-time * 1.4, time + u_scroll));
  vec2 drift = vec2(largeFlow - 0.5, crossFlow - 0.5);
  vec2 liquidPoint = point + drift * (0.13 + u_energy * 0.08);

  float smoke = fbm(liquidPoint * 2.7 + vec2(time * 1.8, -time));
  smoke += sin(liquidPoint.y * 6.0 - time * 5.0 + largeFlow * 5.0) * 0.08;
  smoke = smoothstep(0.46, 0.78, smoke);

  float ribbonField = fbm(liquidPoint * 3.8 - vec2(time * 2.0, u_scroll * 1.4));
  float ribbon = 1.0 - abs(sin((ribbonField + largeFlow * 0.65 + point.x * 0.18) * 8.0));
  ribbon = pow(max(ribbon, 0.0), 7.0);

  float pointerDistance = length(point - pointer);
  float pointerHalo = 1.0 - smoothstep(0.04, 0.48, pointerDistance);
  float pointerWake = fbm((point - pointer) * 4.2 + vec2(-time * 2.0, time));
  pointerWake *= pointerHalo;

  vec3 cobalt = vec3(0.27, 0.41, 1.0);
  vec3 coral = vec3(1.0, 0.36, 0.21);
  vec3 lime = vec3(0.84, 1.0, 0.32);
  vec3 vapor = vec3(0.94, 0.91, 0.82);
  vec3 color = mix(cobalt, coral, smoothstep(0.2, 0.82, largeFlow));
  color = mix(color, lime, ribbon * 0.52);
  color = mix(color, vapor, smoke * 0.32 + pointerWake * 0.24);

  float edgeFade = smoothstep(1.1, 0.28, length(point));
  float alpha = smoke * 0.115 + ribbon * 0.075;
  alpha += pointerWake * (0.035 + u_energy * 0.075);
  alpha *= 0.48 + edgeFade * 0.52;
  alpha *= 0.72 + u_energy * 0.28;

  gl_FragColor = vec4(color, min(alpha, 0.22));
}
`;

function compileShader(
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
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
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

export const FluidAtmosphereWebGL = memo(function FluidAtmosphereWebGL() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
    });
    const program = gl ? createProgram(gl) : null;
    const buffer = gl?.createBuffer() ?? null;

    if (!gl || !program || !buffer) {
      canvas.style.opacity = "0";
      return;
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const pointerLocation = gl.getUniformLocation(program, "u_pointer");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const scrollLocation = gl.getUniformLocation(program, "u_scroll");
    const energyLocation = gl.getUniformLocation(program, "u_energy");

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    let frame = 0;
    let previousFrame = performance.now();
    let previousDraw = 0;
    let isVisible = !document.hidden;
    let pointerX = 0.68;
    let pointerY = 0.28;
    let targetPointerX = pointerX;
    let targetPointerY = pointerY;
    let scroll = 0;
    let targetScroll = 0;
    let energy = reduceMotion ? 0 : 0.12;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
      const height = Math.max(1, Math.round(window.innerHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    const updateScrollTarget = () => {
      const maximum = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      targetScroll = window.scrollY / maximum;
      energy = Math.min(1, energy + 0.22);
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetPointerX = event.clientX / Math.max(window.innerWidth, 1);
      targetPointerY = 1 - event.clientY / Math.max(window.innerHeight, 1);
      energy = Math.min(1, energy + 0.18);
    };

    const draw = (now: number) => {
      if (!isVisible || gl.isContextLost()) {
        frame = 0;
        return;
      }

      if (!reduceMotion && now - previousDraw < 1000 / 30) {
        frame = window.requestAnimationFrame(draw);
        return;
      }

      const delta = Math.min(0.08, Math.max(0, (now - previousFrame) / 1000));
      previousFrame = now;
      previousDraw = now;
      const response = 1 - Math.exp(-4.5 * delta);
      pointerX += (targetPointerX - pointerX) * response;
      pointerY += (targetPointerY - pointerY) * response;
      scroll += (targetScroll - scroll) * response;
      energy = Math.max(0.1, energy * Math.exp(-1.45 * delta));

      resize();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(pointerLocation, pointerX, pointerY);
      gl.uniform1f(timeLocation, reduceMotion ? 0 : now / 1000);
      gl.uniform1f(scrollLocation, scroll);
      gl.uniform1f(energyLocation, energy);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!reduceMotion) frame = window.requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible && !frame) {
        previousFrame = performance.now();
        frame = window.requestAnimationFrame(draw);
      }
    };

    const handleContextLoss = (event: Event) => {
      event.preventDefault();
      canvas.style.opacity = "0";
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    updateScrollTarget();
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", updateScrollTarget, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    canvas.addEventListener("webglcontextlost", handleContextLoss);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", updateScrollTarget);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div className="fluid-atmosphere" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="fluid-atmosphere-canvas"
        data-webgl-atmosphere
      />
    </div>
  );
});
