import React from 'react';
import { View } from 'react-native';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { DrivingMode } from '../../types';
import { NAV_THEME } from '../../navigation/navTheme';

type Props = {
  lat: number;
  lng: number;
  heading: number;
  mode: DrivingMode;
};

export default React.memo(function NavigationPuck({ lat, lng, heading, mode }: Props) {
  const puckColor = NAV_THEME[mode].puck;
  if (!isMapAvailable() || !MapboxGL || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const MB = MapboxGL;

  return (
    <MB.PointAnnotation id="custom-nav-puck" coordinate={[lng, lat]}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderWidth: 3,
          borderColor: 'rgba(255,255,255,0.98)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        }}
      >
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: puckColor,
            transform: [{ rotate: `${heading}deg` }],
          }}
        />
      </View>
    </MB.PointAnnotation>
  );
});
