"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { lockScroll, unlockScroll } from "@/components/SmoothScroll";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Stand-in for every thumbnail and clip until the real assets land. */
const PLACEHOLDER_GIF = "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif";

/**
 * True when a source is something a <video> can actually decode. The current
 * placeholders are gifs, which a video element cannot play, so those render
 * as an image in the motion layer instead of a silently blank <video>.
 */
const isPlayableVideo = (src: string) =>
  /\.(webm|webm|ogg|mov|m4v)(\?.*)?$/i.test(src);

// ============================================================
// MEDIA CONFIGURATION - Edit this section to adjust images and
// gifs. No other part of the file needs to be touched.
// ============================================================

// HOW TO USE THIS CONFIG:
//
// thumbnail     - path to the still image shown when not hovering
//                 use "/media/img/filename.jpg" for local files
//                 or a full URL for external images
//
// video         - path to the gif or video shown on hover
//                 use "/media/gif/filename.gif" for local gifs
//                 use "/media/videos/filename.webm" for videos
//
// thumbnailScale - zoom level of the image at rest
//                  1.0 = no zoom, 1.1 = slight zoom, 1.5 = very zoomed in
//                  increase if image feels too small inside the pie slice
//                  decrease if image overflows or looks too cropped
//
// videoScale    - zoom level of the gif/video on hover
//                  keep this higher than thumbnailScale for a subtle zoom effect
//                  1.2 to 1.5 is a good range
//
// thumbnailPosition - which point of the image stays centered in the frame at rest
//                      { x, y } as percentages of the image, 0-100 each
//                      x: 0 = left edge, 50 = horizontal center, 100 = right edge
//                      y: 0 = top edge,  50 = vertical center,   100 = bottom edge
//                      e.g. { x: 20, y: 0 } keeps the point 20% in from the left,
//                      right at the top, centered in the frame - use this to pin
//                      a face/logo/detail that sits in a specific spot in the source
//                      image. Values below 0 or above 100 are valid too, and push
//                      the focal point past the image's own edge.
//
// thumbnailFit - how the thumbnail scales inside the media frame
//                "cover" fills the frame but may crop
//                "contain" preserves the entire image without cropping
//
// videoPosition - which point of the gif/video stays centered on hover
//                 same { x, y } system as thumbnailPosition
//
// filter        - CSS filter string applied to both the thumbnail and the
//                  hover video, e.g. "brightness(1.1) contrast(1.05)"
//                  used to bring the three renders (each from a different
//                  sim engine, each with its own default exposure) into a
//                  similar tonal range without recoloring or recropping the
//                  source assets. Keep each engine's own palette/mood -
//                  this only nudges brightness/contrast/saturation, it
//                  doesn't force them to look identical. Tune per-asset:
//                  push brightness up on anything too dark, pull it down
//                  on anything blown out, nudge contrast/saturation to
//                  taste. "none" leaves the source image untouched.
//
// vignetteStrength - multiplier (0-1+) on the dark radial overlay that sits
//                  on top of every slice for depth/framing. 1 = current
//                  look. This overlay reaches ~45-90% black toward the
//                  outer edge of a slice regardless of the image
//                  underneath, so it can visually cancel out a big
//                  `filter` brightness boost - if a section still looks
//                  dark after raising its filter brightness, lower this
//                  instead of raising filter further.

const MEDIA_CONFIG = {
  simulation: {
    thumbnail: "/media/img/sim.jpeg",
    video: "/media/gif/manip_demo.webm",
    thumbnailScale: 0.875,
    videoScale: 0.825,
    thumbnailPosition: { x: 32, y: 55 },
    thumbnailFit: "cover" as const,
    videoPosition: { x: 30, y: 65 },
    // Gazebo's default render sits dark - the arm and the environment
    // behind it (kept deliberately visible for the pick-and-place demo)
    // were both getting lost in shadow. Brighten and lift contrast a touch
    // so the environment reads clearly without washing out.
    filter: "brightness(1.18) contrast(1.05) saturate(1.05)",
    // The rim vignette (see note above) was eating most of the brightness
    // boost above, especially toward the outer edge where a lot of this
    // slice's visible area sits. Cut it roughly in half so the brightened
    // image actually reads as brighter.
    vignetteStrength: 0.5,
  },
  training: {
    thumbnail: "/media/img/isaac.jpeg",
    video: "/media/gif/isaac.webm",
    thumbnailScale: 1.0,
    videoScale: 1.5,
    thumbnailPosition: { x: 50, y: 25 },
    thumbnailFit: "contain" as const,
    videoPosition: { x: 30, y: -4 },
    videoFit: "contain" as const,
    // Isaac Sim's interior is blown out next to the other two slices -
    // pull exposure down and add contrast back so it holds detail instead
    // of reading as flat white.
    filter: "brightness(0.82) contrast(1.15) saturate(1.08)",
    vignetteStrength: 1,
  },
  deployment: {
    thumbnail: "/media/img/train.jpeg",
    video: "/media/gif/train.webm",
    thumbnailScale: 1.3,
    videoScale: 1,
    thumbnailPosition: { x: 75, y: 65 },
    thumbnailFit: "cover" as const,
    videoPosition: { x: 70, y: 70 },
    // Already the most balanced of the three - a small contrast/saturation
    // lift so the checker floor and goal marker hold their own once
    // Simulation is brightened and Training is pulled down to match.
    filter: "brightness(1.35) contrast(1.0) saturate(1.12)",
    vignetteStrength: 1,
  },
  hardware: {
    thumbnail: "/media/img/hardware.jpeg",
    video: "/media/gif/hardware.webm",
    thumbnailScale: 0.42,
    videoScale: 0.755,
    thumbnailPosition: { x: 51, y: 50 },
    thumbnailFit: "contain" as const,
    videoPosition: { x: 60, y: 50 },
    videoFit: "contain" as const,
    // Real photo, not a render - left ungraded so it stays a straightforward
    // anchor against the three rendered slices, same as it is today.
    filter: "none",
    vignetteStrength: 1,
  },
}

// ============================================================
// END OF MEDIA CONFIGURATION
// ============================================================

/**
 * Written out rather than derived from MEDIA_CONFIG.simulation: that inferred
 * `thumbnailFit: "cover"` from the one entry it was taken from, so the
 * entries using "contain" did not satisfy it and the file failed to compile.
 */
type MediaConfig = {
  thumbnail: string
  video: string
  thumbnailScale: number
  videoScale: number
  thumbnailPosition: { x: number; y: number }
  thumbnailFit: "cover" | "contain"
  videoPosition: { x: number; y: number }
  videoFit?: "cover" | "contain"
  filter: string
  vignetteStrength: number
}

type SegmentProject = {
  title: string;
  status: string;
  tagline: string;
  description: string;
  bullets: string[];
  tech: string[];
  github: string;
  initials: string;
  /** Optional media shown in the project detail overlay. */
  projectMedia?: string;
};

/** Shared by the Training slice and the Hardware centre, which open the same project. */
const OPENBOT_GIRAFFE: SegmentProject = {
  title: "Giraffe",
  status: "Open Source",
  tagline: "Low-cost, open-source 5-DoF robotic manipulator for Embodied AI",
  description:
    "Designed and developed Giraffe, a low-cost, open-source, ROS2-compatible 5-DoF robotic manipulator aimed at making robotics and Embodied AI more accessible. The project covers both the physical robot and its software stack, including 3D-printable mechanical components, a leader-follower teleoperation system using AS5600 magnetic encoders, wireless-capable microcontroller control, and integration with ROS2, Gazebo, and MoveIt2 for simulation, motion planning, and hardware operation.",
  bullets: [
    "Low-cost 5-DoF robotic manipulator with 3D-printable components",
    "Leader-follower teleoperation with AS5600 encoders and ESP8266",
    "ROS2, Gazebo, and MoveIt2 simulation and motion-planning stack",
    "Custom ROS2 hardware and servo-control interfaces for real-world operation",
  ],
  tech: ["ROS2", "Gazebo", "MoveIt2", "ESP8266", "AS5600", "3D Printing"],
  github: "https://github.com/anantppandey/giraffe",
  initials: "G",
  projectMedia: "/media/gif/hardware.webm",
};

