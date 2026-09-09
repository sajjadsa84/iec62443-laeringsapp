import { useCallback, useState, type DragEvent } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import type { NetworkExercise } from "../types";
import { PALETTE, PALETTE_BY_TYPE, type ComponentKind } from "../lib/topologyComponents";
import {
  validateTopology,
  type TopologyEdge,
  type TopologyNode,
  type ValidationResult,
} from "../lib/topologyValidator";
import { Button } from "./Button";

export interface TopologyResult {
  scored: true;
  correct: boolean;
}

interface TopologyViewProps {
  item: NetworkExercise;
  onComplete: (result: TopologyResult) => void;
}

interface CanvasNodeData {
  kind: ComponentKind;
  componentType: string;
  label: string;
  level?: number;
  icon: string;
  locked?: boolean;
}

const KIND_STYLES: Record<ComponentKind, string> = {
  zone: "border-accent2 bg-accent2/10",
  protection: "border-accent-from bg-accent-from/10",
  device: "border-textMuted/40 bg-panel",
};

function TopologyNodeComponent({ data }: NodeProps<CanvasNodeData>) {
  return (
    <div
      className={`min-w-[150px] rounded-xl border-2 px-3 py-2 text-center text-xs font-medium text-text shadow-sm ${
        KIND_STYLES[data.kind]
      } ${data.locked ? "border-dashed" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-textMuted" />
      <div className="flex items-center justify-center gap-1.5">
        <span>{data.icon}</span>
        <span>{data.label}</span>
        {data.locked && <span title="Låst node – kan ikke flyttes eller slettes">🔒</span>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-textMuted" />
    </div>
  );
}

const NODE_TYPES: NodeTypes = { component: TopologyNodeComponent };

function buildLockedNodes(exercise: NetworkExercise): Node<CanvasNodeData>[] {
  return (exercise.lockedNodes ?? []).map((locked) => {
    const paletteItem = PALETTE_BY_TYPE[locked.type];
    return {
      id: locked.id,
      type: "component",
      position: locked.position,
      draggable: false,
      deletable: false,
      selectable: true,
      data: {
        kind: paletteItem?.kind ?? "device",
        componentType: locked.type,
        label: locked.label,
        level: paletteItem?.level,
        icon: paletteItem?.icon ?? "❓",
        locked: true,
      },
    };
  });
}

function buildSolutionNodes(exercise: NetworkExercise): Node<CanvasNodeData>[] {
  const locked = buildLockedNodes(exercise);
  const solutionOnly = (exercise.solution?.nodes ?? []).map((solutionNode) => {
    const paletteItem = PALETTE_BY_TYPE[solutionNode.type];
    return {
      id: solutionNode.id,
      type: "component",
      position: solutionNode.position,
      data: {
        kind: paletteItem?.kind ?? "device",
        componentType: solutionNode.type,
        label: paletteItem?.label ?? solutionNode.type,
        level: paletteItem?.level,
        icon: paletteItem?.icon ?? "❓",
      },
    };
  });
  return [...locked, ...solutionOnly];
}

function buildSolutionEdges(exercise: NetworkExercise): Edge[] {
  return (exercise.solution?.edges ?? []).map((solutionEdge, i) => ({
    id: `solution-edge-${i}`,
    source: solutionEdge.source,
    target: solutionEdge.target,
  }));
}

function TopologyCanvas({ item, onComplete }: TopologyViewProps) {
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<CanvasNodeData>(buildLockedNodes(item));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Record<string, never>>([]);
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [ownAttempt, setOwnAttempt] = useState<{ nodes: Node<CanvasNodeData>[]; edges: Edge[] } | null>(null);
  const reactFlowInstance = useReactFlow();

  const showingSolution = ownAttempt !== null;

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const allowed = changes.filter((change) => {
        if (change.type === "remove") {
          const node = nodes.find((n) => n.id === change.id);
          return !node?.data.locked;
        }
        return true;
      });
      onNodesChangeRaw(allowed);
    },
    [nodes, onNodesChangeRaw],
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const componentType = event.dataTransfer.getData("application/topology-component");
      const paletteItem = PALETTE_BY_TYPE[componentType];
      if (!paletteItem) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<CanvasNodeData> = {
        id: `node-${crypto.randomUUID()}`,
        type: "component",
        position,
        data: {
          kind: paletteItem.kind,
          componentType: paletteItem.type,
          label: paletteItem.label,
          level: paletteItem.level,
          icon: paletteItem.icon,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const onPaletteDragStart = (event: DragEvent, componentType: string) => {
    event.dataTransfer.setData("application/topology-component", componentType);
    event.dataTransfer.effectAllowed = "move";
  };

  const runValidation = (nodesToCheck: Node<CanvasNodeData>[], edgesToCheck: Edge[]) => {
    const topologyNodes: TopologyNode[] = nodesToCheck.map((n) => ({ id: n.id, data: n.data }));
    const topologyEdges: TopologyEdge[] = edgesToCheck.map((e) => ({ id: e.id, source: e.source, target: e.target }));
    setResults(validateTopology(topologyNodes, topologyEdges, item.validationRules));
  };

  const handleValidate = () => runValidation(nodes, edges);

  const handleReset = () => {
    setNodes(buildLockedNodes(item));
    setEdges([]);
    setResults(null);
    setOwnAttempt(null);
    setHintsRevealed(0);
  };

  const handleShowHint = () => {
    setHintsRevealed((n) => Math.min(n + 1, item.hints?.length ?? 0));
  };

  const handleShowSolution = () => {
    if (!item.solution) return;
    if (!showingSolution) {
      setOwnAttempt({ nodes, edges });
    }
    const solutionNodes = buildSolutionNodes(item);
    const solutionEdges = buildSolutionEdges(item);
    setNodes(solutionNodes);
    setEdges(solutionEdges);
    runValidation(solutionNodes, solutionEdges);
  };

  const handleBackToOwnAttempt = () => {
    if (!ownAttempt) return;
    setNodes(ownAttempt.nodes);
    setEdges(ownAttempt.edges);
    setOwnAttempt(null);
    setResults(null);
  };

  const allPassed = results !== null && results.every((r) => r.passed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent2">
          Nettverksarkitekt · {item.mode === "greenfield" ? "Greenfield" : "Brownfield"}
        </p>
      </div>
      <h3 className="text-xl font-semibold text-text">{item.title}</h3>
      <div className="rounded-xl border border-accent-from/30 bg-accent-from/5 p-3 text-sm text-textMuted">
        {item.requirementText}
      </div>

      {item.hints && item.hints.length > 0 && (
        <div className="space-y-2 rounded-xl border border-accent2/30 bg-accent2/5 p-3 text-sm text-textMuted">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent2">Tips</p>
            {hintsRevealed < item.hints.length && (
              <button
                type="button"
                onClick={handleShowHint}
                className="text-xs font-semibold text-accent2 underline underline-offset-2"
              >
                {hintsRevealed === 0 ? "Vis tips" : "Vis neste tips"}
              </button>
            )}
          </div>
          {hintsRevealed > 0 && (
            <ol className="list-decimal space-y-1 pl-4">
              {item.hints.slice(0, hintsRevealed).map((hint, i) => (
                <li key={i}>{hint}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {showingSolution && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent2/40 bg-accent2/10 p-3 text-sm text-text">
          <p>Dette viser én mulig løsning — din egen versjon er tatt vare på.</p>
          <Button variant="secondary" onClick={handleBackToOwnAttempt}>
            Tilbake til mitt forsøk
          </Button>
        </div>
      )}

      <div className="flex gap-3">
        <div className="w-48 shrink-0 space-y-3 overflow-y-auto rounded-xl border border-textMuted/10 bg-panel p-3" style={{ maxHeight: 520 }}>
          {PALETTE.map((group) => (
            <div key={group.category}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-textMuted">
                {group.category}
              </p>
              <div className="space-y-1.5">
                {group.items.map((paletteItem) => (
                  <div
                    key={paletteItem.type}
                    draggable
                    onDragStart={(e) => onPaletteDragStart(e, paletteItem.type)}
                    className={`cursor-grab rounded-lg border-2 px-2 py-1.5 text-xs text-text active:cursor-grabbing ${KIND_STYLES[paletteItem.kind]}`}
                  >
                    <span className="mr-1">{paletteItem.icon}</span>
                    {paletteItem.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="flex-1 overflow-hidden rounded-xl border border-textMuted/10"
          style={{ height: 520 }}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>

      {results && (
        <div className="space-y-2">
          {results.map((result, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 text-sm ${
                result.passed
                  ? "border-accent-from/40 bg-accent-from/5 text-textMuted"
                  : "border-warn/40 bg-warn/5 text-textMuted"
              }`}
            >
              <p className={`mb-1 font-semibold ${result.passed ? "text-accent-from" : "text-warn"}`}>
                {result.passed ? "✓ " : "✗ "}
                {result.rule.description}
              </p>
              <p>{result.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        {item.solution && !showingSolution && (
          <Button variant="secondary" onClick={handleShowSolution}>
            Vis løsning
          </Button>
        )}
        <Button variant="secondary" onClick={handleReset}>
          Tilbakestill
        </Button>
        <Button variant="secondary" onClick={handleValidate}>
          Valider
        </Button>
        {results && (
          <Button onClick={() => onComplete({ scored: true, correct: allPassed })}>Neste</Button>
        )}
      </div>
    </div>
  );
}

export function TopologyView(props: TopologyViewProps) {
  return (
    <ReactFlowProvider>
      <TopologyCanvas {...props} />
    </ReactFlowProvider>
  );
}
