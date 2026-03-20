import { useEffect, useRef } from 'react';
import { GameState, CarData } from './types';
import { LANES } from './constants';

interface Canvas2DSceneProps {
  gameState: GameState;
  npcCars: CarData[];
  playerLane: number;
  onTick: (delta: number) => void;
}

const NUM_LANES = LANES.length;
const ROAD_HALF_W = 8;

function toScreen(wx: number, wz: number, W: number, H: number): [number, number, number] {
  const HORIZON_Y = H * 0.3;
  const FOV_SCALE = W * 0.32;
  const PLAYER_SCREEN_Y = H * 0.78;
  const PLAYER_Z = 0;
  const FAR_Z = -120;

  if (wz < FAR_Z - 10) return [-9999, -9999, 0];

  const t = (wz - FAR_Z) / (PLAYER_Z - FAR_Z);
  const clampedT = Math.max(0, Math.min(1, t));

  const sy = HORIZON_Y + (PLAYER_SCREEN_Y - HORIZON_Y) * (clampedT * clampedT * clampedT);
  const depth = Math.max(0.001, -wz + 1);
  const scale = FOV_SCALE / Math.max(1, depth);
  const sx = W / 2 + wx * scale;

  const screenScale = Math.min(1.5, clampedT * clampedT * 2);
  return [sx, sy, screenScale];
}

function horizonPoint(wx: number, W: number): number {
  return W / 2 + wx * 0.5;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  roadOffset: number,
  playerLane: number,
  fsdEnabled: boolean,
  npcCars: CarData[],
  speed: number,
  time: number
) {
  const HORIZON_Y = H * 0.3;
  ctx.clearRect(0, 0, W, H);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  skyGrad.addColorStop(0, '#f8f8f9');
  skyGrad.addColorStop(1, '#ececed');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, HORIZON_Y);

  const groundGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
  groundGrad.addColorStop(0, '#e3e3e3');
  groundGrad.addColorStop(1, '#eaeaea');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);

  drawBuildings(ctx, W, H, HORIZON_Y);

  const FAR_Z = -120;
  const NEAR_Z = 0;

  const lEdge = -ROAD_HALF_W - 0.5;
  const rEdge = ROAD_HALF_W + 0.5;

  const lFar = horizonPoint(lEdge, W);
  const rFar = horizonPoint(rEdge, W);
  const [lNx, lNy] = toScreen(lEdge, NEAR_Z, W, H);
  const [rNx, rNy] = toScreen(rEdge, NEAR_Z, W, H);

  const roadGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
  roadGrad.addColorStop(0, '#d2d2d2');
  roadGrad.addColorStop(0.5, '#dbdbdb');
  roadGrad.addColorStop(1, '#e3e3e3');
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(lFar, HORIZON_Y);
  ctx.lineTo(rFar, HORIZON_Y);
  ctx.lineTo(rNx, rNy);
  ctx.lineTo(lNx, lNy);
  ctx.closePath();
  ctx.fill();

  if (fsdEnabled) {
    const laneX = LANES[playerLane];
    const hw = 2.0;
    const plFar = horizonPoint(laneX - hw, W);
    const prFar = horizonPoint(laneX + hw, W);
    const [plNx, plNy] = toScreen(laneX - hw, NEAR_Z, W, H);
    const [prNx, prNy] = toScreen(laneX + hw, NEAR_Z, W, H);

    const pathGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
    pathGrad.addColorStop(0, 'rgba(68,136,255,0.04)');
    pathGrad.addColorStop(0.5, 'rgba(68,136,255,0.16)');
    pathGrad.addColorStop(1, 'rgba(68,136,255,0.28)');
    ctx.fillStyle = pathGrad;
    ctx.beginPath();
    ctx.moveTo(plFar, HORIZON_Y);
    ctx.lineTo(prFar, HORIZON_Y);
    ctx.lineTo(prNx, prNy);
    ctx.lineTo(plNx, plNy);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < NUM_LANES - 1; i++) {
    const midX = (LANES[i] + LANES[i + 1]) / 2;
    const mFar = horizonPoint(midX, W);

    for (let d = 0; d < 15; d++) {
      const zFar = -120 + d * 9 + (roadOffset % 9);
      const zNear = Math.min(-1, zFar + 5);
      const [sx1, sy1, sc1] = toScreen(midX, zFar, W, H);
      const [sx2, sy2] = toScreen(midX, zNear, W, H);

      if (sy1 < HORIZON_Y + 2) {
        if (sy2 < HORIZON_Y + 2) continue;
        const [, , sc2] = toScreen(midX, zNear, W, H);
        ctx.strokeStyle = `rgba(175,175,175,${0.3 + sc2 * 0.6})`;
        ctx.lineWidth = Math.max(0.5, sc2 * 6);
        ctx.beginPath();
        ctx.moveTo(mFar, HORIZON_Y + 1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
        continue;
      }
      ctx.strokeStyle = `rgba(175,175,175,${0.3 + sc1 * 0.6})`;
      ctx.lineWidth = Math.max(0.5, sc1 * 6);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    }
  }

  for (const ex of [-ROAD_HALF_W, ROAD_HALF_W]) {
    const fh = horizonPoint(ex, W);
    const [nx, ny] = toScreen(ex, NEAR_Z, W, H);
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fh, HORIZON_Y);
    ctx.lineTo(nx, ny);
    ctx.stroke();
  }

  if (fsdEnabled) drawChevrons(ctx, W, H, HORIZON_Y, playerLane, time, speed);

  const sorted = [...npcCars].sort((a, b) => a.z - b.z);
  for (const car of sorted) drawNpcCar(ctx, W, H, HORIZON_Y, car);

  drawPlayerCar(ctx, W, H, HORIZON_Y, playerLane);
}

