"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import SpecializationsSection from "@/components/SpecializationsSection";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import ScrollDotNav from "@/components/ScrollDotNav";

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);

  // Hero shrinks into a rounded card over the back half of its own scroll
  // range, so the specializations panel arrives over a receding page.
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"],
  });
  const heroScale = useTransform(heroProgress, [0.5, 1], [1, 0.88]);
  const heroOpacity = useTransform(heroProgress, [0.5, 1], [1, 0.6]);
  const heroRadius = useTransform(heroProgress, [0.5, 1], ["0px", "20px"]);

  return (
    <>
      <ScrollDotNav />
      <main>
        <div ref={heroRef} className="relative z-[1] h-[150vh]">
          <motion.div
            style={{
              scale: heroScale,
              opacity: heroOpacity,
              borderRadius: heroRadius,
              willChange: "transform",
            }}
            className="sticky top-0 h-screen w-full overflow-hidden"
          >
            <HeroSection />
          </motion.div>
        </div>

        {/* Height comes from the section itself, which is h-screen on desktop
            and auto on mobile. The wrapper used to restate 100vh, which pinned
            it to a viewport even where the section had shrunk to its content.
            (At 200vh the section was pinned for the extra 100vh, so the page
            kept scrolling while nothing on screen moved.) */}
        <div className="specializations-wrapper relative z-[2] h-auto">
          <SpecializationsSection />
        </div>

        <ProjectsSection />
        <AboutSection />
        <ContactSection />
        <Footer />
      </main>
    </>
  );
}
