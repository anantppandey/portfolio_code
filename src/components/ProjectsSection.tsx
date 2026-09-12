"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import HoverImageReveal from "@/components/HoverImageReveal";
import { lockScroll, unlockScroll } from "@/components/SmoothScroll";

const projects = [
{
    title: "5-DOF Manipulation Stack",
    status: "Robotics",
    tagline: "Custom IK solver with collision-aware grasp planning",
    description:
      "Engineered a custom 5-DOF IK solver and octomap-based obstacle avoidance in Gazebo, planning collision-aware grasps with MoveIt Task Constructor. Built a ROS2 action-server pipeline with multi-object perception and automatic grasp-failure retry for autonomous pick-and-place.",
    tech: ["ROS2", "MoveIt2", "Gazebo", "Python", "MoveIt Task Constructor"],
    github: "https://github.com/anantppandey/manipulation-stack",
    initials: "5D",
    videoSrc: "/media/gif/manip_demo.webm",
  },
{
    title: "OpenBot Giraffe",
    status: "Open Source",
    tagline: "Affordable 5-DOF robotic arm for hobbyists and researchers",
    description:
      "Designed an affordable 5-DOF robotic manipulator with a 3D-printed frame and ST3215 servos. Integrated with LeRobot, ROS2 and MoveIt for trajectory planning, teleoperation and imitation learning in both simulated and real-world applications.",
    tech: ["ROS2", "LeRobot", "MoveIt2", "Python", "Fusion 360", "Isaac Sim"],
    github: "https://github.com/anantppandey/openbot-giraffe",
    initials: "OG",
    videoSrc: "/media/img/hardware.jpeg",
  },
{
    title: "MuJoCo-Gazebo RL Transfer",
    status: "Research",
    tagline: "PPO reach policy trained in MuJoCo and transferred to Gazebo",
    description:
      "Trained a PPO reach policy from scratch in MuJoCo using Stable-Baselines3, raising success rate from 37% to 78% through seed-controlled ablation. Built a ROS2 and Gazebo pipeline transferring the policy across simulators with retry-based trajectory generation and closed-loop control.",
    tech: ["MuJoCo", "Stable-Baselines3", "ROS2", "Gazebo", "Python", "PPO"],
    github: "https://github.com/anantppandey/mujoco-gazebo-transfer",
    initials: "MG",
    videoSrc: "/media/gif/train.webm",
  },
{
    title: "Servoless Leader Arm",
    status: "Robotics",
    tagline: "Custom leader arm designed for intuitive robotic teleoperation",
    description:
      "Designed and built a servoless leader arm intended to provide physical input for robotic arm teleoperation, focusing on mechanical design, joint motion and operator-driven pose control.",
    tech: ["Robotics", "Mechanical Design", "3D Printing", "Teleoperation", "CAD"],
    github: "",
    initials: "SL",
    videoSrc: "/media/gif/servoless_leader.mp4",
  },
{
    title: "UR5e Trajectory Follower / Teleoperation",
    status: "Robotics",
    tagline: "Trajectory following and real-time teleoperation for the UR5e",
    description:
      "Trajectory following and teleoperation pipeline for the UR5e robotic arm, connecting commanded trajectories and operator input to the robot for controlled motion execution.",
    tech: ["UR5e", "ROS2", "Python", "Trajectory Following", "Teleoperation"],
    github: "",
    initials: "UR",
    videoSrc: "/media/img/isaac.jpeg",
  },
{
    title: "RRT Maze Solver",
    status: "Algorithm",
    tagline: "Rapidly-exploring Random Tree path planning in dynamic mazes",
    description:
      "Python-based maze solver using the RRT algorithm to navigate complex dynamic environments. Built an interactive maze editor for creating custom obstacle layouts and start and goal points with high computational efficiency.",
    tech: ["Python", "RRT Algorithm", "NumPy", "Matplotlib"],
    github: "https://github.com/anantppandey/rrt-maze-solver",
    initials: "RM",
    videoSrc: "/media/img/RRT.png",
  },
{
    title: "ML-based NMPC",
    status: "Research",
    tagline: "Neural network replacing PID control in a quadrotor MPC",
    description:
      "Modeled quadrotor nonlinear flight dynamics as a state-dependent linear system inside a Nonlinear MPC controller in MATLAB. Trained a TensorFlow neural network on NMPC trajectory data to predict quadrotor state evolution, improving prediction MAE by 47% over the analytical model.",
    tech: ["TensorFlow", "MATLAB", "Python", "NumPy", "Keras"],
    github: "https://github.com/anantppandey/ml-nmpc",
    initials: "NM",
    videoSrc: "/media/img/ml_nmpc.png",
  },
{
    title: "Custom 3D Printed Wallet",
    status: "Design",
    tagline: "Custom-designed 3D printed wallet",
    description:
      "Designed and 3D printed a custom wallet, developing the geometry and physical form as a compact functional object.",
    tech: ["Fusion 360", "3D Printing", "CAD", "Product Design"],
    github: "",
    initials: "CW",
    videoSrc: "/media/gif/wallet.mp4",
  }
];

