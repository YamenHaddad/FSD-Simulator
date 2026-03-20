export const LANES = [-6, -2, 2, 6];
export const PLAYER_LANE_INDEX = 1;
export const ROAD_WIDTH = 16;
export const ROAD_SEGMENT_LENGTH = 40;
export const NUM_ROAD_SEGMENTS = 12;
export const MAX_NPC_CARS = 12;
export const PLAYER_Z = 0;
export const CAR_DETECTION_RANGE = 30;
export const CHEVRON_COUNT = 5;

export const FSD_MESSAGES = [
  'Following lead vehicle',
  'Navigating to destination',
  'Changing lanes for traffic',
  'Waiting for pedestrian',
  'Approaching intersection',
  'Adjusting for traffic',
  'Lane change in progress',
  'Slowing for obstacle',
  'Merging onto highway',
  'Monitoring all objects',
];

export const NAV_TARGETS = [
  { name: "Palo Alto, CA", eta: "1:04 pm", distance: "0.5 mi", turn: "300 ft" },
  { name: "Fremont Factory", eta: "2:30 pm", distance: "12.3 mi", turn: "0.2 mi" },
  { name: "Mountain View, CA", eta: "3:15 pm", distance: "4.8 mi", turn: "500 ft" },
];

export const COLORS = {
  road: '#e8e8e8',
  roadLines: '#cccccc',
  ground: '#f0f0f0',
  playerCar: '#cc44ff',
  npcCar: '#888888',
  npcTruck: '#444444',
  pathHighlight: '#4488ff',
  chevronBlue: '#2277ee',
  detected: '#3388ff',
  sky: '#f5f5f5',
};
