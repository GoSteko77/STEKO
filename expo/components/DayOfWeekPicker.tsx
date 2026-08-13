import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemeColors } from "@/constants/theme";

/**
 * Ordered short day labels for the week picker.
 * Sunday-first (S M T W T F S).
 */
export const DAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  sun: "S",
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "T",
  fri: "F",
  sat: "S",
};

export const ALL_DAYS: DayKey[] = [...DAY_KEYS];

interface DayOfWeekPickerProps {
  /** Selected day keys. */
  selected: DayKey[];
  /** Toggle a single day in/out of the selection. */
  onToggle: (day: DayKey) => void;
  /** Set the entire selection at once (used by the "Every day" shortcut). */
  onSet: (days: DayKey[]) => void;
  theme: ThemeColors;
  testID?: string;
}

/**
 * A compact Sunday-first week picker. Each day is a circular pill that
 * highlights when active. An "Every day" shortcut selects or clears all.
 */
export default function DayOfWeekPicker({
  selected,
  onToggle,
  onSet,
  theme,
  testID,
}: DayOfWeekPickerProps) {
  const isAll = selected.length === ALL_DAYS.length;

  const handleEveryDay = () => {
    onSet(isAll ? [] : [...ALL_DAYS]);
  };

  return (
    <View style={styles.wrap}>
      {DAY_KEYS.map((day) => {
        const active = selected.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => onToggle(day)}
            style={[
              styles.day,
              {
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? theme.accent : "transparent",
              },
            ]}
            hitSlop={6}
            testID={testID ? `${testID}-day-${day}` : undefined}
            accessibilityLabel={`${day} ${active ? "selected" : "not selected"}`}
          >
            <Text
              style={[
                styles.dayLabel,
                { color: active ? theme.inverseText : theme.textSecondary },
              ]}
            >
              {DAY_LABELS[day]}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={handleEveryDay}
        style={[
          styles.everyDay,
          {
            borderColor: isAll ? theme.accent : theme.border,
            backgroundColor: isAll ? theme.accentFaint : "transparent",
          },
        ]}
        hitSlop={6}
        testID={testID ? `${testID}-every-day` : undefined}
      >
        <Text
          style={[
            styles.everyDayText,
            { color: isAll ? theme.accent : theme.textSecondary },
          ]}
        >
          {isAll ? "Every day" : "All"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  everyDay: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginLeft: 2,
  },
  everyDayText: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
});
