import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { MatchingItem } from "../types";
import { Button } from "./Button";

export interface MatchingResult {
  scored: true;
  correct: boolean;
}

interface MatchingViewProps {
  item: MatchingItem;
  onComplete: (result: MatchingResult) => void;
}

type SlotState = "empty" | "filled" | "correct" | "wrong";

function shuffledIndices(length: number, seed: string): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;

  for (let i = indices.length - 1; i > 0; i--) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    const j = hash % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function MatchingView({ item, onComplete }: MatchingViewProps) {
  const definitionOrder = useMemo(
    () => shuffledIndices(item.pairs.length, item.id),
    [item],
  );

  const [assignments, setAssignments] = useState<Record<number, number | null>>(() =>
    Object.fromEntries(item.pairs.map((_, i) => [i, null])),
  );
  const [selectedDefinition, setSelectedDefinition] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const placed = new Set(Object.values(assignments).filter((v): v is number => v !== null));
  const availableDefinitions = definitionOrder.filter((d) => !placed.has(d));
  const allPlaced = Object.values(assignments).every((v) => v !== null);
  const allCorrect = Object.entries(assignments).every(
    ([termIndex, defIndex]) => Number(termIndex) === defIndex,
  );

  function assign(termIndex: number, definitionIndex: number) {
    if (checked) return;
    setAssignments((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[Number(key)] === definitionIndex) next[Number(key)] = null;
      }
      next[termIndex] = definitionIndex;
      return next;
    });
    setSelectedDefinition(null);
  }

  function clearSlot(termIndex: number) {
    if (checked) return;
    setAssignments((prev) => ({ ...prev, [termIndex]: null }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const definitionIndex = Number(active.id.toString().replace("def-", ""));
    const termIndex = Number(over.id.toString().replace("term-", ""));
    assign(termIndex, definitionIndex);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent2">Kobling</p>
      <h3 className="text-xl font-semibold text-text">{item.instruction}</h3>
      <p className="text-sm text-textMuted">
        Dra en definisjon til riktig begrep, eller trykk en definisjon og deretter et begrep.
      </p>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="space-y-3">
          {item.pairs.map((pair, termIndex) => {
            const defIndex = assignments[termIndex];
            const isCorrect = checked && defIndex === termIndex;
            const isWrong = checked && defIndex !== null && defIndex !== termIndex;
            const state: SlotState = checked
              ? isCorrect
                ? "correct"
                : isWrong
                  ? "wrong"
                  : "empty"
              : defIndex !== null
                ? "filled"
                : "empty";

            return (
              <div key={termIndex} className="space-y-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="rounded-xl border border-textMuted/20 bg-panel p-3 text-sm font-semibold text-text sm:w-52 sm:shrink-0">
                    {pair.term}
                  </div>
                  <DropSlot
                    termIndex={termIndex}
                    label={defIndex !== null ? item.pairs[defIndex].definition : null}
                    state={state}
                    onClick={() => {
                      if (checked) return;
                      if (defIndex !== null) {
                        clearSlot(termIndex);
                        return;
                      }
                      if (selectedDefinition !== null) assign(termIndex, selectedDefinition);
                    }}
                  />
                </div>
                {isWrong && (
                  <p className="pl-1 text-xs text-accent2">Riktig svar: {pair.definition}</p>
                )}
              </div>
            );
          })}
        </div>

        {availableDefinitions.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-textMuted/10 pt-4">
            {availableDefinitions.map((defIndex) => (
              <DraggableChip
                key={defIndex}
                id={defIndex}
                label={item.pairs[defIndex].definition}
                selected={selectedDefinition === defIndex}
                onClick={() =>
                  setSelectedDefinition((cur) => (cur === defIndex ? null : defIndex))
                }
              />
            ))}
          </div>
        )}
      </DndContext>

      <div className="flex justify-end gap-3">
        {!checked ? (
          <Button disabled={!allPlaced} onClick={() => setChecked(true)}>
            Sjekk svar
          </Button>
        ) : (
          <Button onClick={() => onComplete({ scored: true, correct: allCorrect })}>Neste</Button>
        )}
      </div>
    </div>
  );
}

function DropSlot({
  termIndex,
  label,
  state,
  onClick,
}: {
  termIndex: number;
  label: string | null;
  state: SlotState;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `term-${termIndex}` });
  const styles: Record<SlotState, string> = {
    empty: "border-dashed border-textMuted/30 text-textMuted",
    filled: "border-accent2/50 bg-accent2/10 text-text",
    correct: "border-accent-from bg-accent-from/10 text-text",
    wrong: "border-warn bg-warn/10 text-text",
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onClick}
      className={`w-full flex-1 rounded-xl border p-3 text-left text-sm transition-colors ${styles[state]} ${
        isOver ? "ring-2 ring-accent-from" : ""
      }`}
    >
      {label ?? "Slipp eller trykk en definisjon her"}
    </button>
  );
}

function DraggableChip({
  id,
  label,
  selected,
  onClick,
}: {
  id: number;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `def-${id}`,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...listeners}
      {...attributes}
      className={`touch-none rounded-xl border bg-panel px-3 py-2 text-left text-sm text-text transition-colors ${
        selected ? "border-accent-from shadow-glowSm" : "border-textMuted/20"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      {label}
    </button>
  );
}
