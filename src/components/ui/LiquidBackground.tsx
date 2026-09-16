"use client"

import { useEffect, useRef } from "react"

const VERT = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const FRAG = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * 0.12;

    float n1 = snoise(vec3(uv * 1.8, t * 0.6));
    float n2 = snoise(vec3(uv * 2.4 + 0.5, t * 0.4 + 1.0));
    float n3 = snoise(vec3(uv * 1.2 - 0.3, t * 0.3 + 2.0));

    float flow = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    flow = flow * 0.5 + 0.5;

    vec3 dark    = vec3(0.035, 0.035, 0.04);
    vec3 blue    = vec3(0.0,   0.08,  0.28);
    vec3 purple  = vec3(0.08,  0.0,   0.22);
    vec3 accent  = vec3(0.0,   0.18,  0.5);

    vec3 col = dark;
    col = mix(col, blue,   smoothstep(0.3, 0.55, flow));
    col = mix(col, purple, smoothstep(0.5, 0.72, flow));
    col = mix(col, accent, smoothstep(0.68, 0.85, flow));
    col = mix(col, dark,   smoothstep(0.82, 1.0,  flow));

    float shimmer = snoise(vec3(uv * 4.0, t * 1.2)) * 0.04;
    col += shimmer;

    float vignette = 1.0 - length((uv - 0.5) * 1.4);
    vignette = clamp(vignette, 0.0, 1.0);
    col *= vignette * 0.6 + 0.4;

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`

export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
    })
    if (!gl) return

    let raf: number
    const startTime = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
      gl.STATIC_DRAW
    )

    const loc = gl.getAttribLocation(prog, "a_position")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, "u_time")
    const uRes  = gl.getUniformLocation(prog, "u_resolution")

    resize()
    window.addEventListener("resize", resize)

    const draw = () => {
      const t = (performance.now() - startTime) / 1000
      gl.uniform1f(uTime, t)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        display: "block",
      }}
    />
  )
}
