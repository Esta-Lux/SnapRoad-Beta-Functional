export type AnnouncementRoadBand = 'highway' | 'arterial' | 'local';

export type AnnouncementThresholds = {
  preAnnounce: number;
  orion: number;
  immediate: number;
};

export const ANNOUNCEMENT_THRESHOLDS: Record<AnnouncementRoadBand, AnnouncementThresholds> = {
  highway: { preAnnounce: 500, orion: 150, immediate: 30 },
  arterial: { preAnnounce: 250, orion: 60, immediate: 15 },
  local: { preAnnounce: 100, orion: 30, immediate: 10 },
};

export function announcementBandForSpeed(speedMph: number): AnnouncementRoadBand {
  if (Number.isFinite(speedMph) && speedMph > 55) return 'highway';
  if (Number.isFinite(speedMph) && speedMph >= 30) return 'arterial';
  return 'local';
}

export function thresholdsForSpeed(speedMph: number): AnnouncementThresholds {
  return ANNOUNCEMENT_THRESHOLDS[announcementBandForSpeed(speedMph)];
}