const segments = [
{
  id: "simulation",
  title: "AUTONOMOUS MANIPULATION",
  tools: "ROS2 · Gazebo · MoveIt2",
  description: "PERCEPTION, IK & MOTION PLANNING",
  startAngle: -90,
  endAngle: 30,

  thumbnail: "/media/img/sim.jpeg",
  videoSrc: "/media/gif/manip_demo.webm",

  primaryProject: {
    title: "Autonomous Pick-and-Place Manipulation Pipeline",
    status: "Research",

    tagline:
      "Autonomous 5-DOF robotic manipulation with perception, collision-aware planning, and physical grasp simulation",

    description:
      "Built an autonomous ROS2 manipulation pipeline for the custom 5-DOF Giraffe arm in Gazebo Harmonic. The system combines dual RGB-D perception, custom inverse kinematics, MoveIt2 planning, and live Octomap collision checking to autonomously detect, grasp, transport, and place objects while handling failed grasps and execution issues through runtime recovery.",
    bullets: [
      "Dual RGB-D object detection and localization",
      "Autonomous pick-and-place manipulation",
      "Custom 5-DOF inverse kinematics",
      "Octomap-based collision avoidance",
      "MoveIt Task Constructor and OMPL planning",
      "Gazebo grasp attachment and detachment",
      "Runtime recovery and automatic grasp retries",
    ],

    tech: [
      "ROS2",
      "Gazebo Harmonic",
      "MoveIt2",
      "MoveIt Task Constructor",
      "Octomap",
      "OMPL",
      "RRTConnect",
      "C++",
      "Python",
      "RGB-D Perception",
      "Custom IK"
    ],

    github:
      "https://github.com/anantppandey/ros2_manipulation_pipeline.git",

    initials: "AP",

    projectMedia: "/media/gif/manip_demo.webm",
  } satisfies SegmentProject,
},
  {
    id: "training",
    title: "DATA COLLECTION & TELEOP",
    tools: "Isaac Sim",
    description: "TELEOPERATION & DATA CAPTURE",
    startAngle: 30,
    endAngle: 150,
    // Swap for "/thumbnails/training.jpg" and "/videos/training-demo.webm"
    thumbnail: "/media/img/isaac.jpeg",
    videoSrc: "/media/gif/isaac.webm",
    primaryProject: {
      title: "UR5e Isaac Sim Training Workflow",
      status: "Simulation",
      tagline:
        "Trajectory playback, wrist-camera capture, and Cartesian end-effector teleoperation in Isaac Sim",
      description:
        "Built a UR5e simulation workflow in NVIDIA Isaac Sim for executing recorded robot trajectories, capturing camera data during motion, and controlling the robot through Cartesian end-effector teleoperation. The project includes a VS Code–Isaac Sim development setup, trajectory playback with gripper mapping and optional smoothing, wrist-camera recording during execution, and keyboard-driven Cartesian control using inverse kinematics.",
      bullets: [
        "UR5e trajectory execution and gripper control in Isaac Sim",
        "Wrist-camera RGB capture during trajectory playback",
        "Keyboard-based Cartesian end-effector teleoperation using IK",
        "Pick-and-place task and controller integration",
        "VS Code ↔ Isaac Sim development workflow",
      ],
      tech: ["Isaac Sim", "UR5e", "Python", "Inverse Kinematics", "Teleoperation"],
      github: "https://github.com/anantppandey/ur5e_simulation",
      initials: "UR",
      projectMedia: "/media/gif/isaac.webm",
    },
  },
  {
    id: "deployment",
    title: "RL TRAINING & OPTIMIZATION",
    tools: "MuJoCo · SB3 · LeRobot",
    description: "POLICY TRAINING & OPTIMIZATION",
    startAngle: 150,
    endAngle: 270,
    // Swap for "/thumbnails/deployment.jpg" and "/videos/deployment-demo.webm"
    thumbnail: "/media/img/train.jpeg",
    videoSrc: "/media/gif/train.webm",
    primaryProject: {
      title: "MuJoCo PPO Sim-to-Sim Transfer",
      status: "Research",
      tagline:
        "PPO-based 5-DOF target reaching transferred from MuJoCo into ROS2 + Gazebo",
      description:
        "Trained a custom 5-DOF robotic arm to reach 3D targets using PPO in MuJoCo, then transferred the learned policy into a ROS2 and Gazebo pipeline. A camera detects target objects, the trained policy generates trajectories in MuJoCo, and those trajectories are adapted for execution on the arm in Gazebo. The project focused on making this sim-to-sim transfer reliable through policy tuning, trajectory retries, velocity scaling, and runtime re-planning.",
      bullets: [
        "PPO-based reinforcement learning in MuJoCo",
        "Sim-to-sim transfer from MuJoCo to ROS2 + Gazebo",
        "Camera-based target detection and ROS2 orchestration",
        "Stochastic trajectory retries for improved reliability",
        "Playback-speed scaling for Gazebo controller limits",
        "Runtime target monitoring and re-planning",
        "78% single-shot success and 74% clean success",
      ],
      tech: ["MuJoCo", "PPO", "ROS2", "Gazebo", "Stable-Baselines3"],
      github: "https://github.com/anantppandey/mujoco-gazebo-rl-transfer",
      initials: "RL",
      projectMedia: "/media/gif/train.webm",
    } satisfies SegmentProject,
  },
];

const centerData = {
  id: "hardware",
  title: "Hardware",
  subtitle: "Real Robot",
  // Swap for the real robot thumbnail and demo clip when available
  thumbnail: "/media/img/hardware.jpeg",
  videoSrc: "/media/gif/hardware.webm",
  primaryProject: OPENBOT_GIRAFFE,
};

// ---- geometry ---------------------------------------------------------------

const CX = 350;
const CY = 350;
const OUTER_R = 240;
/** A hovered slice grows outward to this radius. */
const HOVER_OUTER_R = 340;
/** How far a hovered slice slides along its own mid-angle. */
const HOVER_SHIFT = 55;
const INNER_R = 110;
const HARDWARE_R = 108;
const HARDWARE_HOVER_R = 150;
const LABEL_R = 175;
/**
 * Midline of the crescent a tapped slice opens up. The slice slides outward by
 * HOVER_SHIFT, leaving the band between the Hardware disc edge and the slice's
 * new inner edge empty, and the Know more label curves along it.
 */
const KNOW_MORE_R = (HARDWARE_R + INNER_R + HOVER_SHIFT) / 2;
/** Half the angular span of the Know more arc, comfortably longer than the text. */
const KNOW_MORE_SWEEP = 44;
/**
 * Where the Know more text rides, and how far it spans. Pushed out to the
 * slice's inner boundary rather than left down near the Hardware disc, so the
 * label reads as part of the slice it belongs to.
 *
 * That boundary is not concentric with the pie. The slice is translated along
 * its own mid-angle, so its inner edge sits at 165 on the midline but falls to
 * about 157 by the ends of a 25 degree sweep. The radius is held just inside
 * that and the span is kept close to the length of the label, so the text
 * tracks the edge instead of crossing onto the artwork. It still lands inside
 * the tap band below, which is what keeps the whole label tappable.
 */
const KNOW_MORE_TEXT_R = 150;
const KNOW_MORE_TEXT_SWEEP = 27;
/**
 * Outer radius of the mobile tap target. A slice reads as one shape to a
 * thumb: the donut band, the seam on either side of it, and the curved label
 * band that sits out past the rim. The hit wedge spans all of it, so the tap
 * lands on the slice whether the finger reads the artwork or the label above
 * it. Only used below 768, where hover cannot carry the interaction.
 */
const HIT_OUTER_R = 490;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Point on a circle of radius r at `deg`, where 0 is 3 o'clock and angles run clockwise. */
function polar(r: number, deg: number) {
  return { x: CX + r * Math.cos(toRad(deg)), y: CY + r * Math.sin(toRad(deg)) };
}

/**
 * Closed donut-slice path between two radii. The slice is shrunk by `gapDeg`
 * on each side so neighbouring slices show a visible seam.
 */
function describeArc(
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
  gapDeg = 1.5,
) {
  const start = startDeg + gapDeg;
  const end = endDeg - gapDeg;
  const large = end - start > 180 ? 1 : 0;
  const oStart = polar(outerR, start);
  const oEnd = polar(outerR, end);
  const iStart = polar(innerR, start);
  const iEnd = polar(innerR, end);
  return [
    `M ${oStart.x} ${oStart.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oEnd.x} ${oEnd.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${iStart.x} ${iStart.y}`,
    "Z",
  ].join(" ");
}

const midAngle = (s: { startAngle: number; endAngle: number }) =>
  (s.startAngle + s.endAngle) / 2;

/** The pie's drawing surface, which every media layer fills before clipping. */
const PIE_SIZE = 700;

/** Midline of the donut band, where a slice's own area is centred. */
const MEDIA_MID_R = (INNER_R + HOVER_OUTER_R) / 2;

