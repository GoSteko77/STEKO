import * as Haptics from "expo-haptics";
import React, { useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MONO } from "@/constants/theme";

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  positiveColor: string;
  negativeColor: string;
  neutralColor: string;
  trackColor: string;
  surfaceColor: string;
  textColor: string;
  faintColor: string;
}

const MIN = -5;
const MAX = 5;
const STEPS = MAX - MIN;

/**
 * The distinctive STEKO -5..+5 daily progress slider.
 * Snaps to whole numbers with haptic ticks.
 */
export default function RatingSlider({
  value,
  onChange,
  positiveColor,
  negativeColor,
  neutralColor,
  trackColor,
  surfaceColor,
  textColor,
  faintColor,
}: RatingSliderProps) {
  const [width, setWidth] = useState<number>(0);
  const widthRef = useRef<number>(0);
  const valueRef = useRef<number>(value);
  valueRef.current = value;

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  };

  const trackRef = useRef<View>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          handleTouch(evt.nativeEvent.pageX);
        },
        onPanResponderMove: (evt) => {
          handleTouch(evt.nativeEvent.pageX);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Use pageX and measure the track's absolute position so dragging over
  // child views (ticks, fill, thumb) doesn't cause locationX to jump.
  const handleTouch = (pageX: number) => {
    const w = widthRef.current;
    if (w <= 0 || !trackRef.current) return;
    trackRef.current.measureInWindow((x, _y, _w, _h) => {
      const localX = pageX - x;
      const ratio = Math.min(1, Math.max(0, localX / w));
      const next = Math.round(MIN + ratio * STEPS);
      if (next !== valueRef.current) {
        if (Platform.OS !== "web") {
          Haptics.selectionAsync().catch(() => {});
        }
        onChange(next);
      }
    });
  };

  const activeColor =
    value > 0 ? positiveColor : value < 0 ? negativeColor : neutralColor;
  const thumbRatio = (value - MIN) / STEPS;
  const centerX = width / 2;
  const thumbX = thumbRatio * width;

  return (
    <View>
      <View style={styles.readout}>
        <Text style={[styles.readoutValue, { color: activeColor }]}>
          {value > 0 ? `+${value}` : `${value}`}
        </Text>
        <Text style={[styles.readoutHint, { color: faintColor }]}>
          {value > 2
            ? "STRONG CLIMB"
            : value > 0
              ? "UPWARD"
              : value === 0
                ? "HOLDING"
                : value < -2
                  ? "STEEP SETBACK"
                  : "SLIPPED"}
        </Text>
      </View>
      <View
        ref={trackRef}
        style={styles.trackArea}
        onLayout={onLayout}
        {...panResponder.panHandlers}
        testID="rating-slider"
      >
        <View style={[styles.track, { backgroundColor: trackColor }]} />
        {width > 0 && (
          <View
            style={[
              styles.fill,
              {
                backgroundColor: activeColor,
                left: Math.min(centerX, thumbX),
                width: Math.abs(thumbX - centerX),
              },
            ]}
          />
        )}
        {width > 0 &&
          Array.from({ length: STEPS + 1 }).map((_, i) => {
            const x = (i / STEPS) * width;
            const isCenter = i === STEPS / 2;
            return (
              <View
                key={`tick-${i}`}
                style={[
                  styles.tick,
                  {
                    left: x - 0.5,
                    height: isCenter ? 16 : 8,
                    backgroundColor: isCenter ? textColor : trackColor,
                  },
                ]}
              />
            );
          })}
        {width > 0 && (
          <View
            style={[
              styles.thumb,
              {
                left: thumbX - 14,
                borderColor: activeColor,
                backgroundColor: surfaceColor,
              },
            ]}
          >
            <View style={[styles.thumbDot, { backgroundColor: activeColor }]} />
          </View>
        )}
      </View>
      <View style={styles.scale}>
        <Text style={[styles.scaleLabel, { color: negativeColor }]}>-5</Text>
        <Text style={[styles.scaleLabel, { color: faintColor }]}>0</Text>
        <Text style={[styles.scaleLabel, { color: positiveColor }]}>+5</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 18,
  },
  readoutValue: {
    fontSize: 44,
    fontWeight: "700" as const,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  readoutHint: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  trackArea: {
    height: 44,
    justifyContent: "center",
  },
  track: {
    height: 2,
    borderRadius: 1,
  },
  fill: {
    position: "absolute",
    height: 3,
    borderRadius: 1.5,
    top: 20.5,
  },
  tick: {
    position: "absolute",
    width: 1,
    top: 14,
  },
  thumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scale: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  scaleLabel: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1,
  },
});
