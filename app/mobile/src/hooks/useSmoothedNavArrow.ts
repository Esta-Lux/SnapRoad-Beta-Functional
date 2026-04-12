import { useEffect, useRef, useState } from 'react';

const TICK_MS = 33;
const POS_ALPHA = 0.22;
const HDG_ALPHA = 0.28;

function blendHeading(prev: number, target: number, alpha: number): number {
  const d = ((target - prev + 540) % 360) - 180;
  return (prev + alpha * d + 360) % 360;
}

/**
 * EMA-smoothed lat/lng/heading for the GPU nav arrow — reduces jitter from raw GPS
 * while keeping {@link useDriveNavigation} puck/camera on the existing snap path.
 */
export function useSmoothedNavArrow(
  active: boolean,
  lat: number,
  lng: number,
  headingDeg: number,
): { lat: number; lng: number; headingDeg: number } {
  const [out, setOut] = useState({ lat, lng, headingDeg });
  const targetRef = useRef({ lat, lng, h: headingDeg });
  const smoothRef = useRef({ lat, lng, h: headingDeg });

  useEffect(() => {
    targetRef.current = { lat, lng, h: headingDeg };
  }, [lat, lng, headingDeg]);

  useEffect(() => {
    if (!active) {
      smoothRef.current = { lat, lng, h: headingDeg };
      setOut({ lat, lng, headingDeg });
      return;
    }
    const t = targetRef.current;
    smoothRef.current = { lat: t.lat, lng: t.lng, h: t.h };
    setOut({ lat: t.lat, lng: t.lng, headingDeg: t.h });

    const id = setInterval(() => {
      const tg = targetRef.current;
      const s = smoothRef.current;
      s.lat += POS_ALPHA * (tg.lat - s.lat);
      s.lng += POS_ALPHA * (tg.lng - s.lng);
      s.h = blendHeading(s.h, tg.h, HDG_ALPHA);
      setOut({ lat: s.lat, lng: s.lng, headingDeg: s.h });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [active]);

  return out;
}
