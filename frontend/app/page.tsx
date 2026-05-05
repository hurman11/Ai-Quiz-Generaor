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
          <span className="text-2xl">📝</span>
          <span className="font-bold text-white text-lg sm:text-xl">QuizGen</span>
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
          <motion.div className="text-center max-w-2xl" variants={itemVariants}>
            <h1 className="font-heading font-extrabold text-white leading-tight" style={{ fontSize: "clamp(1.6rem, 5vw, 2.8rem)" }}>
              The Future of Interactive Learning
            </h1>
            <p className="mt-4 text-text-secondary" style={{ fontSize: "clamp(0.875rem, 3vw, 1rem)" }}>
              Generate highly-accurate, AI-powered quizzes instantly. Perfect for educators who want to save time and students who want to test their knowledge.
            </p>
          </motion.div>

          {/* ── Role Selection Cards ── */}
          <motion.div
            className="flex flex-col sm:flex-row w-full gap-6 justify-center items-stretch"
            variants={itemVariants}
          >
            {/* Teacher Card */}
            <div className="edu-card flex flex-1 flex-col items-center justify-between text-center group cursor-default" style={{ padding: "clamp(20px, 3vw, 28px)" }}>
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(124,58,237,0.15)] text-3xl">
                  👩‍🏫
                </div>
                <h2 className="font-heading text-xl font-bold text-white">
                  Teacher Access
                </h2>
                <p className="text-sm text-text-secondary">
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
            <div className="edu-card flex flex-1 flex-col items-center justify-between text-center group cursor-default" style={{ padding: "clamp(20px, 3vw, 28px)" }}>
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(0,212,255,0.15)] text-3xl">
                  🎓
                </div>
                <h2 className="font-heading text-xl font-bold text-white">
                  Student Portal
                </h2>
                <p className="text-sm text-text-secondary">
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
            className="text-xs text-text-muted mt-8"
            variants={itemVariants}
          >
            Powered by Groq AI &nbsp;·&nbsp; Built for the future of education
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
