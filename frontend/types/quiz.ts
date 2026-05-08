export interface QuizOption {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption;
  correct: string;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
  quiz_code?: string;
  quiz_uuid?: string;
  live_state?: {
    phase: "lobby" | "question" | "reveal" | "leaderboard" | "finished";
    question_index: number;
    start_time: number;
  };
}
