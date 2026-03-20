export interface CarData {
  id: string;
  x: number;
  z: number;
  speed: number;
  lane: number;
  targetLane: number;
  type: 'sedan' | 'suv' | 'truck';
  detected: boolean;
  braking: boolean;
  changingLane: boolean;
  color: string;
}

export interface ScoreEvent {
  id: number;
  value: number;
  label: string;
}

export interface DecisionMoment {
  type: 'overtake' | 'exit';
  active: boolean;
  timeLeft: number;
}

export interface GameState {
  speed: number;
  fsdEnabled: boolean;
  score: number;
  distance: number;
  fsdMessage: string;
  gear: 'P' | 'R' | 'N' | 'D';
  batteryLevel: number;
  targetSpeed: number;
  navigationTarget: string;
  eta: string;
  distanceToTurn: string;
  turnDirection: 'left' | 'right' | 'straight';
  profile: 'Chill' | 'Average' | 'Assertive';
  laneChangeActive: boolean;
  obstacleDetected: boolean;
  crashed: boolean;
  gameOver: boolean;
  fsdConfidence: number;
  combo: number;
  scoreEvents: ScoreEvent[];
  nearMissActive: boolean;
  decisionMoment: DecisionMoment | null;
}

export interface Lane {
  id: number;
  x: number;
}
