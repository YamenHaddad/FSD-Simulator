import { useEffect, useRef } from 'react';
import { GameState, CarData } from './types';
import { LANES } from './constants';

interface Canvas2DSceneProps {
  gameState: GameState;
  npcCars: CarData[];
  playerLane: number;
  onTick: (delta: number) => void;
}

const ROAD_HALF_W = 8;
const NUM_LANES = LANES.length;

// ─── Projection helpers ───────────────────────────────────────────────────────

/** Project world (wx, wz) → screen (sx, sy, scale).
 *  wz = 0 is at the player; wz = FAR_Z is the horizon.
 *  Returns screenScale ∈ [0,1] which drives perspective sizing. */
function toScreen(
  wx: number, wz: number,
  W: number, H: number,
  horizonY: number
): [number, number, number] {
  const FAR_Z = -120;
  const PLAYER_SCREEN_Y = H * 0.78;

  if (wz < FAR_Z - 10) return [-9999, -9999, 0];

  const t = (wz - FAR_Z) / (0 - FAR_Z);
  const clampedT = Math.max(0, Math.min(1, t));

  // Cubic easing for natural perspective foreshortening
  const sy = horizonY + (PLAYER_SCREEN_Y - horizonY) * (clampedT * clampedT * clampedT);
  const depth = Math.max(0.5, -wz + 1);
  const scale = (W * 0.32) / depth;
  const sx = W / 2 + wx * scale;
  const screenScale = Math.min(1.5, clampedT * clampedT * 2);

  return [sx, sy, screenScale];
}

/** Horizon vanishing-point x for a given world x. */
function horizonX(wx: number, W: number): number {
  return W / 2 + wx * 0.5;
}

// ─── Main scene draw ──────────────────────────────────────────────────────────

