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
          transform: "translate(-2px, -2px)",
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
              x1="6"
              y1="4"
              x2="22"
              y2="34"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#0099ff" />
              <stop offset="100%" stopColor="#6644ff" />
            </linearGradient>
          </defs>
          <path
            d="
              M6 4
              C5 3 3.5 3.5 3.5 5
              L3.5 28
              C3.5 29.8 5.8 30.5 6.9 29.1
              L12 22.5
              C12.5 21.9 13.1 21.6 13.8 21.6
              L14.4 21.6
              C15.1 21.6 15.8 21.9 16.2 22.4
              L20.8 28.8
              C21.6 29.9 23.2 29.6 23.7 28.3
              L25.4 24.1
              C25.7 23.3 25.4 22.4 24.7 21.9
              L19.2 18.4
              C18.4 17.9 18.4 16.8 19.2 16.3
              L30.5 10.8
              C31.8 10.2 31.8 8.3 30.5 7.7
              Z
            "
            fill="url(#cursorGrad)"
          />
        </svg>
      </div>
    </div>
  )
}