/**
 * Anchor point for a slice's zoom, as a percentage of the pie box. Scaling
 * about the pie's centre would push the enlarged frame out of the slice's
 * clip, so each slice anchors on the middle of its own band instead.
 */
function mediaOriginFor(deg: number) {
  const p = polar(MEDIA_MID_R, deg);
  const pct = (v: number) => ((v / PIE_SIZE) * 100).toFixed(1);
  return `${pct(p.x)}% ${pct(p.y)}%`;
}

/**
 * Media revealed inside a slice or the centre disc. It fills the whole pie
 * and relies on the caller's clipPath to cut it to shape, so the video's
 * framing stays fixed while the slice grows around it. Everything here uses
 * inline styles: foreignObject content gets no reliable class support.
 */
function SegmentMedia({
  active,
  thumbnail,
  videoSrc,
  origin,
  registerVideo,
  label,
  config,
}: {
  active: boolean;
  thumbnail: string;
  videoSrc: string;
  /** transform-origin for the zoom, as a percentage pair. */
  origin: string;
  /** Hands the video element to the section so it can play and pause it. */
  registerVideo: (el: HTMLVideoElement | null) => void;
  label: string;
  config: MediaConfig;
}) {
  const playable = isPlayableVideo(videoSrc);

  /*
   * Focal positioning is implemented with a real transform instead of
   * object-position. object-position is inconsistent with "contain" because
   * it has little/no effect when there is no overflow to move.
   *
   * Coordinate system:
   *   50, 50 = centred
   *   x < 50 = move image right
   *   x > 50 = move image left
   *   y < 50 = move image down
   *   y > 50 = move image up
   *
   * Values outside 0-100 are allowed intentionally.
   */
  const focal = active ? config.videoPosition : config.thumbnailPosition;
  const scale = active ? config.videoScale : config.thumbnailScale;
  const translateX = 50 - focal.x;
  const translateY = 50 - focal.y;

  const layer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: active ? (config.videoFit ?? "cover") : config.thumbnailFit,
    objectPosition: "50% 50%",
    transformOrigin: origin,
    transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
    filter: config.filter,
    /*
     * These layers are the full 700px pie and sit directly over the slice
     * path, so anything but a pass-through here swallows every tap on the
     * slice. The foreignObject above already asks for this, but the img and
     * the video inherit it across the foreignObject boundary only in some
     * engines, so it is set on the layers themselves too.
     */
    pointerEvents: "none",
  }

  return (
    <div
      style={{
        position: "relative",
        width: `${PIE_SIZE}px`,
        height: `${PIE_SIZE}px`,
        overflow: "hidden",
        // Shows through if an asset fails, so a slice is never empty.
        background: "rgba(0,10,25,0.85)",
        // Same reason as the layers below: the slice path owns the tap.
        pointerEvents: "none",
      }}
    >
      {/* Layer 1: thumbnail, dimmed at rest and faded out under the motion */}
      {/* eslint-disable-next-line @next/next/no-img-element -- remote asset; next/image would need a config change */}
      <img
        src={thumbnail}
        alt={`${label} thumbnail`}
        style={{
          ...layer,
          zIndex: 1,
          opacity: active ? 0 : 1.0,
          transitionProperty: "opacity, transform",
          transition:
            "opacity 0.4s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* Layer 2: the motion, revealed on hover */}
      {playable ? (
        <video
          ref={registerVideo}
          src={videoSrc}
          muted
          loop
          playsInline
          style={{
            ...layer,
            zIndex: 2,
            opacity: active ? 1 : 0,
            transition:
              "opacity 0.4s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- gif placeholder stands in for the clip
        <img
          src={videoSrc}
          alt={`${label} preview`}
          style={{
            ...layer,
            zIndex: 2,
            opacity: active ? 1 : 0,
            transition:
              "opacity 0.4s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      )}

      {/* Layer 3: rim gradient, lifted while hovered so more reads through */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
          opacity: active ? 0.5 : 1,
          transition: "opacity 0.4s ease",
          background: `radial-gradient(circle at center, rgba(0,5,15,${(
            0.1 * config.vignetteStrength
          ).toFixed(3)}) 0%, rgba(0,0,0,${(0.6 * config.vignetteStrength).toFixed(
            3
          )}) 70%, rgba(0,0,0,${(0.9 * config.vignetteStrength).toFixed(
            3
          )}) 100%)`,
        }}
      />
    </div>
  );
}

/**
 * Call to action shown over an expanded slice, and over the Hardware disc, once
 * a touch device has tapped one. Both sites render the same label, so the
 * styling lives here rather than being repeated at each one.
 *
 * Bare text rather than a pill. Two things the pill's chrome was quietly doing
 * are kept: the padding stays, now invisible, because it is the touch target,
 * and the drop shadow becomes a text shadow, because the label sits directly on
 * the slice photography and several of those frames are bright enough to
 * swallow unshadowed text. The hover colour only resolves on a pointer device,
 * which this does not currently reach, and is kept so it stays complete if it
 * is ever shown on desktop.
 */
function KnowMoreLink({
  color = "#0099ff",
  fontSize = "16.5px",
  iconSize = 15,
}: {
  color?: string;
  fontSize?: string;
  iconSize?: number;
}) {
  return (
    <div
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#ffffff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = color;
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        fontSize,
        fontWeight: 500,
        color,
        fontFamily: "Inter",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        WebkitTapHighlightColor: "transparent",
        transition: "color 0.2s",
        textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7)",
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.9))",
          flexShrink: 0,
        }}
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
      Know more
    </div>
  );
}

const PIE_KEYFRAMES = `
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.04); }
  }
`;

/*
 * Pie box sizing, plus the mobile centring.
 *
 * On desktop the box tracks the viewport on both axes, so the drawing scales
 * with the window instead of sitting at a fixed 700. The height term is what
 * keeps it inside the section: the drawn ink runs about 1.06x the box, and the
 * section is only as tall as the viewport, so sizing off the width alone
 * overflowed the top and bottom of shorter screens. Below 768 the box is pinned
 * back to 700, which is the size the mobile scale and the -406px margin-bottom
 * in globals.css are calibrated against, and stretched to the height left under
 * the section label so the drawing, which keeps its own aspect ratio inside it,
 * lands in the middle of it.
 *
 * Written as a media query rather than an isMobile check because this is
 * layout and it has to be right on the first paint. The size and the margin-top
 * are both owned by the inline style on desktop, so those overrides need
 * !important to win, the same way the rest of this section's mobile rules in
 * globals.css do.
 */
const PIE_LAYOUT_CSS = `
  @media (max-width: 767px) {
    .pie-container {
      width: 700px !important;
      height: 700px !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: calc(100dvh - 60px);
      margin-top: 0 !important;
      padding-top: 0;
      padding-bottom: 0;
    }
  }
`;

// ---- iOS clip-path pie --------------------------------------------------------

/*
 * iOS Safari will not render the media inside the SVG pie: the slices are
 * foreignObject content behind an SVG clipPath, and that combination drops out
 * on iOS while it paints fine everywhere else. iPhones therefore get a second
 * pie built entirely from HTML - one absolutely positioned div per slice, cut
 * to a donut-slice shape by a CSS clip-path polygon, with the img and video
 * clipped by the parent. No SVG, no foreignObject, nothing iOS mishandles.
 *
 * Desktop and Android keep the SVG pie below, untouched.
 */

/*
 * Geometry is the 340 design space at 0.9. At full size an expanded slice
 * reaches 190 and then slides 12 further, so its rim lands 202 from the
 * centre: a 404 circle on a phone 375 wide, and the section clips whatever
 * hangs past the edge. Scaled, the same shape and the same proportions come
 * to 364 across and clear a 375 screen with room on both sides.
 */
const IOS_SCALE = 0.9;
const IOS_PIE = 340 * IOS_SCALE;
const IOS_CX = 170 * IOS_SCALE;
const IOS_CY = 170 * IOS_SCALE;
const IOS_OUTER_DEFAULT = 165 * IOS_SCALE;
/** A tapped slice grows outward, the way a hovered one does on desktop. */
const IOS_OUTER_ACTIVE = 190 * IOS_SCALE;
/** Matches the Hardware disc, which plugs the hole in the middle. */
const IOS_INNER = 62 * IOS_SCALE;
/** Seam on each side of a slice, the same gap the SVG pie uses. */
const IOS_GAP_DEG = 1.5;
/** How far a tapped slice slides along its own mid-angle. */
const IOS_SHIFT = 12 * IOS_SCALE;
const IOS_LABEL_R = IOS_OUTER_DEFAULT + 18 * IOS_SCALE;
const IOS_PILL_R = (IOS_INNER + IOS_OUTER_DEFAULT) * 0.6;
/**
 * A clip-path cannot show anything outside its own element's box, so a slice
 * div that stopped at the container edge would come back with its expanded
 * arc sawn off flat. Each one overhangs by this much instead, which is why
 * the slice polygons are built around a centre of CX + PAD rather than CX.
 */
const IOS_PAD = 28;

function iosPolar(cx: number, cy: number, r: number, deg: number) {
  return { x: cx + r * Math.cos(toRad(deg)), y: cy + r * Math.sin(toRad(deg)) };
}

/**
 * Donut slice as a clip-path polygon: the outer arc walked forwards, the inner
 * arc walked back. Every slice uses the same step count so the browser can
 * interpolate between the resting and expanded shapes and animate the growth.
 */
function buildSegmentClipPath(
  startDeg: number,
  endDeg: number,
  outerR: number,
  steps = 32,
): string {
  const cx = IOS_CX + IOS_PAD;
  const cy = IOS_CY + IOS_PAD;
  const points: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const deg = startDeg + (endDeg - startDeg) * (i / steps);
    const p = iosPolar(cx, cy, outerR, deg);
    points.push(`${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`);
  }

  for (let i = steps; i >= 0; i--) {
    const deg = startDeg + (endDeg - startDeg) * (i / steps);
    const p = iosPolar(cx, cy, IOS_INNER, deg);
    points.push(`${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`);
  }

  return `polygon(${points.join(", ")})`;
}

