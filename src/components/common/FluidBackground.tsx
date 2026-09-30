import React, { useEffect, useRef } from 'react';

export function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;
    let cleanupFn: (() => void) | null = null;

    try {
      cleanupFn = runFluidSimulation(canvas);
    } catch (e) {
      console.warn('[FluidBackground] WebGL fluid simulation failed to start:', e);
    }

    return () => {
      destroyed = true;
      if (cleanupFn) cleanupFn();
    };
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none z-0" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-screen h-screen pointer-events-none"
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(115% 95% at 50% 46%, rgba(4,5,12,0.65) 0%, rgba(4,5,12,0.60) 24%, rgba(4,5,12,0.38) 52%, rgba(4,5,12,0.10) 100%)',
        }}
      />
    </div>
  );
}

function runFluidSimulation(canvas: HTMLCanvasElement): () => void {
  canvas.width = canvas.clientWidth || window.innerWidth;
  canvas.height = canvas.clientHeight || window.innerHeight;

  const config = {
    SIM_RESOLUTION: 200,
    DYE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 0.958,
    VELOCITY_DISSIPATION: 0.96,
    PRESSURE_DISSIPATION: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 42,
    SPLAT_RADIUS: 0.22,
    SHADING: true,
    COLORFUL: true,
    PAUSED: false,
    BACK_COLOR: { r: 4, g: 5, b: 12 },
    TRANSPARENT: false,
    BLOOM: false,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.8,
    BLOOM_SOFT_KNEE: 0.7,
  };

  class Pointer {
    id = -1;
    x = 0;
    y = 0;
    dx = 0;
    dy = 0;
    down = false;
    moved = false;
    everMoved = false;
    color: { r: number; g: number; b: number } = { r: 30, g: 0, b: 300 };
  }

  const pointers: Pointer[] = [new Pointer()];
  const splatStack: number[] = [];
  const bloomFramebuffers: any[] = [];

  const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
  let gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null;
  const isWebGL2 = Boolean(gl);
  if (!gl) {
    gl = (canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)) as any;
  }
  if (!gl) return () => {};

  let halfFloat: any;
  let supportLinearFiltering: any;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  const halfFloatTexType = isWebGL2 ? (gl as any).HALF_FLOAT : halfFloat?.HALF_FLOAT_OES || gl.FLOAT;
  const ext = {
    halfFloatTexType,
    supportLinearFiltering,
    formatRGBA: getSupportedFormat(gl, (gl as any).RGBA16F || gl.RGBA, gl.RGBA, halfFloatTexType),
    formatRG: getSupportedFormat(gl, (gl as any).RG16F || gl.RGBA, (gl as any).RG || gl.RGBA, halfFloatTexType),
    formatR: getSupportedFormat(gl, (gl as any).R16F || gl.RGBA, (gl as any).RED || gl.RGBA, halfFloatTexType),
  };

  function getSupportedFormat(glCtx: any, internalFormat: any, format: any, type: any) {
    if (!supportRenderTextureFormat(glCtx, internalFormat, format, type)) {
      switch (internalFormat) {
        case glCtx.R16F:
          return getSupportedFormat(glCtx, glCtx.RG16F, glCtx.RG, type);
        case glCtx.RG16F:
          return getSupportedFormat(glCtx, glCtx.RGBA16F, glCtx.RGBA, type);
        default:
          return null;
      }
    }
    return { internalFormat, format };
  }

  function supportRenderTextureFormat(glCtx: any, internalFormat: any, format: any, type: any) {
    const texture = glCtx.createTexture();
    glCtx.bindTexture(glCtx.TEXTURE_2D, texture);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.NEAREST);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.NEAREST);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texImage2D(glCtx.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    const fbo = glCtx.createFramebuffer();
    glCtx.bindFramebuffer(glCtx.FRAMEBUFFER, fbo);
    glCtx.framebufferTexture2D(glCtx.FRAMEBUFFER, glCtx.COLOR_ATTACHMENT0, glCtx.TEXTURE_2D, texture, 0);

    const status = glCtx.checkFramebufferStatus(glCtx.FRAMEBUFFER);
    return status === glCtx.FRAMEBUFFER_COMPLETE;
  }

  function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
  }

  if (isMobile()) config.SHADING = false;
  if (!ext.supportLinearFiltering) {
    config.SHADING = false;
    config.BLOOM = false;
  }

  class GLProgram {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation> = {};

    constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
      const p = gl!.createProgram()!;
      gl!.attachShader(p, vertexShader);
      gl!.attachShader(p, fragmentShader);
      gl!.linkProgram(p);

      if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) {
        throw new Error(gl!.getProgramInfoLog(p) || 'Program link error');
      }

      this.program = p;
      const uniformCount = gl!.getProgramParameter(p, gl!.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const uniformName = gl!.getActiveUniform(p, i)!.name;
        this.uniforms[uniformName] = gl!.getUniformLocation(p, uniformName)!;
      }
    }

    bind() {
      gl!.useProgram(this.program);
    }
  }

  function compileShader(type: number, source: string): WebGLShader {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      throw new Error(gl!.getShaderInfoLog(shader) || 'Shader compile error');
    }
    return shader;
  }

  const baseVertexShader = compileShader(
    gl.VERTEX_SHADER,
    `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;
      void main () {
          vUv = aPosition * 0.5 + 0.5;
          vL = vUv - vec2(texelSize.x, 0.0);
          vR = vUv + vec2(texelSize.x, 0.0);
          vT = vUv + vec2(0.0, texelSize.y);
          vB = vUv - vec2(0.0, texelSize.y);
          gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `
  );

  const clearShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () {
          gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `
  );

  const colorShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      uniform vec4 color;
      void main () {
          gl_FragColor = color;
      }
    `
  );

  const displayShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
          vec3 C = texture2D(uTexture, vUv).rgb;
          float a = max(C.r, max(C.g, C.b));
          gl_FragColor = vec4(C, a);
      }
    `
  );

  const displayShadingShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uTexture;
      uniform vec2 texelSize;
      void main () {
          vec3 L = texture2D(uTexture, vL).rgb;
          vec3 R = texture2D(uTexture, vR).rgb;
          vec3 T = texture2D(uTexture, vT).rgb;
          vec3 B = texture2D(uTexture, vB).rgb;
          vec3 C = texture2D(uTexture, vUv).rgb;
          float dx = length(R) - length(L);
          float dy = length(T) - length(B);
          vec3 n = normalize(vec3(dx, dy, length(texelSize)));
          vec3 l = vec3(0.0, 0.0, 1.0);
          float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
          C.rgb *= diffuse;
          float a = max(C.r, max(C.g, C.b));
          gl_FragColor = vec4(C, a);
      }
    `
  );

  const splatShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
          vec2 p = vUv - point.xy;
          p.x *= aspectRatio;
          vec3 splat = exp(-dot(p, p) / radius) * color;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
      }
    `
  );

  const advectionManualFilteringShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform vec2 dyeTexelSize;
      uniform float dt;
      uniform float dissipation;
      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
          vec2 st = uv / tsize - 0.5;
          vec2 iuv = floor(st);
          vec2 fuv = fract(st);
          vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
          vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
          vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
          vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
          return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }
      void main () {
          vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
          gl_FragColor = dissipation * bilerp(uSource, coord, dyeTexelSize);
          gl_FragColor.a = 1.0;
      }
    `
  );

  const advectionShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      void main () {
          vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
          gl_FragColor = dissipation * texture2D(uSource, coord);
          gl_FragColor.a = 1.0;
      }
    `
  );

  const divergenceShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
          float L = texture2D(uVelocity, vL).x;
          float R = texture2D(uVelocity, vR).x;
          float T = texture2D(uVelocity, vT).y;
          float B = texture2D(uVelocity, vB).y;
          vec2 C = texture2D(uVelocity, vUv).xy;
          if (vL.x < 0.0) { L = -C.x; }
          if (vR.x > 1.0) { R = -C.x; }
          if (vT.y > 1.0) { T = -C.y; }
          if (vB.y < 0.0) { B = -C.y; }
          float div = 0.5 * (R - L + T - B);
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `
  );

  const curlShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
          float L = texture2D(uVelocity, vL).y;
          float R = texture2D(uVelocity, vR).y;
          float T = texture2D(uVelocity, vT).x;
          float B = texture2D(uVelocity, vB).x;
          float vorticity = R - L - T + B;
          gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `
  );

  const vorticityShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main () {
          float L = texture2D(uCurl, vL).x;
          float R = texture2D(uCurl, vR).x;
          float T = texture2D(uCurl, vT).x;
          float B = texture2D(uCurl, vB).x;
          float C = texture2D(uCurl, vUv).x;
          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          force /= length(force) + 0.0001;
          force *= curl * C;
          force.y *= -1.0;
          vec2 vel = texture2D(uVelocity, vUv).xy;
          gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
      }
    `
  );

  const pressureShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          float divergence = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + B + T - divergence) * 0.25;
          gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `
  );

  const gradientSubtractShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity.xy -= vec2(R - L, T - B);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `
  );

  const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (destination: any) => {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, destination);
      gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0);
    };
  })();

  let simWidth: number;
  let simHeight: number;
  let dyeWidth: number;
  let dyeHeight: number;
  let density: any;
  let velocity: any;
  let divergence: any;
  let curl: any;
  let pressure: any;

  const clearProgram = new GLProgram(baseVertexShader, clearShader);
  const colorProgram = new GLProgram(baseVertexShader, colorShader);
  const displayProgram = new GLProgram(baseVertexShader, displayShader);
  const displayShadingProgram = new GLProgram(baseVertexShader, displayShadingShader);
  const splatProgram = new GLProgram(baseVertexShader, splatShader);
  const advectionProgram = new GLProgram(baseVertexShader, ext.supportLinearFiltering ? advectionShader : advectionManualFilteringShader);
  const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader);
  const curlProgram = new GLProgram(baseVertexShader, curlShader);
  const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader);
  const pressureProgram = new GLProgram(baseVertexShader, pressureShader);
  const gradienSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader);

  function getResolution(resolution: number) {
    let aspectRatio = gl!.drawingBufferWidth / gl!.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;
    const max = Math.round(resolution * aspectRatio);
    const min = Math.round(resolution);
    if (gl!.drawingBufferWidth > gl!.drawingBufferHeight) return { width: max, height: min };
    return { width: min, height: max };
  }

  function createFBO(w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
    gl!.activeTexture(gl!.TEXTURE0);
    const texture = gl!.createTexture();
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, param);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, param);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl!.createFramebuffer();
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, texture, 0);
    gl!.viewport(0, 0, w, h);
    gl!.clear(gl!.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      attach(id: number) {
        gl!.activeTexture(gl!.TEXTURE0 + id);
        gl!.bindTexture(gl!.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createDoubleFBO(w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
      get read() { return fbo1; },
      set read(value) { fbo1 = value; },
      get write() { return fbo2; },
      set write(value) { fbo2 = value; },
      swap() {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  function resizeFBO(target: any, w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
    const newFBO = createFBO(w, h, internalFormat, format, type, param);
    clearProgram.bind();
    gl!.uniform1i(clearProgram.uniforms.uTexture, target.attach(0));
    gl!.uniform1f(clearProgram.uniforms.value, 1);
    blit(newFBO.fbo);
    return newFBO;
  }

  function resizeDoubleFBO(target: any, w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    return target;
  }

  function initFramebuffers() {
    const simRes = getResolution(config.SIM_RESOLUTION);
    const dyeRes = getResolution(config.DYE_RESOLUTION);

    simWidth = simRes.width;
    simHeight = simRes.height;
    dyeWidth = dyeRes.width;
    dyeHeight = dyeRes.height;

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl!.LINEAR : gl!.NEAREST;

    if (density == null)
      density = createDoubleFBO(dyeWidth, dyeHeight, rgba.internalFormat, rgba.format, texType, filtering);
    else
      density = resizeDoubleFBO(density, dyeWidth, dyeHeight, rgba.internalFormat, rgba.format, texType, filtering);

    if (velocity == null)
      velocity = createDoubleFBO(simWidth, simHeight, rg.internalFormat, rg.format, texType, filtering);
    else
      velocity = resizeDoubleFBO(velocity, simWidth, simHeight, rg.internalFormat, rg.format, texType, filtering);

    divergence = createFBO(simWidth, simHeight, r.internalFormat, r.format, texType, gl!.NEAREST);
    curl = createFBO(simWidth, simHeight, r.internalFormat, r.format, texType, gl!.NEAREST);
    pressure = createDoubleFBO(simWidth, simHeight, r.internalFormat, r.format, texType, gl!.NEAREST);
  }

  function HSVtoRGB(h: number, s: number, v: number) {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r, g, b };
  }

  function generateColor() {
    const h = 0.5 + Math.random() * 0.42;
    const c = HSVtoRGB(h, 0.95, 1.0);
    c.r *= 0.92;
    c.g *= 0.92;
    c.b *= 0.92;
    return c;
  }

  function splat(x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number }) {
    gl!.viewport(0, 0, simWidth, simHeight);
    splatProgram.bind();
    gl!.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl!.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl!.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1.0 - y / canvas.height);
    gl!.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
    gl!.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100.0);
    blit(velocity.write.fbo);
    velocity.swap();

    gl!.viewport(0, 0, dyeWidth, dyeHeight);
    gl!.uniform1i(splatProgram.uniforms.uTarget, density.read.attach(0));
    gl!.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(density.write.fbo);
    density.swap();
  }

  function multipleSplats(amount: number) {
    for (let i = 0; i < amount; i++) {
      const color = generateColor();
      color.r *= 10.0;
      color.g *= 10.0;
      color.b *= 10.0;
      const x = canvas.width * Math.random();
      const y = canvas.height * Math.random();
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      splat(x, y, dx, dy, color);
    }
  }

  initFramebuffers();
  multipleSplats(34);
  for (let i = 0; i < 8; i++) splatStack.push(10 + Math.floor(Math.random() * 10));

  let lastColorChangeTime = Date.now();
  let virtualSeeded = false;
  let orbitAngle = 0;
  let vPrevX = 0, vPrevY = 0;
  let virtualColor: any = null;
  let lastVColorTime = 0;
  const engineStart = Date.now();
  const ORBIT_RADIUS = 300;
  const ORBIT_SPEED = 0.026;
  const ORBIT_START_DELAY = 700;

  let rafHandle = 0;
  let isDestroyed = false;

  function driveVirtualPointer() {
    if (Date.now() - engineStart < ORBIT_START_DELAY) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const base = Math.min(ORBIT_RADIUS, canvas.width * 0.35, canvas.height * 0.35);
    const r = base * (0.72 + 0.28 * Math.sin(orbitAngle * 0.37));
    orbitAngle += ORBIT_SPEED;
    const x = cx + Math.cos(orbitAngle) * r;
    const y = cy + Math.sin(orbitAngle) * r;
    if (!virtualSeeded) {
      virtualSeeded = true;
      vPrevX = x;
      vPrevY = y;
      return;
    }
    if (!virtualColor || Date.now() - lastVColorTime > 120) {
      virtualColor = generateColor();
      virtualColor.r *= 3.2;
      virtualColor.g *= 3.2;
      virtualColor.b *= 3.2;
      lastVColorTime = Date.now();
    }
    const dx = (x - vPrevX) * 9.0;
    const dy = (y - vPrevY) * 9.0;
    vPrevX = x;
    vPrevY = y;
    splat(x, y, dx, dy, virtualColor);
  }

  function input() {
    if (splatStack.length > 0) multipleSplats(splatStack.pop()!);

    for (let i = 0; i < pointers.length; i++) {
      const p = pointers[i];
      if (p.moved) {
        splat(p.x, p.y, p.dx, p.dy, p.color);
        p.moved = false;
      }
    }

    if (!config.COLORFUL) return;

    if (lastColorChangeTime + 100 < Date.now()) {
      lastColorChangeTime = Date.now();
      for (let i = 0; i < pointers.length; i++) {
        pointers[i].color = generateColor();
      }
    }
  }

  function step(dt: number) {
    gl!.disable(gl!.BLEND);
    gl!.viewport(0, 0, simWidth, simHeight);

    curlProgram.bind();
    gl!.uniform2f(curlProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl!.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl.fbo);

    vorticityProgram.bind();
    gl!.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl!.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl!.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl!.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl!.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write.fbo);
    velocity.swap();

    divergenceProgram.bind();
    gl!.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl!.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence.fbo);

    clearProgram.bind();
    gl!.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl!.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION);
    blit(pressure.write.fbo);
    pressure.swap();

    pressureProgram.bind();
    gl!.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl!.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl!.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write.fbo);
      pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl!.uniform2f(gradienSubtractProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl!.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl!.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write.fbo);
    velocity.swap();

    advectionProgram.bind();
    gl!.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    if (!ext.supportLinearFiltering)
      gl!.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1.0 / simWidth, 1.0 / simHeight);
    const velocityId = velocity.read.attach(0);
    gl!.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    gl!.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    gl!.uniform1f(advectionProgram.uniforms.dt, dt);
    gl!.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write.fbo);
    velocity.swap();

    gl!.viewport(0, 0, dyeWidth, dyeHeight);
    if (!ext.supportLinearFiltering)
      gl!.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1.0 / dyeWidth, 1.0 / dyeHeight);
    gl!.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl!.uniform1i(advectionProgram.uniforms.uSource, density.read.attach(1));
    gl!.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(density.write.fbo);
    density.swap();
  }

  function render(target: any) {
    gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    gl!.enable(gl!.BLEND);

    const width = target == null ? gl!.drawingBufferWidth : dyeWidth;
    const height = target == null ? gl!.drawingBufferHeight : dyeHeight;

    gl!.viewport(0, 0, width, height);

    colorProgram.bind();
    const bc = config.BACK_COLOR;
    gl!.uniform4f(colorProgram.uniforms.color, bc.r / 255, bc.g / 255, bc.b / 255, 1);
    blit(target);

    const program = config.SHADING ? displayShadingProgram : displayProgram;
    program.bind();
    gl!.uniform2f(program.uniforms.texelSize, 1.0 / width, 1.0 / height);
    gl!.uniform1i(program.uniforms.uTexture, density.read.attach(0));
    blit(target);
  }

  function resizeCanvas() {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      initFramebuffers();
    }
  }

  function pointerPos(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  const teardown: Array<() => void> = [];
  function on(target: any, type: string, handler: any, opts?: any) {
    target.addEventListener(type, handler, opts);
    teardown.push(() => target.removeEventListener(type, handler, opts));
  }

  on(window, 'mousemove', (e: MouseEvent) => {
    const { x, y } = pointerPos(e.clientX, e.clientY);
    const p = pointers[0];
    if (!p.everMoved) {
      p.everMoved = true;
      p.x = x;
      p.y = y;
      p.down = true;
      return;
    }
    p.down = true;
    p.moved = true;
    p.dx = (x - p.x) * 5.0;
    p.dy = (y - p.y) * 5.0;
    p.x = x;
    p.y = y;
    p.color = generateColor();
  });

  on(window, 'touchmove', (e: TouchEvent) => {
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
      if (i >= pointers.length) pointers.push(new Pointer());
      const p = pointers[i];
      const { x, y } = pointerPos(touches[i].clientX, touches[i].clientY);
      p.down = true;
      p.moved = p.everMoved === true;
      p.everMoved = true;
      p.dx = (x - p.x) * 8.0;
      p.dy = (y - p.y) * 8.0;
      p.x = x;
      p.y = y;
    }
  }, { passive: true });

  on(window, 'touchstart', (e: TouchEvent) => {
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
      if (i >= pointers.length) pointers.push(new Pointer());
      const p = pointers[i];
      const { x, y } = pointerPos(touches[i].clientX, touches[i].clientY);
      p.id = touches[i].identifier;
      p.down = true;
      p.x = x;
      p.y = y;
      p.color = generateColor();
    }
  }, { passive: true });

  function update() {
    if (isDestroyed) return;
    resizeCanvas();
    driveVirtualPointer();
    input();
    if (!config.PAUSED) step(0.016);
    render(null);
    rafHandle = requestAnimationFrame(update);
  }

  update();

  return function destroy() {
    isDestroyed = true;
    if (rafHandle) cancelAnimationFrame(rafHandle);
    for (const off of teardown) off();
  };
}
