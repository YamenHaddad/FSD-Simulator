export interface CarData {
  id: string;
  x: number;
  z: number;
  speed: number;
  lane: number;
  type: 'sedan' | 'suv' | 'truck';
  detected: boolean;
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
}

export interface Lane {
  id: number;
  x: number;
}
