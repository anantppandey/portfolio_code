"use client"

import { useEffect, useRef, useState } from "react"

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: -100, y: -100 })
  const [visible, setVisible] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
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
      if (!visible) setVisible(true)
    }

    const handleScroll = () => {
      setScrolling(true)
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => {
        setScrolling(false)
      }, 0)
    }

    const handleLeave = () => setVisible(false)
    const handleEnter = () => setVisible(true)

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
    document.documentElement.addEventListener("mouseleave", handleLeave)
    document.documentElement.addEventListener("mouseenter", handleEnter)

    return () => {
      window.removeEventListener("mousemove", moveCursor)
      window.removeEventListener("scroll", handleScroll)
      document.documentElement.removeEventListener("mouseleave", handleLeave)
      document.documentElement.removeEventListener("mouseenter", handleEnter)
      clearTimeout(scrollTimerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [visible])

  if (isMobile) return null

  const isHidden = !visible || scrolling

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
        transition: scrolling
          ? "opacity 0.15s ease-out"
          : "opacity 0.1s ease-in",
      }}
    >
      <div
        style={{
          transform: "translate(-4px, -4px)",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter:
              "drop-shadow(0 0 8px rgba(0,153,255,0.7)) drop-shadow(0 0 20px rgba(0,153,255,0.3))",
            display: "block",
          }}
        >
          <defs>
            <linearGradient
              id="cursorGradient"
              x1="20"
              y1="10"
              x2="60"
              y2="90"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#0099ff" />
              <stop offset="100%" stopColor="#6644ff" />
            </linearGradient>
          </defs>
          <path
            d="M15 8
               C12 5 8 7 8 11
               L8 78
               C8 83 14 85 17 81
               L36 57
               L55 83
               C57 86 61 85 63 82
               L70 68
               C71 65 70 62 68 60
               L49 48
               L82 38
               C87 36 87 29 82 27
               Z"
            fill="url(#cursorGradient)"
          />
        </svg>
      </div>
    </div>
  )
}
