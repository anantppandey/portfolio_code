"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { getLenis } from "@/components/SmoothScroll";

/** Stand-in footage for every project until the real clips exist. */
const PLACEHOLDER_GIF = "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Hold the page still. Lenis drives the scroll position itself, so pausing the
 * engine is what actually stops the page moving under the strip. It is also
 * what stops it moving at all: a stopped Lenis cancels every touchmove it
 * sees, upward ones included, which is why the frozen section needs the
 * deliberate release in the handlers below rather than simply letting the
 * reverse gesture through.
 */
const pausePageScroll = () => {
  getLenis()?.stop();
};

/**
 * Give the page back. An open overlay holds the same lock by way of
 * `body { overflow: hidden }`, and starting the engine here would let the page
 * scroll away behind it, so the lock is left alone when one is up.
 */
const resumePageScroll = () => {
  if (document.body.style.overflow !== "hidden") getLenis()?.start();
};

/** Gap between carousel cards, shared by the layout and the dot arithmetic. */
const CARD_GAP = 12;

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
  /**
   * The whole mobile block, strip plus dots. Centring is measured off this
   * rather than the strip so it tracks the section the eye sees.
   */
  const sectionRef = useRef<HTMLDivElement>(null);
  /** Which card the strip has settled on, for the dots below it. */
  const [activeCard, setActiveCard] = useState(0);
  /** True while the section holds the centre and downward input drives the strip. */
  const isHijacking = useRef(false);
  /**
   * Latches once the strip has been driven to its last card. The pass is a one
   * time run from the top down: from then on the section scrolls like any
   * other part of the page, so returning back up through it is never caught.
   */
  const hasCompletedHijack = useRef(false);
  /**
   * Set when an upward drag hands the page back. Re-arming is held off until
   * the section has actually left the centre, otherwise the next scroll event
   * would pull it straight back into a freeze and the escape would not stick.
   */
  const released = useRef(false);

  /**
   * Take the page once the section reaches the middle of the screen, and give
   * it back when the section leaves. A frozen page cannot emit scroll events,
   * so this settles into one state per visit rather than oscillating.
   */
  useEffect(() => {
    if (!isMobile) return;

    const check = () => {
      const target = sectionRef.current ?? carouselRef.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const centered =
        Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2) < 100;

      if (hasCompletedHijack.current) {
        if (isHijacking.current) {
          isHijacking.current = false;
          resumePageScroll();
        }
        return;
      }

      if (released.current) {
        if (centered) return;
        released.current = false;
      }

      if (isHijacking.current === centered) return;

      isHijacking.current = centered;
      if (centered) {
        pausePageScroll();
      } else {
        resumePageScroll();
      }
    };

    window.addEventListener("scroll", check, { passive: true });
    check();

    return () => {
      window.removeEventListener("scroll", check);
      resumePageScroll();
    };
  }, [isMobile]);

  /**
   * Move the strip with downward input. Upward input is deliberately left
   * alone rather than being cancelled: this only ever runs forwards, and
   * swallowing the reverse gesture is what previously left the page unable to
   * scroll back out of the section.
   */
  useEffect(() => {
    if (!isMobile) return;
    const carousel = carouselRef.current;
    if (!carousel) return;

    const atEnd = () =>
      carousel.scrollLeft >=
      carousel.scrollWidth - carousel.clientWidth - 5;

    /**
     * The run is over for good: hand the section back to normal scrolling.
     *
     * Nothing is restored here because nothing was ever taken. The strip
     * carries no snapping on mobile, so there is no engine left to hand back
     * and nothing to jump when a gesture ends.
     */
    const complete = () => {
      isHijacking.current = false;
      hasCompletedHijack.current = true;
      resumePageScroll();
    };

    let touchY = 0;
    let tracking = false;

    const handleTouchStart = (event: TouchEvent) => {
      if (!isHijacking.current || hasCompletedHijack.current) return;
      touchY = event.touches[0].clientY;
      tracking = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!tracking || hasCompletedHijack.current) return;

      const y = event.touches[0].clientY;
      const delta = touchY - y;
      touchY = y;

      if (delta <= 0) {
        /*
         * The way out. While the section is frozen the engine is paused, and a
         * paused engine cancels this gesture whatever it does, so an upward
         * drag has to hand the page back explicitly before the browser can
         * move again. It stays handed back until the section leaves the
         * centre, which is what stops the freeze from simply re-taking it.
         */
        if (isHijacking.current) {
          isHijacking.current = false;
          released.current = true;
          resumePageScroll();
        }
        return;
      }

      if (!isHijacking.current) return;

      if (atEnd()) {
        complete();
        return;
      }

      event.preventDefault();
      carousel.scrollLeft += delta * 1.2;
    };

    const handleTouchEnd = () => {
      tracking = false;
    };

    /*
     * The wheel only became safe to take here once the section started pausing
     * the engine. While it ran, its listener on the same window drove the page
     * regardless of what this one did, and the page slid out from under the
     * strip mid gesture. Paused, it holds still instead, and on a narrow
     * window a wheel is the only input there is, so without this the freeze
     * would have no way to advance the strip or to let go.
     */
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0) {
        /* The same escape the touch path takes. */
        if (isHijacking.current && !hasCompletedHijack.current) {
          isHijacking.current = false;
          released.current = true;
          resumePageScroll();
        }
        return;
      }

      if (!isHijacking.current || hasCompletedHijack.current) return;

      if (atEnd()) {
        complete();
        return;
      }

      event.preventDefault();
      carousel.scrollLeft += event.deltaY;
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
  }, [isMobile]);

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

  /*
   * Which card the strip has settled on. The stride is measured off a real
   * card rather than taken as a share of the container width: the card is
   * sized in vw and then capped by maxWidth, so a percentage of the container
   * does not track it and the index drifts by the end of the strip.
   */
  const cardStride = () => {
    const first = carouselRef.current?.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + CARD_GAP : 0;
  };

  const handleCarouselScroll = () => {
    const carousel = carouselRef.current;
    const stride = cardStride();
    if (!carousel || stride <= 0) return;
    const i = Math.round(carousel.scrollLeft / stride);
    setActiveCard(Math.max(0, Math.min(i, list.length - 1)));
  };

  /*
   * `scrollIntoView` on the card itself rather than arithmetic on a stride:
   * it asks the browser for the card's own offset, so it cannot drift out of
   * step with the layout the way a computed position can.
   */
  const scrollToCard = (i: number) => {
    const card = carouselRef.current?.children[i] as HTMLElement | undefined;
    card?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  if (isMobile) {
    return (
      /* Caps the strip's overflow here so it cannot reach the page and give
         the whole document a sideways scroll. */
      <div ref={sectionRef} style={{ width: "100%", overflowX: "hidden" }}>
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          /* `no-scrollbar` is the existing rule that hides the bar in
             globals.css, kept so this needs no stylesheet change. */
          className="no-scrollbar carousel-container"
          style={{
            display: "flex",
            flexDirection: "row",
            overflowX: "auto",
            /*
             * Stays `hidden`. `visible` cannot survive next to a scrolling
             * axis: the spec computes it to `auto`, which would make this a
             * vertical scroll container and give it a second chance to
             * swallow the page's upward gesture. No `touch-action` here
             * either, for the reason given on the card below.
             */
            overflowY: "hidden",
            /*
             * Off for the whole of mobile, not just while a gesture is being
             * driven. Native snap physics pull the strip toward the nearest
             * card between one assigned position and the next, which is what
             * made a driven drag stutter, and handing the snap back at the end
             * of the gesture is what made it jump. The carousel still swipes,
             * it just stops short of aligning itself to a card.
             */
            scrollSnapType: "none",
            WebkitOverflowScrolling: "touch",
            /*
             * Also off, and for a related reason: `smooth` animates toward
             * every newly assigned scrollLeft and reports the pre animation
             * value when read back, so a drag arriving faster than the
             * animation can follow only ever contributes its last delta. The
             * dots ask for `behavior: "smooth"` on the call itself, so tapping
             * one still glides.
             */
            scrollBehavior: "auto",
            gap: `${CARD_GAP}px`,
            /* No side padding: the wrapper in the section already insets this
               by 20px, and adding it again here would double that. */
            padding: "0 0 20px 0",
            width: "100%",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            backgroundColor,
          }}
        >
        {list.map((item, i) => {
          const bridge = item.description ?? item.image?.alt;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onItemClick?.(i)}
              style={{
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                flexShrink: 0,
                /* 75vw is 281px against a 295px scrollport, so a snapped card
                   sits fully inside it. At 80vw it was 300px and its right
                   edge fell 5px outside, where it could never be seen. */
                width: "75vw",
                minWidth: "240px",
                maxWidth: "300px",
                minHeight: "420px",
                borderRadius: "14px",
                background: "#141414",
                border: "0.5px solid #1e1e1e",
                position: "relative",
                overflow: "hidden",
                cursor: "none",
                WebkitTapHighlightColor: "transparent",
                /*
                 * Not `pan-x`. The allowed gestures for a touch are the
                 * intersection of `touch-action` from the touched element up
                 * through its ancestors, so `pan-x` here forbids vertical
                 * panning for any gesture that starts on a card, at every
                 * level including the page. The cards are 420px tall and cover
                 * most of the section, so that left an upward swipe through
                 * Projects scrolling nothing at all.
                 *
                 * `manipulation` allows both axes and only drops double tap
                 * zoom, which a tappable card wants gone anyway. Direction is
                 * left to the browser: a sideways swipe finds the carousel,
                 * a vertical one finds the page.
                 */
                touchAction: "manipulation",
                /* The media panel and the details block below it are a
                   column, and the details block relies on flex-1 and
                   mt-auto, so the card stays a flex container. */
                display: "flex",
                flexDirection: "column",
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
                  <span className="text-[13px] leading-[1.55] text-ink-muted">
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

        {/* Position in the strip, and a way to jump straight to a card. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "6px",
            marginTop: "16px",
            paddingBottom: "8px",
          }}
        >
          {list.map((_, i) => (
            <div
              key={i}
              onClick={() => scrollToCard(i)}
              aria-hidden="true"
              style={{
                width: activeCard === i ? "20px" : "6px",
                height: "6px",
                borderRadius: "100px",
                background: activeCard === i ? "#ffffff" : "#333333",
                transition: `all 0.3s ${EASE}`,
                cursor: "none",
              }}
            />
          ))}
        </div>
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