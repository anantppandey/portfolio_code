"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";

/** Stand-in footage for every project until the real clips exist. */
const PLACEHOLDER_GIF = "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Media rendered on the server can fail before hydration attaches onError,
 * and the error event does not fire twice. These read the element's settled
 * state on commit so such a failure is still caught.
 */
const imgAlreadyFailed = (el: HTMLImageElement | null) =>
  !!el && el.complete && el.naturalWidth === 0;
const videoAlreadyFailed = (el: HTMLVideoElement | null) =>
  !!el && el.error !== null;

export type HoverImageRevealItem = {
  text?: string;
  image?: { src?: string; alt?: string };
  link?: string;
  description?: string;
  status?: string;
  tech?: string[];
};

export type HoverImageRevealItems = {
  itemCount: number;
} & Record<string, HoverImageRevealItem | number>;

export interface HoverImageRevealProps {
  items: HoverImageRevealItems;
  backgroundColor?: string;
  textColor?: string;
  dimColor?: string;
  align?: "left" | "center" | "right";
  rowGap?: number;
  font?: CSSProperties;
  /** Accepted for API compatibility; the inline reveal uses CSS transitions. */
  transition?: { stiffness?: number; damping?: number; mass?: number };
  style?: CSSProperties;
  onItemClick?: (index: number) => void;
}

