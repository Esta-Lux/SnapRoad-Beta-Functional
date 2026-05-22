/**
 * Shared SVG lane art (14×14 viewBox). No `react-native` import — safe for Node unit tests.
 * “Ahead” is toward the top of the view (−Y), matching the top-stacked turn card.
 */
export const LANE_SVG_STRAIGHT_PATH_START = 'M7 12' as const;

export const LANE_SVG_STRAIGHT =
  'M7 12V3M3.5 6.5L7 3l3.5 3.5' as const;
