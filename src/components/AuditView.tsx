import { useState } from "react";
import type { AuditChecklistItem, AuditExercise } from "../types";
import { Button } from "./Button";

export interface AuditResult {
  scored: true;
  correct: boolean;
}

interface AuditViewProps {
  item: AuditExercise;
  onComplete: (result: AuditResult) => void;
}

type Verdict = AuditChecklistItem["correctVerdict"];
type Priority = NonNullable<AuditChecklistItem["correctPriority"]>;

const VERDICT_LABELS: Record<Verdict, string> = {
  compliant: "Samsvar",
  "non-compliant": "Avvik",
  partial: "Delvis samsvar",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: "Høy",
  medium: "Middels",
  low: "Lav",
};

export function AuditView({ item, onComplete }: AuditViewProps) {
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedVerdict, setSelectedVerdict] = useState<Verdict | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [finished, setFinished] = useState(false);

  const current = item.items[index];
  const needsPriority = selectedVerdict === "non-compliant";
  const answered = selectedVerdict !== null && (!needsPriority || selectedPriority !== null);

  const isVerdictCorrect = selectedVerdict === current.correctVerdict;
  const isPriorityCorrect =
    !needsPriority || !current.correctPriority || selectedPriority === current.correctPriority;
  const isFullyCorrect = isVerdictCorrect && isPriorityCorrect;

  const handleVerdict = (verdict: Verdict) => {
    if (selectedVerdict !== null) return;
    setSelectedVerdict(verdict);
  };

  const handlePriority = (priority: Priority) => {
    if (selectedPriority !== null) return;
    setSelectedPriority(priority);
  };

  const handleNext = () => {
    const nextCorrectCount = correctCount + (isFullyCorrect ? 1 : 0);
    setCorrectCount(nextCorrectCount);
    if (index + 1 < item.items.length) {
      setIndex(index + 1);
      setSelectedVerdict(null);
      setSelectedPriority(null);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    const score = Math.round((correctCount / item.items.length) * 100);
    return (
      <div className="space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-from">Revisjon fullført</p>
        <p className="text-5xl font-bold text-accent-from">{score}%</p>
        <p className="text-textMuted">
          {correctCount} av {item.items.length} vurderinger riktige
        </p>
        <div className="flex justify-end">
          <Button onClick={() => onComplete({ scored: true, correct: score >= 70 })}>Neste</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent2">Revisjonssimulator</p>
      <div className="rounded-xl border border-textMuted/10 bg-panel p-3 text-sm text-textMuted">
        {item.siteContext}
      </div>
      <div className="flex items-center justify-between text-xs text-textMuted">
        <span>{current.requirementRef}</span>
        <span>
          {index + 1} / {item.items.length}
        </span>
      </div>
      <p className="text-text">{current.evidenceText}</p>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-textMuted">Vurdering</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(VERDICT_LABELS) as Verdict[]).map((verdict) => {
            const isPicked = selectedVerdict === verdict;
            let style = "border-textMuted/20 hover:border-accent-from/60";
            if (isPicked) style = verdict === current.correctVerdict ? "border-accent-from bg-accent-from/10" : "border-warn bg-warn/10";
            return (
              <button
                key={verdict}
                type="button"
                disabled={selectedVerdict !== null}
                onClick={() => handleVerdict(verdict)}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-medium text-text transition-colors disabled:cursor-default ${style}`}
              >
                {VERDICT_LABELS[verdict]}
              </button>
            );
          })}
        </div>
      </div>

      {needsPriority && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-textMuted">Prioritet</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((priority) => {
              const isPicked = selectedPriority === priority;
              let style = "border-textMuted/20 hover:border-accent-from/60";
              if (isPicked) {
                style =
                  !current.correctPriority || priority === current.correctPriority
                    ? "border-accent-from bg-accent-from/10"
                    : "border-warn bg-warn/10";
              }
              return (
                <button
                  key={priority}
                  type="button"
                  disabled={selectedPriority !== null}
                  onClick={() => handlePriority(priority)}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-medium text-text transition-colors disabled:cursor-default ${style}`}
                >
                  {PRIORITY_LABELS[priority]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {answered && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            isFullyCorrect
              ? "border-accent-from/40 bg-accent-from/5 text-textMuted"
              : "border-warn/40 bg-warn/5 text-textMuted"
          }`}
        >
          <p className={`mb-1 font-semibold ${isFullyCorrect ? "text-accent-from" : "text-warn"}`}>
            {isFullyCorrect ? "Riktig!" : "Nesten — her er hvorfor..."}
          </p>
          {!isVerdictCorrect && <p className="mb-1">Riktig vurdering her er «{VERDICT_LABELS[current.correctVerdict]}».</p>}
          {isVerdictCorrect && !isPriorityCorrect && current.correctPriority && (
            <p className="mb-1">Riktig prioritet her er «{PRIORITY_LABELS[current.correctPriority]}».</p>
          )}
          <p>{current.explanation}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button disabled={!answered} onClick={handleNext}>
          Neste
        </Button>
      </div>
    </div>
  );
}
