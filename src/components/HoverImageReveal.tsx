"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { getLenis } from "@/components/SmoothScroll";

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

/**
 * Lenis moves the scroll position itself, so `preventDefault` alone does not
 * stop the page sliding under a hijacked carousel and the engine has to be
 * stopped as well. An open project overlay holds the same lock, and it marks
 * that state with `body { overflow: hidden }`, so the release is skipped while
 * that flag is set: otherwise the carousel reaching a card boundary would hand
 * scroll back to a page the overlay is still covering.
 */
const releasePageScroll = () => {
  if (document.body.style.overflow !== "hidden") getLenis()?.start();
};

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
  /** One flag for all rows: they share the same stand-in gif URL. */
  const [gifFailed, setGifFailed] = useState(false);

  /** Mobile only: the horizontally scrolling strip of cards. */
  const carouselRef = useRef<HTMLDivElement>(null);
  /** True while vertical scroll drives the strip instead of the page. */
  const isHijacking = useRef(false);
  /** Card the strip is sitting on, however it got there. */
  const currentCardIndex = useRef(0);

  const count = Number(items.itemCount ?? 0);
  const list: HoverImageRevealItem[] = Array.from({ length: count }, (_, i) => {
    const entry = items[`item${i + 1}`];
    return typeof entry === "object" && entry !== null
      ? (entry as HoverImageRevealItem)
      : {};
  });

  /**
   * The hijack only arms while the strip is mostly on screen, so a gesture
   * anywhere else on the page keeps scrolling the page as usual.
   */
  useEffect(() => {
    if (!isMobile) return;
    const el = carouselRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = entry.isIntersecting && entry.intersectionRatio > 0.6;
        // Scrolling past the strip must hand the page back, or it stays frozen.
        if (!next && isHijacking.current) releasePageScroll();
        isHijacking.current = next;
      },
      { threshold: 0.6 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      releasePageScroll();
    };
  }, [isMobile]);

  /**
   * Vertical scroll moves the cards one at a time and hands control back at
   * either end of the strip. Both gestures are listened for on the window so a
   * swipe that starts on a card is caught too, and the two ends release on the
   * same rule: past the last card downward, before the first one upward.
   */
  useEffect(() => {
    if (!isMobile) return;
    const carousel = carouselRef.current;
    if (!carousel) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    const scrollToCard = (index: number) => {
      const card = carousel.children[index] as HTMLElement | undefined;
      if (!card) return;

      // Cards are 75vw clamped to 260-320px, so the real card is measured
      // rather than assumed: the target has to land on a scroll-snap point.
      const left =
        carousel.scrollLeft +
        card.getBoundingClientRect().left -
        carousel.getBoundingClientRect().left;

      carousel.scrollTo({ left, behavior: "smooth" });
      currentCardIndex.current = index;
    };

    const atStart = () => currentCardIndex.current === 0;
    const atEnd = () => currentCardIndex.current >= count - 1;

    const handleWheel = (e: WheelEvent) => {
      if (!isHijacking.current) return;

      const direction = e.deltaY > 30 ? 1 : e.deltaY < -30 ? -1 : 0;
      if (direction === 0) return;

      if ((direction < 0 && atStart()) || (direction > 0 && atEnd())) {
        releasePageScroll();
        return;
      }

      e.preventDefault();
      getLenis()?.stop();
      scrollToCard(currentCardIndex.current + direction);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!isHijacking.current) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isHijacking.current) return;

      const deltaY = touchStartY - e.touches[0].clientY;
      const deltaX = touchStartX - e.touches[0].clientX;

      // A sideways drag is the user swiping the strip itself, so it is left
      // alone instead of being turned into a page hijack.
      if (Math.abs(deltaY) < 10 || Math.abs(deltaY) <= Math.abs(deltaX)) return;

      if ((deltaY < 0 && atStart()) || (deltaY > 0 && atEnd())) {
        releasePageScroll();
        return;
      }

      e.preventDefault();
      getLenis()?.stop();
      isSwiping = true;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isHijacking.current || !isSwiping) return;

      const deltaY = touchStartY - e.changedTouches[0].clientY;
      if (deltaY > 40) {
        scrollToCard(Math.min(currentCardIndex.current + 1, count - 1));
      } else if (deltaY < -40) {
        scrollToCard(Math.max(currentCardIndex.current - 1, 0));
      }
      isSwiping = false;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobile, count]);

  /** A manual swipe moves the strip too, so the index follows the real card. */
  const handleCarouselScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const containerLeft = carousel.getBoundingClientRect().left;
    let closest = 0;
    let smallest = Infinity;

    Array.from(carousel.children).forEach((child, i) => {
      const distance = Math.abs(
        (child as HTMLElement).getBoundingClientRect().left - containerLeft,
      );
      if (distance < smallest) {
        smallest = distance;
        closest = i;
      }
    });

    currentCardIndex.current = closest;
  };

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

  /*
   * `contain`, not `cover`. The carousel's assets do not share an aspect
   * ratio: five are around 16:9, two are 4:3, and two are 9:16 phone capture.
   * A single frame cannot crop its way to all three, and `cover` was taking
   * 25% off the sides of every 16:9 clip and 58% off the top and bottom of the
   * portrait ones. Containing them shows each in full and lets the frame's own
   * dark ground read as letterboxing, which the gradient along the lower edge
   * already blends into the card.
   */
  const fillMedia: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
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
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-5"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          backgroundColor,
        }}
      >
        {list.map((item, i) => {
          const bridge = item.image?.alt ?? item.description;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onItemClick?.(i)}
              className="relative flex h-[420px] w-[75vw] max-w-[320px] min-w-[260px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-[10px] border-[0.5px] border-hairline bg-surface-1"
              style={{
                cursor: "none",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              {/* Media panel, melting into the card surface along its lower edge */}
              <div className="relative h-[210px] w-full flex-shrink-0 overflow-hidden bg-[#111111]">
                {renderCardMedia(item, i)}

                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[60px]"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, var(--color-surface-1))",
                  }}
                />
              </div>

              {/* Details: status, title, bridge line, then the tech pills */}
              <div className="flex min-h-0 flex-1 flex-col gap-2 px-[18px] pb-[18px] pt-4">
                {item.status && (
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent-blue">
                    {item.status}
                  </span>
                )}

                <span className="line-clamp-2 text-[clamp(22px,6vw,26px)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
                  {item.text}
                </span>

                {bridge && (
                  <span className="line-clamp-2 text-[13px] leading-[1.55] text-ink-muted">
                    {bridge}
                  </span>
                )}

                {item.tech && item.tech.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-[5px] pt-1">
                    {item.tech.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border-[0.5px] border-hairline bg-surface-2 px-[9px] py-1 text-[10px] text-ink-faint"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
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
                  {/* Media half: contain keeps the entire image/video visible. */}
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
