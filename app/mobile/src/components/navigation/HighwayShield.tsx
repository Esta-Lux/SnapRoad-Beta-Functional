import React from 'react';
import type { RoadShield } from '../../navigation/navModel';
import HighwayShieldBadge from './HighwayShieldBadge';

type Props = {
  shields: RoadShield[];
  textColor?: string;
  maxShields?: number;
};

export default function HighwayShield({
  shields,
  textColor = '#111827',
  maxShields = 2,
}: Props) {
  return (
    <HighwayShieldBadge
      shields={shields}
      textColor={textColor}
      maxShields={maxShields}
    />
  );
}
