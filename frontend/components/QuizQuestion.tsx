import { motion } from "framer-motion";
import type { QuizQuestion as Question } from "@/types/quiz";

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
} : QuizQuestionProps) {
  const getButtonClass = (optionLetter: string) => {
    const isSelected = selectedAnswer === optionLetter;
    const isCorrectOption = question.correct === optionLetter;

    if (!answered) {
      return "bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.18)] text-white hover:bg-[rgba(255,255,255,0.16)] hover:border-[rgba(255,255,255,0.4)] hover:scale-[1.01]";
    }

    if (isCorrectOption) {
      return "bg-[var(--glass-green)] border-[var(--border-green)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]";
    }

    if (isSelected && !isCorrectOption) {
      return "bg-[var(--glass-red)] border-[var(--border-red)] text-white";
    }

    return "bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.18)] text-[var(--text-muted)] opacity-50";
  };

  const shakeAnimation = {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.4 },
  };

  return (
    <div className="edu-card flex flex-col gap-6 w-full" style={{ padding: "clamp(20px, 3vw, 28px)", backdropFilter: "blur(28px) saturate(180%)" }}>
      {/* ── Question Text ── */}
      <div className="flex flex-col gap-3">
        <div className="glass-pill self-start px-3 py-1 text-[0.65rem] font-bold text-white uppercase tracking-wider">
          Question
        </div>
        <h2 className="font-semibold text-white leading-relaxed" style={{ fontSize: "clamp(1.1rem, 3vw, 1.25rem)" }}>
          {question.question}
        </h2>
      </div>

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
              className={`flex items-start sm:items-center w-full text-left rounded-xl border p-[14px_16px] transition-all duration-300 min-h-[52px] ${getButtonClass(
                letter
              )}`}
            >
              <div className="flex items-center justify-center rounded-lg bg-[rgba(255,255,255,0.15)] text-sm font-bold min-w-[32px] h-[32px] flex-shrink-0 mr-3 text-white shadow-sm border border-[rgba(255,255,255,0.1)]">
                {letter}
              </div>
              <span className="flex-1 mt-1 sm:mt-0 leading-snug">{text as string}</span>
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
          className="mt-2 overflow-hidden rounded-r-xl border-l-[3px] border-[rgba(167,139,250,0.6)] bg-[rgba(167,139,250,0.15)]"
        >
          <div className="p-[14px_18px] text-[0.8rem] sm:text-sm text-[var(--text-secondary)] italic">
            <strong className="block mb-1 text-white font-semibold not-italic">Explanation:</strong>
            {question.explanation}
          </div>
        </motion.div>
      )}
    </div>
  );
}
