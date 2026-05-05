import { motion } from "framer-motion";
import type { Question } from "@/types/quiz";

interface QuizQuestionProps {
  question: Question;
  onAnswer: (answer: string) => void;
  answered: boolean;
  selectedAnswer: string | null;
}

export default function QuizQuestion({
  question,
  onAnswer,
  answered,
  selectedAnswer,
}: QuizQuestionProps) {
  const getButtonClass = (optionLetter: string) => {
    const isSelected = selectedAnswer === optionLetter;
    const isCorrectOption = question.correct === optionLetter;

    if (!answered) {
      return "bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-body)] hover:border-[var(--accent-cyan)] hover:bg-[rgba(0,212,255,0.05)]";
    }

    if (isCorrectOption) {
      return "bg-[rgba(16,185,129,0.15)] border-[var(--accent-green)] text-[#6ee7b7]";
    }

    if (isSelected && !isCorrectOption) {
      return "bg-[rgba(239,68,68,0.15)] border-[var(--accent-red)] text-[#fca5a5]";
    }

    return "bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)] opacity-50";
  };

  const shakeAnimation = {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.4 },
  };

  return (
    <div className="edu-card flex flex-col gap-6 w-full" style={{ padding: "clamp(20px, 3vw, 28px)" }}>
      {/* ── Question Text ── */}
      <h2 className="font-heading font-semibold text-white leading-relaxed" style={{ fontSize: "clamp(0.95rem, 3vw, 1.1rem)" }}>
        {question.question}
      </h2>

      {/* ── Options ── */}
      <div className="flex flex-col gap-3">
        {Object.entries(question.options).map(([letter, text]) => {
          const isSelected = selectedAnswer === letter;
          const isCorrectOption = question.correct === letter;
          const isWrongSelection = answered && isSelected && !isCorrectOption;

          return (
            <motion.button
              key={letter}
              onClick={() => onAnswer(letter)}
              disabled={answered}
              animate={isWrongSelection ? shakeAnimation : {}}
              className={`flex items-start sm:items-center w-full text-left rounded-xl border p-[14px_16px] transition-all duration-200 min-h-[52px] ${getButtonClass(
                letter
              )}`}
            >
              <div className="flex items-center justify-center rounded-lg bg-black/20 text-sm font-bold min-w-[32px] h-[32px] flex-shrink-0 mr-3 border border-white/5">
                {letter}
              </div>
              <span className="flex-1 mt-1 sm:mt-0 leading-snug">{text}</span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Explanation (shows only after answering) ── */}
      {answered && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="mt-2 overflow-hidden rounded-r-lg border-l-4 border-[var(--accent-purple)] bg-[rgba(124,58,237,0.1)]"
        >
          <div className="p-4 text-[0.8rem] sm:text-sm text-[var(--text-secondary)]">
            <strong className="block mb-1 text-[var(--accent-purple)]">Explanation:</strong>
            {question.explanation}
          </div>
        </motion.div>
      )}
    </div>
  );
}