function drawScene(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  roadOffset: number,
  laneOffset: number,        // smoothly animated world-x of player
  fsdEnabled: boolean,
  npcCars: CarData[],
  speed: number,
  time: number,
  confidence: number,
  nearMiss: boolean,
  crashed: boolean
) {
  // Speed-based horizon rise creates a "zoom" sensation
  const speedNorm = Math.min(1, speed / 80);
  const HORIZON_Y = H * (0.30 - speedNorm * 0.035);

  ctx.clearRect(0, 0, W, H);

  // ── Sky ────────────────────────────────────────────────────────────────────
  const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  skyGrad.addColorStop(0, '#f2f4f7');
  skyGrad.addColorStop(1, '#e8eaed');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, HORIZON_Y);

  // ── Ground ─────────────────────────────────────────────────────────────────
  const groundGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
  groundGrad.addColorStop(0, '#dddfe2');
  groundGrad.addColorStop(1, '#e8e8e8');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);

  drawBuildings(ctx, W, H, HORIZON_Y);

  // ── Road surface ───────────────────────────────────────────────────────────
  const lEdge = -ROAD_HALF_W - 0.4;
  const rEdge = ROAD_HALF_W + 0.4;
  const lFar = horizonX(lEdge, W);
  const rFar = horizonX(rEdge, W);
  const [lNx, lNy] = toScreen(lEdge, 0, W, H, HORIZON_Y);
  const [rNx, rNy] = toScreen(rEdge, 0, W, H, HORIZON_Y);

  const roadGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
  roadGrad.addColorStop(0, '#cecece');
  roadGrad.addColorStop(0.5, '#d8d8d8');
  roadGrad.addColorStop(1, '#e0e0e0');
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(lFar, HORIZON_Y);
  ctx.lineTo(rFar, HORIZON_Y);
  ctx.lineTo(rNx, rNy);
  ctx.lineTo(lNx, lNy);
  ctx.closePath();
  ctx.fill();

  // ── FSD path highlight (player lane, animated pulse) ──────────────────────
  if (fsdEnabled) {
    const hw = 1.9;
    const pulse = 0.18 + Math.sin(time * 2.5) * 0.06;
    const plFar = horizonX(laneOffset - hw, W);
    const prFar = horizonX(laneOffset + hw, W);
    const [plNx, plNy] = toScreen(laneOffset - hw, 0, W, H, HORIZON_Y);
    const [prNx, prNy] = toScreen(laneOffset + hw, 0, W, H, HORIZON_Y);

    const pathGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
    pathGrad.addColorStop(0, `rgba(68,136,255,${pulse * 0.18})`);
    pathGrad.addColorStop(0.5, `rgba(68,136,255,${pulse * 0.55})`);
    pathGrad.addColorStop(1, `rgba(68,136,255,${pulse * 0.75})`);
    ctx.fillStyle = pathGrad;
    ctx.beginPath();
    ctx.moveTo(plFar, HORIZON_Y);
    ctx.lineTo(prFar, HORIZON_Y);
    ctx.lineTo(prNx, prNy);
    ctx.lineTo(plNx, plNy);
    ctx.closePath();
    ctx.fill();
  }

  // ── Lane dashes ────────────────────────────────────────────────────────────
  drawLaneDashes(ctx, W, H, HORIZON_Y, roadOffset, speed);

  // ── Road edges ────────────────────────────────────────────────────────────
  for (const ex of [lEdge, rEdge]) {
    const fx = horizonX(ex, W);
    const [nx, ny] = toScreen(ex, 0, W, H, HORIZON_Y);
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, HORIZON_Y);
    ctx.lineTo(nx, ny);
    ctx.stroke();
  }

  // ── Atmospheric fog overlay ────────────────────────────────────────────────
  drawFog(ctx, W, H, HORIZON_Y, speedNorm);

  // ── Chevrons ───────────────────────────────────────────────────────────────
  if (fsdEnabled) drawChevrons(ctx, W, H, HORIZON_Y, laneOffset, time, speed);

  // ── NPCs (back → front) ───────────────────────────────────────────────────
  const sorted = [...npcCars].sort((a, b) => a.z - b.z);
  for (const car of sorted) drawNpcCar(ctx, W, H, HORIZON_Y, car);

  // ── Player car ────────────────────────────────────────────────────────────
  drawPlayerCar(ctx, W, H, HORIZON_Y, laneOffset, nearMiss, crashed);

  // ── Near-miss flash overlay ───────────────────────────────────────────────
  if (nearMiss) {
    ctx.fillStyle = `rgba(255,60,60,${0.08 + Math.sin(time * 18) * 0.04})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ─── Lane dashes ─────────────────────────────────────────────────────────────

function drawLaneDashes(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  HORIZON_Y: number,
  offset: number,
  speed: number
) {
  // Dash step shrinks as speed increases to amplify sense of motion
  const step = Math.max(5, 9 - speed / 14);
  const dashLen = step * 0.54;

  for (let i = 0; i < NUM_LANES - 1; i++) {
    const midX = (LANES[i] + LANES[i + 1]) / 2;

    for (let d = 0; d < 18; d++) {
      const zFar = -120 + d * step + (offset % step);
      const zNear = Math.min(-0.5, zFar + dashLen);
      const [sx1, sy1, sc1] = toScreen(midX, zFar, W, H, HORIZON_Y);
      const [sx2, sy2] = toScreen(midX, zNear, W, H, HORIZON_Y);
      if (sy2 < HORIZON_Y + 1) continue;
      const sy1c = Math.max(sy1, HORIZON_Y + 1);

      ctx.strokeStyle = `rgba(168,168,168,${0.25 + sc1 * 0.65})`;
      ctx.lineWidth = Math.max(0.8, sc1 * 5.5);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1c);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    }
  }
}

// ─── Atmospheric fog ─────────────────────────────────────────────────────────

function drawFog(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  HORIZON_Y: number,
  speedNorm: number
) {
  // Fog is heavier near the horizon
  const fogDepth = 80 + speedNorm * 40;
  const fogGrad = ctx.createLinearGradient(0, HORIZON_Y - 10, 0, HORIZON_Y + fogDepth);
  fogGrad.addColorStop(0, 'rgba(235,237,240,0.0)');
  fogGrad.addColorStop(0.5, `rgba(235,237,240,${0.25 + speedNorm * 0.15})`);
  fogGrad.addColorStop(1, 'rgba(235,237,240,0.0)');
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, HORIZON_Y - 10, W, fogDepth);
}

// ─── Buildings ───────────────────────────────────────────────────────────────

function drawBuildings(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  HORIZON_Y: number
) {
  const bldgs = [
    { wx: -12, wz: -38, wh: 120 }, { wx: -15.5, wz: -62, wh: 160 },
    { wx: -13, wz: -90, wh: 100 }, { wx: -11, wz: -115, wh: 80 },
    { wx: 12, wz: -32, wh: 130 }, { wx: 15,   wz: -58, wh: 140 },
    { wx: 13, wz: -86, wh: 90 },  { wx: 11,   wz: -112, wh: 75 },
  ];

  for (const b of bldgs) {
    const [sx, , sc] = toScreen(b.wx, b.wz, W, H, HORIZON_Y);
    if (sc <= 0) continue;
    const bw = Math.max(4, 44 * sc);
    const bh = Math.max(6, b.wh * sc);
    const top = Math.max(HORIZON_Y - bh, HORIZON_Y - bh);
    const alpha = Math.min(0.88, sc * 4 + 0.22);

    // Body
    ctx.fillStyle = `rgba(200,204,210,${alpha})`;
    ctx.fillRect(sx - bw / 2, top, bw, bh);

    // Subtle outline
    ctx.strokeStyle = `rgba(182,186,194,${alpha})`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(sx - bw / 2, top, bw, bh);

    // Windows grid
    const rows = Math.max(2, Math.floor(bh / 11));
    const cols = Math.max(1, Math.floor(bw / 10));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ww = Math.max(1, bw / cols - 2.8);
        const wh = Math.max(1, bh / rows - 2.8);
        const wx2 = sx - bw / 2 + c * (bw / cols) + 1.4;
        const wy2 = top + r * (bh / rows) + 1.4;
        ctx.fillStyle = `rgba(168,184,212,${alpha * 0.52})`;
        ctx.fillRect(wx2, wy2, ww, wh);
      }
    }
  }
}

// ─── FSD chevrons ─────────────────────────────────────────────────────────────

function drawChevrons(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  HORIZON_Y: number,
  laneOffset: number,
  time: number,
  speed: number
) {
  // Animation speed scales with vehicle speed
  const animSpeed = Math.max(0.4, speed / 22);
  const step = 14;
  const animOffset = (time * animSpeed * 5.5) % step;

  for (let i = 0; i < 9; i++) {
    const wz = -4 - i * step + animOffset;
    const [cx, cy, sc] = toScreen(laneOffset, wz, W, H, HORIZON_Y);
    if (cy < HORIZON_Y + 4 || cx < -20 || cx > W + 20) continue;

    const sz = Math.max(5, 30 * sc);
    const alpha = Math.min(0.9, (0.85 - i * 0.08) * Math.max(0.35, sc * 1.8));
    const lw = Math.max(1.5, 4 * sc);

    // Outer glow
    ctx.strokeStyle = `rgba(68,136,255,${alpha * 0.35})`;
    ctx.lineWidth = lw + 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - sz, cy + sz * 0.5);
    ctx.lineTo(cx, cy - sz * 0.45);
    ctx.lineTo(cx + sz, cy + sz * 0.5);
    ctx.stroke();

    // Core stroke
    ctx.strokeStyle = `rgba(34,119,238,${alpha})`;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(cx - sz, cy + sz * 0.5);
    ctx.lineTo(cx, cy - sz * 0.45);
    ctx.lineTo(cx + sz, cy + sz * 0.5);
    ctx.stroke();
  }
}

// ─── NPC vehicle ─────────────────────────────────────────────────────────────

function drawNpcCar(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  HORIZON_Y: number,
  car: CarData
) {
  if (car.z > -12) return;
  const [cx, cy, sc] = toScreen(car.x, car.z, W, H, HORIZON_Y);
  if (cy < HORIZON_Y - 2 || sc < 0.018 || cx < -220 || cx > W + 220) return;

  const isLarge = car.type === 'truck';
  const bW = Math.max(5, (isLarge ? 66 : car.type === 'suv' ? 57 : 52) * sc);
  const bH = Math.max(3, (isLarge ? 38 : car.type === 'suv' ? 30 : 24) * sc);
  const cabH = Math.max(2, (isLarge ? 0 : car.type === 'suv' ? 24 : 20) * sc);
  const cabW = bW * 0.8;

  // Per-car color with slight tint
  const base = car.color;

  if (car.detected) {
    ctx.shadowColor = 'rgba(51,136,255,0.6)';
    ctx.shadowBlur = 12 * sc;
  }

  // Body gradient
  const bGrad = ctx.createLinearGradient(cx - bW / 2, cy - bH, cx + bW / 2, cy);
  bGrad.addColorStop(0, lighten(base, 28));
  bGrad.addColorStop(1, base);
  ctx.fillStyle = bGrad;
  rrect(ctx, cx - bW / 2, cy - bH, bW, bH, 3 * sc);
  ctx.fill();

  // Ground shadow
  const shadowGrad = ctx.createRadialGradient(cx, cy + 2, 0, cx, cy + 2, bW * 0.6);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.18)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(cx - bW * 0.6, cy, bW * 1.2, bW * 0.22);

  if (!isLarge) {
    // Cabin
    ctx.fillStyle = darken(base, 18);
    rrect(ctx, cx - cabW / 2, cy - bH - cabH, cabW, cabH, 2 * sc);
    ctx.fill();
    // Windshield
    ctx.fillStyle = 'rgba(20,38,68,0.68)';
    rrect(ctx, cx - cabW / 2 + 2.5 * sc, cy - bH - cabH + 2.5 * sc, cabW - 5 * sc, cabH - 5 * sc, 1.5 * sc);
    ctx.fill();
  } else {
    // Truck cab
    const tcH = bH * 1.1;
    ctx.fillStyle = darken(base, 22);
    rrect(ctx, cx - bW / 2, cy - bH - tcH, bW * 0.45, tcH, 2 * sc);
    ctx.fill();
  }

  // Wheels
  ctx.fillStyle = '#181818';
  for (const wX of [cx - bW * 0.3, cx + bW * 0.3]) {
    ctx.beginPath();
    ctx.ellipse(wX, cy + 1.5, Math.max(2, 4.5 * sc), Math.max(1, 2.2 * sc), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brake lights — red glow if braking, dim otherwise
  const brakeAlpha = car.braking ? 0.95 : 0.55;
  const brakeColor = car.braking ? 'rgba(255,30,0,0.95)' : 'rgba(200,30,0,0.5)';
  if (car.braking) {
    ctx.shadowColor = 'rgba(255,0,0,0.7)';
    ctx.shadowBlur = 10 * sc;
  }
  ctx.fillStyle = brakeColor;
  ctx.fillRect(cx - bW / 2 + 2, cy - bH - 2, Math.max(2, bW * 0.22 - 2), Math.max(2, 3 * sc));
  ctx.fillRect(cx + bW / 2 - Math.max(2, bW * 0.22), cy - bH - 2, Math.max(2, bW * 0.22 - 2), Math.max(2, 3 * sc));

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Detection bounding box
  if (car.detected) {
    const th = bH + (!isLarge ? cabH : bH * 1.12);
    const pad = Math.max(5, 7 * sc);

    ctx.strokeStyle = `rgba(51,136,255,${0.7 + Math.sin(Date.now() / 250) * 0.15})`;
    ctx.lineWidth = Math.max(1, 1.6 * sc);
    ctx.setLineDash([Math.max(3, 5 * sc), Math.max(2, 4 * sc)]);
    ctx.strokeRect(cx - bW / 2 - pad, cy - th - pad, bW + pad * 2, th + pad * 2);
    ctx.setLineDash([]);

    // Target reticle dot
    ctx.fillStyle = 'rgba(51,136,255,0.88)';
    ctx.font = `bold ${Math.max(7, 10 * sc)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('◎', cx, cy - th - pad - 4);
  }
}