export default function HoverImageReveal({
  items,
  backgroundColor = "transparent",
  textColor = "#ffffff",
  dimColor = "#2a2a2a",
  align = "left",
  rowGap = 0,
  font,
  style,
  onItemClick,
}: HoverImageRevealProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  /**
   * null until mounted so the server render stays stable. Media is rendered only
   * once this settles to false, which keeps touch devices from fetching any clip.
   */
  const [isTouch, setIsTouch] = useState<boolean | null>(null);
  /** Indices whose video or image failed to load, keyed so each is retried once. */
  const [failedMedia, setFailedMedia] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const sync = () => setIsTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const markBroken = (index: number) =>
    setFailedMedia((prev) =>
      prev[index] ? prev : { ...prev, [index]: true },
    );
  /** One flag for all rows: they share the same stand-in gif URL. */
  const [gifFailed, setGifFailed] = useState(false);

  const count = Number(items.itemCount ?? 0);
  const list: HoverImageRevealItem[] = Array.from({ length: count }, (_, i) => {
    const entry = items[`item${i + 1}`];
    return typeof entry === "object" && entry !== null
      ? (entry as HoverImageRevealItem)
      : {};
  });

  const justify =
    align === "center"
      ? "center"
      : align === "right"
        ? "flex-end"
        : "flex-start";

  /** Touch: no hover expand at all. Media waits for a confirmed pointer device. */
  const touch = isTouch === true;
  const showMedia = isTouch === false;

  return (
    <div
      onMouseLeave={touch ? undefined : () => setHovered(null)}
      style={{
        position: "relative",
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        gap: `${rowGap}px`,
        cursor: "none",
        ...style,
      }}
    >
      {list.map((item, i) => {
        const isHovered = hovered === i;
        const dimmed = hovered !== null && !isHovered;

        const src = item.image?.src;
        const isVideo =
          !!src && (src.endsWith(".mp4") || src.endsWith(".webm"));
        const isImage = !!src && !isVideo && !src.startsWith("/videos");
        const broken = failedMedia[i];
        const mediaStyle: CSSProperties = {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
          display: "block",
          borderRadius: "10px",
        };

        return (
          <div
            key={i}
            onMouseEnter={touch ? undefined : () => setHovered(i)}
            onClick={() => onItemClick?.(i)}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              cursor: "none",
              minHeight: touch ? "60px" : undefined,
              padding: touch ? "16px 0" : "20px 0 0 0",
              borderTop: i === 0 ? "0.5px solid #1a1a1a" : undefined,
              transition: `all 0.4s ${EASE}`,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {/* Text row: title, index, and the blue sweep beneath them */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: justify,
                width: "100%",
              }}
            >
              <div style={{ overflow: "hidden", flex: 1 }}>
                <motion.div
                  animate={{ color: dimmed ? dimColor : textColor }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    display: "block",
                    color: textColor,
                    textAlign: align,
                    ...font,
                    // Spread last so the touch size beats the caller's fontSize.
                    ...(touch ? { fontSize: "clamp(20px, 5vw, 32px)" } : null),
                  }}
                >
                  {item.text}
                </motion.div>
              </div>

              <span
                style={{
                  fontSize: "11px",
                  color: isHovered ? "#444444" : "#1a1a1a",
                  fontWeight: 400,
                  letterSpacing: "0.14em",
                  fontFamily: "Inter",
                  transition: "color 0.2s ease",
                  flexShrink: 0,
                  marginLeft: "auto",
                  paddingLeft: "32px",
                  alignSelf: "center",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  height: "0.5px",
                  width: isHovered ? "100%" : "0%",
                  background: "#0099ff",
                  transition: `width 0.45s ${EASE}`,
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Expanded project preview: media on the left, project details on the right. */}
            {showMedia && (
              <motion.div
                aria-hidden={!isHovered}
                initial={false}
                animate={{
                  height: isHovered ? "300px" : "0px",
                  marginTop: isHovered ? "16px" : "0px",
                  opacity: isHovered ? 1 : 0,
                }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "relative",
                  width: "100%",
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "300px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1px",
                    background: "#262626",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  {/* Media half — contain keeps the entire image/video visible. */}
                  <div
                    style={{
                      position: "relative",
                      minWidth: 0,
                      height: "300px",
                      background: "#111111",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {isVideo && !broken ? (
                      <video
                        src={src}
                        autoPlay
                        muted
                        loop
                        playsInline
                        ref={(el) => {
                          if (videoAlreadyFailed(el)) markBroken(i);
                        }}
                        onError={() => markBroken(i)}
                        style={{
                          ...mediaStyle,
                          height: "100%",
                          objectFit: "contain",
                          objectPosition: "center",
                          borderRadius: 0,
                        }}
                      />
                    ) : isImage && !broken ? (
                      // eslint-disable-next-line @next/next/no-img-element -- arbitrary project asset URLs
                      <img
                        src={src}
                        alt={item.image?.alt || item.text || ""}
                        ref={(el) => {
                          if (imgAlreadyFailed(el)) markBroken(i);
                        }}
                        onError={() => markBroken(i)}
                        style={{
                          ...mediaStyle,
                          height: "100%",
                          objectFit: "contain",
                          objectPosition: "center",
                          borderRadius: 0,
                        }}
                      />
                    ) : !gifFailed ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote gif; next/image would need a config change
                      <img
                        src={PLACEHOLDER_GIF}
                        alt={`${item.text ?? "Project"} preview`}
                        loading="eager"
                        ref={(el) => {
                          if (imgAlreadyFailed(el)) setGifFailed(true);
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          setGifFailed(true);
                        }}
                        style={{
                          ...mediaStyle,
                          height: "100%",
                          objectFit: "contain",
                          objectPosition: "center",
                          borderRadius: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "#111111",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          fontFamily: "Inter",
                        }}
                      >
                        <svg width="48" height="48" viewBox="0 0 48 48">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            fill="rgba(0,153,255,0.15)"
                            stroke="rgba(0,153,255,0.4)"
                            strokeWidth="1"
                          />
                          <polygon
                            points="20,16 32,24 20,32"
                            fill="rgba(0,153,255,0.8)"
                          />
                        </svg>
                        <div
                          style={{
                            fontSize: "9px",
                            color: "#555555",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                          }}
                        >
                          Preview soon
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details half */}
                  <div
                    style={{
                      height: "300px",
                      minWidth: 0,
                      background: "#0f0f0f",
                      padding: "30px 36px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      fontFamily: "Inter",
                      overflow: "auto",
                    }}
                  >
                    {item.status && (
                      <div
                        style={{
                          fontSize: "9px",
                          color: "#0099ff",
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          marginBottom: "12px",
                        }}
                      >
                        {item.status}
                      </div>
                    )}

                    {item.description && (
                      <p
                        style={{
                          fontSize: "17px",
                          lineHeight: 1.65,
                          color: "#777777",
                          margin: "0 0 18px 0",
                          maxWidth: "520px",
                        }}
                      >
                        {item.description}
                      </p>
                    )}

                    {item.tech && item.tech.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "5px",
                        }}
                      >
                        {item.tech.map((tech) => (
                          <span
                            key={tech}
                            style={{
                              padding: "6px 11px",
                              border: "0.5px solid #292929",
                              borderRadius: "999px",
                              color: "#777777",
                              fontSize: "9px",
                              letterSpacing: "0.02em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Hairline that the media pushes down while the row is open */}
            <div
              style={{
                height: "0.5px",
                background: "#1a1a1a",
                marginTop: touch ? "16px" : isHovered ? "16px" : "20px",
                transition: `margin-top 0.45s ${EASE}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
