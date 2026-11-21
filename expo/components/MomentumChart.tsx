import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

/**
 * react-native-svg's `Path` renders as a DOM <path> on web. Wrapping it in
 * `Animated.createAnimatedComponent` injects `collapsable={false}`, which is
 * not a valid SVG attribute and triggers a React DOM runtime error.
 * Instead we drive `strokeDashoffset` through a JS Animated listener and feed
 * the value back into a plain `Path` via state — works on native and web.
 */

interface MomentumChartProps {
  data: number[];
  height?: number;
  color: string;
  gridColor: string;
  animated?: boolean;
  /** Fixed y-axis minimum. If omitted, uses data min. */
  yMin?: number;
  /** Fixed y-axis maximum. If omitted, uses data max. */
  yMax?: number;
  /** Color for the 0-29 "slipping" zone band. */
  slippingZoneColor?: string;
  /** Color for the 30-69 "holding" zone band. */
  holdingZoneColor?: string;
  /** Color for the 70-100 "climbing" zone band. */
  climbingZoneColor?: string;
  /** Show zone band background regions. */
  showZones?: boolean;
}

interface Point {
  x: number;
  y: number;
}

function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len * 1.2;
}

/**
 * Stock-chart-inspired momentum graph with blueprint grid styling
 * and an animated draw-in stroke.
 */
export default function MomentumChart({
  data,
  height = 180,
  color,
  gridColor,
  animated = true,
  yMin,
  yMax,
  slippingZoneColor,
  holdingZoneColor,
  climbingZoneColor,
  showZones = false,
}: MomentumChartProps) {
  const [width, setWidth] = useState<number>(0);
  const [dashOffset, setDashOffset] = useState<number>(animated ? 0 : 1);
  const progress = useRef(new Animated.Value(animated ? 0 : 1)).current;

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      setDashOffset(value);
    });
    return () => progress.removeListener(id);
  }, [progress]);

  const { linePath, points, totalLength, zones } = useMemo(() => {
    if (width === 0 || data.length < 2) {
      return {
        linePath: "",
        points: [] as Point[],
        totalLength: 0,
        zones: null as null | { slippingY: number; slippingH: number; holdingY: number; holdingH: number; climbingY: number; climbingH: number },
      };
    }
    const padTop = 14;
    const padBottom = 14;
    const padRight = 14;
    const min = yMin ?? Math.min(...data);
    const max = yMax ?? Math.max(...data);
    const range = Math.max(max - min, 1);
    const innerHeight = height - padTop - padBottom;
    const toPoint = (v: number, i: number): Point => ({
      x: (i / (data.length - 1)) * (width - padRight),
      y: padTop + (1 - (v - min) / range) * innerHeight,
    });
    const pts = data.map(toPoint);
    // Zone band y-coordinates (only meaningful with fixed yMin/yMax 0-100).
    const yFor = (val: number) => padTop + (1 - (val - min) / range) * innerHeight;
    const slippingY = yFor(29);
    const slippingH = yFor(0) - yFor(29);
    const holdingY = yFor(69);
    const holdingH = yFor(30) - yFor(69);
    const climbingY = yFor(100);
    const climbingH = yFor(70) - yFor(100);

    return {
      linePath: buildSmoothPath(pts),
      points: pts,
      totalLength: pathLength(pts),
      zones: { slippingY, slippingH, holdingY, holdingH, climbingY, climbingH },
    };
  }, [width, data, height, yMin, yMax]);

  useEffect(() => {
    if (!animated || totalLength === 0) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1100,
      useNativeDriver: false,
    }).start();
  }, [animated, totalLength, progress]);

  const animatedDashOffset = totalLength * (1 - dashOffset);

  const last = points.length > 0 ? points[points.length - 1] : null;
  const gridRows = [0.25, 0.5, 0.75];

  return (
    <View style={[styles.container, { height }]} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {showZones && zones && slippingZoneColor && holdingZoneColor && climbingZoneColor && (
            <>
              <Rect x={0} y={zones.slippingY} width={width} height={zones.slippingH} fill={slippingZoneColor} />
              <Rect x={0} y={zones.holdingY} width={width} height={zones.holdingH} fill={holdingZoneColor} />
              <Rect x={0} y={zones.climbingY} width={width} height={zones.climbingH} fill={climbingZoneColor} />
            </>
          )}
          {gridRows.map((r) => (
            <Line
              key={`g-${r}`}
              x1={0}
              y1={height * r}
              x2={width}
              y2={height * r}
              stroke={gridColor}
              strokeWidth={StyleSheet.hairlineWidth}
            />
          ))}
          {[0.22, 0.5, 0.78].map((c, i) => {
            const cx = width * c;
            const cy = height * gridRows[i % gridRows.length];
            return (
              <React.Fragment key={`cross-${c}`}>
                <Line
                  x1={cx - 4}
                  y1={cy}
                  x2={cx + 4}
                  y2={cy}
                  stroke={gridColor}
                  strokeWidth={1}
                />
                <Line
                  x1={cx}
                  y1={cy - 4}
                  x2={cx}
                  y2={cy + 4}
                  stroke={gridColor}
                  strokeWidth={1}
                />
              </React.Fragment>
            );
          })}
          {linePath !== "" && (
            <Path
              d={linePath}
              stroke={color}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={`${totalLength} ${totalLength}`}
              strokeDashoffset={animatedDashOffset}
            />
          )}
          {last && (
            <>
              <Circle cx={last.x} cy={last.y} r={7} fill={color} opacity={0.18} />
              <Circle cx={last.x} cy={last.y} r={3.5} fill={color} />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