// ─── Player car ───────────────────────────────────────────────────────────────

function drawPlayerCar(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  _HORIZON_Y: number,
  laneOffset: number,
  nearMiss: boolean,
  _crashed: boolean
) {
  // Player car uses fixed screen position; only x tracks the animated lane
  const PLAYER_Z_WORLD = -14;
  const [baseX] = toScreen(laneOffset, PLAYER_Z_WORLD, W, H, H * 0.30);

  const cx = baseX;
  const cy = H * 0.675;
  const bW = W * 0.046;
  const bH = bW * 0.42;
  const cabH = bH * 0.78;
  const cabW = bW * 0.78;

  // Glow halo — pulses on near-miss
  const glowAlpha = nearMiss ? 0.4 + Math.sin(Date.now() / 80) * 0.2 : 0.18;
  const glowColor = nearMiss ? 'rgba(255,60,60,' : 'rgba(180,60,255,';
  const glow = ctx.createRadialGradient(cx, cy - bH / 2, 0, cx, cy - bH / 2, bW * 1.6);
  glow.addColorStop(0, glowColor + (glowAlpha) + ')');
  glow.addColorStop(1, glowColor + '0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - bW * 2.2, cy - bH * 4, bW * 4.4, bH * 5);

  // Body
  const bGrad = ctx.createLinearGradient(cx, cy - bH, cx, cy);
  bGrad.addColorStop(0, '#e066ff');
  bGrad.addColorStop(0.55, '#bb33ee');
  bGrad.addColorStop(1, '#8800cc');
  ctx.fillStyle = bGrad;
  rrect(ctx, cx - bW / 2, cy - bH, bW, bH, 5);
  ctx.fill();

  // Cabin
  const cGrad = ctx.createLinearGradient(cx, cy - bH - cabH, cx, cy - bH);
  cGrad.addColorStop(0, '#2a0044');
  cGrad.addColorStop(1, '#1a0030');
  ctx.fillStyle = cGrad;
  rrect(ctx, cx - cabW / 2, cy - bH - cabH, cabW, cabH, 4);
  ctx.fill();

  // Windshield highlight
  ctx.fillStyle = 'rgba(120,0,180,0.42)';
  rrect(ctx, cx - cabW / 2 + 4, cy - bH - cabH + 3, cabW - 8, cabH - 5, 2.5);
  ctx.fill();

  // Ground shadow
  const shadowGrad = ctx.createRadialGradient(cx, cy + 4, 0, cx, cy + 4, bW * 0.8);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(cx - bW * 0.8, cy + 1, bW * 1.6, bW * 0.2);

  // Headlights
  ctx.fillStyle = 'rgba(255,100,0,0.95)';
  ctx.fillRect(cx - bW / 2 + 3, cy - bH, bW * 0.22, 4);
  ctx.fillRect(cx + bW / 2 - bW * 0.22 - 3, cy - bH, bW * 0.22, 4);
  ctx.fillStyle = 'rgba(255,15,0,0.9)';
  ctx.fillRect(cx - bW / 2 + 3, cy - 5, bW - 6, 4);

  // Wheels
  ctx.fillStyle = '#101010';
  for (const wX of [cx - bW * 0.3, cx + bW * 0.3]) {
    ctx.beginPath();
    ctx.ellipse(wX, cy + 2.5, bW * 0.13, bW * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const R = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + R, y);
  ctx.lineTo(x + w - R, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + R);
  ctx.lineTo(x + w, y + h - R);
  ctx.quadraticCurveTo(x + w, y + h, x + w - R, y + h);
  ctx.lineTo(x + R, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - R);
  ctx.lineTo(x, y + R);
  ctx.quadraticCurveTo(x, y, x + R, y);
  ctx.closePath();
}

function lighten(hex: string, amt: number): string {
  return shiftColor(hex, amt);
}
function darken(hex: string, amt: number): string {
  return shiftColor(hex, -amt);
}
function shiftColor(hex: string, amt: number): string {
  try {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
    const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
    return `rgb(${r},${g},${b})`;
  } catch { return hex; }
}

// ─── React component ─────────────────────────────────────────────────────────

export function Canvas2DScene({ gameState, npcCars, playerLane, onTick }: Canvas2DSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const roadOffsetRef = useRef(0);
  const timeRef = useRef(0);

  // Smooth lane animation — lerps world-x toward target
  const laneOffsetRef = useRef(LANES[playerLane]);

  // Sync latest props without re-creating the loop
  const propsRef = useRef({ gameState, npcCars, playerLane, onTick });
  useEffect(() => { propsRef.current = { gameState, npcCars, playerLane, onTick }; });

  useEffect(() => {
    let running = true;
    lastTimeRef.current = performance.now();

    const loop = (ts: number) => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { animRef.current = requestAnimationFrame(loop); return; }

      const raw = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      const delta = Math.min(raw / 1000, 0.05);
      timeRef.current += delta;

      const { gameState: gs, npcCars: npcs, playerLane: pl, onTick: tick } = propsRef.current;
      if (!gs.gameOver) tick(delta);

      // Animate road offset (lane dashes scroll speed)
      roadOffsetRef.current += (gs.speed / 2.237) * delta * 0.11;
      if (roadOffsetRef.current > 14) roadOffsetRef.current -= 14;

      // Smoothly lerp player lane world-x
      const targetX = LANES[pl];
      laneOffsetRef.current += (targetX - laneOffsetRef.current) * Math.min(1, delta * 7);

      // Resize canvas to pixel ratio
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) { animRef.current = requestAnimationFrame(loop); return; }
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);

      ctx.save();
      ctx.scale(dpr, dpr);

      // Camera shake at high speed — subtle random jitter
      if (gs.speed > 50 && !gs.gameOver) {
        const intensity = (gs.speed - 50) / 30;
        const sx = (Math.random() - 0.5) * intensity * 1.8;
        const sy = (Math.random() - 0.5) * intensity * 0.9;
        ctx.translate(sx, sy);
      }

      drawScene(
        ctx, w, h,
        roadOffsetRef.current,
        laneOffsetRef.current,
        gs.fsdEnabled,
        npcs,
        gs.speed,
        timeRef.current,
        gs.fsdConfidence,
        gs.nearMissActive,
        gs.crashed
      );

      ctx.restore();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', inset: 0 }}
    />
  );
}
