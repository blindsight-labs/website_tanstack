/* The assessment's state, shared by every concept: the answers, the question on screen,
   whether the result card shows, and the actions. Nothing leaves the page.
   Dev aid: #a=12302131 prefills all eight answers (0–3 per question) and shows the result. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { N, emptyAnswers, score, seeOf, seenCount, type Answers, type Score } from "./model";

export type Assessment = {
  answers: Answers;
  /** index of the question on screen */
  q: number;
  /** the result card is showing (instead of a question) */
  result: boolean;
  /** all eight answered */
  done: boolean;
  answered: number;
  score: Score;
  /** visibility per risk, 0..1 (the baseline while unanswered) */
  see: number[];
  /** risks at see ≥ 0.5 */
  inView: number;
  pick(option: number): void;
  setQ(index: number): void;
  showResult(): void;
  retake(): void;
};

function prefill(): Answers | null {
  const m = /[#&]a=([0-3]{8})/.exec(window.location.hash);
  return m ? m[1].split("").map(Number) : null;
}

export function useAssessment(): Assessment {
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [q, setQState] = useState(0);
  const [result, setResult] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    const a = prefill();
    if (a) {
      setAnswers(a);
      setQState(N - 1);
      setResult(true);
    }
    return () => window.clearTimeout(timer.current);
  }, []);

  const pick = useCallback(
    (option: number) => {
      setAnswers((cur) => {
        const next = cur.slice();
        next[q] = option;
        window.clearTimeout(timer.current);
        // a beat to see the choice land, then the next open question (or the result)
        timer.current = window.setTimeout(() => {
          const after = next.findIndex((x, k) => x == null && k > q);
          const any = after >= 0 ? after : next.findIndex((x) => x == null);
          if (any >= 0) setQState(any);
          else setResult(true);
        }, 420);
        return next;
      });
    },
    [q],
  );

  const setQ = useCallback((i: number) => {
    window.clearTimeout(timer.current);
    setResult(false);
    setQState(Math.max(0, Math.min(N - 1, i)));
  }, []);

  const retake = useCallback(() => {
    window.clearTimeout(timer.current);
    setAnswers(emptyAnswers());
    setQState(0);
    setResult(false);
  }, []);

  return useMemo(() => {
    const done = answers.every((x) => x != null);
    return {
      answers,
      q,
      result,
      done,
      answered: answers.filter((x) => x != null).length,
      score: score(answers),
      see: seeOf(answers),
      inView: seenCount(answers),
      pick,
      setQ,
      showResult: () => done && setResult(true),
      retake,
    };
  }, [answers, q, result, pick, setQ, retake]);
}
