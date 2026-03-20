import { useEffect, useRef, useState } from 'react';
import { GameState, ScoreEvent } from './types';

interface HUDProps {
  gameState: GameState;
  onToggleFsd: () => void;
  onProfileChange: (p: GameState['profile']) => void;
  onLaneLeft: () => void;
  onLaneRight: () => void;
  onDecision: (choice: 'yes' | 'no') => void;
}

// ─── Glassmorphism panel base style ──────────────────────────────────────────
const glass = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
};

const glassSubtle = {
  background: 'rgba(255,255,255,0.58)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
};

// ─── FSD Confidence arc ───────────────────────────────────────────────────────
function ConfidenceArc({ confidence }: { confidence: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = (confidence / 100) * circ * 0.75; // 3/4 arc
  const color = confidence > 65 ? '#22c55e' : confidence > 40 ? '#f59e0b' : '#ef4444';

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      {/* Background track */}
      <circle cx="28" cy="28" r={r}
        fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="3.5"
        strokeDasharray={`${circ * 0.75} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform="rotate(135 28 28)"
      />
      {/* Filled arc */}
      <circle cx="28" cy="28" r={r}
        fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform="rotate(135 28 28)"
        style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
      />
      <text x="28" y="32" textAnchor="middle"
        style={{ fontSize: 12, fontWeight: 700, fill: color, fontFamily: 'system-ui' }}>
        {Math.round(confidence)}
      </text>
    </svg>
  );
}

// ─── Floating score events ────────────────────────────────────────────────────
function ScorePopup({ event }: { event: ScoreEvent & { opacity: number; y: number } }) {
  const isPos = event.value > 0;
  return (
    <div style={{
      position: 'absolute', top: event.y, left: '50%', transform: 'translateX(-50%)',
      opacity: event.opacity,
      color: isPos ? '#22c55e' : '#ef4444',
      fontWeight: 700, fontSize: 13,
      textShadow: '0 1px 4px rgba(0,0,0,0.15)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      transition: 'none',
    }}>
      {event.label}
    </div>
  );
}

interface AnimatedEvent extends ScoreEvent {
  opacity: number;
  y: number;
  startTime: number;
}

export function HUD({
  gameState, onToggleFsd, onProfileChange, onLaneLeft, onLaneRight, onDecision
}: HUDProps) {
  const {
    speed, fsdEnabled, fsdMessage, gear, batteryLevel, score,
    navigationTarget, eta, distanceToTurn, turnDirection, profile,
    laneChangeActive, fsdConfidence, combo, scoreEvents, decisionMoment,
  } = gameState;

  const [animEvents, setAnimEvents] = useState<AnimatedEvent[]>([]);
  const prevEventsRef = useRef<ScoreEvent[]>([]);
  const animFrameRef = useRef<number>(0);
  const startRef = useRef<number>(performance.now());

  // Convert new score events into animated floating popups
  useEffect(() => {
    const newOnes = scoreEvents.filter(
      ev => !prevEventsRef.current.find(p => p.id === ev.id)
    );
    if (newOnes.length === 0) return;
    prevEventsRef.current = scoreEvents;
    setAnimEvents(prev => [
      ...prev,
      ...newOnes.map(ev => ({
        ...ev,
        opacity: 1,
        y: 110 + Math.random() * 20,
        startTime: performance.now(),
      })),
    ]);
  }, [scoreEvents]);

  // Animate the floating events
  useEffect(() => {
    const animate = () => {
      const now = performance.now();
      setAnimEvents(prev => {
        const updated = prev
          .map(ev => {
            const age = (now - ev.startTime) / 1000;
            return { ...ev, opacity: Math.max(0, 1 - age / 1.6), y: ev.y - age * 22 };
          })
          .filter(ev => ev.opacity > 0);
        return updated;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const speedDisplay = Math.round(speed);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const confColor = fsdConfidence > 65 ? '#22c55e' : fsdConfidence > 40 ? '#f59e0b' : '#ef4444';

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-2.5"
        style={{ ...glass, borderRadius: '0 0 16px 16px', borderTop: 'none' }}>

        {/* Gear selector */}
        <div className="flex items-center gap-2.5">
          {(['P', 'R', 'N', 'D'] as const).map(g => (
            <span key={g} className={`text-sm font-semibold tracking-wide ${gear === g ? 'text-black' : 'text-gray-350'}`}
              style={{ color: gear === g ? '#111' : '#b0b0b0' }}>{g}</span>
          ))}
          <div className="ml-1.5 w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </div>
        </div>

        {/* FSD message + confidence */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-xs font-medium text-gray-600 text-center leading-tight max-w-[220px]">
            {fsdMessage}
          </div>
          {fsdEnabled && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: confColor }} />
              <span className="text-xs font-semibold" style={{ color: confColor }}>
                {Math.round(fsdConfidence)}% confidence
              </span>
            </div>
          )}
        </div>

        {/* Time + battery */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{timeStr}</span>
          <span>72°F</span>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-2.5 rounded-sm border border-gray-300 overflow-hidden">
              <div className="h-full rounded-sm transition-all"
                style={{ width: `${batteryLevel}%`, background: batteryLevel > 20 ? '#22c55e' : '#ef4444' }} />
            </div>
            <span className="font-medium">{batteryLevel}%</span>
          </div>
        </div>
      </div>

      {/* ── Left panel: speed + nav + speed limit ─────────────────────── */}
      <div className="absolute left-4 top-16 flex flex-col gap-2.5">

        {/* Speed */}
        <div className="rounded-2xl px-4 py-3 min-w-[82px] text-center" style={glass}>
          <div className="text-4xl font-light text-black leading-none tabular-nums">{speedDisplay}</div>
          <div className="text-[10px] text-gray-400 mt-0.5 font-semibold tracking-widest">MPH</div>
        </div>

        {/* Navigation */}
        <div className="rounded-2xl px-3.5 py-2.5 min-w-[165px]" style={glass}>
          <div className="flex items-center gap-2.5">
            <span className="text-xl" style={{ lineHeight: 1 }}>
              {turnDirection === 'left' ? '←' : turnDirection === 'right' ? '→' : '↑'}
            </span>
            <div>
              <div className="text-[10px] text-gray-400 font-medium">{distanceToTurn}</div>
              <div className="text-sm font-semibold text-gray-900 leading-tight">
                {navigationTarget.split(',')[0]}
              </div>
            </div>
          </div>
        </div>

        {/* Speed limit */}
        <div className="rounded-xl px-2.5 py-2 text-center" style={glassSubtle}>
          <div className="text-xl font-bold text-gray-900">65</div>
          <div className="text-[9px] text-gray-400 font-semibold tracking-wider leading-tight">SPEED<br />LIMIT</div>
        </div>
      </div>

      {/* ── Right panel: destination + FSD arc ───────────────────────── */}
      <div className="absolute right-4 top-16 flex flex-col items-end gap-2.5">
        <div className="rounded-2xl px-4 py-3 text-right min-w-[150px]" style={glass}>
          <div className="text-sm font-semibold text-gray-900">{navigationTarget}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">{eta} · 2 min</div>
          <div className="text-[10px] text-gray-300 mt-0.5">0.5 mi</div>
        </div>

        {/* FSD confidence arc */}
        {fsdEnabled && (
          <div className="rounded-2xl px-3 py-2 flex flex-col items-center gap-0.5" style={glassSubtle}>
            <ConfidenceArc confidence={fsdConfidence} />
            <span className="text-[9px] text-gray-400 font-semibold tracking-wider">CONFIDENCE</span>
          </div>
        )}
      </div>

      {/* ── Score + Combo (top-center, compact) ──────────────────────── */}
      <div className="absolute left-1/2 -translate-x-1/2 top-14 flex flex-col items-center gap-1.5">
        <div className="rounded-xl px-4 py-1.5 flex items-center gap-3" style={glassSubtle}>
          <div className="text-center">
            <div className="text-[9px] text-gray-400 font-semibold tracking-widest">SCORE</div>
            <div className="text-lg font-bold text-gray-800 tabular-nums leading-tight">{score.toLocaleString()}</div>
          </div>
          {combo > 1 && (
            <div className="h-7 w-px bg-gray-200" />
          )}
          {combo > 1 && (
            <div className="text-center">
              <div className="text-[9px] text-gray-400 font-semibold tracking-widest">COMBO</div>
              <div className="text-lg font-bold leading-tight" style={{ color: '#a855f7' }}>×{Math.floor(combo)}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating score events ────────────────────────────────────── */}
      {animEvents.map(ev => <ScorePopup key={ev.id} event={ev} />)}

      {/* ── Decision moment banner ───────────────────────────────────── */}
      {decisionMoment?.active && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ top: '18%' }}>
          <div className="rounded-2xl px-5 py-3.5 flex flex-col items-center gap-2.5"
            style={{ ...glass, border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 4px 24px rgba(99,102,241,0.15)' }}>
            <div className="text-xs font-semibold text-indigo-500 tracking-wider uppercase">
              {decisionMoment.type === 'overtake' ? '🚦 Overtake Opportunity' : '🛣️ Exit Ramp Ahead'}
            </div>
            <div className="text-sm text-gray-600 text-center max-w-[200px] leading-snug">
              {decisionMoment.type === 'overtake'
                ? 'Slower vehicle ahead — overtake now?'
                : 'Your exit is approaching — take it?'}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => onDecision('yes')}
                className="px-5 py-1.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
                {decisionMoment.type === 'overtake' ? 'Overtake' : 'Take Exit'}
              </button>
              <button onClick={() => onDecision('no')}
                className="px-5 py-1.5 rounded-xl text-sm font-semibold text-gray-600 bg-white/70 transition-all active:scale-95"
                style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                Stay
              </button>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-1 rounded-full"
                  style={{
                    width: 20,
                    background: i < Math.ceil(decisionMoment.timeLeft) ? '#6366f1' : 'rgba(0,0,0,0.1)',
                    transition: 'background 0.3s'
                  }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Lane change indicator ─────────────────────────────────────── */}
      {laneChangeActive && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '38%' }}>
          <div className="px-4 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ background: 'rgba(59,130,246,0.88)', backdropFilter: 'blur(8px)' }}>
            Lane change in progress
          </div>
        </div>
      )}

      {/* ── Bottom controls ───────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2.5 pb-5 px-4 pointer-events-auto">

        {/* FSD status badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: fsdEnabled ? 'rgba(37,99,235,0.90)' : 'rgba(55,65,81,0.80)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
          }}>
          <span>{fsdEnabled ? '⚡' : '○'}</span>
          <span>{fsdEnabled ? 'Full Self-Driving ACTIVE' : 'FSD OFF — Manual Control'}</span>
        </div>

        {/* Main control row */}
        <div className="flex items-stretch gap-3 w-full max-w-sm">
          <button
            onClick={onLaneLeft}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 transition-all active:scale-95 active:brightness-95"
            style={glass}
          >
            ← Lane Left
          </button>

          <button
            onClick={onToggleFsd}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{
              background: fsdEnabled
                ? 'rgba(239,68,68,0.12)'
                : 'linear-gradient(135deg,rgba(37,99,235,0.9),rgba(99,102,241,0.9))',
              color: fsdEnabled ? '#dc2626' : '#fff',
              backdropFilter: 'blur(12px)',
              border: fsdEnabled ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            {fsdEnabled ? 'Disable FSD' : 'Enable FSD'}
          </button>

          <button
            onClick={onLaneRight}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 transition-all active:scale-95 active:brightness-95"
            style={glass}
          >
            Lane Right →
          </button>
        </div>

        {/* FSD profile selector */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl" style={glassSubtle}>
          <span className="text-[10px] text-gray-400 mr-1 font-medium">Profile</span>
          {(['Chill', 'Average', 'Assertive'] as const).map(p => (
            <button
              key={p}
              onClick={() => onProfileChange(p)}
              className="px-3 py-1 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={profile === p
                ? { background: '#111', color: '#fff' }
                : { color: '#666', background: 'transparent' }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Keyboard hint */}
        <div className="text-[10px] text-gray-300 text-center">
          A/D or ← → to change lanes · F to toggle FSD · Y/N for decisions
        </div>
      </div>
    </div>
  );
}
