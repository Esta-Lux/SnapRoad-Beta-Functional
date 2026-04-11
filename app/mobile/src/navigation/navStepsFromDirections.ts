/**
 * Build rich {@link NavStep}[] from Mapbox Directions steps + polyline.
 * Single place we interpret bannerInstructions, intersections, maneuver type/modifier, lanes.
 */

import type { DirectionsStep } from '../lib/directions';
import type { Coordinate } from '../types';
import type {
  LaneIndication,
  LaneInfo,
  ManeuverKind,
  NavStep,
  RoadShield,
  RoadSignal,
  RoadSignalKind,
} from './navModel';
import { nearestSegmentIndex } from './navGeometry';

const MANEUVER_MAP: Record<string, Record<string, ManeuverKind>> = {
  turn: {
    left: 'turn_left',
    right: 'turn_right',
    'sharp left': 'sharp_left',
    'sharp right': 'sharp_right',
    'slight left': 'slight_left',
    'slight right': 'slight_right',
    straight: 'straight',
    uturn: 'uturn',
  },
  'end of road': {
    left: 'turn_left',
    right: 'turn_right',
  },
  merge: {
    left: 'merge_left',
    right: 'merge_right',
    straight: 'merge',
  },
  'on ramp': {
    left: 'on_ramp_left',
    right: 'on_ramp_right',
    'slight left': 'on_ramp_left',
    'slight right': 'on_ramp_right',
  },
  'off ramp': {
    left: 'off_ramp_left',
    right: 'off_ramp_right',
    'slight left': 'off_ramp_left',
    'slight right': 'off_ramp_right',
  },
  fork: {
    left: 'fork_left',
    right: 'fork_right',
    'slight left': 'fork_left',
    'slight right': 'fork_right',
  },
  roundabout: {
    left: 'roundabout_left',
    right: 'roundabout_right',
    straight: 'roundabout_straight',
  },
  rotary: {
    left: 'roundabout_left',
    right: 'roundabout_right',
    straight: 'roundabout_straight',
  },
  'roundabout turn': {
    left: 'roundabout_left',
    right: 'roundabout_right',
    straight: 'roundabout_straight',
  },
  continue: {
    left: 'keep_left',
    right: 'keep_right',
    straight: 'continue',
    'slight left': 'keep_left',
    'slight right': 'keep_right',
    uturn: 'uturn',
  },
  arrive: { '': 'arrive' },
  depart: { '': 'depart' },
  notification: { '': 'notification' },
};

export function resolveManeuverKind(type: string, modifier: string): ManeuverKind {
  const t = (type || '').toLowerCase().trim();
  const m = (modifier || '').toLowerCase().trim();

  if (t === 'arrive') return 'arrive';
  if (t === 'depart') return 'depart';

  const bucket = MANEUVER_MAP[t];
  if (bucket) {
    const exact = bucket[m];
    if (exact) return exact;
    const simple = m.replace(/^(sharp|slight)\s+/, '');
    if (bucket[simple]) return bucket[simple]!;
  }

  if (m.includes('left')) return 'turn_left';
  if (m.includes('right')) return 'turn_right';
  if (m === 'straight') return 'straight';
  if (m.includes('uturn') || m.includes('u-turn')) return 'uturn';

  return 'unknown';
}

function rawTypeModifierFromStep(step: DirectionsStep): { rawType: string; rawModifier: string } {
  const mm = step.mapboxManeuver;
  if (mm?.type != null || mm?.modifier != null) {
    return { rawType: String(mm.type ?? ''), rawModifier: String(mm.modifier ?? '') };
  }
  const simple = (step.maneuver || 'straight').toLowerCase();
  if (simple === 'arrive') return { rawType: 'arrive', rawModifier: '' };
  if (simple === 'depart') return { rawType: 'depart', rawModifier: '' };
  if (simple === 'u-turn' || simple === 'uturn') return { rawType: 'turn', rawModifier: 'uturn' };
  if (simple === 'merge') return { rawType: 'merge', rawModifier: 'straight' };
  if (simple === 'fork') return { rawType: 'fork', rawModifier: 'right' };
  if (simple === 'roundabout') return { rawType: 'roundabout', rawModifier: 'straight' };
  if (simple.includes('sharp-left')) return { rawType: 'turn', rawModifier: 'sharp left' };
  if (simple.includes('sharp-right')) return { rawType: 'turn', rawModifier: 'sharp right' };
  if (simple.includes('slight-left')) return { rawType: 'turn', rawModifier: 'slight left' };
  if (simple.includes('slight-right')) return { rawType: 'turn', rawModifier: 'slight right' };
  if (simple === 'left') return { rawType: 'turn', rawModifier: 'left' };
  if (simple === 'right') return { rawType: 'turn', rawModifier: 'right' };
  if (simple === 'straight') return { rawType: 'continue', rawModifier: 'straight' };
  return { rawType: 'continue', rawModifier: 'straight' };
}

