import { useState } from "react";
import type { RiskScenario } from "../types";
import { Button } from "./Button";

export interface RiskResult {
  scored: true;
  correct: boolean;
}

interface RiskCalculatorProps {
  item: RiskScenario;
  onComplete: (result: RiskResult) => void;
}

const SL_OPTIONS = ["SL1", "SL2", "SL3", "SL4"];

function severityColor(score: number): string {
  if (score <= 4) return "bg-accent-from/30";
  if (score <= 9) return "bg-yellow-500/30";
  if (score <= 15) return "bg-orange-500/40";
  return "bg-warn/50";
}

export function RiskCalculator({ item, onComplete }: RiskCalculatorProps) {
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [selectedSL, setSelectedSL] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const isCorrect = selectedSL === item.correctSLTarget;

  const handleLock = () => {
    if (!selectedSL) return;
    setLocked(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent2">Risikokalkulator</p>
      <p className="text-text">{item.description}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-xs text-textMuted">
              <span>Sannsynlighet</span>
              <span className="font-semibold text-text">{likelihood}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={likelihood}
              disabled={locked}
              onChange={(e) => setLikelihood(Number(e.target.value))}
              className="w-full accent-accent-from disabled:opacity-50"
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-textMuted">
              <span>Konsekvens</span>
              <span className="font-semibold text-text">{impact}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={impact}
              disabled={locked}
              onChange={(e) => setImpact(Number(e.target.value))}
              className="w-full accent-accent-from disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Foreslå SL-target</p>
            <div className="grid grid-cols-4 gap-2">
              {SL_OPTIONS.map((sl) => (
                <button
                  key={sl}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelectedSL(sl)}
                  className={`rounded-xl border-2 px-2 py-2 text-sm font-semibold text-text transition-colors disabled:cursor-default disabled:opacity-70 ${
                    selectedSL === sl ? "border-accent-from bg-accent-from/10" : "border-textMuted/20"
                  }`}
                >
                  {sl}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1 self-start">
          {[5, 4, 3, 2, 1].flatMap((impactRow) =>
            [1, 2, 3, 4, 5].map((likelihoodCol) => {
              const isCurrent = impactRow === impact && likelihoodCol === likelihood;
              return (
                <div
                  key={`${impactRow}-${likelihoodCol}`}
                  className={`flex aspect-square items-center justify-center rounded text-sm font-semibold text-text ${severityColor(
                    impactRow * likelihoodCol,
                  )} ${isCurrent ? "ring-2 ring-text" : ""}`}
                >
                  {isCurrent ? "●" : ""}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {!locked ? (
        <div className="flex justify-end">
          <Button disabled={!selectedSL} onClick={handleLock}>
            Lås inn
          </Button>
        </div>
      ) : (
        <>
          <div
            className={`rounded-xl border p-4 text-sm ${
              isCorrect
                ? "border-accent-from/40 bg-accent-from/5 text-textMuted"
                : "border-warn/40 bg-warn/5 text-textMuted"
            }`}
          >
            <p className={`mb-1 font-semibold ${isCorrect ? "text-accent-from" : "text-warn"}`}>
              {isCorrect ? "Riktig!" : "Nesten — her er hvorfor..."}
            </p>
            {!isCorrect && <p className="mb-1">Riktig SL-target her er {item.correctSLTarget}.</p>}
            <p>{item.explanation}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onComplete({ scored: true, correct: isCorrect })}>Neste</Button>
          </div>
        </>
      )}
    </div>
  );
}
