import type { Point } from "./pathfinding";

export interface TopologyGraph {
  nodes: Record<string, Point>;
  /** Grunnstruktur (topp-ned) — brukes sammen med ringEdges for faktisk stifinning. */
  edges: string[][];
  /** Ekstra, tovegs redundante lenker (ringer) — samme node kan nås via flere ruter. */
  ringEdges?: string[][];
}

/** Rette-vinkel-rute mellom to noder: ned/opp til barnets høyde, så sidelengs. Delt mellom angriper-stier og conduit-tegning. */
export function buildEdgeRoute(from: Point, to: Point): Point[] {
  if (from.x === to.x || from.y === to.y) return [from, to];
  return [from, { x: from.x, y: to.y }, to];
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export type EdgeCostFn = (fromId: string, toId: string, distancePx: number) => number;

/**
 * Bygger en tovegs (udirigert) naboliste av hele grafen — vanlige "tre"-kanter
 * pluss eventuelle ring-kanter. En ring gir angriperen faktisk flere mulige
 * ruter til samme mål: kutter man én lenke (eller forsvarer den tungt), går
 * trafikken andre veien i stedet — akkurat som redundans i et ekte nett (FR7).
 */
function buildAdjacency(graph: TopologyGraph): Map<string, { to: string; dist: number }[]> {
  const adjacency = new Map<string, { to: string; dist: number }[]>();
  const add = (a: string, b: string) => {
    const pa = graph.nodes[a];
    const pb = graph.nodes[b];
    if (!pa || !pb) return;
    const dist = distance(pa, pb);
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a)!.push({ to: b, dist });
  };
  for (const [a, b] of graph.edges) {
    add(a, b);
    add(b, a);
  }
  for (const [a, b] of graph.ringEdges ?? []) {
    add(a, b);
    add(b, a);
  }
  return adjacency;
}

/**
 * Finner den billigste ruten fra et startpunkt til det NÆRMESTE/MINST
 * FORSVARTE av flere mulige mål (Dijkstra over hele grafen samtidig).
 * `edgeCost` lar den kalte parten legge på en "straff" for kanter/noder som
 * har et aktivt forsvar — slik velger angriperen faktisk korteste ELLER
 * minst forsvarte rute, ikke bare geografisk korteste.
 */
export function buildDefenseAwarePath(
  startNodeId: string,
  graph: TopologyGraph,
  targetNodeIds: string[],
  edgeCost: EdgeCostFn,
): Point[] {
  const adjacency = buildAdjacency(graph);
  const nodeIds = Object.keys(graph.nodes);

  const dist = new Map<string, number>([[startNodeId, 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  for (let i = 0; i < nodeIds.length; i++) {
    let current: string | null = null;
    let currentCost = Infinity;
    for (const id of nodeIds) {
      if (visited.has(id)) continue;
      const cost = dist.get(id) ?? Infinity;
      if (cost < currentCost) {
        currentCost = cost;
        current = id;
      }
    }
    if (current === null) break;
    visited.add(current);

    for (const { to, dist: edgeDist } of adjacency.get(current) ?? []) {
      if (visited.has(to)) continue;
      const stepCost = edgeCost(current, to, edgeDist);
      const candidate = currentCost + stepCost;
      if (candidate < (dist.get(to) ?? Infinity)) {
        dist.set(to, candidate);
        prev.set(to, current);
      }
    }
  }

  let bestTarget: string | null = null;
  let bestCost = Infinity;
  for (const targetId of targetNodeIds) {
    const cost = dist.get(targetId);
    if (cost !== undefined && cost < bestCost) {
      bestCost = cost;
      bestTarget = targetId;
    }
  }
  if (bestTarget === null) return [graph.nodes[startNodeId]];

  const nodePath: string[] = [bestTarget];
  let cursor = bestTarget;
  while (cursor !== startNodeId) {
    const parent = prev.get(cursor);
    if (!parent) break;
    nodePath.unshift(parent);
    cursor = parent;
  }

  const waypoints: Point[] = [graph.nodes[nodePath[0]]];
  for (let i = 1; i < nodePath.length; i++) {
    waypoints.push(...buildEdgeRoute(graph.nodes[nodePath[i - 1]], graph.nodes[nodePath[i]]).slice(1));
  }
  return waypoints;
}
