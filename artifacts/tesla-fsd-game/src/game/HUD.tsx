import { GameState } from './types';

interface HUDProps {
  gameState: GameState;
  onToggleFsd: () => void;
  onProfileChange: (p: GameState['profile']) => void;
  onLaneLeft: () => void;
  onLaneRight: () => void;
}

export function HUD({ gameState, onToggleFsd, onProfileChange, onLaneLeft, onLaneRight }: HUDProps) {
  const {
    speed, fsdEnabled, fsdMessage, gear, batteryLevel, score,
    navigationTarget, eta, distanceToTurn, turnDirection, profile,
    laneChangeActive, obstacleDetected
  } = gameState;

  const speedDisplay = Math.round(speed);

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top bar - Tesla style */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 text-gray-800 text-sm" style={{ background: 'rgba(245,245,245,0.88)', backdropFilter: 'blur(10px)' }}>
        {/* Gear selector */}
        <div className="flex items-center gap-3">
          {(['P', 'R', 'N', 'D'] as const).map(g => (
            <span key={g} className={`font-semibold text-base ${gear === g ? 'text-black' : 'text-gray-400'}`}>{g}</span>
          ))}
          <div className="ml-2 w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
        </div>

        {/* Center - FSD message */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-700">{fsdMessage}</div>
        </div>

        {/* Right info */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>🔒</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          <span>72°F</span>
          <div className="flex items-center gap-1">
            <div className="w-8 h-3 border border-gray-400 rounded-sm relative">
              <div className="h-full bg-green-500 rounded-sm" style={{ width: `${batteryLevel}%` }} />
            </div>
            <span>{batteryLevel}%</span>
          </div>
        </div>
      </div>

      {/* Left - Speed + Navigation */}
      <div className="absolute left-6 top-16 flex flex-col gap-3">
        {/* Speed display */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-lg min-w-[90px]">
          <div className="text-5xl font-light text-black leading-none text-center">{speedDisplay}</div>
          <div className="text-xs text-gray-500 text-center mt-1 font-medium">MPH</div>
        </div>

        {/* Navigation */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg min-w-[180px]">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{turnDirection === 'left' ? '←' : turnDirection === 'right' ? '→' : '↑'}</div>
            <div>
              <div className="text-xs text-gray-500">{distanceToTurn}</div>
              <div className="text-sm font-semibold text-black">{navigationTarget.split(',')[0]}</div>
            </div>
          </div>
        </div>

        {/* Speed limit */}
        <div className="bg-white/85 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-black">65</div>
            <div className="text-[10px] text-gray-500 font-medium">SPEED<br/>LIMIT</div>
          </div>
        </div>
      </div>

      {/* Right - Navigation destination */}
      <div className="absolute right-6 top-16">
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg text-right min-w-[160px]">
          <div className="text-sm font-semibold text-black">{navigationTarget}</div>
          <div className="text-xs text-gray-500 mt-1">{eta} · 2 min</div>
          <div className="text-xs text-gray-400">0.5 mi</div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3">
        {/* FSD Status indicator */}
        <div className={`px-6 py-2 rounded-full text-sm font-semibold shadow-lg ${fsdEnabled ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'}`}>
          {fsdEnabled ? '⚡ Full Self-Driving ACTIVE' : 'FSD OFF — Manual Control'}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onLaneLeft}
            className="bg-white/90 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 shadow hover:bg-white active:scale-95 transition-all"
          >
            ← Lane Left
          </button>
          <button
            onClick={onToggleFsd}
            className={`rounded-xl px-5 py-2 text-sm font-semibold shadow transition-all active:scale-95 ${
              fsdEnabled ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {fsdEnabled ? 'Disable FSD' : 'Enable FSD'}
          </button>
          <button
            onClick={onLaneRight}
            className="bg-white/90 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 shadow hover:bg-white active:scale-95 transition-all"
          >
            Lane Right →
          </button>
        </div>

        {/* Profile selector */}
        <div className="flex items-center gap-2 bg-white/85 backdrop-blur-sm rounded-xl px-4 py-2 shadow pointer-events-auto">
          <span className="text-xs text-gray-500 mr-1">FSD Profile:</span>
          {(['Chill', 'Average', 'Assertive'] as const).map(p => (
            <button
              key={p}
              onClick={() => onProfileChange(p)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                profile === p
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2 shadow text-center">
          <div className="text-xs text-gray-500">SCORE</div>
          <div className="text-xl font-bold text-gray-800">{score.toLocaleString()}</div>
        </div>
      </div>

      {/* Lane change indicator */}
      {laneChangeActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="bg-blue-500/90 text-white text-sm font-semibold px-5 py-2 rounded-full shadow-lg animate-pulse">
            Lane Change in Progress
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="absolute bottom-2 right-4 text-xs text-gray-400">
        A/D or ← → to change lanes · F to toggle FSD
      </div>
    </div>
  );
}