/**
 * The same donut slice as a real SVG arc, for the outline that rides over the
 * artwork. Drawn in container space, not the padded slice space.
 */
function iosArcPath(startDeg: number, endDeg: number, outerR: number) {
  const oStart = iosPolar(IOS_CX, IOS_CY, outerR, startDeg);
  const oEnd = iosPolar(IOS_CX, IOS_CY, outerR, endDeg);
  const iStart = iosPolar(IOS_CX, IOS_CY, IOS_INNER, startDeg);
  const iEnd = iosPolar(IOS_CX, IOS_CY, IOS_INNER, endDeg);
  return [
    `M ${oStart.x} ${oStart.y}`,
    `A ${outerR} ${outerR} 0 0 1 ${oEnd.x} ${oEnd.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${IOS_INNER} ${IOS_INNER} 0 0 0 ${iStart.x} ${iStart.y}`,
    "Z",
  ].join(" ");
}

/** The same three slices, narrowed by the seam. */
const IOS_SEGMENTS = segments.map((segment) => {
  const startDeg = segment.startAngle + IOS_GAP_DEG;
  const endDeg = segment.endAngle - IOS_GAP_DEG;
  const midDeg = (startDeg + endDeg) / 2;
  return {
    ...segment,
    startDeg,
    endDeg,
    midDeg,
    restClip: buildSegmentClipPath(startDeg, endDeg, IOS_OUTER_DEFAULT),
    activeClip: buildSegmentClipPath(startDeg, endDeg, IOS_OUTER_ACTIVE),
    shift: {
      x: Math.cos(toRad(midDeg)) * IOS_SHIFT,
      y: Math.sin(toRad(midDeg)) * IOS_SHIFT,
    },
    pill: iosPolar(IOS_CX, IOS_CY, IOS_PILL_R, midDeg),
    /*
     * Text on a clockwise arc reads upside down across the bottom of the
     * circle, so the bottom slice gets its arc drawn the other way. The same
     * rule the SVG pie's own labels use, which is what keeps the two matched.
     */
    flipLabel: midDeg > 0 && midDeg < 180,
  };
});

/**
 * Two things live here. The padding overrides the 136px that globals.css puts
 * on #specializations for the SVG pie, which is the wrong clearance for this
 * one: the labels and an expanded slice reach about 29px above the container,
 * and 130 is what keeps that off the caption. Written as id + class so it
 * outranks the !important rule it replaces.
 *
 * The keyframes are here rather than in globals.css because this component is
 * the only file this change is allowed to touch, which is the same reason
 * PIE_KEYFRAMES above is inline.
 */
const IOS_PIE_CSS = `
  @media (max-width: 767px) {
    #specializations.ios-pie-section {
      padding-top: 130px !important;
      padding-bottom: 56px !important;
    }
  }

  @keyframes core-pulse {
    0%, 100% {
      box-shadow: 0 0 20px rgba(0,153,255,0.4),
        0 0 40px rgba(0,153,255,0.15),
        inset 0 0 20px rgba(0,153,255,0.15);
    }
    50% {
      box-shadow: 0 0 30px rgba(0,153,255,0.7),
        0 0 60px rgba(0,153,255,0.25),
        inset 0 0 30px rgba(0,153,255,0.25);
    }
  }
`;

// ---- section ------------------------------------------------------------------

