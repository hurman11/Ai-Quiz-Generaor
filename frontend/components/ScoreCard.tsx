"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import type { QuizQuestion } from "@/types/quiz";

interface ScoreCardProps {
  score: number;
  total: number;
  questions: QuizQuestion[];
  userAnswers: string[];
  studentName?: string;
  onBackHome: () => void;
}

function useCountUp(target: number, duration: number = 1500): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      if (current !== start) {
        start = current;
        setValue(current);
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

export default function ScoreCard({
  score,
  total,
  questions,
  userAnswers,
  studentName,
  onBackHome,
}: ScoreCardProps) {
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const animatedScore = useCountUp(score, 1500);

  // SVG circle math
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const size = isMobile ? 120 : 180;
  const strokeWidth = isMobile ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Performance message
  const getMessage = (): { text: string; emoji: string } => {
    if (percentage >= 90) return { text: "Outstanding! You're a star student!", emoji: "🌟" };
    if (percentage >= 70) return { text: "Great job! Keep it up!", emoji: "👏" };
    if (percentage >= 50) return { text: "Good effort! Review the answers and try again!", emoji: "📚" };
    return { text: "Don't give up! Practice makes perfect!", emoji: "💪" };
  };

  const message = getMessage();

  // Stroke color based on rating
  const getStrokeColor = (): string => {
    if (percentage >= 90) return "rgba(34,211,238,1)";
    if (percentage >= 70) return "rgba(96,165,250,1)";
    if (percentage >= 50) return "rgba(251,191,36,1)";
    return "rgba(255,255,255,0.6)";
  };

  const getBadgeColor = (): string => {
    if (percentage >= 90) return "bg-[rgba(34,211,238,0.15)] text-[rgba(34,211,238,1)] border-[rgba(34,211,238,0.5)]";
    if (percentage >= 70) return "bg-[rgba(96,165,250,0.15)] text-[rgba(96,165,250,1)] border-[rgba(96,165,250,0.5)]";
    if (percentage >= 50) return "bg-[rgba(251,191,36,0.15)] text-[rgba(251,191,36,1)] border-[rgba(251,191,36,0.5)]";
    return "bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.8)] border-[rgba(255,255,255,0.3)]";
  };

  return (
    <div className="edu-card w-full max-w-[520px]" style={{ padding: "clamp(20px, 4vw, 32px)", margin: "0 auto", backdropFilter: "blur(32px) saturate(180%)" }}>
      <div className="flex flex-col items-center gap-6">
        {/* ── Title ── */}
        <h2 className="text-xl font-bold text-white tracking-tight">
          Quiz Results
        </h2>

        {/* ── SVG Ring ── */}
        <div className="relative flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
          >
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={getStrokeColor()}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </svg>
          {/* Score overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-white" style={{ fontSize: "clamp(1.8rem, 6vw, 2.8rem)", letterSpacing: "-0.04em" }}>
              {animatedScore}
              <span className="text-lg text-white/60 font-normal"> / {total}</span>
            </span>
            <span className="text-sm text-white/60 mt-[-4px]">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>

        {/* ── Message ── */}
        <motion.div
          className={`rounded-full px-6 py-2 text-sm font-semibold border ${getBadgeColor()}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          {message.emoji} {message.text}
        </motion.div>

        {/* ── Answer Review ── */}
        <div className="w-full mt-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Answer Review
          </h3>
          <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex flex-col gap-2">
              {questions.map((q, idx) => {
                const isCorrect = userAnswers[idx] === q.correct;
                
                return (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] p-3 bg-transparent hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                  >
                    <span
                      className={`mt-0.5 text-sm font-bold flex-shrink-0 ${
                        isCorrect ? "text-[#34d399]" : "text-[#f87171]"
                      }`}
                    >
                      {isCorrect ? "✓" : "✗"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8rem] sm:text-sm text-white leading-snug">
                        {q.question}
                      </p>
                      {!isCorrect && (
                        <p className="mt-1.5 text-[0.75rem] sm:text-xs text-[#22d3ee]">
                          <span className="font-semibold">Correct: {q.correct}</span> —{" "}
                          {q.options[q.correct as keyof typeof q.options]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Action Button ── */}
        <button
          id="back-home-btn"
          type="button"
          onClick={onBackHome}
          className="btn-primary w-full min-h-[52px] mt-2"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
