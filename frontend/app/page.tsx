"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-3 glass-nav z-10 w-full flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="font-bold text-white text-lg sm:text-xl tracking-tight">Nexus</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push("/teacher/login")}
            className="btn-outline text-sm sm:text-base py-1.5 px-4 min-h-[36px] sm:min-h-[40px]"
          >
            Teacher Login
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 z-10">
        <motion.div
          className="flex w-full max-w-4xl flex-col items-center justify-center gap-8 sm:gap-12 py-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ── Hero Text ── */}
          <motion.div className="text-center max-w-3xl flex-shrink-0 mt-8 sm:mt-12" variants={itemVariants}>
            <h1 className="font-extrabold text-white leading-tight" style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", letterSpacing: "-0.03em" }}>
              Ignite the Mind.<br/>
              <span className="text-white/75">Automate the Rest.</span>
            </h1>
            <p className="mt-6 text-[var(--text-secondary)] mx-auto max-w-[480px]" style={{ fontSize: "clamp(1rem, 2.5vw, 1.15rem)" }}>
              Enter the Nexus. Transform any lecture, PDF, or document into a competitive, high-stakes real-time assessment in seconds. Built for forward-thinking educators and relentless students.
            </p>
          </motion.div>

          {/* ── Role Selection Cards ── */}
          <motion.div
            className="flex flex-col sm:flex-row w-full gap-5 sm:gap-6 justify-center items-stretch flex-shrink-1 overflow-y-auto sm:overflow-visible no-scrollbar"
            variants={itemVariants}
          >
            {/* Teacher Card */}
            <div className="edu-card flex flex-1 flex-col items-center justify-between text-center group transition-all duration-300">
              <div className="flex flex-col items-center gap-4 mb-5">
                <div className="glass-pill flex h-16 w-16 items-center justify-center text-3xl mb-2">
                  👩‍🏫
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Teacher Access
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Create AI quizzes from any material, assign them to your class, and track real-time results.
                </p>
              </div>
              <button
                onClick={() => router.push("/teacher/login")}
                className="w-full btn-primary"
              >
                Create a Quiz
              </button>
            </div>

            {/* Student Card */}
            <div className="edu-card flex flex-1 flex-col items-center justify-between text-center group transition-all duration-300">
              <div className="flex flex-col items-center gap-4 mb-5">
                <div className="glass-pill flex h-16 w-16 items-center justify-center text-3xl mb-2">
                  🎓
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Student Portal
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Join an active quiz session assigned by your teacher and test your knowledge.
                </p>
              </div>
              <button
                onClick={() => router.push("/student")}
                className="w-full btn-outline"
              >
                Join Session
              </button>
            </div>
          </motion.div>

          {/* ── Footer ── */}
          <motion.p
            className="text-xs text-[var(--text-muted)] mt-auto pt-6 text-center flex-shrink-0"
            variants={itemVariants}
          >
            Powered by Groq AI &nbsp;·&nbsp; Built for the future of education &nbsp;·&nbsp; <span className="font-semibold text-[var(--text-secondary)]">Made by Arthur</span>
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
