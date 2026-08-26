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
uniform vec2 u_pointerVelocity;

uniform float u_time;
uniform float u_scroll;
uniform float u_energy;


/* =========================================================
   NOISE
   ========================================================= */

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  // Quintic interpolation.
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  return mix(
    mix(a, b, f.x),
    mix(c, d, f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  mat2 rotation = mat2(
     0.80,  0.60,
    -0.60,  0.80
  );

  for (int i = 0; i < 5; i++) {
    value += noise(p) * amplitude;

    p = rotation * p * 2.02 + vec2(17.13, 9.71);
    amplitude *= 0.5;
  }

  return value;
}


/* =========================================================
   DOMAIN WARP
   ========================================================= */

vec2 flowField(vec2 p, float time) {
  float a = fbm(
    p * 0.82 +
    vec2(time * 0.11, -time * 0.07)
  );

  float b = fbm(
    p * 0.91 +
    vec2(-time * 0.09, time * 0.13) +
    7.31
  );

  return vec2(a - 0.5, b - 0.5);
}

float warpedFBM(vec2 p, float time) {
  vec2 q = vec2(
    fbm(p + vec2(0.0, time * 0.10)),
    fbm(p + vec2(5.2, 1.3) - vec2(time * 0.08, 0.0))
  );

  vec2 r = vec2(
    fbm(p + 3.8 * q + vec2(1.7, 9.2) + time * 0.07),
    fbm(p + 3.4 * q + vec2(8.3, 2.8) - time * 0.06)
  );

  return fbm(p + 2.1 * r);
}


/* =========================================================
   MAIN
   ========================================================= */

void main() {
  vec2 resolution = max(u_resolution, vec2(1.0));

  float aspectRatio = resolution.x / resolution.y;

  vec2 aspect = vec2(aspectRatio, 1.0);

  vec2 p = (v_uv - 0.5) * aspect;
  vec2 pointer = (u_pointer - 0.5) * aspect;

  float time = u_time * 0.36;


  /* ---------------------------------------------------------
     GLOBAL DRIFT
     --------------------------------------------------------- */

  p.y += u_scroll * 0.18;

  vec2 globalFlow = flowField(
    p * 1.15,
    time
  );

  p += globalFlow * 0.20;


  /* ---------------------------------------------------------
     POINTER FLUID DISTORTION
     --------------------------------------------------------- */

  vec2 pointerDelta = p - pointer;

  float pointerDistance = length(pointerDelta);

  float pointerInfluence =
    1.0 -
    smoothstep(0.06, 0.68, pointerDistance);

  pointerInfluence *= pointerInfluence;

  vec2 tangent = vec2(
    -pointerDelta.y,
     pointerDelta.x
  );

  tangent /= max(pointerDistance, 0.001);

  float pointerSpeed = clamp(
    length(u_pointerVelocity) * 6.0,
    0.0,
    1.0
  );

  /*
   * Slow vortex even when stationary.
   */
  p += tangent
    * pointerInfluence
    * (0.025 + pointerSpeed * 0.055)
    * (0.4 + u_energy);

  /*
   * Directional wake from pointer velocity.
   */
  p -= u_pointerVelocity
    * pointerInfluence
    * 0.32;


  /* ---------------------------------------------------------
     LARGE LIQUID MASSES
     --------------------------------------------------------- */

  float large =
    warpedFBM(
      p * 1.25 +
      vec2(
        time * 0.075,
        -time * 0.045
      ),
      time
    );

  vec2 warp = vec2(
    fbm(p * 1.75 + large * 2.4 + time * 0.08),
    fbm(p * 1.62 - large * 2.1 - time * 0.06)
  );

  warp -= 0.5;

  vec2 liquidP =
    p +
    warp * (0.24 + u_energy * 0.05);


  /* ---------------------------------------------------------
     CLOUD / VAPOR FIELD
     --------------------------------------------------------- */

  float vaporField =
    warpedFBM(
      liquidP * 2.25 +
      vec2(
        time * 0.13,
        -time * 0.10
      ),
      time * 0.82
    );

  float vapor =
    smoothstep(
      0.49,
      0.73,
      vaporField
    );


  /* ---------------------------------------------------------
     FILAMENTS
     --------------------------------------------------------- */

  float filamentNoise =
    warpedFBM(
      liquidP * 2.8 -
      vec2(
        time * 0.18,
        u_scroll * 0.9
      ),
      time * 1.12
    );

  float wave =
    sin(
      liquidP.x * 2.2 +
      liquidP.y * 3.1 +
      filamentNoise * 10.0 -
      time * 0.75
    );

  float filament =
    1.0 - abs(wave);

  filament =
    smoothstep(
      0.62,
      0.98,
      filament
    );

  filament *=
    smoothstep(
      0.42,
      0.72,
      filamentNoise
    );


  /* ---------------------------------------------------------
     POINTER WAKE DETAIL
     --------------------------------------------------------- */

  float wakeNoise =
    fbm(
      (p - pointer)
      * vec2(3.4, 5.1)
      -
      u_pointerVelocity * 7.0
      +
      time * 0.22
    );

  float wake =
    pointerInfluence
    * smoothstep(
      0.42,
      0.78,
      wakeNoise
    );

  wake *= 0.35 + pointerSpeed * 0.65;


  /* ---------------------------------------------------------
     COLOR
     --------------------------------------------------------- */

  vec3 blue = vec3(
    0.19,
    0.31,
    1.00
  );

  vec3 electricBlue = vec3(
    0.41,
    0.55,
    1.00
  );

  vec3 coral = vec3(
    1.00,
    0.29,
    0.15
  );

  vec3 acid = vec3(
    0.80,
    1.00,
    0.28
  );

  vec3 ivory = vec3(
    0.96,
    0.93,
    0.86
  );

  /*
   * Base gradient changes with the fluid itself,
   * instead of using screen coordinates directly.
   */
  float chromaMix =
    smoothstep(
      0.27,
      0.78,
      large + warp.x * 0.35
    );

  vec3 color =
    mix(
      blue,
      coral,
      chromaMix
    );

  /*
   * Introduce a colder intermediate zone.
   */
  color =
    mix(
      color,
      electricBlue,
      smoothstep(
        0.38,
        0.69,
        vaporField
      ) * 0.34
    );

  /*
   * Acid filaments.
   */
  color =
    mix(
      color,
      acid,
      filament * 0.60
    );

  /*
   * Vapor / pointer highlights.
   */
  color =
    mix(
      color,
      ivory,
      vapor * 0.16 +
      wake * 0.31
    );


  /* ---------------------------------------------------------
     DEPTH
     --------------------------------------------------------- */

  float depth =
    0.72 +
    large * 0.28;

  color *= depth;


  /* ---------------------------------------------------------
     ALPHA
     --------------------------------------------------------- */

  float alpha = 0.0;

  alpha += vapor * 0.14;
  alpha += filament * 0.13;
  alpha += wake * (0.04 + u_energy * 0.08);

  /*
   * Keep transparent negative space.
   */
  float bodyMask =
    smoothstep(
      0.41,
      0.67,
      vaporField + large * 0.18
    );

  alpha *=
    0.48 +
    bodyMask * 0.52;


  /* ---------------------------------------------------------
     EDGE / COMPOSITION FADE
     --------------------------------------------------------- */

  float radialDistance =
    length(
      p * vec2(0.72, 1.0)
    );

  float edgeFade =
    1.0 -
    smoothstep(
      0.34,
      1.08,
      radialDistance
    );

  alpha *=
    0.46 +
    edgeFade * 0.54;


  /* ---------------------------------------------------------
     ENERGY
     --------------------------------------------------------- */

  alpha *=
    0.86 +
    u_energy * 0.28;

  color +=
    wake *
    pointerSpeed *
    0.08;


  /* ---------------------------------------------------------
     OUTPUT
     --------------------------------------------------------- */

  alpha = min(alpha, 0.28);

  gl_FragColor = vec4(
    color,
    alpha
  );
}
`;


/* =========================================================
   WEBGL HELPERS
   ========================================================= */

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
    console.error(
      gl.getShaderInfoLog(shader)
    );

    gl.deleteShader(shader);

    return null;
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext
): WebGLProgram | null {
  const vertex = compileShader(
    gl,
    gl.VERTEX_SHADER,
    VERTEX_SHADER
  );

  const fragment = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    FRAGMENT_SHADER
  );

  if (!vertex || !fragment) {
    return null;
  }

  const program = gl.createProgram();

  if (!program) {
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);

  gl.linkProgram(program);

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (
    !gl.getProgramParameter(
      program,
      gl.LINK_STATUS
    )
  ) {
    console.error(
      gl.getProgramInfoLog(program)
    );

    gl.deleteProgram(program);

    return null;
  }

  return program;
}


/* =========================================================
   COMPONENT
   ========================================================= */

export const FluidAtmosphereWebGL = memo(
  function FluidAtmosphereWebGL() {
    const canvasRef =
      useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;

      if (!canvas) return;

      const atmosphere =
        canvas.closest<HTMLElement>(
          ".fluid-atmosphere"
        );

      if (!atmosphere) return;

      const reduceMotion =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

      const gl =
        canvas.getContext("webgl", {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: true,
          powerPreference: "high-performance",
        });

      if (!gl) {
        canvas.style.display = "none";
        return;
      }

      const program =
        createProgram(gl);

      const buffer =
        gl.createBuffer();

      if (!program || !buffer) {
        canvas.style.display = "none";
        return;
      }


      /* -----------------------------------------------------
         LOCATIONS
         ----------------------------------------------------- */

      const positionLocation =
        gl.getAttribLocation(
          program,
          "a_position"
        );

      const resolutionLocation =
        gl.getUniformLocation(
          program,
          "u_resolution"
        );

      const pointerLocation =
        gl.getUniformLocation(
          program,
          "u_pointer"
        );

      const pointerVelocityLocation =
        gl.getUniformLocation(
          program,
          "u_pointerVelocity"
        );

      const timeLocation =
        gl.getUniformLocation(
          program,
          "u_time"
        );

      const scrollLocation =
        gl.getUniformLocation(
          program,
          "u_scroll"
        );

      const energyLocation =
        gl.getUniformLocation(
          program,
          "u_energy"
        );


      /* -----------------------------------------------------
         GEOMETRY
         ----------------------------------------------------- */

      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        buffer
      );

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1, -1,
           1, -1,
          -1,  1,

          -1,  1,
           1, -1,
           1,  1,
        ]),
        gl.STATIC_DRAW
      );

      gl.useProgram(program);

      gl.enableVertexAttribArray(
        positionLocation
      );

      gl.vertexAttribPointer(
        positionLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );

      gl.disable(gl.DEPTH_TEST);

      gl.enable(gl.BLEND);

      gl.blendFunc(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA
      );

      gl.clearColor(
        0,
        0,
        0,
        0
      );


      /* -----------------------------------------------------
         STATE
         ----------------------------------------------------- */

      let frame = 0;

      let surfaceModeFrame = 0;

      let previousTime =
        performance.now();

      let previousDraw = 0;

      let isDocumentVisible =
        !document.hidden;

      let isCanvasVisible = true;

      let pointerX = 0.68;
      let pointerY = 0.30;

      let targetPointerX = pointerX;
      let targetPointerY = pointerY;

      let velocityX = 0;
      let velocityY = 0;

      let targetVelocityX = 0;
      let targetVelocityY = 0;

      let lastRawPointerX = pointerX;
      let lastRawPointerY = pointerY;

      let scroll = 0;
      let targetScroll = 0;

      let energy =
        reduceMotion
          ? 0
          : 0.08;


      /* -----------------------------------------------------
         SURFACE CONTRAST
         ----------------------------------------------------- */

      const updateSurfaceMode = () => {
        surfaceModeFrame = 0;

        const element =
          document.elementFromPoint(
            window.innerWidth * 0.5,
            window.innerHeight * 0.5
          );

        const surface =
          element?.closest<HTMLElement>(
            "[data-atmosphere-surface]"
          );

        atmosphere.dataset.surface =
          surface?.dataset.atmosphereSurface ??
          "light";
      };

      const scheduleSurfaceMode = () => {
        if (surfaceModeFrame) return;

        surfaceModeFrame =
          requestAnimationFrame(
            updateSurfaceMode
          );
      };


      /* -----------------------------------------------------
         RESIZE
         ----------------------------------------------------- */

      const resize = () => {
        /*
         * 1.35 is deliberate.
         *
         * Full Retina rendering is unnecessary for this
         * kind of blurred procedural atmosphere.
         */
        const pixelRatio =
          Math.min(
            window.devicePixelRatio || 1,
            1.35
          );

        const rect =
          canvas.getBoundingClientRect();

        const width =
          Math.max(
            1,
            Math.round(
              rect.width * pixelRatio
            )
          );

        const height =
          Math.max(
            1,
            Math.round(
              rect.height * pixelRatio
            )
          );

        if (
          canvas.width !== width ||
          canvas.height !== height
        ) {
          canvas.width = width;
          canvas.height = height;

          gl.viewport(
            0,
            0,
            width,
            height
          );
        }
      };


      /* -----------------------------------------------------
         SCROLL
         ----------------------------------------------------- */

      const updateScrollTarget = () => {
        const maxScroll =
          Math.max(
            1,
            document.documentElement
              .scrollHeight -
              window.innerHeight
          );

        targetScroll =
          window.scrollY /
          maxScroll;

        scheduleSurfaceMode();

        if (!reduceMotion) {
          energy =
            Math.min(
              1,
              energy + 0.16
            );
        }
      };

      const handleResize = () => {
        resize();
        scheduleSurfaceMode();
      };


      /* -----------------------------------------------------
         POINTER
         ----------------------------------------------------- */

      const handlePointerMove = (
        event: PointerEvent
      ) => {
        const x =
          event.clientX /
          Math.max(
            window.innerWidth,
            1
          );

        const y =
          1 -
          event.clientY /
            Math.max(
              window.innerHeight,
              1
            );

        targetPointerX = x;
        targetPointerY = y;

        targetVelocityX =
          x - lastRawPointerX;

        targetVelocityY =
          y - lastRawPointerY;

        lastRawPointerX = x;
        lastRawPointerY = y;

        if (!reduceMotion) {
          energy =
            Math.min(
              1,
              energy + 0.22
            );
        }
      };


      /* -----------------------------------------------------
         DRAW
         ----------------------------------------------------- */

      const draw = (
        now: number
      ) => {
        frame = 0;

        if (
          !isDocumentVisible ||
          !isCanvasVisible ||
          gl.isContextLost()
        ) {
          return;
        }

        /*
         * 40 FPS is enough for this type of background.
         */
        const frameInterval =
          reduceMotion
            ? Infinity
            : 1000 / 40;

        if (
          !reduceMotion &&
          now - previousDraw <
            frameInterval
        ) {
          frame =
            requestAnimationFrame(draw);

          return;
        }

        const delta =
          Math.min(
            0.05,
            Math.max(
              0.001,
              (now - previousTime) /
                1000
            )
          );

        previousTime = now;
        previousDraw = now;


        /* ---------------------------------------------------
           SPRING-LIKE RESPONSE
           --------------------------------------------------- */

        const pointerResponse =
          1 -
          Math.exp(
            -5.4 * delta
          );

        const velocityResponse =
          1 -
          Math.exp(
            -7.5 * delta
          );

        const scrollResponse =
          1 -
          Math.exp(
            -3.2 * delta
          );

        pointerX +=
          (targetPointerX -
            pointerX) *
          pointerResponse;

        pointerY +=
          (targetPointerY -
            pointerY) *
          pointerResponse;

        velocityX +=
          (targetVelocityX -
            velocityX) *
          velocityResponse;

        velocityY +=
          (targetVelocityY -
            velocityY) *
          velocityResponse;

        scroll +=
          (targetScroll -
            scroll) *
          scrollResponse;


        /* ---------------------------------------------------
           VELOCITY DECAY
           --------------------------------------------------- */

        targetVelocityX *=
          Math.exp(
            -8.0 * delta
          );

        targetVelocityY *=
          Math.exp(
            -8.0 * delta
          );


        /* ---------------------------------------------------
           ENERGY DECAY
           --------------------------------------------------- */

        if (!reduceMotion) {
          energy =
            Math.max(
              0.035,
              energy *
                Math.exp(
                  -1.25 * delta
                )
            );
        } else {
          energy = 0;
        }


        /* ---------------------------------------------------
           RENDER
           --------------------------------------------------- */

        gl.clear(
          gl.COLOR_BUFFER_BIT
        );

        gl.useProgram(program);

        gl.uniform2f(
          resolutionLocation,
          canvas.width,
          canvas.height
        );

        gl.uniform2f(
          pointerLocation,
          pointerX,
          pointerY
        );

        gl.uniform2f(
          pointerVelocityLocation,
          velocityX,
          velocityY
        );

        gl.uniform1f(
          timeLocation,
          reduceMotion
            ? 0
            : now / 1000
        );

        gl.uniform1f(
          scrollLocation,
          scroll
        );

        gl.uniform1f(
          energyLocation,
          energy
        );

        gl.drawArrays(
          gl.TRIANGLES,
          0,
          6
        );

        if (!reduceMotion) {
          frame =
            requestAnimationFrame(draw);
        }
      };


      /* -----------------------------------------------------
         VISIBILITY
         ----------------------------------------------------- */

      const start = () => {
        if (
          frame ||
          !isDocumentVisible ||
          !isCanvasVisible
        ) {
          return;
        }

        previousTime =
          performance.now();

        frame =
          requestAnimationFrame(draw);
      };

      const stop = () => {
        if (!frame) return;

        cancelAnimationFrame(frame);
        frame = 0;
      };

      const handleVisibility = () => {
        isDocumentVisible =
          !document.hidden;

        if (isDocumentVisible) {
          start();
        } else {
          stop();
        }
      };


      /* -----------------------------------------------------
         INTERSECTION OBSERVER
         ----------------------------------------------------- */

      const observer =
        new IntersectionObserver(
          ([entry]) => {
            isCanvasVisible =
              entry.isIntersecting;

            if (
              isCanvasVisible
            ) {
              start();
            } else {
              stop();
            }
          },
          {
            rootMargin: "150px",
          }
        );

      observer.observe(canvas);


      /* -----------------------------------------------------
         CONTEXT LOSS
         ----------------------------------------------------- */

      const handleContextLoss = (
        event: Event
      ) => {
        event.preventDefault();

        stop();

        canvas.style.opacity =
          "0";
      };


      /* -----------------------------------------------------
         INIT
         ----------------------------------------------------- */

      resize();
      updateScrollTarget();
      updateSurfaceMode();

      window.addEventListener(
        "pointermove",
        handlePointerMove,
        {
          passive: true,
        }
      );

      window.addEventListener(
        "scroll",
        updateScrollTarget,
        {
          passive: true,
        }
      );

      window.addEventListener(
        "resize",
        handleResize,
        {
          passive: true,
        }
      );

      document.addEventListener(
        "visibilitychange",
        handleVisibility
      );

      canvas.addEventListener(
        "webglcontextlost",
        handleContextLoss
      );

      start();


      /* -----------------------------------------------------
         CLEANUP
         ----------------------------------------------------- */

      return () => {
        stop();

        if (surfaceModeFrame) {
          cancelAnimationFrame(
            surfaceModeFrame
          );
        }

        observer.disconnect();

        window.removeEventListener(
          "pointermove",
          handlePointerMove
        );

        window.removeEventListener(
          "scroll",
          updateScrollTarget
        );

        window.removeEventListener(
          "resize",
          handleResize
        );

        document.removeEventListener(
          "visibilitychange",
          handleVisibility
        );

        canvas.removeEventListener(
          "webglcontextlost",
          handleContextLoss
        );

        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      };
    }, []);

    return (
      <div
        className="fluid-atmosphere"
        aria-hidden="true"
      >
        <canvas
          ref={canvasRef}
          className="fluid-atmosphere-canvas"
          data-webgl-atmosphere
        />
      </div>
    );
  }
);
