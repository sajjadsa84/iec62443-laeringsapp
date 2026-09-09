import { useMemo, useState } from "react";
import type { BranchingScenario } from "../types";
import { Button } from "./Button";

export interface BranchingResult {
  scored: true;
  correct: boolean;
}

interface BranchingScenarioViewProps {
  item: BranchingScenario;
  onComplete: (result: BranchingResult) => void;
}

function computeMaxScore(
  nodes: BranchingScenario["nodes"],
  nodeId: string,
  memo: Map<string, number>,
): number {
  if (memo.has(nodeId)) return memo.get(nodeId)!;
  const node = nodes[nodeId];
  if (!node || node.choices.length === 0) {
    memo.set(nodeId, 0);
    return 0;
  }
  const best = Math.max(
    ...node.choices.map((choice) => choice.scoreImpact + computeMaxScore(nodes, choice.nextNodeId, memo)),
  );
  memo.set(nodeId, best);
  return best;
}

export function BranchingScenarioView({ item, onComplete }: BranchingScenarioViewProps) {
  const [currentNodeId, setCurrentNodeId] = useState(item.startNodeId);
  const [scoreTotal, setScoreTotal] = useState(0);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);

  const maxScore = useMemo(() => computeMaxScore(item.nodes, item.startNodeId, new Map()), [item]);
  const currentNode = item.nodes[currentNodeId];

  if (!currentNode) {
    return <p className="text-warn">Fant ikke scenario-steget «{currentNodeId}».</p>;
  }

  const chosen = selectedChoiceIndex !== null ? currentNode.choices[selectedChoiceIndex] : null;

  const handleContinue = () => {
    if (!chosen) return;
    setScoreTotal((s) => s + chosen.scoreImpact);
    setCurrentNodeId(chosen.nextNodeId);
    setSelectedChoiceIndex(null);
  };

  if (currentNode.isEnding) {
    const passThreshold = Math.ceil(maxScore * 0.6);
    const passed = scoreTotal >= passThreshold;

    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-warn">Hendelsesrespons</p>
        <h3 className="text-xl font-semibold text-text">{item.title}</h3>
        <p className="text-text">{currentNode.narrativeText}</p>
        <div className="rounded-xl border border-accent-from/30 bg-accent-from/5 p-4 text-sm text-textMuted">
          <p className="mb-1 font-semibold text-accent-from">Oppsummering</p>
          <p>{currentNode.endingSummary}</p>
        </div>
        <div className="rounded-xl border border-textMuted/10 bg-panel p-4 text-sm text-textMuted">
          <p>
            Din poengsum: <span className="font-semibold text-text">{scoreTotal}</span>
          </p>
          <p>
            Beste mulige vei: <span className="font-semibold text-text">{maxScore}</span>
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onComplete({ scored: true, correct: passed })}>Fullfør</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-warn">Hendelsesrespons</p>
      <h3 className="text-xl font-semibold text-text">{item.title}</h3>
      <p className="text-text">{currentNode.narrativeText}</p>

      <div className="space-y-2">
        {currentNode.choices.map((choice, i) => {
          const isPicked = i === selectedChoiceIndex;
          return (
            <button
              key={i}
              type="button"
              disabled={selectedChoiceIndex !== null}
              onClick={() => setSelectedChoiceIndex(i)}
              className={`w-full rounded-2xl border bg-panel p-3 text-left text-text transition-colors disabled:cursor-default ${
                isPicked ? "border-accent-from bg-accent-from/10" : "border-textMuted/20 hover:border-accent-from/60"
              }`}
            >
              {choice.text}
            </button>
          );
        })}
      </div>

      {chosen && (
        <div className="rounded-2xl border border-accent2/40 bg-accent2/5 p-4 text-sm text-textMuted">
          <p>{chosen.consequenceNote}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button disabled={!chosen} onClick={handleContinue}>
          Fortsett
        </Button>
      </div>
    </div>
  );
}
