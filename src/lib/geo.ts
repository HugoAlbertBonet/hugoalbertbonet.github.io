// World map geometry, computed at build time so the page ships plain SVG (no map code in the browser).
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import land110m from 'world-atlas/land-110m.json';

/** SVG coordinate space: the whole world is 1000 × 500 (x = longitude, y = latitude, equirectangular). */
export interface View {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Map box shape (width / height), matching the layout. Tall enough that the view isn't a thin strip. */
export const ASPECT = 1.6;

/**
 * The smallest box of the given shape that contains every point plus some margin, so the map is as
 * zoomed in as it can be while all pins stay visible. Never wider than the world.
 */
export function fitView(points: { lon: number; lat: number }[], margin = 60): View {
  const pts = points.map((p) => project(p.lon, p.lat));
  const minX = Math.min(...pts.map((p) => p.x)) - margin;
  const maxX = Math.max(...pts.map((p) => p.x)) + margin;
  const minY = Math.min(...pts.map((p) => p.y)) - margin;
  const maxY = Math.max(...pts.map((p) => p.y)) + margin;
  const width = Math.min(1000, Math.max(maxX - minX, (maxY - minY) * ASPECT));
  const height = width / ASPECT;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const x = Math.min(Math.max(cx - width / 2, 0), 1000 - width);
  const y = Math.min(Math.max(cy - height / 2, 0), 500 - height);
  return { x, y, width, height };
}

const projection = geoEquirectangular()
  .scale(1000 / (2 * Math.PI))
  .translate([500, 250]);

const topology = land110m as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);

/** SVG path of all land. */
export const landPath = geoPath(projection).digits(1)(land) ?? '';

/** Project a place into SVG coordinates. */
export function project(lon: number, lat: number): { x: number; y: number } {
  const [x, y] = projection([lon, lat]) ?? [0, 0];
  return { x, y };
}

/** Position as percentages of the visible map box, for HTML pins laid over the SVG. */
export function toPercent({ x, y }: { x: number; y: number }, view: View): { left: string; top: string } {
  return {
    left: `${(((x - view.x) / view.width) * 100).toFixed(2)}%`,
    top: `${(((y - view.y) / view.height) * 100).toFixed(2)}%`,
  };
}

/**
 * Pin positions for places, nudged apart where they would overlap (e.g. two cities in the same region),
 * so each stays clickable. `minGap` is a share of the visible map width (0.024 ≈ 18px on desktop).
 */
export function spreadPins(points: { lon: number; lat: number }[], view: View, gapShare = 0.024): { x: number; y: number }[] {
  const minGap = view.width * gapShare;
  const pts = points.map((p) => project(p.lon, p.lat));
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        let dx = pts[j].x - pts[i].x;
        let dy = pts[j].y - pts[i].y;
        let d = Math.hypot(dx, dy);
        if (d >= minGap) continue;
        if (d < 0.01) {
          // Same spot: separate side by side.
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (minGap - d) / 2;
        pts[i].x -= (dx / d) * push;
        pts[i].y -= (dy / d) * push;
        pts[j].x += (dx / d) * push;
        pts[j].y += (dy / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return pts;
}

/** Dashed arc between two places: a quadratic curve bowed upwards, longer trips bow more. */
export function arcPath(from: [number, number], to: [number, number]): string {
  const a = project(...from);
  const b = project(...to);
  const mx = (a.x + b.x) / 2;
  const my = Math.min(a.y, b.y) - Math.abs(b.x - a.x) * 0.18 - 10;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}
