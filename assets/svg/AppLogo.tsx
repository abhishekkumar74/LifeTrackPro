import * as React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

type Props = { size?: number; color?: string; accent?: string };

/** LifeTrack Pro logo mark ("Spark i"). Default colours are for dark surfaces. */
export default function AppLogo({ size = 40, color = '#FFFFFF', accent = '#5B5CF0' }: Props) {
  const w = size * (356.45 / 444.09);
  return (
    <Svg width={w} height={size} viewBox="0 0 356.45 444.09">
      <G transform="translate(-16.35 427.64)">
        <Path d="M32.8 0V-292H98.4V-57.6H212.8V0Z" fill={color}/><Path d="M258.8 0V-172H229.6V-219.2H322.8V0Z" fill={color}/><Circle cx="276.20" cy="-331.04" r="80.15" fill={accent}/>
      </G>
    </Svg>
  );
}
