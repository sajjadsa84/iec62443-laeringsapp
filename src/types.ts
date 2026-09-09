export interface QuizItem {
  type: "quiz";
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ScenarioChoice {
  text: string;
  consequence: string;
  correct: boolean;
}

export interface ScenarioItem {
  type: "scenario";
  id: string;
  prompt: string;
  choices: ScenarioChoice[];
}

export interface CaseItem {
  type: "case";
  id: string;
  description: string;
  relatedRequirement: string;
  question: string;
}

export interface MatchingPair {
  term: string;
  definition: string;
}

export interface MatchingItem {
  type: "matching";
  id: string;
  instruction: string;
  pairs: MatchingPair[];
}

export interface TopologyPosition {
  x: number;
  y: number;
}

export interface LockedNode {
  id: string;
  type: string;
  label: string;
  position: TopologyPosition;
}

export interface ValidationRule {
  description: string;
  check: string;
}

export interface SolutionNode {
  id: string;
  type: string;
  position: TopologyPosition;
}

export interface SolutionEdge {
  source: string;
  target: string;
}

export interface NetworkExerciseSolution {
  nodes: SolutionNode[];
  edges: SolutionEdge[];
}

export interface NetworkExercise {
  type: "topology";
  id: string;
  mode: "greenfield" | "brownfield";
  title: string;
  requirementText: string;
  lockedNodes?: LockedNode[];
  validationRules: ValidationRule[];
  hints?: string[];
  solution?: NetworkExerciseSolution;
}

export interface AuditChecklistItem {
  id: string;
  requirementRef: string;
  evidenceText: string;
  correctVerdict: "compliant" | "non-compliant" | "partial";
  correctPriority?: "high" | "medium" | "low";
  explanation: string;
}

export interface AuditExercise {
  type: "audit";
  id: string;
  siteContext: string;
  items: AuditChecklistItem[];
}

export interface RiskScenario {
  type: "risk-calculator";
  id: string;
  description: string;
  correctLikelihood: number;
  correctImpact: number;
  correctSLTarget: string;
  explanation: string;
}

export interface BranchChoice {
  text: string;
  nextNodeId: string;
  consequenceNote: string;
  scoreImpact: number;
}

export interface BranchNode {
  id: string;
  narrativeText: string;
  choices: BranchChoice[];
  isEnding?: boolean;
  endingSummary?: string;
}

export interface BranchingScenario {
  type: "branching";
  id: string;
  title: string;
  startNodeId: string;
  nodes: Record<string, BranchNode>;
}

export type ContentItem =
  | QuizItem
  | ScenarioItem
  | CaseItem
  | MatchingItem
  | NetworkExercise
  | AuditExercise
  | RiskScenario
  | BranchingScenario;

export interface LearningModule {
  moduleId: string;
  title: string;
  items: ContentItem[];
}

export interface UserProgress {
  completedModuleIds: string[];
  scoresByModuleId: Record<string, number>;
  currentModuleId: string | null;
}
