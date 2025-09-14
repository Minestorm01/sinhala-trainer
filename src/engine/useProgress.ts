import { useEffect, useMemo, useState } from "react";
import { getItem, setItem } from "../lib/storage";

type Key = { course: string; section: string; unit: string; lesson: string };
type Result = "pass" | "fail";

interface LessonProgress {
  attempts: number;
  bestScore: number;
  lastResult?: Result;
  completed: boolean;
  timestamp?: number;
}

function keyify(k: Key) {
  return `prog:${k.course}:${k.section}:${k.unit}:${k.lesson}`;
}

export function useProgress(k: Key) {
  const storageKey = useMemo(() => keyify(k), [k.course, k.section, k.unit, k.lesson]);
  const [state, setState] = useState<LessonProgress>(() => {
    return getItem<LessonProgress>(storageKey) ?? { attempts: 0, bestScore: 0, completed: false };
  });

  useEffect(() => setItem(storageKey, state), [storageKey, state]);

  const setResult = (score: number) => {
    setState(prev => ({
      attempts: prev.attempts + 1,
      bestScore: Math.max(prev.bestScore, score),
      completed: score >= 80 ? true : prev.completed,
      lastResult: score >= 80 ? "pass" : "fail",
      timestamp: Date.now()
    }));
  };

  return { state, setResult };
}
