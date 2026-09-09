import { useState } from "react";
import type { ScenarioItem } from "../types";
import { Button } from "./Button";

export interface ScenarioResult {
  scored: true;
  correct: boolean;
}

interface ScenarioViewProps {
  item: ScenarioItem;
  onComplete: (result: ScenarioResult) => void;
}

export function ScenarioView({ item, onComplete }: ScenarioViewProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const chosen = answered ? item.choices[selected] : null;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent2">Scenario</p>
      <h3 className="text-xl font-semibold text-text">{item.prompt}</h3>

      <div className="space-y-2">
        {item.choices.map((choice, i) => {
          const isPicked = i === selected;
          let style = "border-textMuted/20 hover:border-accent-from/60";
          if (answered && isPicked) {
            style = choice.correct ? "border-accent-from bg-accent-from/10" : "border-warn bg-warn/10";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setSelected(i)}
              className={`w-full rounded-2xl border bg-panel p-3 text-left text-text transition-colors disabled:cursor-default ${style}`}
            >
              {choice.text}
            </button>
          );
        })}
      </div>

      {chosen && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            chosen.correct
              ? "border-accent-from/40 bg-accent-from/5 text-textMuted"
              : "border-accent2/40 bg-accent2/5 text-textMuted"
          }`}
        >
          <p className={`mb-1 font-semibold ${chosen.correct ? "text-accent-from" : "text-accent2"}`}>
            {chosen.correct ? "Godt valg!" : "Nesten — her er hvorfor..."}
          </p>
          <p>{chosen.consequence}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          disabled={!answered}
          onClick={() => onComplete({ scored: true, correct: chosen?.correct ?? false })}
        >
          Neste
        </Button>
      </div>
    </div>
  );
}
