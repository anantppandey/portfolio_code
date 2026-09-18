"use client";

import { motion } from "framer-motion";
import { HeroBackground } from "./HeroBackground";

const EASE = [0.16, 1, 0.3, 1] as const;

const ICON_CLASS =
  "h-[14px] w-[14px] shrink-0 text-ink-faint transition-colors duration-200 group-hover:text-ink md:h-4 md:w-4";

const CELL_CLASS =
  "group flex cursor-none flex-col items-center justify-center gap-1.5 border-r-[0.5px] border-hairline bg-transparent px-1.5 py-3 no-underline transition-colors duration-200 last:border-r-0 hover:bg-white/[0.04] md:px-2 md:py-3.5";

const LABEL_CLASS =
  "text-[9px] uppercase tracking-[0.08em] text-[#555555] md:text-[10px]";

function LinkedInIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={ICON_CLASS}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={ICON_CLASS}
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={ICON_CLASS}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={ICON_CLASS}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/**
 * Graph-paper hairlines. This is a positioned layer rather than a background
 * on the section, because a section background paints behind its children and
 * the opaque shader at z-0 would bury it. Offset to line up with the 100px
 * content inset.
 */
function GridOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] hidden md:block"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
        `,
        backgroundSize: "130px 130px",
        backgroundPosition: "100px 0",
      }}
    />
  );
}

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative z-[1] min-h-screen w-full overflow-hidden bg-canvas py-0"
    >
      <HeroBackground />
      <GridOverlay />

      <div className="relative z-[2] mx-auto flex min-h-screen w-full max-w-[1100px] flex-col items-start justify-center px-6 py-10 text-left md:px-8 lg:translate-x-0 lg:px-6 xl:-translate-x-[18%] xl:px-6">
        <div className="hero-heading-block w-full max-w-[650px] text-left">
          {/* Greeting */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: EASE }}
          className="mb-[6px] self-start text-left text-[17px] font-normal tracking-[0.04em] text-ink-muted"
        >
          Hello there,
        </motion.p>


        {/* Name */}
        <h1 className="mb-0 leading-[0.82] text-ink">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
            className="block text-left text-[clamp(30px,7vw,44px)] font-black tracking-[-1px] text-ink-muted md:text-[clamp(40px,4.5vw,60px)]"
          >
            I&apos;m
          </motion.span>

          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.8, ease: EASE }}
            className="relative block text-[clamp(78px,20vw,108px)] font-black tracking-[-4px] text-ink md:text-[clamp(100px,11.5vw,165px)] md:tracking-[-6px]"
          >
            Anant
          </motion.span>
        </h1>
        </div>

        {/* Centered content below the name */}
        <div className="flex w-full max-w-[650px] flex-col items-center text-center">
        {/* Separator dividing the hero into halves */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
          style={{
            width: "100%",
            height: "0.5px",
            background: "#262626",
            margin: "28px 0",
          }}
        />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
          className="max-w-[650px] text-[17px] font-normal leading-[1.65] tracking-[-0.1px] text-ink-muted"
        >
          Robotics Engineer specializing in manipulation, simulation, and robot learning. I turn robotic concepts into functional systems, integrating simulation, motion planning, and learning based control across both virtual environments and real world hardware. Currently looking for my next robotics role in Bangalore.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6, ease: EASE }}
          className="mt-7 grid w-full max-w-[480px] grid-cols-4 overflow-hidden rounded-[10px] border-[0.5px] border-hairline"
        >
          <a
            href="https://www.linkedin.com/in/anant-p-pandey/"
            target="_blank"
            rel="noopener noreferrer"
            className={CELL_CLASS}
          >
            <LinkedInIcon />
            <span className={LABEL_CLASS}>LinkedIn</span>
          </a>

          <a
            href="https://github.com/anantppandey"
            target="_blank"
            rel="noopener noreferrer"
            className={CELL_CLASS}
          >
            <GitHubIcon />
            <span className={LABEL_CLASS}>GitHub</span>
          </a>

          <a
            href="/media/CV/Anant_Pandey_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={CELL_CLASS}
          >
            <ResumeIcon />
            <span className={LABEL_CLASS}>Resume</span>
          </a>

          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("contact")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            className={CELL_CLASS}
          >
            <ChatIcon />
            <span className={LABEL_CLASS}>Chat</span>
          </a>
        </motion.div>
        </div>
      </div>
    </section>
  );
}