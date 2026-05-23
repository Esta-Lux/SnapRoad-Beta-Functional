import type { LaneInfo } from '../navModel';
import { parseLaneIndication } from '../laneIndication';

export type ArrowDirection = 'up' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'uturn';

export type ParsedLane = {
  id: string;
  directions: string[];
  isValid: boolean;
  isRecommended: boolean;
  arrowType: ArrowDirection;
};

export type LaneData = {
  lanes: ParsedLane[];
  totalLanes: number;
  recommendedLaneIndex: number;
  showGuidance: boolean;
};

type RawLane = {
  indications?: string[] | null;
  valid?: boolean | null;
  active?: boolean | null;
  valid_indication?: string | null;
  validIndication?: string | null;
};

type BannerSubInstruction = {
  lanes?: RawLane[] | null;
} | null | undefined;

export function mapIndicationsToArrow(indications: string[], validIndication?: string | null): ArrowDirection {
  const normalized = [
    validIndication,
    ...indications,
  ]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().toLowerCase());

  if (normalized.includes('straight')) return 'up';
  if (normalized.includes('left') || normalized.includes('sharp left')) return 'left';
  if (normalized.includes('right') || normalized.includes('sharp right')) return 'right';
  if (normalized.includes('slight left')) return 'slight-left';
  if (normalized.includes('slight right')) return 'slight-right';
  if (normalized.includes('uturn') || normalized.includes('u-turn')) return 'uturn';
  return 'up';
}

export function parseLanes(bannerSub: BannerSubInstruction): LaneData | null {
  const raw = bannerSub?.lanes;
  if (!raw?.length) return null;

  const lanes = raw.map((lane, index): ParsedLane => {
    const directions = (lane.indications ?? []).filter((v): v is string => typeof v === 'string');
    const validIndication = lane.valid_indication ?? lane.validIndication ?? null;
    return {
      id: `lane-${index}`,
      directions,
      isValid: Boolean(lane.valid ?? lane.active ?? validIndication),
      isRecommended: Boolean(lane.active ?? validIndication),
      arrowType: mapIndicationsToArrow(directions, validIndication),
    };
  });

  return {
    lanes,
    totalLanes: lanes.length,
    recommendedLaneIndex: lanes.findIndex((lane) => lane.isRecommended),
    showGuidance: lanes.length >= 2 && lanes.some((lane) => !lane.isValid),
  };
}

export function laneInfosFromParsedLaneData(data: LaneData | null): LaneInfo[] {
  if (!data) return [];
  return data.lanes.map((lane) => ({
    indications: lane.directions.map(parseLaneIndication),
    displayIndication: parseLaneIndication(lane.directions[0] ?? 'straight'),
    active: lane.isValid,
    preferred: lane.isRecommended,
  }));
}
