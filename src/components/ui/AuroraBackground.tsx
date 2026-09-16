"use client"

import { useEffect, useRef } from "react"

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    let raf: number

    canvas.width = width
    canvas.height = height

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener("resize", handleResize)

    const blobs = [
      {
        x: width * 0.2,
        y: height * 0.3,
        r: 420,
        color: "rgba(0, 80, 200, 0.13)",
        dx: 0.18,
        dy: 0.12,
        phase: 0,
      },
      {
        x: width * 0.75,
        y: height * 0.2,
        r: 380,
        color: "rgba(60, 0, 180, 0.1)",
        dx: -0.14,
        dy: 0.16,
        phase: 1.2,
      },
      {
        x: width * 0.5,
        y: height * 0.7,
        r: 460,
        color: "rgba(0, 120, 255, 0.08)",
        dx: 0.1,
        dy: -0.13,
        phase: 2.4,
      },
      {
        x: width * 0.85,
        y: height * 0.65,
        r: 340,
        color: "rgba(80, 0, 220, 0.09)",
        dx: -0.16,
        dy: -0.1,
        phase: 0.8,
      },
    ]

    let t = 0

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      blobs.forEach((blob) => {
        const px =
          blob.x +
          Math.sin(t * blob.dx + blob.phase) * 180
        const py =
          blob.y +
          Math.cos(t * blob.dy + blob.phase) * 140

        const pulse =
          blob.r +
          Math.sin(t * 0.4 + blob.phase) * 60

        const grad = ctx.createRadialGradient(
          px, py, 0,
          px, py, pulse
        )
        grad.addColorStop(0, blob.color)
        grad.addColorStop(0.5, blob.color.replace(
          /[\d.]+\)$/,
          "0.04)"
        ))
        grad.addColorStop(1, "transparent")

        ctx.beginPath()
        ctx.arc(px, py, pulse, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })

      t += 0.008
      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        opacity: 1,
      }}
    />
  )
}
