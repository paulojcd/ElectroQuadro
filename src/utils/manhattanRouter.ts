/**
 * Manhattan / Orthogonal Wire Routing Engine for Electrical Enclosures
 * 
 * Complies with industrial electrical panel wiring practices:
 * - Strictly orthogonal segments (horizontal and vertical only: dx === 0 || dy === 0)
 * - Intelligent lane / track allocation inside horizontal and vertical wire ducts (canaletas)
 * - Prevents wire overlap by assigning discrete staggered parallel channels
 * - Smooth corner fillets (rounded 90° bends with customizable radius)
 * - Computes exact physical wire routing length (in mm) including terminal slack
 */

export interface Point {
  x: number;
  y: number;
}

export interface ManhattanRouteOptions {
  // Origin terminal
  x1: number;
  y1: number;
  fromIsTop: boolean;
  fromRailIdx: number;
  fromRailY: number;

  // Destination terminal
  x2: number;
  y2: number;
  toIsTop: boolean;
  toRailIdx: number;
  toRailY: number;

  // Enclosure geometry
  cabWidth: number;
  cabHeight: number;
  sideDuctWidth: number;
  horizontalDuctHeight: number;

  // Multi-wire track separation index
  wireIndex: number;
  totalWires?: number;

  // Fillet radius in mm (0 for sharp 90°, 4-6mm recommended for CAD look)
  cornerRadius?: number;

  // Terminal connection strip slack in mm added to physical length calculation
  terminalSlackMm?: number;
}

export interface ManhattanRouteResult {
  pathData: string;
  points: Point[];
  totalLengthMm: number;
  midX: number;
  midY: number;
  wireChannel: {
    fromHorizontalY: number;
    toHorizontalY: number;
    verticalX: number | null;
  };
}

/**
 * Generates an SVG path with smooth circular/quadratic corner fillets between
 * orthogonal points.
 */
