import React from "react";
import { View } from "react-native";
import Svg, { Line, Path, Polyline } from "react-native-svg";

interface StickmanClimberProps {
  width: number;
  height: number;
  color: string;
  faintColor: string;
}

/**
 * A blueprint summit ridge with contours, route line, and summit flag.
 */
export default function StickmanClimber({
  width,
  height,
  color: _color,
  faintColor,
}: StickmanClimberProps) {
  const w = width;
  const h = height;

  // Blueprint summit ridge: rises from bottom-left to upper-right peak
  const ridgePoints = `${0.05 * w},${0.9 * h} ${0.28 * w},${0.62 * h} ${0.48 * w},${0.38 * h} ${0.68 * w},${0.2 * h} ${0.84 * w},${0.18 * h} ${0.98 * w},${0.08 * h}`;
  const peakX = 0.84 * w;
  const peakY = 0.18 * h;

  // Slope fill under the ridge
  const slopeFill = `M 0,${h} L ${0.05 * w},${0.9 * h} L ${0.28 * w},${0.62 * h} L ${0.48 * w},${0.38 * h} L ${0.68 * w},${0.2 * h} L ${0.84 * w},${0.18 * h} L ${0.98 * w},${0.08 * h} L ${w},${0} L ${w},${h} Z`;

  // Dashed route line up the ridge
  const routePoints = `0,${0.94 * h} ${0.22 * w},${0.72 * h} ${0.42 * w},${0.48 * h} ${0.62 * w},${0.3 * h} ${0.84 * w},${0.18 * h} ${0.98 * w},${0.08 * h}`;

  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h}>
        {/* Slope surface fill */}
        <Path d={slopeFill} fill={faintColor} opacity={0.08} />

        {/* Dashed contour lines */}
        <Line
          x1={0.12 * w}
          y1={0.76 * h}
          x2={0.64 * w}
          y2={0.76 * h}
          stroke={faintColor}
          strokeWidth={1}
          strokeDasharray="4 6"
          opacity={0.4}
        />
        <Line
          x1={0.32 * w}
          y1={0.56 * h}
          x2={0.82 * w}
          y2={0.56 * h}
          stroke={faintColor}
          strokeWidth={1}
          strokeDasharray="4 6"
          opacity={0.35}
        />

        {/* Ridge outline */}
        <Polyline
          points={ridgePoints}
          fill="none"
          stroke={faintColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
        />

        {/* Dashed route up the summit */}
        <Polyline
          points={routePoints}
          fill="none"
          stroke={faintColor}
          strokeWidth={1.5}
          strokeDasharray="5 6"
          strokeLinecap="round"
          opacity={0.55}
        />

        {/* Summit flag */}
        <Line
          x1={peakX}
          y1={peakY}
          x2={peakX}
          y2={peakY - 18}
          stroke={faintColor}
          strokeWidth={1.5}
        />
        <Path
          d={`M ${peakX},${peakY - 18} L ${peakX + 14},${peakY - 13} L ${peakX},${peakY - 8} Z`}
          fill={faintColor}
          opacity={0.8}
        />
      </Svg>
    </View>
  );
}
