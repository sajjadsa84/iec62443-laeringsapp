import type { ContentItem } from "../types";
import { Button } from "./Button";
import { QuizView } from "./QuizView";
import { ScenarioView } from "./ScenarioView";
import { MatchingView } from "./MatchingView";
import { TopologyView } from "./TopologyView";
import { AuditView } from "./AuditView";
import { RiskCalculator } from "./RiskCalculator";
import { BranchingScenarioView } from "./BranchingScenarioView";

export interface ContentItemResult {
  scored: boolean;
  correct: boolean;
}

interface ContentItemViewProps {
  item: ContentItem;
  onComplete: (result: ContentItemResult) => void;
}

export function ContentItemView({ item, onComplete }: ContentItemViewProps) {
  if (item.type === "quiz") return <QuizView item={item} onComplete={onComplete} />;
  if (item.type === "scenario") return <ScenarioView item={item} onComplete={onComplete} />;
  if (item.type === "matching") return <MatchingView item={item} onComplete={onComplete} />;
  if (item.type === "topology") return <TopologyView item={item} onComplete={onComplete} />;
  if (item.type === "audit") return <AuditView item={item} onComplete={onComplete} />;
  if (item.type === "risk-calculator") return <RiskCalculator item={item} onComplete={onComplete} />;
  if (item.type === "branching") return <BranchingScenarioView item={item} onComplete={onComplete} />;
  return <CaseView item={item} onComplete={onComplete} />;
}

function CaseView({
  item,
  onComplete,
}: {
  item: Extract<ContentItem, { type: "case" }>;
  onComplete: (result: ContentItemResult) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-warn">Case</p>
      <p className="text-text">{item.description}</p>
      <span className="inline-block rounded-full bg-panel border border-textMuted/20 px-3 py-1 text-xs text-textMuted">
        {item.relatedRequirement}
      </span>
      <h3 className="text-lg font-semibold text-text">{item.question}</h3>
      <div className="flex justify-end">
        <Button onClick={() => onComplete({ scored: false, correct: false })}>Neste</Button>
      </div>
    </div>
  );
}
