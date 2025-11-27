export interface Question {
  id: number;
  text: string;
  options: string[]; // Can be empty if it's an open-ended question
  correctAnswerIndex: number | null; // Null if open-ended
  correctAnswerText: string; // For verification or open-ended answers
  explanation: string;
}

export interface RawQuestion {
  id: number;
  originalIndex: number; // To track position in PDF
  content: string; // The raw text and image description extracted from PDF
}

export interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<number, number | string>; // Index for MC, string for open text
  score: number;
  isFinished: boolean;
}

export enum AppStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING', // New status for initial PDF map
  ANALYZING = 'ANALYZING', // Solving specific batch
  QUIZ = 'QUIZ',
  RESULTS = 'RESULTS',
  HISTORY = 'HISTORY',
  ERROR = 'ERROR'
}

export interface AnalysisError {
  message: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface HistoryRecord {
  id?: number;
  date: string;
  score: number;
  total: number;
  questions: Question[];
  userAnswers: Record<number, number | string>;
}