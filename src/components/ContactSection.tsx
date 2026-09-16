"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import emailjs from "@emailjs/browser";

// ---------------------------------------------------------------------------
// TODO: EmailJS placeholders — the contact form will not send until these three
// values are replaced with the real ones from https://dashboard.emailjs.com
//   SERVICE_ID  → Email Services  → your service
//   TEMPLATE_ID → Email Templates → your template
//   PUBLIC_KEY  → Account         → API Keys → Public Key
// The template must accept: from_name, from_email, message, to_name.
// ---------------------------------------------------------------------------
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";

const easing = [0.16, 1, 0.3, 1] as const;

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export default function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!message.trim()) newErrors.message = "Message is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setStatus("loading");

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: name,
          from_email: email,
          message: message,
          to_name: "Anant Pandey",
        },
        EMAILJS_PUBLIC_KEY,
      );
      setStatus("success");
      setTimeout(() => {
        setName("");
        setEmail("");
        setMessage("");
        setStatus("idle");
      }, 3000);
    } catch {
      setStatus("error");
    }
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <section
      id="contact"
      className="relative z-[1] w-full overflow-hidden bg-canvas"
    >
      <div className="contact-inner relative z-[1] mx-auto max-w-[640px] px-6 py-[60px] md:px-[60px] md:py-[96px_80px]">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easing }}
          className="mb-12 text-center text-[11px] uppercase tracking-[0.18em] text-ink-muted"
        >
          04 — Contact
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.7, ease: easing }}
          className="mb-4 text-center text-[clamp(32px,8vw,56px)] font-medium leading-[1.0] tracking-[-3px] text-ink md:text-[clamp(42px,7vw,80px)] md:tracking-[-4px]"
        >
          Open to work.
          <br />
          Open to ideas<span className="text-accent-blue">.</span>
        </motion.h2>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.6, ease: easing }}
          className="mb-14 text-center text-[15px] text-ink-muted"
        >
          Got a project, a role, or just want to talk robots? Send a message.
        </motion.p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-full flex-col gap-3 p-0 md:max-w-[560px]"
        >
          {/* Name field */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6, ease: easing }}
          >
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
              className="h-12 w-full rounded-[10px] border-[0.5px] border-hairline bg-surface-1 px-[18px] text-[14px] text-ink outline-none placeholder:text-[#555555] transition-colors duration-200 focus:border-accent-blue"
            />
            {errors.name && (
              <p className="mt-1 text-[12px] text-[#ff4444]">{errors.name}</p>
            )}
          </motion.div>

          {/* Email field */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.38, duration: 0.6, ease: easing }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              className="h-12 w-full rounded-[10px] border-[0.5px] border-hairline bg-surface-1 px-[18px] text-[14px] text-ink outline-none placeholder:text-[#555555] transition-colors duration-200 focus:border-accent-blue"
            />
            {errors.email && (
              <p className="mt-1 text-[12px] text-[#ff4444]">{errors.email}</p>
            )}
          </motion.div>

          {/* Message field */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.46, duration: 0.6, ease: easing }}
          >
            <textarea
              placeholder="What are you working on?"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                clearError("message");
              }}
              className="h-[140px] w-full resize-none rounded-[10px] border-[0.5px] border-hairline bg-surface-1 px-[18px] py-[14px] text-[14px] text-ink outline-none placeholder:text-[#555555] transition-colors duration-200 focus:border-accent-blue"
            />
            {errors.message && (
              <p className="mt-1 text-[12px] text-[#ff4444]">
                {errors.message}
              </p>
            )}
          </motion.div>

          {/* Status pill */}
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex self-start rounded-full border-[0.5px] border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] px-[14px] py-1.5 text-[12px] text-[#22c55e]"
            >
              Message sent. Anant will get back to you soon.
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex self-start rounded-full border-[0.5px] border-[rgba(255,68,68,0.3)] bg-[rgba(255,68,68,0.1)] px-[14px] py-1.5 text-[12px] text-[#ff4444]"
            >
              Something went wrong. Please try again or email directly.
            </motion.div>
          )}

          {/* Submit button */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.54, duration: 0.6, ease: easing }}
          >
            <button
              type="submit"
              disabled={status === "loading"}
              className={`mt-2 flex h-[52px] w-full items-center justify-center rounded-full text-[14px] font-medium tracking-[-0.2px] transition-colors duration-200 ${
                status === "loading"
                  ? "cursor-not-allowed bg-[#e0e0e0] text-[#000000]"
                  : status === "success"
                    ? "bg-[#22c55e] text-[#ffffff]"
                    : status === "error"
                      ? "bg-[#ff4444] text-[#ffffff]"
                      : "bg-ink text-[#000000] hover:bg-[#e0e0e0]"
              }`}
            >
              {status === "loading"
                ? "Sending..."
                : status === "success"
                  ? "Message sent"
                  : status === "error"
                    ? "Something went wrong. Try again."
                    : "Send message"}
            </button>
          </motion.div>
        </form>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6, ease: easing }}
          className="mt-12 flex items-center justify-center gap-3 md:gap-6"
        >
          <a
            href="https://linkedin.com/in/anantpandey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] uppercase tracking-[0.12em] text-[#555555] transition-colors duration-200 hover:text-ink"
          >
            LinkedIn
          </a>
          <span className="text-[#333333]">·</span>
          <a
            href="https://github.com/anantpandey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] uppercase tracking-[0.12em] text-[#555555] transition-colors duration-200 hover:text-ink"
          >
            GitHub
          </a>
          <span className="text-[#333333]">·</span>
          <a
            href="mailto:prakashanantpandey@gmail.com"
            className="text-[12px] uppercase tracking-[0.12em] text-[#555555] transition-colors duration-200 hover:text-ink"
          >
            Email
          </a>
        </motion.div>

      </div>
    </section>
  );
}
