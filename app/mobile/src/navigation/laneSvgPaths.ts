/**
 * Shared SVG lane art (14×14 viewBox). No `react-native` import — safe for Node unit tests.
 * “Ahead” is toward the top of the view (−Y), matching the top-stacked turn card.
 */
export const LANE_SVG_STRAIGHT_PATH_START = 'M6 2' as const;

export const LANE_SVG_STRAIGHT =
  'M6 2v8l-2.5-2.5L2 9l5 5 5-5-1.5-1.5L8 10V2H6z' as const;
