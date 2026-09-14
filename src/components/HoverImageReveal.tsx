"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";

/** Stand-in footage for every project until the real clips exist. */
const PLACEHOLDER_GIF = "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Sources a <video> can decode. Anything else is handed to an <img>. */
const isVideoSrc = (src: string) => /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(src);

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
  /**
   * Width rather than hover capability: the expand layout is a breakpoint
   * decision, so it follows the width. Starts false so the server render is stable.
   */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
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
        cursor: "default",
        ...style,
      }}
    >
      {list.map((item, i) => {
        const isHovered = hovered === i;
        const dimmed = hovered !== null && !isHovered;

        const src = item.image?.src;
        // Shared with the carousel, so mov and ogg are recognised here too
        // rather than falling through to an img that cannot render them.
        const isVideo = !!src && isVideoSrc(src);
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
              cursor: item.link ? "pointer" : "default",
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
                  // Never opens on mobile: the carousel shows the media
                  // instead, so the row has nothing to expand into.
                  height: isMobile ? "0px" : isHovered ? "300px" : "0px",
                  marginTop: isMobile ? "0px" : isHovered ? "16px" : "0px",
                  opacity: isMobile ? 0 : isHovered ? 1 : 0,
                }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "relative",
                  width: "100%",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "300px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1px",
                    background: "#0d0d0d",
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
                      flex: 1,
                      height: "100%",
                      padding: "20px 24px 20px 20px",
                      // Border box keeps the generous padding from pushing the
                      // panel past its 300px grid row and clipping the text.
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: "10px",
                      overflow: "hidden",
                      background: "#0d0d0d",
                      fontFamily: "Inter",
                    }}
                  >
                    {item.status && (
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "#0099ff",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          fontFamily: "Inter",
                          lineHeight: 1,
                        }}
                      >
                        {item.status}
                      </div>
                    )}

                    {item.description && (
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 400,
                          color: "#cccccc",
                          lineHeight: 1.55,
                          fontFamily: "Inter",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          textOverflow: "ellipsis",
                          margin: 0,
                          padding: 0,
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
                          marginTop: "2px",
                        }}
                      >
                        {item.tech.slice(0, 3).map((tech) => (
                          <span
                            key={tech}
                            style={{
                              background: "#1a1a1a",
                              border: "0.5px solid #262626",
                              borderRadius: "100px",
                              padding: "4px 10px",
                              fontSize: "10px",
                              color: "#666666",
                              fontFamily: "Inter",
                              whiteSpace: "nowrap",
                              lineHeight: 1.4,
                            }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "14px",
                        fontSize: "9px",
                        color: "#3a3a3a",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      Click to view details
                    </div>
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
