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
      }, 400)
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
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        style={{
          transform: "translate(-2px, -2px)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter:
              "drop-shadow(0 0 6px rgba(0,153,255,0.85)) drop-shadow(0 0 14px rgba(0,153,255,0.35))",
            display: "block",
          }}
        >
          <path
            d="M4.5 2.5C3.4 1.6 2 2.4 2 3.8L2 22.5C2 24 3.8 24.6 4.7 23.5L9.8 17.2L15.2 24.6C15.8 25.4 16.9 25.2 17.4 24.4L19.4 20.4C19.7 19.7 19.5 18.9 18.9 18.4L13.6 14.9L21.8 12C23 11.6 23 9.9 21.8 9.5L5 2.8C4.8 2.7 4.6 2.6 4.5 2.5Z"
            fill="#0099ff"
          />
        </svg>
      </div>
    </div>
  )
}