function drawBuildings(ctx: CanvasRenderingContext2D, W: number, H: number, HORIZON_Y: number) {
  const bldgs = [
    { wx: -12, wz: -35 }, { wx: -15, wz: -60 }, { wx: -13, wz: -90 }, { wx: -11, wz: -140 },
    { wx: 12, wz: -30 }, { wx: 14, wz: -55 }, { wx: 12, wz: -85 }, { wx: 10, wz: -130 },
  ];
  for (const b of bldgs) {
    const [sx, sy, sc] = toScreen(b.wx, b.wz, W, H);
    if (sc <= 0) continue;
    const bw = Math.max(5, 45 * sc);
    const bh = Math.max(8, 110 * sc);
    const alpha = Math.min(0.9, sc * 4 + 0.3);

    ctx.fillStyle = `rgba(205,207,212,${alpha})`;
    ctx.fillRect(sx - bw / 2, Math.max(HORIZON_Y - bh, sy - bh), bw, bh);
    ctx.strokeStyle = `rgba(188,190,196,${alpha})`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(sx - bw / 2, Math.max(HORIZON_Y - bh, sy - bh), bw, bh);

    const rows = Math.max(2, Math.floor(bh / 10));
    const cols = Math.max(1, Math.floor(bw / 9));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ww2 = Math.max(1, bw / cols - 2.5);
        const wh2 = Math.max(1, bh / rows - 2.5);
        const wx2 = sx - bw / 2 + c * (bw / cols) + 1.2;
        const wy2 = Math.max(HORIZON_Y - bh, sy - bh) + r * (bh / rows) + 1.2;
        ctx.fillStyle = `rgba(170,185,210,${alpha * 0.55})`;
        ctx.fillRect(wx2, wy2, ww2, wh2);
      }
    }
  }
}

