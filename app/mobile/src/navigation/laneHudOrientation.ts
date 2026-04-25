/**
 * HUD direction for turn-card lane art (no route math here).
 *
 * - **SVG** lane paths in `LaneGuidance` are authored in a 14×14 viewBox with “ahead” toward
 *   **−Y** (arrow tip at the top of the view) so glyphs read as forward on the top-stacked card.
 * - **Native lane PNGs** from Mapbox Navigation use the same HUD convention on current builds; if
 *   a specific OS or SDK rev ships map-anchored bitmaps, adjust {@link NATIVE_LANE_BITMAP_ROTATE}
 *   in one place (iOS / Android can differ here without touching progress adapters).
 */
import { Platform } from 'react-native';

export { LANE_SVG_STRAIGHT_PATH_START, LANE_SVG_STRAIGHT } from './laneSvgPaths';

/**
 * `transform: [{ rotate }]` on the `Image` for each native lane bitmap. Must stay aligned with
 * SVG `LANE_GLYPH_ROTATION_FIX_DEG` so the strip is internally consistent.
 */
const ROTATE_DEFAULT: '0deg' | '180deg' = '0deg';
const ROTATE_ANDROID: '0deg' | '180deg' = '0deg';

export const NATIVE_LANE_BITMAP_ROTATE: '0deg' | '180deg' =
  Platform.OS === 'android' ? ROTATE_ANDROID : ROTATE_DEFAULT;
