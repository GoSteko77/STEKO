import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText, TSpan } from "react-native-svg";

import { MONO } from "@/constants/theme";

export interface MountainCheckpoint {
  id: string;
  title: string;
  done: boolean;
}

interface BlueprintMountainProps {
  width: number;
  height: number;
  checkpoints: MountainCheckpoint[];
  accent: string;
  lineColor: string;
  faintColor: string;
  surfaceColor: string;
  labelColor?: string;
  showLabels?: boolean;
  interactive?: boolean;
  selectedId?: string | null;
  onPressCheckpoint?: (id: string) => void;
  summitLabel?: string;
}

interface NodePosition {
  x: number;
  y: number;
}

/** Silhouette ratio points for the ridge line. */
const RIDGE: [number, number][] = [
  [0.04, 0.92],
  [0.34, 0.44],
  [0.42, 0.54],
  [0.58, 0.1],
  [0.7, 0.42],
  [0.77, 0.35],
  [0.96, 0.92],
];

const PEAK: [number, number] = [0.58, 0.1];
const BASE_Y = 0.92;

function edgeXAt(yRatio: number): { left: number; right: number } {
  const t = (BASE_Y - yRatio) / (BASE_Y - PEAK[1]);
  const left = 0.04 + (PEAK[0] - 0.04) * t;
  const right = 0.96 - (0.96 - PEAK[0]) * t;
  return { left, right };
}

export function computeNodePositions(
  count: number,
  width: number,
  height: number,
): NodePosition[] {
  const positions: NodePosition[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    const yRatio = 0.86 - (0.86 - 0.22) * t;
    const { left, right } = edgeXAt(yRatio);
    const mid = (left + right) / 2;
    const spread = (right - left) / 2;
    const bias = i % 2 === 0 ? -0.45 : 0.45;
    positions.push({
      x: (mid + spread * bias) * width,
      y: yRatio * height,
    });
  }
  return positions;
}

/**
 * The STEKO signature: a minimal blueprint mountain with an ascending
 * checkpoint route. Checkpoints animate when completed and can be tapped.
 */
export default function BlueprintMountain({
  width,
  height,
  checkpoints,
  accent,
  lineColor,
  faintColor,
  surfaceColor,
  labelColor,
  showLabels = false,
  interactive = false,
  selectedId = null,
  onPressCheckpoint,
  summitLabel,
}: BlueprintMountainProps) {
  const nodes = computeNodePositions(checkpoints.length, width, height);
  const peak: NodePosition = { x: PEAK[0] * width, y: PEAK[1] * height };
  const routeStart: NodePosition = { x: 0.18 * width, y: 0.9 * height };

  const ridgePoints = RIDGE.map(([x, y]) => `${x * width},${y * height}`).join(" ");
  const routePoints = [routeStart, ...nodes, { x: peak.x, y: peak.y + 6 }]
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  const contourYs = [0.62, 0.76];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line
          x1={0.02 * width}
          y1={BASE_Y * height}
          x2={0.98 * width}
          y2={BASE_Y * height}
          stroke={faintColor}
          strokeWidth={1}
          strokeDasharray="2 6"
        />
        {contourYs.map((cy) => {
          const { left, right } = edgeXAt(cy);
          return (
            <Line
              key={`contour-${cy}`}
              x1={(left + 0.04) * width}
              y1={cy * height}
              x2={(right - 0.04) * width}
              y2={cy * height}
              stroke={faintColor}
              strokeWidth={StyleSheet.hairlineWidth}
              strokeDasharray="1 5"
            />
          );
        })}
        <Polyline
          points={ridgePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Polyline
          points={routePoints}
          fill="none"
          stroke={accent}
          strokeWidth={1.25}
          strokeDasharray="4 5"
          opacity={0.75}
        />
        <Line
          x1={peak.x}
          y1={peak.y - 4}
          x2={peak.x}
          y2={peak.y - 16}
          stroke={accent}
          strokeWidth={1.5}
        />
        <Polyline
          points={`${peak.x},${peak.y - 16} ${peak.x + 10},${peak.y - 12.5} ${peak.x},${peak.y - 9}`}
          fill={accent}
          stroke={accent}
          strokeWidth={1}
        />
        {summitLabel && (
          <SvgText
            x={peak.x + 16}
            y={peak.y - 12}
            fill={labelColor ?? lineColor}
            fontSize={10}
            fontFamily={MONO}
            letterSpacing={1.2}
          >
            {summitLabel.toUpperCase()}
          </SvgText>
        )}
        {nodes.map((n, i) => {
          const cp = checkpoints[i];
          const selected = selectedId === cp.id;
          return (
            <React.Fragment key={cp.id}>
              {selected && (
                <Circle
                  cx={n.x}
                  cy={n.y}
                  r={13}
                  fill="none"
                  stroke={accent}
                  strokeWidth={1}
                  opacity={0.5}
                />
              )}
              <Circle
                cx={n.x}
                cy={n.y}
                r={7}
                fill={cp.done ? accent : surfaceColor}
                stroke={cp.done ? accent : lineColor}
                strokeWidth={1.5}
              />
              {cp.done && (
                <Polyline
                  points={`${n.x - 3},${n.y} ${n.x - 1},${n.y + 2.4} ${n.x + 3.2},${n.y - 2.4}`}
                  fill="none"
                  stroke={surfaceColor}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {showLabels && (() => {
                const labelX = i % 2 === 0 ? n.x - 14 : n.x + 14;
                const anchor = i % 2 === 0 ? "end" : "start";
                const words = cp.title.split(" ");
                const maxCharsPerLine = 14;
                const lines: string[] = [];
                let current = "";
                for (const word of words) {
                  if ((current + " " + word).trim().length > maxCharsPerLine) {
                    if (current) lines.push(current);
                    current = word;
                  } else {
                    current = (current + " " + word).trim();
                  }
                }
                if (current) lines.push(current);
                return (
                  <SvgText
                    x={labelX}
                    y={n.y + 3.5}
                    fill={labelColor ?? lineColor}
                    fontSize={9}
                    fontFamily={MONO}
                    letterSpacing={0.4}
                    textAnchor={anchor}
                  >
                    {lines.map((line, li) => (
                      <TSpan
                        key={`lbl-${i}-${li}`}
                        x={labelX}
                        dy={li === 0 ? 0 : 11}
                      >
                        {line}
                      </TSpan>
                    ))}
                  </SvgText>
                );
              })()}
            </React.Fragment>
          );
        })}
      </Svg>
      {interactive &&
        nodes.map((n, i) => {
          const cp = checkpoints[i];
          return (
            <Pressable
              key={`hit-${cp.id}`}
              onPress={() => onPressCheckpoint?.(cp.id)}
              style={[styles.hitArea, { left: n.x - 22, top: n.y - 22 }]}
              testID={`mountain-checkpoint-${cp.id}`}
            />
          );
        })}
    </View>
  );
}

interface PulseDotProps {
  color: string;
  size?: number;
}

/** Small breathing dot used to mark "current" states. */
export function PulseDot({ color, size = 6 }: PulseDotProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

const styles = StyleSheet.create({
  hitArea: {
    position: "absolute",
    width: 44,
    height: 44,
  },
});