export default function ProjectsSection() {
  const [selectedProject, setSelectedProject] = useState<
    (typeof projects)[0] | null
  >(null);
  /** Starts false so the server render matches; the real value lands after mount. */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      lockScroll();
    } else {
      unlockScroll();
    }
    return () => {
      unlockScroll();
    };
  }, [selectedProject]);

  const closeOverlay = () => {
    setSelectedProject(null)
    if (window.history.state?.overlayOpen) {
      window.history.back()
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeOverlay()
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      window.history.pushState(
        { overlayOpen: true, projectTitle: selectedProject.title },
        "",
        window.location.href
      )
    }
  }, [selectedProject])

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (selectedProject) {
        e.preventDefault()
        setSelectedProject(null)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [selectedProject])

  const items = {
    itemCount: projects.length,
    ...Object.fromEntries(
      projects.map((p, i) => [
        `item${i + 1}`,
        {
          text: p.title,
          image: { src: p.videoSrc, alt: p.tagline },
          description: p.description,
          status: p.status,
          tech: p.tech,
        },
      ]),
    ),
  };

  return (
    <section
      id="projects"
      style={{
        background: "#090909",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: isMobile ? "48px 20px" : "80px 0 96px 0",
        position: "relative",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: isMobile ? "0 20px" : "0 80px",
          marginBottom: "32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "#444444",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 400,
            margin: 0,
            marginBottom: "10px",
          }}
        >
          03 — Projects
        </p>
        <h2
          style={{
            fontSize: isMobile
              ? "clamp(28px, 8vw, 44px)"
              : "clamp(52px, 7vw, 88px)",
            fontWeight: 500,
            color: "#ffffff",
            letterSpacing: isMobile ? "-2px" : "-4px",
            lineHeight: 1.0,
            margin: 0,
          }}
        >
          More of my projects
          <span
            style={{
              color: "#0099ff",
              fontSize: "inherit",
              fontWeight: 500,
            }}
          >
            .
          </span>
        </h2>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: "400px",
          padding: isMobile ? "0 20px" : "0 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <HoverImageReveal
          items={items}
          backgroundColor="#090909"
          textColor="#ffffff"
          dimColor="#252525"
          align="left"
          rowGap={0}
          font={{
            fontSize: "clamp(22px, 3vw, 40px)",
            fontWeight: 400,
            letterSpacing: "-0.03em",
            lineHeight: "1.0",
            fontFamily: "Inter",
          }}
          transition={{
            stiffness: 350,
            damping: 38,
            mass: 0.8,
          }}
          style={{
            padding: "0",
            height: "auto",
            justifyContent: "flex-start",
            gap: "0px",
            overflow: "visible",
          }}
          onItemClick={(index) => {
            setSelectedProject(projects[index])
          }}
        />
      </div>

      {typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              className="project-overlay-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => {
                setSelectedProject(null)
              }}
              role="dialog"
              aria-modal="true"
              aria-label={selectedProject.title}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(9,9,9,0.95)",
                backdropFilter: "blur(20px)",
              }}
            >
            <motion.div
              className="project-overlay-inner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="project-overlay-left" style={{ overflow: "hidden" }}>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#141414",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    className="project-overlay-initials"
                    style={{
                      fontSize: "64px",
                      fontWeight: 500,
                      color: "#1e1e1e",
                      letterSpacing: "-3px",
                    }}
                  >
                    {selectedProject.initials}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#222",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    Preview soon
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to right, transparent 60%, rgba(9,9,9,0.8) 100%)",
                    pointerEvents: "none",
                  }}
                />
              </div>

              <div
                className="project-overlay-right"
                style={{
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  maxHeight: "100%",
                }}
              >
                <button
                  className="project-overlay-close"
                  onClick={() => {
              closeOverlay()
            }}
                  aria-label="Close project details"
                  style={{
                    position: "absolute",
                    top: "32px",
                    right: "32px",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "#141414",
                    border: "0.5px solid #262626",
                    color: "#999999",
                    fontSize: "18px",
                    cursor: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  x
                </button>

                <div
                  style={{
                    display: "inline-flex",
                    background: "rgba(255,255,255,0.06)",
                    border: "0.5px solid rgba(255,255,255,0.12)",
                    borderRadius: "100px",
                    padding: "4px 12px",
                    fontSize: "11px",
                    color: "#cccccc",
                    marginBottom: "20px",
                    width: "fit-content",
                  }}
                >
                  {selectedProject.status}
                </div>

                <h2
                  className="project-overlay-title"
                  style={{
                    fontSize: "clamp(28px, 3.5vw, 44px)",
                    fontWeight: 500,
                    color: "#ffffff",
                    letterSpacing: "-2px",
                    lineHeight: 1.0,
                    margin: "0 0 16px 0",
                  }}
                >
                  {selectedProject.title}
                </h2>

                <p
                  className="project-overlay-desc"
                  style={{
                    fontSize: "14px",
                    color: "#666666",
                    lineHeight: 1.6,
                    margin: "0 0 32px 0",
                    maxWidth: "380px",
                  }}
                >
                  {selectedProject.description}
                </p>

                <p
                  style={{
                    fontSize: "11px",
                    color: "#555555",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    margin: "0 0 12px 0",
                  }}
                >
                  Tools and Technologies
                </p>

                <div
                  className="project-overlay-chips"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginBottom: "32px",
                  }}
                >
                  {selectedProject.tech.map((t) => (
                    <span
                      className="project-overlay-chip"
                      key={t}
                      style={{
                        background: "#1c1c1c",
                        border: "0.5px solid #262626",
                        borderRadius: "100px",
                        padding: "5px 13px",
                        fontSize: "12px",
                        color: "#cccccc",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <p
                  style={{
                    fontSize: "11px",
                    color: "#555555",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    margin: "0 0 12px 0",
                  }}
                >
                  Links
                </p>

                {selectedProject.github && (
                  <a
                    className="project-overlay-github"
                    href={selectedProject.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#141414",
                      border: "0.5px solid #262626",
                      borderRadius: "100px",
                      padding: "10px 20px",
                      fontSize: "12px",
                      color: "#cccccc",
                      textDecoration: "none",
                      width: "fit-content",
                      cursor: "none",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    View on GitHub
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}
    </section>
  );
}