export function buildFilletedPath(points: Point[], radius: number = 5): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2 || radius <= 0) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  // Simplify collinear sequential points
  const cleanPts: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleanPts[cleanPts.length - 1];
    const curr = points[i];
    const next = i < points.length - 1 ? points[i + 1] : null;

    // Skip point if it's virtually identical to previous
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) < 0.5) continue;

    // If prev, curr, and next are strictly collinear, skip curr
    if (next) {
      const isHorizontalCollinear = Math.abs(prev.y - curr.y) < 0.1 && Math.abs(curr.y - next.y) < 0.1;
      const isVerticalCollinear = Math.abs(prev.x - curr.x) < 0.1 && Math.abs(curr.x - next.x) < 0.1;
      if (isHorizontalCollinear || isVerticalCollinear) continue;
    }

    cleanPts.push(curr);
  }

  if (cleanPts.length <= 2) {
    return cleanPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  let d = `M ${cleanPts[0].x} ${cleanPts[0].y}`;

  for (let i = 1; i < cleanPts.length - 1; i++) {
    const pPrev = cleanPts[i - 1];
    const pCurr = cleanPts[i];
    const pNext = cleanPts[i + 1];

    const v1 = { x: pCurr.x - pPrev.x, y: pCurr.y - pPrev.y };
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);

    if (len1 < 0.5 || len2 < 0.5) {
      d += ` L ${pCurr.x} ${pCurr.y}`;
      continue;
    }

    // Limit radius so it never exceeds half the shortest adjacent segment
    const r = Math.min(radius, len1 / 2, len2 / 2);

    // Vector units
    const u1 = { x: v1.x / len1, y: v1.y / len1 };
    const u2 = { x: v2.x / len2, y: v2.y / len2 };

    // Start point of fillet curve
    const startX = pCurr.x - u1.x * r;
    const startY = pCurr.y - u1.y * r;

    // End point of fillet curve
    const endX = pCurr.x + u2.x * r;
    const endY = pCurr.y + u2.y * r;

    // Line to fillet start
    d += ` L ${startX.toFixed(1)} ${startY.toFixed(1)}`;

    // Quadratic Bézier curve through corner control point
    d += ` Q ${pCurr.x.toFixed(1)} ${pCurr.y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  // Final line to target endpoint
  const last = cleanPts[cleanPts.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

  return d;
}

/**
 * Calculates total physical length of an orthogonal polyline in mm.
 */
export function calculatePolylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return total;
}

/**
 * Core Manhattan Routing Algorithm with Duct Channel Allocation
 */
export function routeManhattanWire(options: ManhattanRouteOptions): ManhattanRouteResult {
  const {
    x1,
    y1,
    fromIsTop,
    fromRailIdx,
    fromRailY,
    x2,
    y2,
    toIsTop,
    toRailIdx,
    toRailY,
    cabWidth,
    sideDuctWidth,
    wireIndex,
    cornerRadius = 5,
    terminalSlackMm = 100, // 50mm ferrule/stripping slack at each end
  } = options;

  // 1. Determine discrete horizontal lanes to avoid overlap inside ducts.
  // We use 11 distinct staggered tracks spaced by 2.6 mm within the horizontal duct corridor.
  // Prime number step ensures smooth non-colliding cyclic distribution.
  const numHorizontalLanes = 11;
  const hLaneIndex1 = ((wireIndex * 7) % numHorizontalLanes) - Math.floor(numHorizontalLanes / 2);
  const hLaneIndex2 = (((wireIndex + 3) * 7) % numHorizontalLanes) - Math.floor(numHorizontalLanes / 2);

  const hOffset1 = hLaneIndex1 * 2.5;
  const hOffset2 = hLaneIndex2 * 2.5;

  // Horizontal duct centerline Y positions relative to rail:
  // Top duct center: railY - 18
  // Bottom duct center: railY + 118
  const hDuctY1 = fromIsTop ? fromRailY - 18 + hOffset1 : fromRailY + 118 + hOffset1;
  const hDuctY2 = toIsTop ? toRailY - 18 + hOffset2 : toRailY + 118 + hOffset2;

  const points: Point[] = [];
  let midX = (x1 + x2) / 2;
  let midY = (y1 + y2) / 2;
  let verticalX: number | null = null;

  // -------------------------------------------------------------
  // CASE A: Direct Intra-Rail Connection (Same DIN rail and same duct side)
  // -------------------------------------------------------------
  if (fromRailIdx === toRailIdx && fromIsTop === toIsTop) {
    // Both escape into the same horizontal duct lane and travel directly across
    points.push({ x: x1, y: y1 });
    points.push({ x: x1, y: hDuctY1 });
    points.push({ x: x2, y: hDuctY1 });
    points.push({ x: x2, y: y2 });

    midX = (x1 + x2) / 2;
    midY = hDuctY1;
    verticalX = null;
  }
  // -------------------------------------------------------------
  // CASE B: Vertical Trunking Corridor (Different rails or cross-rail wrap)
  // -------------------------------------------------------------
  else {
    // Decide whether to route via Left vertical duct or Right vertical duct
    const avgX = (x1 + x2) / 2;
    const cabinetCenterX = cabWidth / 2;
    const useLeftDuct = avgX <= cabinetCenterX;

    // 13 staggered vertical tracks spaced by 2.4 mm inside vertical duct
    const numVerticalLanes = 13;
    const vLaneIndex = ((wireIndex * 5) % numVerticalLanes) - Math.floor(numVerticalLanes / 2);
    const vOffset = vLaneIndex * 2.4;

    const leftDuctCenterX = 24 + sideDuctWidth / 2;
    const rightDuctCenterX = cabWidth - 24 - sideDuctWidth / 2;

    const sDuctX = useLeftDuct
      ? Math.round((leftDuctCenterX + vOffset) * 10) / 10
      : Math.round((rightDuctCenterX + vOffset) * 10) / 10;

    verticalX = sDuctX;

    // Strictly orthogonal 5-point Manhattan route:
    // P0: (x1, y1) -> Start pin
    // P1: (x1, hDuctY1) -> Escape into from-duct
    // P2: (sDuctX, hDuctY1) -> Turn into vertical trunking
    // P3: (sDuctX, hDuctY2) -> Travel vertically to destination duct level
    // P4: (x2, hDuctY2) -> Travel horizontally to destination X
    // P5: (x2, y2) -> Enter destination pin
    points.push({ x: x1, y: y1 });
    points.push({ x: x1, y: hDuctY1 });
    points.push({ x: sDuctX, y: hDuctY1 });
    points.push({ x: sDuctX, y: hDuctY2 });
    points.push({ x: x2, y: hDuctY2 });
    points.push({ x: x2, y: y2 });

    midX = sDuctX;
    midY = (hDuctY1 + hDuctY2) / 2;
  }

  // Calculate physical length
  const routedSegmentsMm = calculatePolylineLength(points);
  const totalLengthMm = Math.round(routedSegmentsMm + terminalSlackMm);

  // Generate SVG path string with fillets
  const pathData = buildFilletedPath(points, cornerRadius);

  return {
    pathData,
    points,
    totalLengthMm,
    midX,
    midY,
    wireChannel: {
      fromHorizontalY: hDuctY1,
      toHorizontalY: hDuctY2,
      verticalX,
    },
  };
}
