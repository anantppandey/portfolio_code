"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

if (typeof window !== "undefined") {
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Clock: This module has been deprecated")) return
    originalWarn.apply(console, args as [string, ...unknown[]])
  }
}

function Particles({ count = 120 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10

      const blue = 0.4 + Math.random() * 0.6
      colors[i * 3] = 0
      colors[i * 3 + 1] = blue * 0.6
      colors[i * 3 + 2] = blue
    }

    return [positions, colors]
  }, [count])

  useFrame((state) => {
    if (!mesh.current) return
    mesh.current.rotation.y = state.clock.elapsedTime * 0.008
    mesh.current.rotation.x = state.clock.elapsedTime * 0.004
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

export function ParticleField() {
  const count =
    typeof window !== "undefined" && window.innerWidth < 768 ? 60 : 120

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
        }}
        style={{ background: "transparent", pointerEvents: "none" }}
      >
        <Particles count={count} />
      </Canvas>
    </div>
  )
}
