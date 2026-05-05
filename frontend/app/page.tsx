"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--gradient-hero)" }}>
      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 glass-nav z-10 w-full" style={{ background: "var(--bg-navbar)" }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-pulse">⚡</span>
          <span className="font-bold text-white text-lg sm:text-xl tracking-wider uppercase font-heading text-transparent bg-clip-text bg-[var(--gradient-brand)] drop-shadow-[0_0_10px_rgba(124,58,237,0.5)]">Nexus</span>
        </div>
        <button
          onClick={() => router.push("/teacher/login")}
          className="btn-outline text-sm sm:text-base py-2 px-4 min-h-[40px] sm:min-h-[48px]"
        >
          Teacher Login
        </button>
      </nav>

      {/* ── Main Content ── */}
      <main className="flex flex-1 flex-col items-center justify-center page-container z-10">
        <motion.div
          className="flex w-full max-w-4xl flex-col items-center gap-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ── Hero Text ── */}
          <motion.div className="text-center max-w-3xl" variants={itemVariants}>
            <h1 className="font-heading font-extrabold text-white leading-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" style={{ fontSize: "clamp(1.8rem, 6vw, 3.2rem)" }}>
              Ignite the Mind.<br/><span className="text-transparent bg-clip-text bg-[var(--gradient-brand)]">Automate the Rest.</span>
            </h1>
            <p className="mt-6 text-[var(--text-secondary)] font-medium" style={{ fontSize: "clamp(0.95rem, 3vw, 1.1rem)" }}>
              Enter the Nexus. Transform any lecture, PDF, or document into a competitive, high-stakes real-time assessment in seconds. Built for forward-thinking educators and relentless students.
            </p>
          </motion.div>

          {/* ── Role Selection Cards ── */}
          <motion.div
            className="flex flex-col sm:flex-row w-full gap-6 justify-center items-stretch"
            variants={itemVariants}
          >
            {/* Teacher Card */}
            <div className="edu-card flex flex-1 flex-col items-center justify-between text-center group cursor-default relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:-translate-y-2" style={{ padding: "clamp(20px, 3vw, 28px)" }}>
              <div className="absolute top-0 left-0 w-full h-1 bg-[rgba(124,58,237,0.5)] group-hover:bg-[var(--accent-purple)] transition-colors"></div>
              <div className="flex flex-col items-center gap-4 mb-6 relative z-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(124,58,237,0.15)] text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]">
                  👩‍🏫
                </div>
                <h2 className="font-heading text-xl font-bold text-white group-hover:text-[var(--accent-purple)] transition-colors">
                  Teacher Access
                </h2>
                <p className="text-sm text-text-secondary">
                  Create AI quizzes from any material, assign them to your class, and track real-time results.
                </p>
              </div>
              <button
                onClick={() => router.push("/teacher/login")}
                className="w-full btn-primary relative z-10"
              >
                Create a Quiz
              </button>
            </div>

            {/* Student Card */}
            <div className="edu-card flex flex-1 flex-col items-center justify-between text-center group cursor-default relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:-translate-y-2" style={{ padding: "clamp(20px, 3vw, 28px)" }}>
              <div className="absolute top-0 left-0 w-full h-1 bg-[rgba(0,212,255,0.5)] group-hover:bg-[var(--accent-cyan)] transition-colors"></div>
              <div className="flex flex-col items-center gap-4 mb-6 relative z-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(0,212,255,0.15)] text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]">
                  🎓
                </div>
                <h2 className="font-heading text-xl font-bold text-white group-hover:text-[var(--accent-cyan)] transition-colors">
                  Student Portal
                </h2>
                <p className="text-sm text-text-secondary">
                  Join an active quiz session assigned by your teacher and test your knowledge.
                </p>
              </div>
              <button
                onClick={() => router.push("/student")}
                className="w-full btn-primary animate-pulseGlow bg-transparent border-2 border-[var(--accent-cyan)] text-white hover:bg-[rgba(0,212,255,0.1)] relative z-10"
              >
                Join Session
              </button>
            </div>
          </motion.div>

          {/* ── Footer ── */}
          <motion.p
            className="text-xs text-[var(--text-muted)] mt-8 pb-8 text-center"
            variants={itemVariants}
          >
            Powered by Groq AI &nbsp;·&nbsp; Built for the future of education &nbsp;·&nbsp; <span className="font-semibold text-white">Made by Arthur</span>
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
