"use client";

import { motion } from "framer-motion";
import { HeroBackground } from "./HeroBackground";

const EASE = [0.16, 1, 0.3, 1] as const;

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
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

      <div className="relative z-[2] px-6 pb-10 pt-[calc(28vh+20px)] md:pl-[100px] md:pr-[160px]">
        {/* Greeting */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: EASE }}
          className="mb-[6px] text-[13px] font-normal tracking-[0.04em] text-ink-muted"
        >
          Hello there,
        </motion.p>

        {/* Role */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
          className="mb-[10px] text-[13px] font-normal tracking-[-0.1px] text-ink-muted"
        >
          Robotics Engineer and Embodied AI Builder
        </motion.p>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
          className="mb-0 whitespace-nowrap text-[clamp(56px,14vw,80px)] font-black leading-[0.88] tracking-[-3px] text-ink md:text-[clamp(88px,11.5vw,144px)] md:tracking-[-6px]"
        >
          I&apos;m Anant
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4, ease: EASE }}
            className="inline-block text-[0.55em] font-black text-accent-blue"
            style={{ verticalAlign: "super" }}
          >
            *
          </motion.span>
        </motion.h1>

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

        {/* Bottom half: bio left, CTAs right */}
        <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2 md:pr-[120px]">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
              className="max-w-full text-[13px] font-normal leading-[1.65] tracking-[-0.1px] text-ink-muted md:max-w-[300px]"
            >
              I build robots that learn. Specializing in manipulation,
              simulation and robot learning across ROS2, MuJoCo and MoveIt2.
              Open to freelance and full-time opportunities.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
              className="mt-5 flex items-center gap-4"
            >
              <a
                href="https://linkedin.com/in/anantpandey"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="inline-flex items-center text-[#555555] no-underline transition-colors duration-200 hover:text-ink"
              >
                <LinkedInIcon />
              </a>
              <a
                href="https://github.com/anantppandey"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="inline-flex items-center text-[#555555] no-underline transition-colors duration-200 hover:text-ink"
              >
                <GitHubIcon />
              </a>
            </motion.div>
          </div>

          <div>
            <motion.a
              href="/media/CV/Anant_Pandey_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6, ease: EASE }}
              className="group mb-[18px] flex items-center gap-3 text-[13px] font-normal tracking-[-0.1px] text-ink-muted transition-colors duration-200 hover:text-ink"
              style={{ cursor: "none" }}
            >
              <span className="text-ink-faint transition-colors duration-200 group-hover:text-ink">
                <ResumeIcon />
              </span>
              <span>
                If you want my resume
                <sup className="ml-[2px] text-[9px] text-accent-blue">**</sup>
              </span>
            </motion.a>

            <motion.a
              href="#contact"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6, ease: EASE }}
              className="group flex items-center gap-3 text-[13px] font-normal tracking-[-0.1px] text-ink-muted transition-colors duration-200 hover:text-ink"
            >
              <span className="text-ink-faint transition-colors duration-200 group-hover:text-ink">
                <ChatIcon />
              </span>
              <span>Or have a chat</span>
            </motion.a>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.6, ease: EASE }}
              className="mt-6 max-w-[240px] text-[11px] font-normal leading-[1.6] tracking-[0.01em] text-[#555555]"
            >
              <p>
                * Robotics Engineer specializing in LeRobot, ROS2 and MoveIt2.
              </p>
              <p>** Resume available on request. I don&apos;t bite.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
