"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";

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
  image?: { src?: string; srcSet?: string; alt?: string };
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
   * Width rather than hover capability: the carousel is a layout decision, so
   * it follows the breakpoint. Starts false so the server render is stable.
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

  /** Two letters from the title, the fallback when a card has no artwork. */
  const initialsFor = (text?: string) =>
    (text ?? "")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const fillMedia: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
  };

  /**
   * Artwork for one carousel card: the project's own clip when it is a format
   * a video element can decode, its still otherwise, and the title initials
   * when the source is missing or fails to load.
   */
  const renderCardMedia = (item: HoverImageRevealItem, i: number) => {
    const src = item.image?.src ?? "";
    const broken = failedMedia[i];

    if (src && !broken) {
      if (isVideoSrc(src)) {
        return (
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
            style={fillMedia}
          />
        );
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary project asset URLs
        <img
          src={src}
          alt={item.image?.alt || item.text || ""}
          ref={(el) => {
            if (imgAlreadyFailed(el)) markBroken(i);
          }}
          onError={() => markBroken(i)}
          style={fillMedia}
        />
      );
    }

    return (
      <div
        style={{
          ...fillMedia,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          background: "#111111",
        }}
      >
        <div
          style={{
            fontSize: "32px",
            fontWeight: 500,
            color: "#1e1e1e",
            letterSpacing: "-1px",
            fontFamily: "Inter",
          }}
        >
          {initialsFor(item.text)}
        </div>
        <div
          style={{
            fontSize: "9px",
            color: "#1a1a1a",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "Inter",
          }}
        >
          Preview soon
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          flexDirection: "row",
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          gap: "12px",
          padding: "0 20px 20px 20px",
          width: "100%",
          backgroundColor,
        }}
      >
        {list.map((item, i) => {
          return (
            <div
              key={i}
              onClick={() => onItemClick?.(i)}
              style={{
                flexShrink: 0,
                width: "75vw",
                minWidth: "260px",
                maxWidth: "320px",
                height: "360px",
                scrollSnapAlign: "start",
                borderRadius: "14px",
                background: "#141414",
                // Written out per side rather than as the border shorthand.
                // This node is reused when the layout swaps between the
                // desktop list and this carousel, and the row it swaps with
                // sets borderTop. React warns when it has to drop a shorthand
                // while a conflicting longhand is set, so both sides of the
                // swap stay on longhands.
                borderTop: "0.5px solid #1e1e1e",
                borderBottom: "0.5px solid #1e1e1e",
                borderLeft: "0.5px solid #1e1e1e",
                borderRight: "0.5px solid #1e1e1e",
                position: "relative",
                overflow: "hidden",
                cursor: "none",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              {/* Artwork */}
              <div
                style={{
                  height: "65%",
                  background: "#111111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {renderCardMedia(item, i)}
              </div>

              {/* Caption */}
              <div
                style={{
                  height: "35%",
                  padding: "14px 16px",
                  background: "#141414",
                  borderTop: "0.5px solid #1a1a1a",
                  boxSizing: "border-box",
                  fontFamily: "Inter",
                }}
              >
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "#ffffff",
                    letterSpacing: "-0.4px",
                    lineHeight: 1.1,
                    marginBottom: "4px",
                  }}
                >
                  {item.text}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#555555",
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.image?.alt ?? item.description}
                </div>
              </div>

              <span
                style={{
                  position: "absolute",
                  bottom: "12px",
                  right: "14px",
                  fontSize: "11px",
                  color: "#1e1e1e",
                  letterSpacing: "0.1em",
                  fontFamily: "Inter",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

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

        const src = item.image?.src ?? "";
        // Shared with the carousel, so mov and ogg are recognised here too
        // rather than falling through to an img that cannot render them.
        const isVideo = !!src && isVideoSrc(src);
        const broken = failedMedia[i];
        const expandMediaStyle: CSSProperties = {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          borderRadius: "8px",
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
                  height: isMobile ? "0px" : isHovered ? "280px" : "0px",
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
                    display: "flex",
                    flexDirection: "row",
                    height: "280px",
                    overflow: "hidden",
                    gap: 0,
                    background: "#0d0d0d",
                    borderRadius: "0 0 10px 10px",
                    marginTop: 0,
                  }}
                >
                  {/* Media panel: a tall narrow card inset 12px from the top and bottom. */}
                  <div
                    style={{
                      width: "200px",
                      flexShrink: 0,
                      alignSelf: "stretch",
                      margin: "12px 0",
                      position: "relative",
                      overflow: "hidden",
                      borderRadius: "8px",
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
                        style={expandMediaStyle}
                      />
                    ) : src && !broken ? (
                      // eslint-disable-next-line @next/next/no-img-element -- arbitrary project asset URLs
                      <img
                        src={src}
                        alt={item.image?.alt || item.text || ""}
                        ref={(el) => {
                          if (imgAlreadyFailed(el)) markBroken(i);
                        }}
                        onError={() => markBroken(i)}
                        style={expandMediaStyle}
                      />
                    ) : (
                      <div
                        style={{
                          ...expandMediaStyle,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          background: "#111111",
                          fontFamily: "Inter",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "32px",
                            fontWeight: 500,
                            color: "#1e1e1e",
                            letterSpacing: "-1px",
                          }}
                        >
                          {initialsFor(item.text)}
                        </div>
                        <div
                          style={{
                            fontSize: "9px",
                            color: "#1a1a1a",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                          }}
                        >
                          Preview soon
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details panel: status, description, then tech chips. */}
                  <div
                    style={{
                      flex: 1,
                      height: "100%",
                      padding: "24px 28px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: "12px",
                      overflow: "hidden",
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
                        }}
                      >
                        {item.status}
                      </div>
                    )}

                    {item.description && (
                      <p
                        style={{
                          fontSize: "15px",
                          fontWeight: 400,
                          color: "#cccccc",
                          lineHeight: 1.55,
                          margin: 0,
                          maxWidth: "420px",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          textOverflow: "ellipsis",
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
                          gap: "6px",
                          marginTop: "4px",
                        }}
                      >
                        {item.tech.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            style={{
                              background: "#1c1c1c",
                              border: "0.5px solid #262626",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "11px",
                              color: "#888888",
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
