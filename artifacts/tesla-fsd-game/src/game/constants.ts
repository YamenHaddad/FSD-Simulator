export const LANES = [-6, -2, 2, 6];
export const PLAYER_LANE_INDEX = 1;
export const ROAD_WIDTH = 16;
export const ROAD_SEGMENT_LENGTH = 40;
export const NUM_ROAD_SEGMENTS = 12;
export const MAX_NPC_CARS = 8;
export const PLAYER_Z = 0;
export const CAR_DETECTION_RANGE = 35;

// Scoring constants
export const SCORE_SAFE_OVERTAKE = 10;
export const SCORE_SMOOTH_LANE_CHANGE = 5;
export const SCORE_NEAR_MISS = -15;
export const SCORE_COLLISION = -50;

// FSD confidence thresholds
export const CONFIDENCE_DANGER_ZONE = 40;
export const CONFIDENCE_WARNING_ZONE = 65;

// NPC color palette — subtle variations for realism
export const NPC_COLORS = {
  sedan: ['#8a8a8a', '#7a8090', '#909090', '#7c7c7c', '#8c8478'],
  suv:   ['#6a6a6a', '#606870', '#707070', '#686060', '#6a6878'],
  truck: ['#484848', '#404850', '#505050', '#484040', '#484858'],
};

export const FSD_MESSAGES = [
  'Following lead vehicle',
  'Navigating to destination',
  'Adjusting for traffic flow',
  'Monitoring all road objects',
  'Slowing for obstacle ahead',
  'Merging onto highway',
  'Evaluating lane change',
  'Optimal path calculated',
  'Scanning for pedestrians',
  'Maintaining safe following distance',
  'Traffic-aware cruise control active',
  'Route recalculated',
];

export const NAV_TARGETS = [
  { name: 'Palo Alto, CA', eta: '1:04 pm', distance: '0.5 mi', turn: '300 ft' },
  { name: 'Fremont Factory', eta: '2:30 pm', distance: '12.3 mi', turn: '0.2 mi' },
  { name: 'Mountain View, CA', eta: '3:15 pm', distance: '4.8 mi', turn: '500 ft' },
];
