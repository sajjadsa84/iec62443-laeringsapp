export interface Point {
  x: number;
  y: number;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function getPathLength(path: Point[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += distance(path[i - 1], path[i]);
  }
  return total;
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  return distance(point, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Korteste avstand fra et punkt til en polylinje — brukt til å avgjøre om en angriper er "på" en gitt conduit. */
export function distanceToPath(point: Point, path: Point[]): number {
  let min = Infinity;
  for (let i = 1; i < path.length; i++) {
    min = Math.min(min, distanceToSegment(point, path[i - 1], path[i]));
  }
  return min;
}

/**
 * Enkel path-følging: ingen A*, angriperen følger et forhåndsdefinert
 * sett med punkter (en polylinje) i rekkefølge. Returnerer null når
 * distansen er lengre enn selve pathen (målet er nådd).
 */
export function getPositionAlongPath(path: Point[], distanceTraveled: number): Point | null {
  if (path.length === 0) return null;
  if (path.length === 1) return distanceTraveled <= 0 ? path[0] : null;

  let remaining = distanceTraveled;
  for (let i = 1; i < path.length; i++) {
    const segmentStart = path[i - 1];
    const segmentEnd = path[i];
    const segmentLength = distance(segmentStart, segmentEnd);

    if (remaining <= segmentLength) {
      const t = segmentLength === 0 ? 0 : remaining / segmentLength;
      return {
        x: segmentStart.x + (segmentEnd.x - segmentStart.x) * t,
        y: segmentStart.y + (segmentEnd.y - segmentStart.y) * t,
      };
    }
    remaining -= segmentLength;
  }

  return null;
}
