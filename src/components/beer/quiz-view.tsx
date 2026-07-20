'use client';

import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiGet } from '@/lib/api-client';

// ── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  fact1: string;
  fact2: string;
  fact3: string;
  options: string[];
  correctIndex: number;
  beerName: string;
}

interface AnsweredQuestion {
  question: QuizQuestion;
  selectedIndex: number | null;
  isCorrect: boolean;
  isTimeout: boolean;
  points: number;
}

type GameState = 'start' | 'playing' | 'results';

// ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_QUESTIONS = 10;
const TIMER_SECONDS = 15;

function getRatingTitle(score: number): string {
  if (score === 10) return 'Пивной гений! 🏆';
  if (score >= 8) return 'Знаток пива! 🥇';
  if (score >= 5) return 'Любитель пива 🍺';
  return 'Новичок 🌱';
}

const FACT_CONFIG = [
  { icon: '🌍', label: 'Стиль и страна' },
  { icon: '📊', label: 'Характеристики' },
  { icon: '⭐', label: 'Популярность' },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadBestScore(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('beerid-quiz-best');
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

function saveBestScore(score: number): number | null {
  try {
    const stored = localStorage.getItem('beerid-quiz-best');
    const prev = stored ? parseInt(stored, 10) : 0;
    if (score > prev) {
      localStorage.setItem('beerid-quiz-best', String(score));
      return score;
    }
    return prev;
  } catch {
    return null;
  }
}

// ── Reducer ──────────────────────────────────────────────────────────────────

interface QuizState {
  gameState: GameState;
  questions: QuizQuestion[];
  currentQ: number;
  score: number;
  answered: AnsweredQuestion[];
  selectedIdx: number | null;
  isAnswered: boolean;
  timeLeft: number;
  bestScore: number | null;
  lastPoints: number;
  lastCorrect: boolean;
  lastTimeout: boolean;
  showFeedback: boolean;
}

type QuizAction =
  | { type: 'START'; questions: QuizQuestion[] }
  | { type: 'ANSWER'; idx: number; timeLeft: number }
  | { type: 'TICK' }
  | { type: 'TIMEOUT' }
  | { type: 'ADVANCE' }
  | { type: 'SHOW_FEEDBACK'; correct: boolean; points: number; isTimeout: boolean }
  | { type: 'RESET' }
  | { type: 'SET_BEST_SCORE'; score: number | null };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        gameState: 'playing',
        questions: action.questions,
        currentQ: 0,
        score: 0,
        answered: [],
        selectedIdx: null,
        isAnswered: false,
        timeLeft: TIMER_SECONDS,
        showFeedback: false,
      };

    case 'ANSWER': {
      const q = state.questions[state.currentQ];
      if (!q || state.isAnswered) return state;
      const correct = action.idx === q.correctIndex;
      const points = correct ? Math.max(10, Math.round((action.timeLeft / TIMER_SECONDS) * 100)) : 0;
      return {
        ...state,
        isAnswered: true,
        selectedIdx: action.idx,
        score: state.score + points,
        answered: [
          ...state.answered,
          { question: q, selectedIndex: action.idx, isCorrect: correct, isTimeout: false, points },
        ],
        showFeedback: true,
        lastPoints: points,
        lastCorrect: correct,
        lastTimeout: false,
      };
    }

    case 'TIMEOUT': {
      const q = state.questions[state.currentQ];
      if (!q || state.isAnswered) return state;
      return {
        ...state,
        isAnswered: true,
        selectedIdx: null,
        answered: [
          ...state.answered,
          { question: q, selectedIndex: null, isCorrect: false, isTimeout: true, points: 0 },
        ],
        showFeedback: true,
        lastPoints: 0,
        lastCorrect: false,
        lastTimeout: true,
      };
    }

    case 'SHOW_FEEDBACK':
      return { ...state, showFeedback: true, lastCorrect: action.correct, lastPoints: action.points, lastTimeout: action.isTimeout };

    case 'ADVANCE': {
      if (state.currentQ + 1 >= state.questions.length) {
        const correctCount = state.answered.filter((a) => a.isCorrect).length;
        const best = saveBestScore(correctCount);
        return {
          ...state,
          gameState: 'results',
          bestScore: best !== null ? best : state.bestScore,
          showFeedback: false,
        };
      }
      return {
        ...state,
        currentQ: state.currentQ + 1,
        selectedIdx: null,
        isAnswered: false,
        timeLeft: TIMER_SECONDS,
        showFeedback: false,
      };
    }

    case 'TICK':
      return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) };

    case 'RESET':
      return {
        ...state,
        gameState: 'start',
        questions: [],
        currentQ: 0,
        score: 0,
        answered: [],
        selectedIdx: null,
        isAnswered: false,
        timeLeft: TIMER_SECONDS,
        showFeedback: false,
      };

    case 'SET_BEST_SCORE':
      return { ...state, bestScore: action.score };

    default:
      return state;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function QuizView() {
  const [state, dispatch] = useReducer(quizReducer, {
    gameState: 'start',
    questions: [],
    currentQ: 0,
    score: 0,
    answered: [],
    selectedIdx: null,
    isAnswered: false,
    timeLeft: TIMER_SECONDS,
    // Initial value is null on both server and client — `loadBestScore()` is
    // dispatched from a useEffect so the SSR markup stays stable and React
    // doesn't warn about a hydration mismatch on the best-score badge.
    bestScore: null,
    lastPoints: 0,
    lastCorrect: false,
    lastTimeout: false,
    showFeedback: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearAdvanceTimeout = useCallback(() => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  // ── Timer effect ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.gameState !== 'playing' || state.isAnswered) {
      clearTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return clearTimer;
  }, [state.gameState, state.currentQ, state.isAnswered, clearTimer]);

  // ── Watch for timeLeft === 0 to trigger timeout ───────────────────────────

  const prevTimeLeftRef = useRef(state.timeLeft);
  useEffect(() => {
    if (
      state.gameState === 'playing' &&
      !state.isAnswered &&
      prevTimeLeftRef.current > 0 &&
      state.timeLeft === 0
    ) {
      dispatch({ type: 'TIMEOUT' });
      advanceTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'ADVANCE' });
      }, 1500);
    }
    prevTimeLeftRef.current = state.timeLeft;
  }, [state.timeLeft, state.gameState, state.isAnswered]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTimer();
      clearAdvanceTimeout();
    };
  }, [clearTimer, clearAdvanceTimeout]);

  // Load best score on client only — keeps SSR output stable.
  useEffect(() => {
    dispatch({ type: 'SET_BEST_SCORE', score: loadBestScore() });
  }, []);

  // ── Fetch questions ───────────────────────────────────────────────────────

  const fetchQuestions = useCallback(async (): Promise<QuizQuestion[]> => {
    try {
      // Batch mode: one request fetches up to 10 questions, so we don't
      // pay 10x the network cost.
      const data = await apiGet<{ questions: QuizQuestion[] } | QuizQuestion>(
        `/api/quiz?count=${TOTAL_QUESTIONS}`,
      );
      if (Array.isArray((data as { questions?: QuizQuestion[] }).questions)) {
        return (data as { questions: QuizQuestion[] }).questions;
      }
      // Backwards-compat: single-question response (no `questions` wrapper).
      return [data as QuizQuestion];
    } catch {
      return [];
    }
  }, []);

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    const qs = await fetchQuestions();
    dispatch({ type: 'START', questions: qs });
    setIsLoading(false);
  }, [fetchQuestions]);

  const handleAnswer = useCallback(
    (idx: number) => {
      if (state.isAnswered) return;
      clearTimer();
      dispatch({ type: 'ANSWER', idx, timeLeft: state.timeLeft });
      advanceTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'ADVANCE' });
      }, 1500);
    },
    [state.isAnswered, state.timeLeft, clearTimer],
  );

  const handleReset = useCallback(() => {
    clearTimer();
    clearAdvanceTimeout();
    dispatch({ type: 'RESET' });
  }, [clearTimer, clearAdvanceTimeout]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const {
    gameState,
    questions,
    currentQ,
    score,
    answered,
    selectedIdx,
    isAnswered,
    timeLeft,
    bestScore,
    showFeedback,
    lastPoints,
    lastCorrect,
  } = state;

  // ── Render: Start Screen ─────────────────────────────────────────────────

  if (gameState === 'start') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-7xl"
          >
            🧠
          </motion.div>

          <h1 className="text-4xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
            Пивной квиз
          </h1>

          <p className="text-lg text-muted-foreground">
            Угадай пиво по трём фактам
          </p>

          {bestScore !== null && bestScore > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-3 dark:border-amber-800 dark:bg-amber-950/40"
            >
              <p className="text-sm text-amber-600 dark:text-amber-400">🏆 Лучший результат</p>
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                {bestScore} из {TOTAL_QUESTIONS}
              </p>
            </motion.div>
          )}

          <Button
            size="lg"
            onClick={handleStart}
            disabled={isLoading}
            className="mt-2 h-14 w-64 bg-amber-600 text-lg font-semibold text-white hover:bg-amber-700"
          >
            {isLoading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
              />
            ) : (
              'Начать игру'
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            10 вопросов · 15 секунд на каждый
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Render: Results Screen ───────────────────────────────────────────────

  if (gameState === 'results') {
    const correctCount = answered.filter((a) => a.isCorrect).length;
    const ratingTitle = getRatingTitle(correctCount);

    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="text-7xl"
          >
            {correctCount >= 8 ? '🏆' : correctCount >= 5 ? '🍺' : '🌱'}
          </motion.div>

          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Ваш результат</p>
            <p className="text-6xl font-bold text-amber-700 dark:text-amber-400">
              {correctCount}<span className="text-2xl text-muted-foreground"> из {TOTAL_QUESTIONS}</span>
            </p>
          </div>

          <p className="text-xl font-semibold">{ratingTitle}</p>

          {bestScore !== null && (
            <p className="text-sm text-muted-foreground">
              Лучший результат: {bestScore} из {TOTAL_QUESTIONS}
            </p>
          )}

          {/* Question breakdown */}
          <div className="mt-4 w-full space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Детали ответов</h3>
            <div className="max-h-80 overflow-y-auto rounded-lg border p-3">
              {answered.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-start gap-3 border-b py-3 last:border-0"
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: a.isCorrect ? '#16a34a' : '#dc2626' }}
                  >
                    {a.isCorrect ? '✓' : a.isTimeout ? '⏱' : '✗'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.question.beerName}</p>
                    {!a.isCorrect && a.selectedIndex !== null && (
                      <p className="truncate text-xs text-muted-foreground">
                        Ваш ответ: {a.question.options[a.selectedIndex]}
                      </p>
                    )}
                    {a.isTimeout && (
                      <p className="text-xs text-muted-foreground">Время вышло</p>
                    )}
                  </div>
                  {a.isCorrect && a.points > 0 && (
                    <span className="shrink-0 text-xs font-semibold text-green-600 dark:text-green-400">
                      +{a.points}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleReset}
            className="mt-2 h-12 w-56 bg-amber-600 font-semibold text-white hover:bg-amber-700"
          >
            Попробовать снова
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Render: Question Screen ──────────────────────────────────────────────

  const question = questions[currentQ];
  if (!question) return null;

  const timerPercent = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor =
    timeLeft > 10 ? 'bg-amber-500' : timeLeft > 5 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Progress bar — overall */}
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Вопрос {currentQ + 1} из {TOTAL_QUESTIONS}
        </span>
        <span className="font-semibold text-amber-600 dark:text-amber-400">
          {score} очков
        </span>
      </div>
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-amber-500"
          initial={false}
          animate={{ width: `${((currentQ + 1) / TOTAL_QUESTIONS) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Timer bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${timerColor}`}
          initial={false}
          animate={{ width: `${timerPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Facts */}
      <div className="mb-6 space-y-3">
        {FACT_CONFIG.map((cfg, i) => {
          const fact = [question.fact1, question.fact2, question.fact3][i];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.35 }}
            >
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                <CardContent className="flex items-center gap-3 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg dark:bg-amber-900/50">
                    {cfg.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
                      {cfg.label}
                    </p>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      {fact}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Answer feedback */}
      <AnimatePresence mode="wait">
        {showFeedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`mb-4 rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
              lastCorrect
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {lastCorrect
              ? `Верно! 🎉 +${lastPoints} очков`
              : `Правильный ответ: ${question.beerName}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="space-y-2.5">
        {question.options.map((option, idx) => {
          let btnClass = 'border-border bg-card hover:bg-accent/50 text-foreground';
          if (isAnswered) {
            if (idx === question.correctIndex) {
              btnClass =
                'border-green-500 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-950/40 dark:text-green-300';
            } else if (idx === selectedIdx && idx !== question.correctIndex) {
              btnClass =
                'border-red-500 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-950/40 dark:text-red-300';
            } else {
              btnClass = 'border-border/50 bg-card/50 text-muted-foreground';
            }
          }

          return (
            <motion.button
              key={idx}
              disabled={isAnswered}
              whileTap={!isAnswered ? { scale: 0.98 } : undefined}
              onClick={() => handleAnswer(idx)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium transition-colors ${btnClass} disabled:cursor-default ${
                !isAnswered ? 'cursor-pointer active:scale-[0.98]' : ''
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {idx + 1}
              </span>
              <span className="truncate">{option}</span>
              {isAnswered && idx === question.correctIndex && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto text-lg"
                >
                  ✅
                </motion.span>
              )}
              {isAnswered && idx === selectedIdx && idx !== question.correctIndex && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto text-lg"
                >
                  ❌
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}