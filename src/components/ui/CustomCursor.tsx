"use client"

import { useEffect, useRef, useState } from "react"

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: -100, y: -100 })
  const [active, setActive] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY }
      setActive(true)
    }

    const handleScroll = () => {
      setActive(false)
    }

    const loop = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${posRef.current.x}px, ${posRef.current.y}px)`
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    window.addEventListener("mousemove", moveCursor)
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("mousemove", moveCursor)
      window.removeEventListener("scroll", handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (isMobile) return null

  const isHidden = !active

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 99999,
        pointerEvents: "none",
        willChange: "transform",
        opacity: isHidden ? 0 : 1,
        transition: isHidden
          ? "opacity 0.12s ease-out"
          : "opacity 0.08s ease-in",
      }}
    >
      <div
        style={{
          transform: "translate(-3px, -3px)",
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter:
              "drop-shadow(0 0 6px rgba(0,153,255,0.6)) drop-shadow(0 0 16px rgba(100,68,255,0.25))",
            display: "block",
          }}
        >
          <defs>
            <linearGradient
              id="cursorGrad"
              x1="4"
              y1="3"
              x2="15"
              y2="31"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#1e88ff" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path
            d="
              M4.02 3.42
              L28.72 13.59
              Q30.2 14.2 28.82 15.01
              L21.68 19.19
              Q20.3 20 19.46 21.36
              L15.04 28.54
              Q14.2 29.9 13.59 28.42
              L3.42 4.02
              Q3 3 4.02 3.42
              Z
            "
            fill="url(#cursorGrad)"
          />
        </svg>
      </div>
    </div>
  )
}
