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
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <motion.div
        className="flex w-full max-w-3xl flex-col items-center gap-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Logo & Title ── */}
        <motion.div className="text-center" variants={itemVariants}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy text-accent-lime text-2xl shadow-md">
            📝
          </div>
          <h1 className="font-heading text-4xl font-extrabold text-text-primary sm:text-5xl">
            QuizGen
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            AI-powered quiz generator for classrooms
          </p>
        </motion.div>

        {/* ── Role Selection Cards ── */}
        <motion.div
          className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2"
          variants={itemVariants}
        >
          {/* Teacher Card */}
          <button
            id="role-teacher-btn"
            onClick={() => router.push("/teacher/login")}
            className="edu-card group flex flex-col items-center gap-4 p-8 text-center cursor-pointer hover:border-accent-purple transition-all duration-300"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-purple/10 text-4xl transition-transform duration-300 group-hover:scale-110">
              👩‍🏫
            </div>
            <h2 className="font-heading text-xl font-bold text-accent-purple">
              I&apos;m a Teacher
            </h2>
            <p className="text-sm text-text-secondary">
              Create quizzes, share with students, and track their results in
              real time.
            </p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-purple/10 px-4 py-1.5 text-sm font-semibold text-accent-purple transition-colors group-hover:bg-accent-purple group-hover:text-white">
              Get Started →
            </span>
          </button>

          {/* Student Card */}
          <button
            id="role-student-btn"
            onClick={() => router.push("/student")}
            className="edu-card group flex flex-col items-center gap-4 p-8 text-center cursor-pointer hover:border-accent-teal transition-all duration-300"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-teal/10 text-4xl transition-transform duration-300 group-hover:scale-110">
              🎓
            </div>
            <h2 className="font-heading text-xl font-bold text-text-primary">
              I&apos;m a Student
            </h2>
            <p className="text-sm text-text-secondary">
              Take quizzes assigned by your teacher and see your score
              instantly.
            </p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-teal/10 px-4 py-1.5 text-sm font-semibold text-accent-teal transition-colors group-hover:bg-accent-teal group-hover:text-white">
              Join Quiz →
            </span>
          </button>
        </motion.div>

        {/* ── Footer ── */}
        <motion.p
          className="text-xs text-text-secondary/60"
          variants={itemVariants}
        >
          Powered by Groq AI &nbsp;·&nbsp; Built for educators
        </motion.p>
      </motion.div>
    </main>
  );
}