function extractRoadSignal(step: DirectionsStep): RoadSignal {
  const ixns = step.intersections as
    | Array<{
        classes?: string[];
        traffic_signal?: boolean;
        stop_sign?: boolean;
        yield_sign?: boolean;
        railway_crossing?: boolean;
        toll_collection?: unknown;
      }>
    | undefined;

  if (!ixns?.length) return { kind: 'none', label: '' };

  const maneuverIxn = ixns[ixns.length - 1]!;
  const classes = maneuverIxn.classes ?? [];

  if (maneuverIxn.toll_collection || classes.includes('toll')) {
    return { kind: 'toll_booth', label: 'At the toll booth' };
  }
  if (maneuverIxn.railway_crossing || classes.includes('railway_crossing')) {
    return { kind: 'railway_crossing', label: 'At the railway crossing' };
  }
  if (maneuverIxn.traffic_signal || classes.includes('traffic_signal')) {
    return { kind: 'traffic_light', label: 'At the traffic light' };
  }
  if (maneuverIxn.stop_sign || classes.includes('stop_sign')) {
    return { kind: 'stop_sign', label: 'At the stop sign' };
  }
  if (maneuverIxn.yield_sign || classes.includes('yield')) {
    return { kind: 'yield', label: 'At the yield' };
  }

  if (ixns.length > 1) {
    const first = ixns[0]!;
    const fc = first.classes ?? [];
    if (first.traffic_signal || fc.includes('traffic_signal')) {
      return { kind: 'traffic_light', label: 'At the traffic light' };
    }
    if (first.stop_sign || fc.includes('stop_sign')) {
      return { kind: 'stop_sign', label: 'At the stop sign' };
    }
  }

  return { kind: 'none', label: '' };
}

function parseLaneIndication(raw: string): LaneIndication {
  const s = raw.toLowerCase().trim();
  if (s === 'left') return 'left';
  if (s === 'slight left') return 'slight_left';
  if (s === 'right') return 'right';
  if (s === 'slight right') return 'slight_right';
  if (s === 'uturn' || s === 'u-turn') return 'uturn';
  return 'straight';
}

function extractLanes(step: DirectionsStep): LaneInfo[] {
  const ixns = step.intersections as
    | Array<{
        lanes?: Array<{
          valid?: boolean;
          active?: boolean;
          indications?: string[];
          valid_indication?: string;
        }>;
      }>
    | undefined;

  if (!ixns?.length) return [];

  const last = ixns[ixns.length - 1];
  if (!last?.lanes?.length) return [];

  return last.lanes.map((lane) => {
    const indications = (lane.indications ?? []).map(parseLaneIndication);
    const preferred = lane.valid_indication
      ? indications.includes(parseLaneIndication(lane.valid_indication))
      : Boolean(lane.valid);
    return {
      indications,
      active: Boolean(lane.valid),
      preferred,
    };
  });
}

interface BannerComponent {
  text: string;
  type?: string;
  abbr?: string;
  mapbox_shield?: { base_url?: string; display_ref?: string; name?: string; text_color?: string };
}

interface BannerInstruction {
  text: string;
  type?: string;
  modifier?: string;
  components?: BannerComponent[];
  degrees?: number;
  driving_side?: string;
}

interface BannerInstructionSet {
  distanceAlongGeometry?: number;
  primary?: BannerInstruction;
  secondary?: BannerInstruction | null;
  sub?: BannerInstruction | null;
}

function getBannerText(banner: BannerInstruction | null | undefined): string {
  if (!banner) return '';
  return (banner.text ?? '').trim();
}

function extractShields(banner: BannerInstruction | null | undefined): RoadShield[] {
  if (!banner?.components?.length) return [];
  const shields: RoadShield[] = [];
  for (const comp of banner.components) {
    if (comp.mapbox_shield) {
      shields.push({
        network: comp.mapbox_shield.name ?? '',
        ref: comp.text ?? '',
        displayRef: comp.mapbox_shield.display_ref ?? comp.text ?? '',
      });
    }
    if (comp.type === 'icon' && comp.text) {
      const alreadyHas = shields.some((s) => s.ref === comp.text);
      if (!alreadyHas) {
        shields.push({
          network: '',
          ref: comp.text,
          displayRef: comp.abbr ?? comp.text,
        });
      }
    }
  }
  return shields;
}