export default function SpecializationsSection() {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  /** Tap state for touch devices, where hover never fires. */
  const [tappedSegment, setTappedSegment] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<SegmentProject | null>(
    null,
  );
  /** Starts false so the server render matches; the real value lands after mount. */
  const [isMobile, setIsMobile] = useState(false);
  /**
   * iOS Safari only, and for the same reason: it is the one engine that drops
   * the SVG pie's media. Resolved after mount so the server render still
   * matches, and never from the viewport, since this is an engine bug rather
   * than a size question.
   */
  const [isIOS, setIsIOS] = useState(false);
  /** One entry per slice plus the Hardware disc, keyed by segment id. */
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  /** Hover drives the expand on desktop, tap drives it on mobile. */
  const activeSegment = isMobile ? tappedSegment : hoveredSegment;

  /*
   * One place for the mobile toggle, called by the slice paths and by the
   * Hardware disc. The functional update reads the live value rather than the
   * one captured when the handler was created. Desktop keeps its own
   * handlers: hover drives the expand there and a click opens the project.
   */
  const handleSegmentTap = (segmentId: string) => {
    if (!isMobile) return;
    setTappedSegment((prev) => (prev === segmentId ? null : segmentId));
  };

  /**
   * Touch runs the tap itself and stops the event there. A touch tap also
   * produces a compatibility click, and if that click reached the same
   * handler the toggle would run twice and land back where it started, which
   * reads as a tap that did nothing. Touches are stamped so the click that
   * belongs to the same gesture can be recognised and dropped. The stamp is
   * the native event's own timeStamp rather than Date.now, which both keeps
   * the two on one clock and stays out of render.
   */
  const lastTouchTap = useRef(0);

  const handleSegmentTouch = (
    segmentId: string,
    event: React.TouchEvent<SVGElement>,
  ) => {
    event.preventDefault();
    lastTouchTap.current = event.timeStamp;
    handleSegmentTap(segmentId);
  };

  /** Desktop opens the project; a touch device toggles the slice open instead. */
  const handleSegmentClick = (
    segmentId: string,
    project: SegmentProject,
    event: React.MouseEvent<SVGElement>,
  ) => {
    if (!isMobile) {
      setSelectedProject(project);
      return;
    }
    if (event.timeStamp - lastTouchTap.current < 600) return;
    handleSegmentTap(segmentId);
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const detect = () => {
      const ua = window.navigator.userAgent;
      // iPadOS reports itself as a Mac, so it is caught by the touch check.
      const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
      setIsIOS(/iPad|iPhone|iPod/.test(ua) || iPadOS);
    };
    detect();
  }, []);

  /*
   * Open one slice on arrival, mobile only. Nothing about the pie says "tap
   * me" on a touch device, where there is no hover to discover it with, so the
   * first slice starts expanded and carries its Know more label as a worked
   * example. It stays open until the visitor taps something, after which the
   * normal toggle takes over. The ref keeps it to once per mount, so it does
   * not reopen if the viewport crosses the breakpoint later.
   */
  const introOpened = useRef(false);
  useEffect(() => {
    if (!isMobile || introOpened.current) return;
    introOpened.current = true;
    setTappedSegment(segments[0].id);
  }, [isMobile]);

  // Only the active shape's clip plays; the rest rewind so each expand starts
  // from the top. play() rejects if the source cannot load, hence the catch.
  useEffect(() => {
    const active = isMobile ? tappedSegment : hoveredSegment;
    for (const [id, el] of Object.entries(videoRefs.current)) {
      if (!el) continue;
      if (id === active) {
        void el.play().catch(() => {});
      } else {
        el.pause();
        el.currentTime = 0;
      }
    }
  }, [hoveredSegment, tappedSegment, isMobile]);

  /**
   * Closing pops the history entry the overlay pushed, so the URL does not
   * accumulate dead entries when it is dismissed by the X or by Escape. Only
   * safe to read window here because every caller is an event handler.
   */
  const closeSpecOverlay = useCallback(() => {
    setSelectedProject(null);
    if (isMobile) setTappedSegment(null);
    if (window.history.state?.specOverlayOpen) {
      window.history.back();
    }
  }, [isMobile]);

  // A history entry per open overlay, so the hardware back button on mobile
  // dismisses the overlay instead of leaving the page.
  useEffect(() => {
    if (selectedProject) {
      window.history.pushState(
        { specOverlayOpen: true },
        "",
        window.location.href,
      );
    }
  }, [selectedProject]);

  useEffect(() => {
    const handlePopState = () => {
      if (selectedProject) {
        setSelectedProject(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedProject]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSpecOverlay();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeSpecOverlay]);

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

  /** iOS phones get the HTML pie; every other engine keeps the SVG one. */
  const useIosPie = isIOS && isMobile;

  return (
    <section
      id="specializations"
      className={`specializations-section relative z-[1] flex h-screen w-full items-center justify-center overflow-hidden bg-canvas${
        useIosPie ? " ios-pie-section" : ""
      }`}
      style={{ overflow: "hidden" }}
    >
      <style>{PIE_LAYOUT_CSS}</style>
      {useIosPie && <style>{IOS_PIE_CSS}</style>}

      <p className="spec-heading absolute left-0 z-[5] w-full text-center text-[11px] uppercase tracking-[0.18em] text-ink-muted" style={{ top: '23px' }}>
        Specializations
      </p>

      {useIosPie ? (
        <div
          className="ios-pie relative z-[2] shrink-0"
          style={{ width: IOS_PIE, height: IOS_PIE }}
        >
          {/* Decorative rings, the HTML answer to the two the SVG pie draws */}
          <div
            style={{
              position: "absolute",
              left: -10,
              top: -10,
              width: IOS_PIE + 20,
              height: IOS_PIE + 20,
              borderRadius: "50%",
              border: "0.5px solid rgba(0,153,255,0.2)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -20,
              top: -20,
              width: IOS_PIE + 40,
              height: IOS_PIE + 40,
              borderRadius: "50%",
              border: "0.5px dashed rgba(0,153,255,0.07)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          {IOS_SEGMENTS.map((segment) => {
            const isActive = tappedSegment === segment.id;
            const clip = isActive ? segment.activeClip : segment.restClip;
            const shiftX = isActive ? segment.shift.x : 0;
            const shiftY = isActive ? segment.shift.y : 0;

            return (
              <div
                key={segment.id}
                onClick={() =>
                  setTappedSegment(isActive ? null : segment.id)
                }
                style={{
                  position: "absolute",
                  left: -IOS_PAD,
                  top: -IOS_PAD,
                  width: IOS_PIE + IOS_PAD * 2,
                  height: IOS_PIE + IOS_PAD * 2,
                  clipPath: clip,
                  WebkitClipPath: clip,
                  transform: `translate(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px)`,
                  transition:
                    "clip-path 0.4s cubic-bezier(0.16,1,0.3,1), -webkit-clip-path 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.3s ease",
                  // Open slice brightest, its neighbours pushed back, and an
                  // even middle reading when nothing is open.
                  filter: isActive
                    ? "brightness(1.25)"
                    : tappedSegment
                      ? "brightness(0.55)"
                      : "brightness(0.85)",
                  overflow: "hidden",
                  cursor: "none",
                  WebkitTapHighlightColor: "transparent",
                  zIndex: isActive ? 2 : 1,
                }}
              >
                {/* Shows through if an asset fails, so a slice is never empty */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#0d1a2a",
                  }}
                />

                {/* eslint-disable-next-line @next/next/no-img-element -- local asset; next/image would need a config change */}
                <img
                  src={segment.thumbnail}
                  alt={segment.title}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    pointerEvents: "none",
                  }}
                />

                {/* Still at rest and motion once open, the same swap the SVG
                    pie makes. Layered over the thumbnail rather than replacing
                    it, so a clip iOS cannot decode leaves the still in place
                    instead of an empty slice. Mounting it only while open is
                    also what makes autoplay fire on each tap. */}
                {isActive && segment.videoSrc ? (
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    src={segment.videoSrc}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      pointerEvents: "none",
                    }}
                  />
                ) : null}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.25)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            );
          })}

          {/* Hardware disc, which is also the hole the slices are cut around */}
          <div
            onClick={() => setSelectedProject(centerData.primaryProject)}
            style={{
              position: "absolute",
              left: IOS_CX - IOS_INNER,
              top: IOS_CY - IOS_INNER,
              width: IOS_INNER * 2,
              height: IOS_INNER * 2,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, #001833 0%, #000510 100%)",
              border: "1px solid rgba(0,153,255,0.5)",
              boxShadow:
                "0 0 20px rgba(0,153,255,0.4), 0 0 40px rgba(0,153,255,0.15), inset 0 0 20px rgba(0,153,255,0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
              cursor: "none",
              animation: "core-pulse 2.5s ease-in-out infinite",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.9)",
                fontFamily: "Inter",
                letterSpacing: "-0.3px",
                textShadow: "0 0 10px rgba(0,153,255,0.8)",
              }}
            >
              {centerData.title}
            </span>
            <span
              style={{
                fontSize: "8px",
                color: "#555555",
                fontFamily: "Inter",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              {centerData.subtitle}
            </span>
          </div>

          {/* Slice outlines and the curved titles. Plain SVG at the root, which
              iOS draws correctly: the bug this whole pie works around is a
              foreignObject behind a clipPath, not SVG itself. Nothing here
              takes a pointer, so the slices underneath keep the tap. */}
          <svg
            viewBox={`0 0 ${IOS_PIE} ${IOS_PIE}`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 4,
              overflow: "visible",
            }}
          >
            <defs>
              {IOS_SEGMENTS.map((segment) => {
                // Pulled in at both ends so the text never runs into the seam.
                const from = iosPolar(
                  IOS_CX,
                  IOS_CY,
                  IOS_LABEL_R,
                  segment.startDeg + 8,
                );
                const to = iosPolar(
                  IOS_CX,
                  IOS_CY,
                  IOS_LABEL_R,
                  segment.endDeg - 8,
                );
                const d = segment.flipLabel
                  ? `M ${to.x} ${to.y} A ${IOS_LABEL_R} ${IOS_LABEL_R} 0 0 0 ${from.x} ${from.y}`
                  : `M ${from.x} ${from.y} A ${IOS_LABEL_R} ${IOS_LABEL_R} 0 0 1 ${to.x} ${to.y}`;
                return (
                  <path key={segment.id} id={`ios-label-arc-${segment.id}`} d={d} />
                );
              })}
            </defs>

            {IOS_SEGMENTS.map((segment) => {
              const isActive = tappedSegment === segment.id;
              return (
                <path
                  key={`outline-${segment.id}`}
                  d={iosArcPath(
                    segment.startDeg,
                    segment.endDeg,
                    isActive ? IOS_OUTER_ACTIVE : IOS_OUTER_DEFAULT,
                  )}
                  fill="none"
                  stroke={
                    isActive ? "rgba(0,153,255,0.8)" : "rgba(0,153,255,0.15)"
                  }
                  strokeWidth={isActive ? 1.5 : 1}
                  transform={
                    isActive
                      ? `translate(${segment.shift.x.toFixed(2)} ${segment.shift.y.toFixed(2)})`
                      : undefined
                  }
                  style={{ transition: "stroke 0.3s ease" }}
                />
              );
            })}

            {IOS_SEGMENTS.map((segment) => (
              <text
                key={`label-${segment.id}`}
                fontSize="9"
                fontWeight="700"
                fill={
                  tappedSegment === segment.id
                    ? "rgba(255,255,255,1)"
                    : "rgba(255,255,255,0.75)"
                }
                fontFamily="Inter"
                letterSpacing="1.5"
                textAnchor="middle"
                style={{ transition: "fill 0.3s ease" }}
              >
                <textPath
                  href={`#ios-label-arc-${segment.id}`}
                  startOffset="50%"
                >
                  {segment.title.toUpperCase()}
                </textPath>
              </text>
            ))}
          </svg>

          {/* Know more, on the open slice only, in the gap the slice leaves */}
          {IOS_SEGMENTS.map((segment) => {
            if (tappedSegment !== segment.id) return null;
            return (
              <div
                key={`pill-${segment.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProject(segment.primaryProject);
                }}
                style={{
                  position: "absolute",
                  left: segment.pill.x,
                  top: segment.pill.y,
                  transform: "translate(-50%, -50%)",
                  zIndex: 8,
                  pointerEvents: "all",
                  cursor: "none",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "rgba(9,9,9,0.92)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: "0.5px solid rgba(0,153,255,0.5)",
                    borderRadius: "100px",
                    padding: "7px 14px",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#ffffff",
                    fontFamily: "Inter",
                    whiteSpace: "nowrap",
                    boxShadow: "0 0 12px rgba(0,153,255,0.2)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0099ff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  Know more
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div
        className="pie-container relative z-[2] shrink-0"
        style={{
          width: "clamp(420px, min(38vw, 68vh), 660px)",
          height: "clamp(420px, min(38vw, 68vh), 660px)",
          marginTop: -40,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 700 700"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0"
          style={{ overflow: "visible" }}
        >
          <style>{PIE_KEYFRAMES}</style>
          <defs>
            <filter
              id="segment-glow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter
              id="center-glow"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="12" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Media clips use the expanded radius and the same seam gap as
                the slice paths, so footage never bleeds into the dividers. */}
            {segments.map((segment) => (
              <clipPath key={segment.id} id={`clip-${segment.id}`}>
                <path
                  d={describeArc(
                    HOVER_OUTER_R,
                    INNER_R,
                    segment.startAngle,
                    segment.endAngle,
                  )}
                />
              </clipPath>
            ))}
            <clipPath id="clip-hardware">
              <motion.circle
                cx={CX}
                cy={CY}
                r={HARDWARE_R}
                animate={{
                  r:
                    activeSegment === centerData.id
                      ? HARDWARE_HOVER_R
                      : HARDWARE_R,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            </clipPath>
          </defs>

          {/* Outer ring decoration */}
          <motion.circle
            cx={CX}
            cy={CY}
            r={248}
            fill="none"
            stroke="#0099ff"
            strokeWidth={0.5}
            strokeDasharray="3 6"
            initial={{ strokeOpacity: 0.06 }}
            animate={{ strokeOpacity: activeSegment ? 0.2 : 0.06 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
          <motion.circle
            cx={CX}
            cy={CY}
            r={260}
            fill="none"
            stroke="rgba(0,153,255,0.04)"
            strokeWidth={12}
            filter="url(#segment-glow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: activeSegment ? 0.6 : 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />

          {/* Segments */}
          {segments.map((segment, i) => (
            <motion.g
              key={segment.id}
              initial={{ opacity: 0, scale: 0.85, x: 0, y: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                // Slide the whole slice along its own mid-angle on hover. The
                // media and its clip ride along, staying registered together.
                x: activeSegment === segment.id
                  ? Math.cos(toRad(midAngle(segment))) * HOVER_SHIFT
                  : 0,
                y: activeSegment === segment.id
                  ? Math.sin(toRad(midAngle(segment))) * HOVER_SHIFT
                  : 0,
              }}
              transition={{
                opacity: { duration: 0.7, delay: i * 0.15, ease: EASE },
                scale: { duration: 0.7, delay: i * 0.15, ease: EASE },
                default: { type: "spring", stiffness: 260, damping: 30 },
              }}
              style={{
                transformBox: "view-box",
                transformOrigin: "350px 350px",
              }}
              onMouseEnter={
                isMobile ? undefined : () => setHoveredSegment(segment.id)
              }
              onMouseLeave={
                isMobile ? undefined : () => setHoveredSegment(null)
              }
              onClick={(event) =>
                handleSegmentClick(segment.id, segment.primaryProject, event)
              }
              onTouchEnd={
                isMobile
                  ? (event) => handleSegmentTouch(segment.id, event)
                  : undefined
              }
            >
              {/*
                Mobile tap target. The whole geometric wedge rather than the
                donut band alone, so a finger that lands on the seam, on the
                label band, or anywhere between them still hits this slice.
                Transparent rather than none: an unpainted fill has no
                interior to hit-test, so it has to stay a real paint.
              */}
              {isMobile && (
                <path
                  d={describeArc(
                    HIT_OUTER_R,
                    INNER_R,
                    segment.startAngle,
                    segment.endAngle,
                    0,
                  )}
                  fill="transparent"
                  style={{ cursor: "none", pointerEvents: "all" }}
                />
              )}
              {/*
                The path carries no handlers of its own. It fills the core of
                the wedge above, so its events bubble to the group, which owns
                the single set of handlers. Duplicating them here would run
                every tap twice and cancel the toggle out.
              */}
              <motion.path
                d={describeArc(
                  OUTER_R,
                  INNER_R,
                  segment.startAngle,
                  segment.endAngle,
                )}
                fill="#0d1a2a"
                stroke="rgba(0,153,255,0.15)"
                strokeWidth={1}
                initial={{
                  d: describeArc(
                    OUTER_R,
                    INNER_R,
                    segment.startAngle,
                    segment.endAngle,
                  ),
                  fill: "#0d1a2a",
                  stroke: "rgba(0,153,255,0.15)",
                  strokeWidth: 1,
                  opacity: 1,
                }}
                animate={{
                  d: describeArc(
                    activeSegment === segment.id ? HOVER_OUTER_R : OUTER_R,
                    INNER_R,
                    segment.startAngle,
                    segment.endAngle,
                  ),
                  fill: activeSegment === segment.id
                    ? "#0a2040"
                    : activeSegment !== null && activeSegment !== segment.id
                      ? "#080e18"
                      : "#0d1a2a",
                  stroke: activeSegment === segment.id
                    ? "rgba(0,153,255,0.8)"
                    : activeSegment !== null && activeSegment !== segment.id
                      ? "rgba(0,153,255,0.08)"
                      : "rgba(0,153,255,0.15)",
                  strokeWidth: activeSegment === segment.id ? 1.5 : 1,
                  opacity: activeSegment !== null && activeSegment !== segment.id ? 0.7 : 1,
                }}
                transition={{
                  d: { type: "spring", stiffness: 300, damping: 28 },
                  default: { duration: 0.35, ease: "easeInOut" },
                }}
                filter={
                  activeSegment === segment.id ? "url(#segment-glow)" : undefined
                }
                style={{ cursor: "none", pointerEvents: "all" }}
              />

              {/* Media inside the slice. Every layer in it passes the pointer
                  straight through to the group, which owns the tap. */}
              <foreignObject
                x={0}
                y={0}
                width={PIE_SIZE}
                height={PIE_SIZE}
                clipPath={`url(#clip-${segment.id})`}
                style={{ pointerEvents: "none" }}
              >
                <SegmentMedia
                  active={activeSegment === segment.id}
                  thumbnail={segment.thumbnail}
                  videoSrc={segment.videoSrc}
                  origin={mediaOriginFor(midAngle(segment))}
                  label={segment.title}
                  registerVideo={(el) => {
                    videoRefs.current[segment.id] = el;
                  }}
                  config={MEDIA_CONFIG[segment.id as keyof typeof MEDIA_CONFIG]}
                />
              </foreignObject>
            </motion.g>
          ))}

          {/* Dividers between segments */}
          {[30, 150, 270].map((deg) => {
            const a = polar(INNER_R, deg);
            const b = polar(OUTER_R, deg);
            return (
              <line
                key={deg}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#090909"
                strokeWidth={2}
                // The seams sit on top of the slices, so they would otherwise
                // take the tap for themselves along a 2px band.
                style={{ pointerEvents: "none" }}
              />
            );
          })}

          {/* Centre: Hardware */}
          <motion.g
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
            style={{ transformBox: "view-box", transformOrigin: "350px 350px" }}
          >
            <motion.circle
              cx={CX}
              cy={CY}
              r={HARDWARE_R}
              animate={{
                r:
                  activeSegment === centerData.id
                    ? HARDWARE_HOVER_R
                    : HARDWARE_R,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              fill="#090909"
              stroke={
                activeSegment === centerData.id
                  ? "rgba(0,153,255,0.6)"
                  : "rgba(0,153,255,0.3)"
              }
              strokeWidth={1}
              filter={
                activeSegment === centerData.id
                  ? "url(#center-glow)"
                  : undefined
              }
              style={{ transition: "stroke 0.35s ease" }}
            />

            {/* Media inside the disc, beneath the rings and the title text. */}
            <foreignObject
              x={0}
              y={0}
              width={PIE_SIZE}
              height={PIE_SIZE}
              clipPath="url(#clip-hardware)"
              style={{ pointerEvents: "none" }}
            >
              <SegmentMedia
                active={activeSegment === centerData.id}
                thumbnail={centerData.thumbnail}
                videoSrc={centerData.videoSrc}
                origin="50% 50%"
                label={centerData.title}
                registerVideo={(el) => {
                  videoRefs.current[centerData.id] = el;
                }}
                config={MEDIA_CONFIG.hardware}
              />
            </foreignObject>

            <circle
              cx={CX}
              cy={CY}
              r={100}
              fill="none"
              stroke="rgba(0,153,255,0.08)"
              strokeWidth={0.5}
              style={{
                transformBox: "view-box",
                transformOrigin: "350px 350px",
                animation: "pulse-ring 3s ease-in-out infinite",
              }}
            />
            <circle
              cx={CX}
              cy={CY}
              r={90}
              fill="none"
              stroke="rgba(0,153,255,0.12)"
              strokeWidth={0.5}
            />
            {/*
              One wrapper owns the disc's hover and tap. The hit circle and the
              Know more label are siblings inside it, which is what stops the
              two from fighting: handlers on the circle alone fired mouseleave
              the moment the pointer crossed onto the label sitting over it,
              which closed the disc and took the label with it.
            */}
            <g
              onMouseEnter={
                isMobile ? undefined : () => setHoveredSegment(centerData.id)
              }
              onMouseLeave={
                isMobile ? undefined : () => setHoveredSegment(null)
              }
              onClick={(event) =>
                handleSegmentClick(centerData.id, centerData.primaryProject, event)
              }
              onTouchEnd={
                isMobile
                  ? (event) => handleSegmentTouch(centerData.id, event)
                  : undefined
              }
              style={{ cursor: "none" }}
            >
              {/*
                A plain circle, not a motion one. When framer owned its `r`
                through `animate` the attribute read "undefined" until an
                animation frame wrote a real value, which left the element 0 by
                0 with no hit area at all. That is the source of the repeated
                `<circle> attribute r` console error.

                The radius now comes straight from state, so it is always a
                valid number. It steps rather than eases, which an invisible
                target does not care about, and it tracks the disc: 108 at
                rest, so it does not reach over the slices that start at 110,
                and the expanded 150 while the disc is open so the whole of it
                answers. It is drawn before the label so the label, which
                paints later, is the one that answers a tap on the words.
              */}
              <circle
                cx={CX}
                cy={CY}
                r={
                  activeSegment === centerData.id
                    ? HARDWARE_HOVER_R
                    : HARDWARE_R
                }
                fill="transparent"
                style={{ cursor: "none", pointerEvents: "all" }}
              />

              <motion.g
                animate={{
                  scale: activeSegment === centerData.id
                    ? HARDWARE_HOVER_R / HARDWARE_R
                    : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                style={{
                  transformBox: "view-box",
                  transformOrigin: "350px 350px",
                }}
              >
                <text
                  x={CX}
                  y={277}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={18}
                  fontWeight={600}
                  fontFamily="Inter"
                  letterSpacing={-0.5}
                  // Otherwise the word itself is a dead patch over the hit
                  // circle, since SVG text hit-tests its own glyphs.
                  style={{ pointerEvents: "none" }}
                >
                  Hardware
                </text>

                {/* Same rule as the slices: hover reveals it on desktop, a tap
                    reveals it on mobile, and it is not there at rest. */}
                <AnimatePresence>
                  {activeSegment === centerData.id && (
                    <motion.g
                      key="hardware-know-more"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(centerData.primaryProject);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedProject(centerData.primaryProject);
                      }}
                      style={{ cursor: "none" }}
                    >
                      {/* The glyphs are a few px tall once the pie scales
                          down, so the tap rides a transparent box around
                          them rather than the text itself. */}
                      <rect
                        x={CX - 62}
                        y={424}
                        width={124}
                        height={24}
                        fill="transparent"
                        style={{ pointerEvents: "all" }}
                      />
                      <text
                        x={CX}
                        y={440}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={11}
                        fontWeight={500}
                        fontFamily="Inter, sans-serif"
                        letterSpacing={0.5}
                        style={{
                          cursor: "none",
                          pointerEvents: "all",
                          userSelect: "none",
                        }}
                      >
                        → Know more
                      </text>
                    </motion.g>
                  )}
                </AnimatePresence>
              </motion.g>
            </g>
          </motion.g>

          {/* Segment labels: true curved text following the outer circumference. */}
          <defs>
            {segments.map((segment) => {
              const angle = midAngle(segment);
              const radius = activeSegment === segment.id ? 390 : 365;
              const start = angle - 42;
              const end = angle + 42;
              const startPoint = polar(radius, start);
              const endPoint = polar(radius, end);

              return (
                <path
                  key={`label-path-${segment.id}`}
                  id={`label-arc-${segment.id}`}
                  d={`M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 1 ${endPoint.x} ${endPoint.y}`}
                  fill="none"
                  stroke="none"
                />
              );
            })}
          </defs>

          {segments.map((segment) => {
            const angle = midAngle(segment);
            // The title is already at the expanded position at rest.
            // On hover, move the title farther outward and put each metadata
            // line on its own larger-radius arc so the three lines never collide.
            const titleRadius = activeSegment === segment.id ? 420 : 365;
            const toolsRadius = activeSegment === segment.id ? 452 : 365;
            const descriptionRadius = activeSegment === segment.id ? 470 : 365;

            /*
             * Text on a clockwise arc reads upside down across the lower half
             * of the circle, where the tangent runs right to left. SVG y grows
             * downward, so that is any mid-angle between 0 and 180 - the
             * Data Collection slice, centred at 90. Those labels trace the
             * same circle anticlockwise instead, which puts the baseline the
             * right way up without moving the text off its radius.
             */
            const flip = angle > 0 && angle < 180;

            const makeArc = (radius: number) => {
              const from = polar(radius, flip ? angle + 52 : angle - 52);
              const to = polar(radius, flip ? angle - 52 : angle + 52);
              return `M ${from.x} ${from.y} A ${radius} ${radius} 0 0 ${
                flip ? 0 : 1
              } ${to.x} ${to.y}`;
            };

            return (
              <motion.g
                key={`label-${segment.id}`}
                animate={{ x: 0, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                style={{ pointerEvents: "none" }}
              >
                <path
                  id={`label-title-arc-${segment.id}`}
                  d={makeArc(titleRadius)}
                  fill="none"
                  stroke="none"
                />
                <path
                  id={`label-tools-arc-${segment.id}`}
                  d={makeArc(toolsRadius)}
                  fill="none"
                  stroke="none"
                />
                <path
                  id={`label-description-arc-${segment.id}`}
                  d={makeArc(descriptionRadius)}
                  fill="none"
                  stroke="none"
                />

                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: activeSegment !== null && activeSegment !== segment.id ? 0.25 : 1,
                  }}
                  transition={{ opacity: { duration: 0.3 } }}
                  fill={activeSegment === segment.id ? "#ffffff" : "#cccccc"}
                  fontSize={29}
                  fontWeight={700}
                  fontFamily="Inter"
                  letterSpacing="-0.35px"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    textShadow: activeSegment === segment.id
                      ? "0 0 18px rgba(0,153,255,0.45)"
                      : "none",
                  }}
                >
                  <textPath
                    href={`#label-title-arc-${segment.id}`}
                    startOffset="50%"
                  >
                    {segment.title}
                  </textPath>
                </motion.text>

                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: activeSegment === segment.id ? 1 : 0,
                  }}
                  transition={{ duration: 0.25, ease: EASE }}
                  fill="#0099ff"
                  fontSize={15}
                  fontWeight={500}
                  fontFamily="Inter"
                  letterSpacing="1px"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <textPath
                    href={`#label-tools-arc-${segment.id}`}
                    startOffset="50%"
                  >
                    {segment.tools}
                  </textPath>
                </motion.text>

                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: activeSegment === segment.id ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, delay: 0.03, ease: EASE }}
                  fill="#777777"
                  fontSize={13}
                  fontWeight={500}
                  fontFamily="Inter"
                  letterSpacing="0.08em"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <textPath
                    href={`#label-description-arc-${segment.id}`}
                    startOffset="50%"
                  >
                    {segment.description}
                  </textPath>
                </motion.text>
              </motion.g>
            );
          })}

          {/* The open slice's affordance, curved along the crescent the way the
              slice titles follow their own arcs. It lives in the SVG rather
              than the HTML overlay below because only SVG text can take a real
              curve. The clip problem that pushed the Hardware pill out of the
              artwork does not apply here: that was a foreignObject inheriting a
              slice clipPath, and this is plain SVG text at the root.

              Keyed off activeSegment rather than isMobile, so hover reveals it
              on desktop and a tap reveals it on mobile. */}
          <AnimatePresence>
            {segments.map((segment) => {
                if (activeSegment !== segment.id) return null;

                const angle = midAngle(segment);
                // The same rule the slice labels use: a clockwise arc carries
                // text upside down across the lower half of the circle.
                const flip = angle > 0 && angle < 180;
                const from = polar(
                  KNOW_MORE_R,
                  flip ? angle + KNOW_MORE_SWEEP : angle - KNOW_MORE_SWEEP,
                );
                const to = polar(
                  KNOW_MORE_R,
                  flip ? angle - KNOW_MORE_SWEEP : angle + KNOW_MORE_SWEEP,
                );
                const arc = `M ${from.x} ${from.y} A ${KNOW_MORE_R} ${KNOW_MORE_R} 0 0 ${
                  flip ? 0 : 1
                } ${to.x} ${to.y}`;

                /*
                 * The text rides a concentric arc of its own, on its own
                 * shorter span. Running it out to the tap arc's sweep would
                 * carry its ends past the slice's inner edge, which curves in
                 * as the slice slides off centre, and the label would cross
                 * onto the artwork at both ends.
                 */
                const textFrom = polar(
                  KNOW_MORE_TEXT_R,
                  flip
                    ? angle + KNOW_MORE_TEXT_SWEEP
                    : angle - KNOW_MORE_TEXT_SWEEP,
                );
                const textTo = polar(
                  KNOW_MORE_TEXT_R,
                  flip
                    ? angle - KNOW_MORE_TEXT_SWEEP
                    : angle + KNOW_MORE_TEXT_SWEEP,
                );
                const textArc = `M ${textFrom.x} ${textFrom.y} A ${KNOW_MORE_TEXT_R} ${KNOW_MORE_TEXT_R} 0 0 ${
                  flip ? 0 : 1
                } ${textTo.x} ${textTo.y}`;

                return (
                  <motion.g
                    key={`know-more-${segment.id}`}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    style={{
                      transformBox: "view-box",
                      transformOrigin: "350px 350px",
                    }}
                    /*
                     * The crescent this sits in is outside the slice's own hit
                     * shape, so on desktop the pointer leaving the slice to
                     * reach these words would clear the hover and take them
                     * away mid-approach. Re-asserting the hover here keeps the
                     * slice open for as long as the pointer is on the label.
                     */
                    onMouseEnter={
                      isMobile
                        ? undefined
                        : () => setHoveredSegment(segment.id)
                    }
                    onMouseLeave={
                      isMobile ? undefined : () => setHoveredSegment(null)
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(segment.primaryProject);
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSelectedProject(segment.primaryProject);
                    }}
                  >
                    <path
                      id={`know-more-arc-${segment.id}`}
                      d={arc}
                      fill="none"
                      stroke="none"
                    />
                    <path
                      id={`know-more-text-arc-${segment.id}`}
                      d={textArc}
                      fill="none"
                      stroke="none"
                    />
                    {/* A thick transparent stroke on the midline arc carries the
                        tap. The glyphs alone are a few px tall once the pie is
                        scaled to 0.42 on mobile, which is no tap target. */}
                    <path
                      d={arc}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={46}
                      style={{ pointerEvents: "stroke", cursor: "none" }}
                    />
                    {/* Sized off the description line and coloured off the
                        tools line, so the action reads as part of the same
                        stack of labels rather than a separate voice. */}
                    <text
                      fill="#0099ff"
                      fontSize={11}
                      fontWeight={500}
                      fontFamily="Inter"
                      letterSpacing="0.14em"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        cursor: "none",
                        pointerEvents: "all",
                        userSelect: "none",
                        textTransform: "uppercase",
                        opacity: 0.9,
                        textShadow:
                          "0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7)",
                      }}
                    >
                      <textPath
                        href={`#know-more-text-arc-${segment.id}`}
                        startOffset="50%"
                      >
                        Know more →
                      </textPath>
                    </text>
                  </motion.g>
                );
              })}
          </AnimatePresence>
        </svg>

        {/* Pills sit outside the SVG on purpose: every slice shape is a
            clippath on the artwork, and a pill parented to a foreignObject
            inherits that clip and gets cut off. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {/* Hardware "Know more" is now inside the SVG center disc. */}
        </div>
      </div>
      )}

      {/* Full screen project overlay. Kept outside the scaled pie wrapper: a
          transformed ancestor would become the containing block for the fixed
          positioning and trap the overlay inside the pie. */}
      {/*
        Mounted straight off the state rather than through AnimatePresence.
        Under AnimatePresence the exit ran its opacity to 0 and then stalled
        without ever unmounting, which left a full screen sheet over the page
        that still took every tap: the overlay looked closed and the site went
        dead behind it. Closing now removes the element outright. The cost is
        the fade on the way out, which is worth a close button that closes.
      */}
      {typeof window !== "undefined" &&
        selectedProject &&
        createPortal(
          <motion.div
            className="project-overlay-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onClick={closeSpecOverlay}
            role="dialog"
            aria-modal="true"
            aria-label={selectedProject.title}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(9,9,9,0.96)",
              backdropFilter: "blur(20px)",
              cursor: "none",
            }}
          >
            {/*
              First child of the overlay itself, not of the panel inside it.
              The panel carries a framer transform while it animates and it is
              what scrolls, and a fixed child of a transformed element anchors
              to that element rather than to the viewport, which is how the
              close control ended up out of reach. Out here the viewport is the
              containing block and the button stays in the corner.
            */}
            <button
              className="project-overlay-close"
              /*
                The backdrop closes on click too, and this button is a child of
                it rather than of the panel that stops propagation. Without
                this the close ran twice and popped two history entries, which
                took the visitor off the site altogether.
              */
              onClick={(e) => {
                e.stopPropagation();
                closeSpecOverlay();
              }}
              aria-label="Close project details"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#0099ff";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#262626";
                e.currentTarget.style.color = "#999999";
              }}
              style={{
                position: "fixed",
                top: "16px",
                right: "16px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#141414",
                border: "0.5px solid #262626",
                color: "#999999",
                fontSize: "20px",
                cursor: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10001,
                WebkitTapHighlightColor: "transparent",
                lineHeight: 1,
              }}
            >
              x
            </button>

            <motion.div
              className="project-overlay-inner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left: preview */}
              <div
                className="project-overlay-left"
                style={{
                  position: "relative",
                  background: "#0a0a0a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {selectedProject.projectMedia ? (
                  /\\.(gif|jpe?g|png|webp)(\\?.*)?$/i.test(selectedProject.projectMedia) ? (
                    <img
                      src={selectedProject.projectMedia}
                      alt={`${selectedProject.title} project preview`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  ) : (
                    <video
                      src={selectedProject.projectMedia}
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls
                      preload="metadata"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                        background: "#050505",
                      }}
                    />
                  )
                ) : (
                  <>
                    <div
                      className="project-overlay-initials"
                      style={{
                        fontSize: "72px",
                        fontWeight: 500,
                        color: "#1a1a1a",
                        letterSpacing: "-4px",
                      }}
                    >
                      {selectedProject.initials}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#1e1e1e",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                      }}
                    >
                      Preview soon
                    </div>
                  </>
                )}
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

              {/* Right: details */}
              <div
                className="project-overlay-right"
              >
                {/* The close control now lives at the overlay root, above. */}

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

                <div
                  className="project-overlay-description-section"
                  style={{
                    margin: "0 0 32px 0",
                    maxWidth: "560px",
                  }}
                >
                  <p
                    className="project-overlay-desc"
                    style={{
                      fontSize: "14px",
                      color: "#888888",
                      lineHeight: 1.65,
                      margin: "0 0 18px 0",
                    }}
                  >
                    {selectedProject.description}
                  </p>

                  <ul
                    className="project-overlay-bullets"
                    style={{
                      margin: 0,
                      paddingLeft: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      color: "#b8b8b8",
                    }}
                  >
                    {selectedProject.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        style={{
                          fontSize: "13px",
                          lineHeight: 1.5,
                          paddingLeft: "3px",
                        }}
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
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

                <a
                  className="project-overlay-github"
                  href={selectedProject.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0099ff";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#262626";
                    e.currentTarget.style.color = "#cccccc";
                  }}
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
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
    </section>
  );
}