function drawChevrons(ctx: CanvasRenderingContext2D, W: number, H: number, HORIZON_Y: number, playerLane: number, time: number, speed: number) {
  const laneX = LANES[playerLane];
  const animSpeed = Math.max(0.3, speed / 25);
  const animOffset = (time * animSpeed * 5) % 14;

  for (let i = 0; i < 8; i++) {
    const wz = -4 - i * 14 + animOffset;
    const [cx, cy, sc] = toScreen(laneX, wz, W, H);
    if (cy < HORIZON_Y + 5 || cx < -10 || cx > W + 10) continue;

    const sz = Math.max(6, 32 * sc);
    const opacity = Math.min(0.85, (0.8 - i * 0.09) * Math.max(0.4, sc * 2));
    const lw = Math.max(1.5, 4.5 * sc);

    ctx.strokeStyle = `rgba(34,119,238,${opacity})`;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - sz, cy + sz * 0.55);
    ctx.lineTo(cx, cy - sz * 0.45);
    ctx.lineTo(cx + sz, cy + sz * 0.55);
    ctx.stroke();
  }
}

function drawNpcCar(ctx: CanvasRenderingContext2D, W: number, H: number, HORIZON_Y: number, car: CarData) {
  if (car.z > -12) return;
  const [cx, cy, sc] = toScreen(car.x, car.z, W, H);
  if (cy < HORIZON_Y - 2 || sc < 0.02 || cx < -200 || cx > W + 200) return;

  const isLarge = car.type === 'truck';
  const bW = Math.max(5, (isLarge ? 65 : car.type === 'suv' ? 56 : 52) * sc);
  const bH = Math.max(3, (isLarge ? 38 : car.type === 'suv' ? 30 : 24) * sc);
  const cabH = Math.max(2, (isLarge ? 0 : car.type === 'suv' ? 24 : 20) * sc);
  const cabW = bW * 0.8;
  const bodyColor = car.detected ? '#5599ff' : (isLarge ? '#555555' : '#888888');

  if (car.detected) {
    ctx.shadowColor = '#3388ff';
    ctx.shadowBlur = 15 * sc;
  }

  const bGrad = ctx.createLinearGradient(cx - bW / 2, cy - bH, cx + bW / 2, cy);
  bGrad.addColorStop(0, adj(bodyColor, 25));
  bGrad.addColorStop(1, bodyColor);
  ctx.fillStyle = bGrad;
  rrect(ctx, cx - bW / 2, cy - bH, bW, bH, 3 * sc);
  ctx.fill();

  if (!isLarge) {
    ctx.fillStyle = adj(bodyColor, -15);
    rrect(ctx, cx - cabW / 2, cy - bH - cabH, cabW, cabH, 2 * sc);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,40,70,0.72)';
    rrect(ctx, cx - cabW / 2 + 2.5 * sc, cy - bH - cabH + 2.5 * sc, cabW - 5 * sc, cabH - 5 * sc, 1 * sc);
    ctx.fill();
  } else {
    const truckCabH = bH * 1.1;
    ctx.fillStyle = adj(bodyColor, -20);
    rrect(ctx, cx - bW / 2, cy - bH - truckCabH, bW * 0.46, truckCabH, 2 * sc);
    ctx.fill();
  }

  ctx.fillStyle = '#1a1a1a';
  [cx - bW * 0.3, cx + bW * 0.3].forEach(wx => {
    ctx.beginPath();
    ctx.ellipse(wx, cy + 1, Math.max(2, 4 * sc), Math.max(1, 2 * sc), 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(255,10,0,0.9)';
  ctx.fillRect(cx - bW / 2 + 2, cy - bH - 2, bW - 4, Math.max(2, 3 * sc));

  if (car.detected) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(51,136,255,0.75)';
    ctx.lineWidth = Math.max(1, 1.5 * sc);
    ctx.setLineDash([Math.max(3, 5 * sc), Math.max(3, 5 * sc)]);
    const th = bH + (!isLarge ? cabH : bH * 1.1);
    ctx.strokeRect(cx - bW / 2 - 5, cy - th - 5, bW + 10, th + 10);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(51,136,255,0.9)';
    ctx.font = `bold ${Math.max(8, 11 * sc)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('◉', cx, cy - th - 9);
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

function drawPlayerCar(ctx: CanvasRenderingContext2D, W: number, H: number, HORIZON_Y: number, playerLane: number) {
  const laneX = LANES[playerLane];

  const PLAYER_Z_WORLD = -14;
  const [baseX] = toScreen(laneX, PLAYER_Z_WORLD, W, H);

  const cx = baseX;
  const cy = H * 0.68;
  const bW = W * 0.048;
  const bH = bW * 0.42;
  const cabH = bH * 0.8;
  const cabW = bW * 0.8;

  const glow = ctx.createRadialGradient(cx, cy - bH / 2, 0, cx, cy - bH / 2, bW * 1.5);
  glow.addColorStop(0, 'rgba(200,68,255,0.2)');
  glow.addColorStop(1, 'rgba(200,68,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - bW * 2, cy - bH * 4, bW * 4, bH * 5);

  const bGrad = ctx.createLinearGradient(cx - bW / 2, cy - bH, cx + bW / 2, cy);
  bGrad.addColorStop(0, '#dd66ff');
  bGrad.addColorStop(0.6, '#bb33ee');
  bGrad.addColorStop(1, '#9911cc');
  ctx.fillStyle = bGrad;
  rrect(ctx, cx - bW / 2, cy - bH, bW, bH, 5);
  ctx.fill();

  const cGrad = ctx.createLinearGradient(cx, cy - bH - cabH, cx, cy - bH);
  cGrad.addColorStop(0, '#330055');
  cGrad.addColorStop(1, '#220033');
  ctx.fillStyle = cGrad;
  rrect(ctx, cx - cabW / 2, cy - bH - cabH, cabW, cabH, 4);
  ctx.fill();

  ctx.fillStyle = 'rgba(100,0,150,0.5)';
  rrect(ctx, cx - cabW / 2 + 4, cy - bH - cabH + 3, cabW - 8, cabH - 6, 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,100,0,0.95)';
  ctx.fillRect(cx - bW / 2 + 3, cy - bH, bW - 6, 4);
  ctx.fillStyle = 'rgba(255,10,0,0.92)';
  ctx.fillRect(cx - bW / 2 + 3, cy - 5, bW - 6, 4);

  ctx.fillStyle = '#111';
  [cx - bW * 0.3, cx + bW * 0.3].forEach(wx => {
    ctx.beginPath();
    ctx.ellipse(wx, cy + 2, bW * 0.12, bW * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const R = Math.min(r, w / 2, h / 2, 4);
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

function adj(hex: string, amt: number): string {
  try {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
    const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
    return `rgb(${r},${g},${b})`;
  } catch { return hex; }
}

export function Canvas2DScene({ gameState, npcCars, playerLane, onTick }: Canvas2DSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const timeRef = useRef(0);
  const propsRef = useRef({ gameState, npcCars, playerLane, onTick });

  useEffect(() => {
    propsRef.current = { gameState, npcCars, playerLane, onTick };
  });

  useEffect(() => {
    let running = true;
    lastTimeRef.current = performance.now();

    const loop = (ts: number) => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { animRef.current = requestAnimationFrame(loop); return; }

      const delta = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = ts;
      timeRef.current += delta;

      const { gameState: gs, npcCars: npcs, playerLane: pl, onTick: tick } = propsRef.current;
      tick(delta);

      offsetRef.current += (gs.speed / 2.237) * delta * 0.12;
      if (offsetRef.current > 12) offsetRef.current -= 12;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) { animRef.current = requestAnimationFrame(loop); return; }
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);

      ctx.save();
      ctx.scale(dpr, dpr);
      drawScene(ctx, w, h, offsetRef.current, pl, gs.fsdEnabled, npcs, gs.speed, timeRef.current);
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
