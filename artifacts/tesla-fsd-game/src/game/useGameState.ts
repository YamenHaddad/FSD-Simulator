import { useState, useRef, useCallback, useEffect } from 'react';
import { GameState, CarData } from './types';
import { LANES, FSD_MESSAGES, NAV_TARGETS, MAX_NPC_CARS } from './constants';

const initialState: GameState = {
  speed: 0,
  fsdEnabled: true,
  score: 0,
  distance: 0,
  fsdMessage: 'Full Self-Driving active',
  gear: 'D',
  batteryLevel: 82,
  targetSpeed: 65,
  navigationTarget: NAV_TARGETS[0].name,
  eta: NAV_TARGETS[0].eta,
  distanceToTurn: NAV_TARGETS[0].turn,
  turnDirection: 'left',
  profile: 'Average',
  laneChangeActive: false,
  obstacleDetected: false,
  crashed: false,
  gameOver: false,
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [npcCars, setNpcCars] = useState<CarData[]>([]);
  const [playerLane, setPlayerLane] = useState(1);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameTimeRef = useRef(0);
  const playerLaneRef = useRef(1);

  const initNPCs = useCallback(() => {
    const cars: CarData[] = [];
    for (let i = 0; i < MAX_NPC_CARS; i++) {
      const laneIdx = Math.floor(Math.random() * LANES.length);
      const type = Math.random() < 0.15 ? 'truck' : Math.random() < 0.4 ? 'suv' : 'sedan';
      cars.push({
        id: `car-${i}`,
        x: LANES[laneIdx],
        z: -20 - Math.random() * 100,
        speed: 20 + Math.random() * 40,
        lane: laneIdx,
        type,
        detected: false,
      });
    }
    setNpcCars(cars);
  }, []);

  const cycleFsdMessage = useCallback(() => {
    setGameState(s => ({
      ...s,
      fsdMessage: FSD_MESSAGES[Math.floor(Math.random() * FSD_MESSAGES.length)],
    }));
    const delay = 3000 + Math.random() * 4000;
    messageTimerRef.current = setTimeout(cycleFsdMessage, delay);
  }, []);

  const setProfile = useCallback((profile: GameState['profile']) => {
    setGameState(s => ({ ...s, profile }));
  }, []);

  const toggleFsd = useCallback(() => {
    setGameState(s => ({ ...s, fsdEnabled: !s.fsdEnabled }));
  }, []);

  const changePlayerLane = useCallback((dir: -1 | 1) => {
    setPlayerLane(prev => {
      const next = Math.max(0, Math.min(LANES.length - 1, prev + dir));
      if (next !== prev) {
        playerLaneRef.current = next;
        setGameState(s => ({ ...s, laneChangeActive: true, fsdMessage: 'Lane change in progress' }));
        setTimeout(() => setGameState(s => ({ ...s, laneChangeActive: false })), 1000);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    initNPCs();
    messageTimerRef.current = setTimeout(cycleFsdMessage, 3000);
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, [initNPCs, cycleFsdMessage]);

  const tick = useCallback((delta: number) => {
    gameTimeRef.current += delta;
    setGameState(s => {
      if (s.gameOver) return s;
      const newSpeed = s.fsdEnabled
        ? Math.min(s.targetSpeed, s.speed + delta * 15)
        : Math.max(0, s.speed - delta * 8);
      const newDist = s.distance + (newSpeed * delta) / 3600 * 1000;
      const newScore = Math.floor(newDist / 10);
      return {
        ...s,
        speed: newSpeed,
        distance: newDist,
        score: newScore,
      };
    });

    setNpcCars(prev => {
      const currentLane = playerLaneRef.current;
      let collided = false;
      const updated = prev.map(car => {
        let newZ = car.z + (gameState.speed - car.speed / 3.6) * delta * 0.3;
        if (newZ > -10) {
          newZ = -60 - Math.random() * 60;
          const laneIdx = Math.floor(Math.random() * LANES.length);
          return { ...car, z: newZ, x: LANES[laneIdx], lane: laneIdx };
        }
        const dist = Math.abs(newZ);
        if (car.lane === currentLane && dist < 16 && dist > 8) {
          collided = true;
        }
        return { ...car, z: newZ, detected: dist < 35 && dist > 10 };
      });
      if (collided) {
        setGameState(s => s.gameOver ? s : { ...s, crashed: true, gameOver: true, fsdMessage: 'Collision detected!' });
      }
      return updated;
    });
  }, [gameState.speed]);

  const restart = useCallback(() => {
    setGameState({ ...initialState, score: 0 });
    setPlayerLane(1);
    playerLaneRef.current = 1;
    initNPCs();
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(cycleFsdMessage, 3000);
  }, [initNPCs, cycleFsdMessage]);

  return {
    gameState,
    npcCars,
    playerLane,
    setPlayerLane,
    changePlayerLane,
    setProfile,
    toggleFsd,
    tick,
    restart,
  };
}
