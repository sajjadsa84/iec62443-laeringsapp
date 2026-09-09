import type { ValidationRule } from "../types";
import { LOCKED_NODE_PROTECTION_TYPES } from "./topologyComponents";
import type { ComponentKind } from "./topologyComponents";

export interface TopologyNodeData {
  kind: ComponentKind;
  componentType: string;
  label: string;
  level?: number;
  locked?: boolean;
}

export interface TopologyNode {
  id: string;
  data: TopologyNodeData;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
}

export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
  message: string;
}

type CheckOutcome = { passed: boolean; message: string };

function buildAdjacency(nodes: TopologyNode[], edges: TopologyEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });
  return adjacency;
}

function indexById(nodes: TopologyNode[]): Map<string, TopologyNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

/** Enkel BFS som finner én vei (korteste, usortert) mellom to noder i grafen. */
function findPath(adjacency: Map<string, string[]>, startId: string, endId: string): string[] | null {
  if (startId === endId) return [startId];
  const visited = new Set([startId]);
  const queue: string[][] = [[startId]];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (const neighborId of adjacency.get(last) ?? []) {
      if (visited.has(neighborId)) continue;
      const nextPath = [...path, neighborId];
      if (neighborId === endId) return nextPath;
      visited.add(neighborId);
      queue.push(nextPath);
    }
  }
  return null;
}

function checkNoDirectEnterpriseToCell(nodes: TopologyNode[], edges: TopologyEdge[]): CheckOutcome {
  const byId = indexById(nodes);
  const adjacency = buildAdjacency(nodes, edges);

  const enterpriseZones = nodes.filter((n) => n.data.componentType === "enterprise-zone");
  const cellZones = nodes.filter((n) => n.data.componentType === "cell-zone");

  for (const enterprise of enterpriseZones) {
    for (const cell of cellZones) {
      const path = findPath(adjacency, enterprise.id, cell.id);
      if (!path) continue;

      if (path.length === 2) {
        return {
          passed: false,
          message: `Nesten — ${enterprise.data.label} og ${cell.data.label} er koblet direkte sammen, uten DMZ eller brannmur mellom. Legg inn en DMZ-sone med en brannmur på veien mellom dem.`,
        };
      }

      const intermediateNodes = path.slice(1, -1).map((id) => byId.get(id)!);
      const hasDmz = intermediateNodes.some((n) => n.data.componentType === "dmz-zone");
      const hasFirewall = intermediateNodes.some((n) => n.data.componentType === "firewall");

      if (!hasDmz || !hasFirewall) {
        const missing = !hasDmz && !hasFirewall ? "en DMZ-sone og en brannmur" : !hasDmz ? "en DMZ-sone" : "en brannmur";
        return {
          passed: false,
          message: `Nesten — veien fra ${enterprise.data.label} til ${cell.data.label} mangler ${missing}. Sørg for at trafikk mellom disse to sonene går via DMZ og en brannmur.`,
        };
      }
    }
  }

  return { passed: true, message: "Ingen direkte, usikret vei mellom Enterprise-sonen og Cellesonen." };
}

function checkLockedNodesProtected(nodes: TopologyNode[], edges: TopologyEdge[]): CheckOutcome {
  const byId = indexById(nodes);
  const adjacency = buildAdjacency(nodes, edges);
  const lockedNodes = nodes.filter((n) => n.data.locked);

  for (const locked of lockedNodes) {
    const visited = new Set([locked.id]);
    let frontier = [locked.id];
    let protectedNearby = false;

    for (let depth = 0; depth < 2 && !protectedNearby; depth++) {
      const nextFrontier: string[] = [];
      for (const currentId of frontier) {
        for (const neighborId of adjacency.get(currentId) ?? []) {
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);
          const neighbor = byId.get(neighborId)!;
          if (neighbor.data.kind === "protection" && LOCKED_NODE_PROTECTION_TYPES.includes(neighbor.data.componentType)) {
            protectedNearby = true;
            break;
          }
          nextFrontier.push(neighborId);
        }
        if (protectedNearby) break;
      }
      frontier = nextFrontier;
    }

    if (!protectedNearby) {
      return {
        passed: false,
        message: `Nesten — "${locked.data.label}" har ingen beskyttelseskomponent (brannmur, IDS/IPS eller data-diode) i nærheten. Koble en av disse til enheten eller på veien inn til den.`,
      };
    }
  }

  return { passed: true, message: "Alle låste enheter har minst én beskyttelseskomponent i nærheten." };
}

function checkCrossZoneEdgesNeedFirewall(nodes: TopologyNode[], edges: TopologyEdge[]): CheckOutcome {
  const byId = indexById(nodes);

  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    if (source.data.kind !== "zone" || target.data.kind !== "zone") continue;

    const sourceLevel = source.data.level ?? 0;
    const targetLevel = target.data.level ?? 0;

    if (sourceLevel !== targetLevel) {
      return {
        passed: false,
        message: `Nesten — ${source.data.label} og ${target.data.label} er koblet direkte sammen uten en brannmur mellom. Sett inn en brannmur-node på denne forbindelsen i stedet for en direkte kant.`,
      };
    }
  }

  return { passed: true, message: "Alle forbindelser mellom soner på ulikt nivå går via en brannmur." };
}

const CHECKS: Record<string, (nodes: TopologyNode[], edges: TopologyEdge[]) => CheckOutcome> = {
  "no-direct-enterprise-to-cell": checkNoDirectEnterpriseToCell,
  "locked-nodes-protected": checkLockedNodesProtected,
  "cross-zone-edges-need-firewall": checkCrossZoneEdgesNeedFirewall,
};

export function validateTopology(
  nodes: TopologyNode[],
  edges: TopologyEdge[],
  rules: ValidationRule[],
): ValidationResult[] {
  return rules.map((rule) => {
    const checkFn = CHECKS[rule.check];
    if (!checkFn) {
      return { rule, passed: false, message: `Ukjent valideringsregel: "${rule.check}"` };
    }
    const { passed, message } = checkFn(nodes, edges);
    return { rule, passed, message };
  });
}
