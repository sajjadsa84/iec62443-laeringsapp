import { useState } from "react";
import type { QuizItem } from "../types";
import { Button } from "./Button";

export interface QuizResult {
  scored: true;
  correct: boolean;
}

interface QuizViewProps {
  item: QuizItem;
  onComplete: (result: QuizResult) => void;
}

export function QuizView({ item, onComplete }: QuizViewProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = answered && selected === item.correctIndex;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-from">Quiz</p>
      <h3 className="text-xl font-semibold text-text">{item.question}</h3>

      <div className="space-y-2">
        {item.options.map((option, i) => {
          const isRightAnswer = i === item.correctIndex;
          const isPicked = i === selected;

          let style = "border-textMuted/20 hover:border-accent-from/60";
          if (answered && isRightAnswer) style = "border-accent-from bg-accent-from/10";
          else if (answered && isPicked && !isRightAnswer) style = "border-warn bg-warn/10";

          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setSelected(i)}
              className={`w-full rounded-2xl border bg-panel p-3 text-left text-text transition-colors disabled:cursor-default ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            isCorrect
              ? "border-accent-from/40 bg-accent-from/5 text-textMuted"
              : "border-accent2/40 bg-accent2/5 text-textMuted"
          }`}
        >
          <p className={`mb-1 font-semibold ${isCorrect ? "text-accent-from" : "text-accent2"}`}>
            {isCorrect ? "Riktig!" : "Nesten — her er hvorfor..."}
          </p>
          <p>{item.explanation}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          disabled={!answered}
          onClick={() => onComplete({ scored: true, correct: isCorrect })}
        >
          Neste
        </Button>
      </div>
    </div>
  );
}
