import { useState, useRef, useCallback, useEffect } from 'react';
import { GameState, CarData, ScoreEvent } from './types';
import {
  LANES, FSD_MESSAGES, NAV_TARGETS, MAX_NPC_CARS,
  SCORE_SAFE_OVERTAKE, SCORE_SMOOTH_LANE_CHANGE, SCORE_NEAR_MISS,
  NPC_COLORS,
} from './constants';

let scoreEventId = 0;

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
  fsdConfidence: 88,
  combo: 1,
  scoreEvents: [],
  nearMissActive: false,
  decisionMoment: null,
};

function makeNpcCar(i: number, minZ = -45): CarData {
  const laneIdx = Math.floor(Math.random() * LANES.length);
  const type = Math.random() < 0.15 ? 'truck' : Math.random() < 0.4 ? 'suv' : 'sedan';
  const palette = NPC_COLORS[type];
  // Spread cars through z range with minimum distance from player
  const zRange = 70;
  return {
    id: `car-${i}-${Date.now()}`,
    x: LANES[laneIdx],
    z: minZ - Math.random() * zRange,
    speed: 24 + Math.random() * 36,
    lane: laneIdx,
    targetLane: laneIdx,
    type,
    detected: false,
    braking: false,
    changingLane: false,
    color: palette[Math.floor(Math.random() * palette.length)],
  };
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [npcCars, setNpcCars] = useState<CarData[]>([]);
  const [playerLane, setPlayerLane] = useState(1);

  // Refs to avoid stale closures in the tick loop
  const playerLaneRef = useRef(1);
  const speedRef = useRef(0);
  const gameOverRef = useRef(false);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decisionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const npcBehaviorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overtakeTrackerRef = useRef<Set<string>>(new Set()); // tracks NPCs already scored

  const initNPCs = useCallback(() => {
    const cars: CarData[] = [];
    for (let i = 0; i < MAX_NPC_CARS; i++) cars.push(makeNpcCar(i));
    setNpcCars(cars);
  }, []);

  const cycleFsdMessage = useCallback(() => {
    if (gameOverRef.current) return;
    setGameState(s => ({
      ...s,
      fsdMessage: FSD_MESSAGES[Math.floor(Math.random() * FSD_MESSAGES.length)],
    }));
    const delay = 3500 + Math.random() * 4500;
    messageTimerRef.current = setTimeout(cycleFsdMessage, delay);
  }, []);

  // Trigger a random decision moment every 10–15 seconds
  const scheduleDecision = useCallback(() => {
    if (gameOverRef.current) return;
    const delay = 10000 + Math.random() * 5000;
    decisionTimerRef.current = setTimeout(() => {
      if (gameOverRef.current) return;
      const type = Math.random() < 0.5 ? 'overtake' : 'exit';
      setGameState(s => ({
        ...s,
        decisionMoment: { type, active: true, timeLeft: 6 },
        fsdMessage: type === 'overtake' ? 'Overtake opportunity detected' : 'Exit ramp approaching',
      }));
      // Auto-dismiss after 6s
      setTimeout(() => {
        setGameState(s => ({ ...s, decisionMoment: null }));
        scheduleDecision();
      }, 6000);
    }, delay);
  }, []);

  // Randomly mutate NPC driving behaviour every few seconds
  const scheduleNpcBehavior = useCallback(() => {
    if (gameOverRef.current) return;
    npcBehaviorTimerRef.current = setTimeout(() => {
      if (gameOverRef.current) return;
      setNpcCars(prev => prev.map(car => {
        const roll = Math.random();
        if (roll < 0.15) {
          // Sudden brake
          return { ...car, braking: true };
        } else if (roll < 0.28) {
          // Lane change to adjacent lane
          const adj = Math.random() < 0.5 ? -1 : 1;
          const newLane = Math.max(0, Math.min(LANES.length - 1, car.lane + adj));
          return { ...car, targetLane: newLane, changingLane: true };
        } else if (roll < 0.32) {
          // Resume normal speed
          return { ...car, braking: false };
        }
        return car;
      }));
      scheduleNpcBehavior();
    }, 2500 + Math.random() * 2000);
  }, []);

  const setProfile = useCallback((profile: GameState['profile']) => {
    setGameState(s => ({
      ...s,
      profile,
      targetSpeed: profile === 'Chill' ? 55 : profile === 'Average' ? 65 : 80,
    }));
  }, []);

  const toggleFsd = useCallback(() => {
    setGameState(s => ({
      ...s,
      fsdEnabled: !s.fsdEnabled,
      fsdMessage: s.fsdEnabled ? 'Autopilot disengaged — Manual control' : 'Full Self-Driving active',
    }));
  }, []);

  const changePlayerLane = useCallback((dir: -1 | 1) => {
    if (gameOverRef.current) return;
    setPlayerLane(prev => {
      const next = Math.max(0, Math.min(LANES.length - 1, prev + dir));
      if (next === prev) return prev;
      playerLaneRef.current = next;

      setGameState(s => {
        // Check if nearby NPC in current lane — smooth change is valid if clear
        const smooth = true; // scored in tick when NPC passes
        const newEvents: ScoreEvent[] = smooth
          ? [...s.scoreEvents, { id: scoreEventId++, value: SCORE_SMOOTH_LANE_CHANGE * s.combo, label: `+${SCORE_SMOOTH_LANE_CHANGE * s.combo} Smooth` }]
          : s.scoreEvents;
        return {
          ...s,
          laneChangeActive: true,
          fsdMessage: 'Lane change in progress',
          score: s.score + (smooth ? SCORE_SMOOTH_LANE_CHANGE * s.combo : 0),
          scoreEvents: newEvents,
          combo: Math.min(8, s.combo + (smooth ? 0.5 : 0)),
          fsdConfidence: Math.min(100, s.fsdConfidence + 1),
        };
      });
      setTimeout(() => setGameState(s => ({ ...s, laneChangeActive: false })), 900);
      return next;
    });
  }, []);

  const chooseDecision = useCallback((choice: 'yes' | 'no') => {
    setGameState(s => {
      if (!s.decisionMoment) return s;
      const bonus = choice === 'yes' ? SCORE_SAFE_OVERTAKE * s.combo : 0;
      return {
        ...s,
        decisionMoment: null,
        score: s.score + bonus,
        fsdConfidence: Math.min(100, s.fsdConfidence + (choice === 'yes' ? 3 : 0)),
        scoreEvents: bonus > 0
          ? [...s.scoreEvents, { id: scoreEventId++, value: bonus, label: `+${bonus} Decision` }]
          : s.scoreEvents,
      };
    });
  }, []);

  useEffect(() => {
    initNPCs();
    messageTimerRef.current = setTimeout(cycleFsdMessage, 3000);
    scheduleDecision();
    scheduleNpcBehavior();
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      if (decisionTimerRef.current) clearTimeout(decisionTimerRef.current);
      if (npcBehaviorTimerRef.current) clearTimeout(npcBehaviorTimerRef.current);
    };
  }, [initNPCs, cycleFsdMessage, scheduleDecision, scheduleNpcBehavior]);

  const tick = useCallback((delta: number) => {
    if (gameOverRef.current) return;

    setGameState(s => {
      if (s.gameOver) return s;
      speedRef.current = s.speed;

      // Speed simulation — FSD ramps up, manual coasts down
      const newSpeed = s.fsdEnabled
        ? Math.min(s.targetSpeed, s.speed + delta * 14)
        : Math.max(0, s.speed - delta * 6);

      const newDist = s.distance + (newSpeed / 3.6) * delta;

      // FSD confidence slowly recovers when driving smoothly
      const confRecover = s.fsdEnabled && !s.nearMissActive ? delta * 1.5 : 0;
      const newConf = Math.min(100, s.fsdConfidence + confRecover);

      // Tick down decision moment timer
      let dm = s.decisionMoment;
      if (dm && dm.active) {
        dm = { ...dm, timeLeft: Math.max(0, dm.timeLeft - delta) };
      }

      // Purge score events older than ~2s (we use array length as proxy; HUD handles timing)
      const newEvents = s.scoreEvents.slice(-6);

      return {
        ...s,
        speed: newSpeed,
        distance: newDist,
        fsdConfidence: newConf,
        decisionMoment: dm,
        scoreEvents: newEvents,
        nearMissActive: false, // reset; will be set true again in NPC loop if needed
      };
    });

    // NPC movement + collision detection
    setNpcCars(prev => {
      const currentLane = playerLaneRef.current;
      const currentSpeed = speedRef.current;
      let nearMiss = false;
      let collision = false;
      const overtakeScores: { value: number; label: string }[] = [];

      const updated = prev.map(car => {
        // Smooth lane switch animation
        let newX = car.x;
        let { changingLane, targetLane, lane } = car;
        if (changingLane) {
          const targetX = LANES[targetLane];
          newX = car.x + (targetX - car.x) * Math.min(1, delta * 1.8);
          if (Math.abs(newX - targetX) < 0.05) {
            newX = targetX;
            lane = targetLane;
            changingLane = false;
          }
        }

        // Braking: NPC slows to 40% speed → player approaches it faster
        const effectiveNpcSpeed = car.braking ? car.speed * 0.4 : car.speed;
        // Relative approach speed (positive = car coming toward player)
        const relSpeed = (currentSpeed - effectiveNpcSpeed / 3.6) * 0.3;
        let newZ = car.z + relSpeed * delta;

        // Car scrolled past player → recycle
        if (newZ > -10) {
          // Award safe overtake if car was in player's lane
          if (car.lane === currentLane && !overtakeTrackerRef.current.has(car.id)) {
            overtakeTrackerRef.current.add(car.id);
            overtakeScores.push({ value: SCORE_SAFE_OVERTAKE, label: `+${SCORE_SAFE_OVERTAKE} Overtake` });
          }
          const newCar = makeNpcCar(Math.random() * 1000);
          overtakeTrackerRef.current.delete(car.id);
          return newCar;
        }

        const dist = Math.abs(newZ);

        // Danger zone: car is very close in same lane
        if (car.lane === currentLane) {
          if (dist < 12 && dist > 6) nearMiss = true;
          if (dist < 7) collision = true;
        }

        return {
          ...car,
          x: newX,
          z: newZ,
          lane,
          targetLane,
          changingLane,
          braking: car.braking,
          detected: dist < 38 && dist > 10,
        };
      });

      // Apply score/confidence updates for events found in this tick
      if (nearMiss || collision || overtakeScores.length > 0) {
        setGameState(s => {
          if (s.gameOver) return s;
          let { score, fsdConfidence, combo, scoreEvents, fsdMessage } = s;
          let crashed = s.crashed;
          let gameOver: boolean = s.gameOver;

          if (collision) {
            crashed = true;
            gameOver = true;
            gameOverRef.current = true;
            score += -50;
            fsdConfidence = Math.max(0, fsdConfidence - 30);
            combo = 1;
            fsdMessage = 'Collision detected — Autopilot disengaged';
            scoreEvents = [...scoreEvents, { id: scoreEventId++, value: -50, label: '-50 Collision' }];
          } else if (nearMiss) {
            fsdConfidence = Math.max(0, fsdConfidence - 8);
            combo = 1;
            score += SCORE_NEAR_MISS;
            scoreEvents = [...scoreEvents, { id: scoreEventId++, value: SCORE_NEAR_MISS, label: `${SCORE_NEAR_MISS} Near Miss` }];
            fsdMessage = 'Near collision — confidence reduced';
          }

          for (const ev of overtakeScores) {
            const earned = ev.value * combo;
            score += earned;
            combo = Math.min(8, combo + 1);
            fsdConfidence = Math.min(100, fsdConfidence + 2);
            scoreEvents = [...scoreEvents, { id: scoreEventId++, value: earned, label: `+${earned} Overtake` }];
          }

          return {
            ...s,
            score: Math.max(0, score),
            fsdConfidence,
            combo,
            scoreEvents,
            nearMissActive: nearMiss && !collision,
            crashed,
            gameOver,
            fsdMessage,
          };
        });
      }

      return updated;
    });
  }, []);

  const restart = useCallback(() => {
    gameOverRef.current = false;
    overtakeTrackerRef.current.clear();
    speedRef.current = 0;
    playerLaneRef.current = 1;
    setGameState({ ...initialState });
    setPlayerLane(1);
    initNPCs();
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(cycleFsdMessage, 3000);
    scheduleDecision();
    scheduleNpcBehavior();
  }, [initNPCs, cycleFsdMessage, scheduleDecision, scheduleNpcBehavior]);

  return {
    gameState,
    npcCars,
    playerLane,
    changePlayerLane,
    setProfile,
    toggleFsd,
    tick,
    restart,
    chooseDecision,
  };
}
