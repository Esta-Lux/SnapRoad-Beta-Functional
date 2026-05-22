import type { LaneInfo, ManeuverKind } from '../navModel';
import { parseLaneIndication } from '../laneIndication';

export type LaneGuidanceData = {
  lanes: LaneInfo[];
  totalLanes: number;
  recommendedLaneIndex: number;
  isHighwayExit: boolean;
  distanceToLaneChange: number;
};

type RawLane = {
  indications?: string[];
  valid?: boolean;
  active?: boolean;
  valid_indication?: string;
  validIndication?: string;
};

export function parseLaneGuidance(args: {
  rawLanes?: RawLane[] | null;
  kind?: ManeuverKind | null;
  distanceMeters: number;
}): LaneGuidanceData {
  const lanes = (args.rawLanes ?? []).map((lane) => {
    const indications = (lane.indications ?? []).map(parseLaneIndication);
    const validRaw = lane.valid_indication ?? lane.validIndication;
    const displayIndication = validRaw ? parseLaneIndication(validRaw) : indications[0] ?? 'straight';
    return {
      indications,
      displayIndication,
      active: Boolean(lane.valid ?? lane.active),
      preferred: Boolean(lane.active || validRaw),
    };
  });
  return {
    lanes,
    totalLanes: lanes.length,
    recommendedLaneIndex: Math.max(0, lanes.findIndex((lane) => lane.preferred || lane.active)),
    isHighwayExit: Boolean(args.kind && /ramp|fork|merge/.test(args.kind)),
    distanceToLaneChange: args.distanceMeters,
  };
}
