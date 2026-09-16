"use client";

import { useEffect, useState } from "react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export function GlobalBackground() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="dotted-glow-background"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        width: "100vw",
        height: "100vh",
      }}
    >
      <DottedGlowBackground
        className="pointer-events-none mask-radial-to-90% mask-radial-at-center"
        opacity={1}
        gap={10}
        radius={1.6}
        colorLightVar="--color-neutral-800"
        glowColorLightVar="--color-neutral-700"
        colorDarkVar="--color-neutral-700"
        glowColorDarkVar="--color-sky-700"
        backgroundOpacity={0}
        speedMin={isMobile ? 0.1 : 0.3}
        speedMax={isMobile ? 0.5 : 1.2}
        speedScale={isMobile ? 0.4 : 0.8}
      />
    </div>
  );
}