function extractDestinationRoad(banner: BannerInstruction | null | undefined): string | null {
  if (!banner?.components?.length) return null;
  const textParts = banner.components
    .filter((c) => c.type === 'text' || !c.type)
    .map((c) => c.text?.trim())
    .filter(Boolean);
  return textParts.length > 0 ? textParts[textParts.length - 1]! : null;
}

function extractRoundaboutExit(step: DirectionsStep): number | null {
  const ex = step.mapboxManeuver?.exit;
  if (typeof ex === 'number' && ex >= 1) return ex;
  return null;
}

function extractVoiceAnnouncement(step: DirectionsStep): string | null {
  const voice = step.voiceInstructions;
  if (voice?.length) {
    const first = voice[0];
    if (first?.announcement?.trim()) return first.announcement.trim();
  }
  return null;
}

function cumulativeDistancesFromSteps(steps: DirectionsStep[]): number[] {
  const cums: number[] = [];
  let total = 0;
  for (const step of steps) {
    cums.push(total);
    total += step.distanceMeters ?? 0;
  }
  return cums;
}

/**
 * Build {@link NavStep} list for {@link useNavigationProgress} from Mapbox-parsed steps + full polyline.
 */
export function buildNavStepsFromDirections(steps: DirectionsStep[], polyline: Coordinate[]): NavStep[] {
  if (!steps.length) return [];

  const route = polyline.map((p) => ({ lat: p.lat, lng: p.lng }));
  const cumDists = cumulativeDistancesFromSteps(steps);
  const result: NavStep[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const { rawType, rawModifier } = rawTypeModifierFromStep(step);
    const kind = resolveManeuverKind(rawType, rawModifier);
    const bearingAfter = step.mapboxManeuver?.bearing_after ?? 0;

    const banners = (step.bannerInstructions ?? []) as BannerInstructionSet[];
    const primaryBanner = banners[0]?.primary ?? null;
    const secondaryBanner = banners[0]?.secondary ?? null;
    const subBanner = banners[0]?.sub ?? null;

    const primaryText = getBannerText(primaryBanner);
    const rawInstruction = step.instruction || '';
    const displayInstruction = primaryText || rawInstruction || '';

    const streetName = step.name?.trim() || null;
    const destinationRoad = extractDestinationRoad(primaryBanner);
    const shields = extractShields(primaryBanner);
    const signal = extractRoadSignal(step);
    const lanes = extractLanes(step);
    const roundaboutExitNumber = extractRoundaboutExit(step);
    const voiceAnnouncement = extractVoiceAnnouncement(step);

    const stepLen = step.distanceMeters ?? 0;
    const nextSt = i + 1 < steps.length ? steps[i + 1]! : null;
    let nextManeuverKind: ManeuverKind | null = null;
    let nextManeuverStreet: string | null = null;
    let nextManeuverDistanceMeters: number | null = null;
    if (nextSt) {
      const nm = rawTypeModifierFromStep(nextSt);
      nextManeuverKind = resolveManeuverKind(nm.rawType, nm.rawModifier);
      nextManeuverStreet = nextSt.name?.trim() || null;
      nextManeuverDistanceMeters = stepLen;
    }

    const ptOk =
      Number.isFinite(step.lat) &&
      Number.isFinite(step.lng) &&
      (Math.abs(step.lat) > 1e-5 || Math.abs(step.lng) > 1e-5);
    const pt = ptOk && route.length >= 2 ? { lat: step.lat, lng: step.lng } : route[0]!;
    const segmentIndex = route.length >= 2 ? nearestSegmentIndex(route, pt) : 0;

    const fallbackToNext = nextSt?.distanceMeters ?? stepLen;

    result.push({
      index: i,
      segmentIndex,
      kind,
      rawType,
      rawModifier,
      bearingAfter,
      displayInstruction,
      secondaryInstruction: getBannerText(secondaryBanner) || null,
      subInstruction: getBannerText(subBanner) || null,
      instruction: step.instruction || '',
      streetName,
      destinationRoad,
      shields,
      signal,
      lanes,
      roundaboutExitNumber,
      distanceMetersFromStart: cumDists[i] ?? 0,
      distanceMeters: stepLen,
      distanceMetersToNext: fallbackToNext,
      durationSeconds: Math.max(0, step.durationSeconds ?? 0),
      voiceAnnouncement,
      nextManeuverKind,
      nextManeuverStreet,
      nextManeuverDistanceMeters,
    });
  }

  return result;
}
