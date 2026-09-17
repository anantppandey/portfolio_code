"use client";

import { motion } from "framer-motion";

const skillCards = [
  {
    category: "Languages",
    skills: ["Python", "C++", "MATLAB", "Oracle SQL"],
  },
  {
    category: "Platforms and Simulation",
    skills: ["ROS2", "Gazebo", "Isaac Sim", "MuJoCo", "MoveIt2", "Fusion 360"],
  },
  {
    category: "Hardware and IoT",
    skills: ["Raspberry Pi", "Arduino", "NodeMCU", "3D Printing"],
  },
  {
    category: "AI and Data",
    skills: ["TensorFlow", "LeRobot", "Stable-Baselines3", "NumPy", "Pandas"],
  },
];

const easing = [0.16, 1, 0.3, 1] as const;

export default function AboutSection() {
  return (
    <section
      id="about"
      className="relative z-[1] w-full overflow-hidden bg-canvas"
    >
      <div className="about-inner relative z-[1] mx-auto max-w-[1400px] px-6 py-[60px] md:px-[60px] md:py-[80px]">
        {/* Section number label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easing }}
          className="mb-12 text-[11px] uppercase tracking-[0.18em] text-ink-muted"
        >
          03 — About
        </motion.p>

        <div className="about-grid flex flex-col gap-[64px] lg:flex-row">
          {/* Left column */}
          <div className="flex flex-1 flex-col gap-8 lg:max-w-[60%]">
            {/* Section tag pill */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0, duration: 0.6, ease: easing }}
            >
              <span className="inline-block rounded-full border-[0.5px] border-hairline px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                Who I am
              </span>
            </motion.div>

            {/* Display heading */}
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.7, ease: easing }}
              className="font-medium leading-[1.0] text-ink text-[clamp(28px,7vw,42px)] md:text-[clamp(28px,8vw,36px)] lg:text-[clamp(36px,5vw,52px)]"
              style={{ letterSpacing: "-2px" }}
            >
              Building robots
              <br />
              that learn.
              <span className="text-accent-blue">*</span>
            </motion.h2>

            {/* Footnote asterisk */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 0.6, ease: easing }}
              className="text-[12px] text-ink-faint"
            >
              * imitation learning counts
            </motion.p>

            {/* Bio paragraphs */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6, ease: easing }}
              className="max-w-full text-[14px] leading-[1.6] text-ink-muted md:max-w-[520px]"
            >
              I am Anant Pandey, a Robotics Engineer based in Bangalore. I
              started tinkering with Arduinos before I knew what a robot was,
              and never really stopped.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6, ease: easing }}
              className="max-w-full text-[14px] leading-[1.6] text-ink-muted md:max-w-[520px]"
            >
              Today I work at the intersection of manipulation, robot learning
              and simulation, building systems that watch, learn and move. Most
              recently at OpenBot, where I cut system cost by 90% building a
              leader arm from scratch and trained imitation learning policies
              using LeRobot and MoveIt2.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.6, ease: easing }}
              className="max-w-full text-[14px] leading-[1.6] text-ink-muted md:max-w-[520px]"
            >
              I have worked across ROS2, MuJoCo, Isaac Sim, MoveIt2 and
              Stable-Baselines3. From training PPO policies in simulation to
              deploying manipulation stacks on real hardware. If it moves and
              thinks, I probably want to build one.
            </motion.p>

            {/* Closing line */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.6, ease: easing }}
              className="border-l border-hairline pl-[14px] text-[13px] italic text-ink-faint"
            >
              Previously at Deloitte USI · B.Tech EIE, Manipal Institute of
              Technology
            </motion.p>

            {/* Availability badge */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.6, ease: easing }}
              className="flex items-center gap-2"
            >
              <span className="inline-block h-[6px] w-[6px] rounded-full bg-[#22c55e]" />
              <span className="text-[12px] text-[#555555]">
                Open to freelance and full time opportunities · Bangalore, India
              </span>
            </motion.div>
          </div>

          {/* Right column: skill cards */}
          <div className="skill-cards-container flex flex-col gap-3 lg:max-w-[40%]">
            {skillCards.map((card, i) => (
              <motion.div
                key={card.category}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.2 + i * 0.1,
                  duration: 0.6,
                  ease: easing,
                }}
                className="rounded-[10px] border-[0.5px] border-hairline bg-surface-1 p-5 px-6"
              >
                <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[#555555]">
                  {card.category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {card.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-block rounded-full border-[0.5px] border-hairline bg-surface-2 px-[13px] py-[5px] text-[12px] text-[#cccccc] transition-colors duration-200 hover:border-accent-blue hover:text-ink"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
