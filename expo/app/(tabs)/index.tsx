import { useRouter } from "expo-router";
import {
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mountain,
  Plus,
  Settings,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BlueprintMountain from "@/components/BlueprintMountain";
import MomentumChart from "@/components/MomentumChart";
import PressableScale from "@/components/PressableScale";
import SectionLabel from "@/components/SectionLabel";
import { MONO } from "@/constants/theme";
import { Priority, VERSES, habitStatusOn } from "@/mocks/data";
import { MOMENTUM_WINDOW, useApp } from "@/providers/AppProvider";
import { addDays, dayDiff, formatKey, parseKey, weekdayOf } from "@/utils/date";

/** Fixed habit logging colors — these do not change with the theme. */
const HABIT_DONE_BLUE = "#2B5BE3";
const HABIT_DONE_BLUE_FAINT = "rgba(43, 91, 227, 0.12)";
const HABIT_MISSED_RED = "#B8433C";
const HABIT_MISSED_RED_FAINT = "rgba(184, 67, 60, 0.12)";

function formatBacklogDate(dateKey: string): string {
  return formatKey(dateKey, { weekday: "short", month: "short", day: "numeric" });
}

function priorityColor(
  priority: Priority,
  theme: { negative: string; amber: string; textFaint: string },
): string {
  if (priority === "high") return theme.negative;
  if (priority === "medium") return theme.amber;
  return theme.textFaint;
}

const MIN_DATA_POINTS = MOMENTUM_WINDOW;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    theme,
    objectives,
    setObjectiveStatus,
    summits,
    checkpoints,
    overallMomentum,
    selectedDate,
    isViewingToday,
    todayKey,
    setSelectedDay,
    goToToday,
    needsLoggingToday,
    needsHabitsToday,
    backloggedItems,
  } = useApp();

  const [verseIndex] = useState<number>(() =>
    Math.floor(Math.random() * VERSES.length),
  );
  const verse = VERSES[verseIndex];

  const today = useMemo(
    () =>
      formatKey(selectedDate, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).toUpperCase(),
    [selectedDate],
  );

  // Day offset helpers: 0 = today, up to 7 days back.
  const dayOffset = useMemo(
    () => dayDiff(todayKey, selectedDate),
    [selectedDate, todayKey],
  );

  const goBack = () => {
    if (dayOffset >= 7) return;
    setSelectedDay(addDays(selectedDate, -1));
  };

  const goForward = () => {
    if (isViewingToday) return;
    setSelectedDay(addDays(selectedDate, 1));
  };

  const earliestSummitDate = useMemo(() => {
    if (summits.length === 0) return todayKey;
    return summits.reduce(
      (min, s) => (s.startedAt < min ? s.startedAt : min),
      todayKey,
    );
  }, [summits, todayKey]);

  const canGoBack = dayOffset < 7 && selectedDate > earliestSummitDate;
  const canGoForward = !isViewingToday;

  const shortDate = useMemo(() => {
    return formatKey(selectedDate, { month: "short", day: "numeric" });
  }, [selectedDate]);

  const momentumSeries = overallMomentum.series;
  const momentumNow = overallMomentum.latest;
  const hasMomentum = momentumSeries.length >= MIN_DATA_POINTS;
  // Always show a score — defaults to 50 (baseline) when no data.
  const displayScore = momentumNow !== null ? Math.round(momentumNow) : 50;
  // Chart data: always prepend the baseline (50) so the line renders from
  // the neutral starting point. With no logs, show a flat line at 50.
  const chartData = momentumSeries.length > 0 ? [50, ...momentumSeries] : [50, 50];
  const weekAgo =
    momentumSeries.length >= 8
      ? momentumSeries[momentumSeries.length - 8]
      : momentumSeries[0] ?? null;
  const delta =
    momentumNow !== null && weekAgo !== null
      ? Math.round(momentumNow - weekAgo)
      : 0;

  const activeSummits = useMemo(
    () => summits.filter((s) => s.status === "active"),
    [summits],
  );

  // Habits scheduled for the selected weekday.
  const weekdayKey = useMemo(() => {
    const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    return keys[weekdayOf(selectedDate)];
  }, [selectedDate]);

  const scheduledObjectives = useMemo(
    () =>
      objectives.filter(
        (o) => o.daysOfWeek.length === 0 || o.daysOfWeek.includes(weekdayKey),
      ),
    [objectives, weekdayKey],
  );

  const homeObjectives = scheduledObjectives.slice(0, 4);
  const summitNameById = useMemo(() => {
    const map: Record<string, string> = {};
    summits.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [summits]);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 18,
        paddingBottom: 48,
        paddingHorizontal: 22,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SectionLabel color={theme.textFaint}>{today}</SectionLabel>
          <Text style={[styles.greeting, { color: theme.text }]}>
            STEKO
          </Text>
          {!isViewingToday && (
            <View
              style={[styles.backfillBadge, { backgroundColor: theme.accentFaint }]}
            >
              <Calendar size={11} color={theme.accent} strokeWidth={2} />
              <Text style={[styles.backfillText, { color: theme.accent }]}>
                BACKFILL · {dayOffset}d AGO
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <View
            style={[styles.dayNav, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Pressable
              onPress={goBack}
              disabled={!canGoBack}
              hitSlop={6}
              style={[styles.dayNavBtn, !canGoBack && styles.dayNavBtnDisabled]}
              testID="day-back"
            >
              <ChevronLeft size={16} color={canGoBack ? theme.text : theme.textFaint} />
            </Pressable>
            <Pressable onPress={goToToday} hitSlop={6} testID="day-today">
              <Text
                style={[styles.dayNavLabel, { color: isViewingToday ? theme.accent : theme.text }]}
              >
                {isViewingToday ? "Today" : shortDate}
              </Text>
            </Pressable>
            <Pressable
              onPress={goForward}
              disabled={!canGoForward}
              hitSlop={6}
              style={[styles.dayNavBtn, !canGoForward && styles.dayNavBtnDisabled]}
              testID="day-forward"
            >
              <ChevronRight size={16} color={canGoForward ? theme.text : theme.textFaint} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={10}
            style={[styles.settingsButton, { borderColor: theme.border }]}
            testID="open-settings"
          >
            <Settings size={19} color={theme.textSecondary} strokeWidth={1.75} />
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.verseCard,
          { borderColor: theme.border, backgroundColor: theme.surface },
        ]}
      >
        <Text style={[styles.verseText, { color: theme.text }]}>
          {verse.text}
        </Text>
        <Text style={[styles.verseRef, { color: theme.accent }]}>
          {verse.reference}
        </Text>
      </View>

      <View style={styles.momentumHeader}>
        <SectionLabel color={theme.textFaint}>Overall Momentum</SectionLabel>
        <View style={styles.momentumNumbers}>
          <Text style={[styles.momentumValue, { color: theme.text }]}>
            {displayScore}
          </Text>
          {hasMomentum && momentumNow !== null && (
            <View
              style={[
                styles.trendChip,
                {
                  backgroundColor:
                    delta >= 0 ? theme.accentFaint : "rgba(184,67,60,0.08)",
                },
              ]}
            >
              <ArrowUpRight
                size={13}
                color={delta >= 0 ? theme.accent : theme.negative}
                style={delta < 0 ? styles.flipped : undefined}
              />
              <Text
                style={[
                  styles.trendText,
                  { color: delta >= 0 ? theme.accent : theme.negative },
                ]}
              >
                {delta >= 0 ? "+" : ""}
                {delta} this week
              </Text>
            </View>
          )}
        </View>
      </View>

      <MomentumChart
        data={chartData}
        height={170}
        color={theme.accent}
        gridColor={theme.hairline}
        yMin={0}
        yMax={100}
      />
      {hasMomentum ? (
        <Text style={[styles.chartCaption, { color: theme.textFaint }]}>
          {momentumSeries.length} DAYS · ROLLING {MOMENTUM_WINDOW}-DAY SCORE
        </Text>
      ) : (
        <Text style={[styles.chartCaption, { color: theme.textFaint, fontSize: 13, letterSpacing: 0.5, lineHeight: 19 }]}>
          Summits require {MOMENTUM_WINDOW} days of logging to view an accurate score.
        </Text>
      )}

      {(needsLoggingToday.length > 0 || needsHabitsToday.length > 0) && (
        <View
          style={[
            styles.needsCard,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        >
          <View style={[styles.needsHeader, { borderBottomColor: theme.hairline }]}>
            <View style={[styles.needsHeaderIcon, { backgroundColor: theme.accentFaint }]}>
              <CheckCircle2 size={14} color={theme.accent} strokeWidth={2.5} />
            </View>
            <Text style={[styles.needsTitle, { color: theme.text }]}>
              Needs logging today
            </Text>
            <View style={[styles.needsCountBadge, { backgroundColor: theme.accent }]}>
              <Text style={[styles.needsCountText, { color: theme.inverseText }]}>
                {needsLoggingToday.length + needsHabitsToday.length}
              </Text>
            </View>
          </View>
          <View style={styles.needsTaskList}>
            {needsLoggingToday.map((s) => (
              <View key={`s-${s.id}`} style={[styles.needsRow, { borderLeftColor: theme.accent }]}>
                <View style={styles.needsRowContent}>
                  <Text style={[styles.needsItem, { color: theme.text }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <View style={[styles.needsTagPill, { backgroundColor: theme.accentFaint }]}>
                    <Text style={[styles.needsTag, { color: theme.accent }]}>SUMMIT</Text>
                  </View>
                </View>
              </View>
            ))}
            {needsHabitsToday.map((o) => (
              <View key={`o-${o.id}`} style={[styles.needsRow, { borderLeftColor: theme.textFaint }]}>
                <View style={[styles.needsRowContent, { flex: 1 }]}>
                  <Text style={[styles.needsItem, { color: theme.text }]} numberOfLines={1}>
                    {o.title}
                  </Text>
                  <View style={[styles.needsTagPill, { backgroundColor: theme.hairline }]}>
                    <Text style={[styles.needsTag, { color: theme.textSecondary }]}>HABIT</Text>
                  </View>
                </View>
                <View style={styles.needsHabitActions}>
                  <Pressable
                    onPress={() => setObjectiveStatus(o.id, todayKey, "done")}
                    style={[styles.needsHabitBtn, { backgroundColor: HABIT_DONE_BLUE_FAINT }]}
                    hitSlop={6}
                    testID={`needs-done-${o.id}`}
                  >
                    <Check size={14} color={HABIT_DONE_BLUE} strokeWidth={2.5} />
                  </Pressable>
                  <Pressable
                    onPress={() => setObjectiveStatus(o.id, todayKey, "missed")}
                    style={[styles.needsHabitBtn, { backgroundColor: HABIT_MISSED_RED_FAINT }]}
                    hitSlop={6}
                    testID={`needs-missed-${o.id}`}
                  >
                    <X size={14} color={HABIT_MISSED_RED} strokeWidth={2.5} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          {backloggedItems.length > 0 && (
            <View style={[styles.backlogSection, { borderTopColor: theme.hairline }]}>
              <Text style={[styles.backlogLabel, { color: theme.textFaint }]}>
                BACKLOG
              </Text>
              {backloggedItems.map((item) => (
                <View key={`bl-${item.date}`} style={styles.backlogDay}>
                  <Text style={[styles.backlogDate, { color: theme.textSecondary }]}>
                    {formatBacklogDate(item.date)}
                  </Text>
                  {item.summits.map((s) => (
                    <Text key={`bls-${item.date}-${s.id}`} style={[styles.backlogItem, { color: theme.textFaint }]} numberOfLines={1}>
                      {`▲ ${s.name}`}
                    </Text>
                  ))}
                  {item.habits.map((h) => (
                    <Text key={`blh-${item.date}-${h.id}`} style={[styles.backlogItem, { color: theme.textFaint }]} numberOfLines={1}>
                      {`✓ ${h.title}`}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <SectionLabel color={theme.textFaint}>
          {isViewingToday ? "Today's Habits" : `Habits · ${shortDate}`}
        </SectionLabel>
        <Pressable onPress={() => router.push("/(tabs)/objectives")} hitSlop={8}>
          <Text style={[styles.sectionLink, { color: theme.accent }]}>
            View all
          </Text>
        </Pressable>
      </View>

      {homeObjectives.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        >
          <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
            No habits yet
          </Text>
          <Text style={[styles.emptyCardSub, { color: theme.textFaint }]}>
            Add a daily habit to start building momentum.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/objectives")}
            style={[
              styles.emptyCardBtn,
              { backgroundColor: theme.inverse },
            ]}
            testID="home-add-habit"
          >
            <Text style={[styles.emptyCardBtnText, { color: theme.inverseText }]}>
              Add a Habit
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={[
            styles.objectivesCard,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        >
          {homeObjectives.map((o, i) => {
            const status = habitStatusOn(o, selectedDate);
            const done = status === "done";
            const missed = status === "missed";
            return (
              <View
                key={o.id}
                style={[
                  styles.objectiveRow,
                  i < homeObjectives.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.hairline,
                  },
                ]}
              >
                <View style={styles.habitActions}>
                  <Pressable
                    onPress={() =>
                      setObjectiveStatus(o.id, selectedDate, done ? null : "done")
                    }
                    style={[
                      styles.habitActionBtn,
                      {
                        backgroundColor: done
                          ? HABIT_DONE_BLUE
                          : HABIT_DONE_BLUE_FAINT,
                      },
                    ]}
                    hitSlop={8}
                    testID={`home-objective-done-${o.id}`}
                  >
                    <Check
                      size={16}
                      color={done ? "#FFFFFF" : HABIT_DONE_BLUE}
                      strokeWidth={2.5}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setObjectiveStatus(o.id, selectedDate, missed ? null : "missed")
                    }
                    style={[
                      styles.habitActionBtn,
                      {
                        backgroundColor: missed
                          ? HABIT_MISSED_RED
                          : HABIT_MISSED_RED_FAINT,
                      },
                    ]}
                    hitSlop={8}
                    testID={`home-objective-missed-${o.id}`}
                  >
                    <X
                      size={16}
                      color={missed ? "#FFFFFF" : HABIT_MISSED_RED}
                      strokeWidth={2.5}
                    />
                  </Pressable>
                </View>
                <View style={styles.objectiveTextBlock}>
                  <Text
                    style={[
                      styles.objectiveTitle,
                      {
                        color: done || missed ? theme.textFaint : theme.text,
                        textDecorationLine: done ? "line-through" : "none",
                      },
                    ]}
                  >
                    {o.title}
                  </Text>
                  {o.summitIds.length > 0 && (
                    <Text
                      style={[styles.objectiveSummit, { color: theme.textFaint }]}
                      numberOfLines={1}
                    >
                      {o.summitIds
                        .map((sid) => `▲ ${summitNameById[sid] ?? ""}`)
                        .join("  ·  ")}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <SectionLabel color={theme.textFaint}>Active Summits</SectionLabel>
        <Pressable onPress={() => router.push("/(tabs)/summits")} hitSlop={8}>
          <Text style={[styles.sectionLink, { color: theme.accent }]}>All</Text>
        </Pressable>
      </View>

      {activeSummits.length === 0 ? (
        <Pressable
          onPress={() => router.push("/(tabs)/summits")}
          style={[
            styles.emptyCard,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
          testID="home-add-summit"
        >
          <View
            style={[styles.emptyIcon, { backgroundColor: theme.accentFaint }]}
          >
            <Mountain size={20} color={theme.accent} strokeWidth={1.75} />
          </View>
          <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
            Create a Summit
          </Text>
          <Text style={[styles.emptyCardSub, { color: theme.textFaint }]}>
            A Summit is a big goal with smaller checkpoints. Ready to start a climb?
          </Text>
          <View
            style={[
              styles.emptyCardBtn,
              { backgroundColor: theme.inverse, flexDirection: "row", gap: 8 },
            ]}
          >
            <Plus size={15} color={theme.inverseText} strokeWidth={2.5} />
            <Text style={[styles.emptyCardBtnText, { color: theme.inverseText }]}>
              New Summit
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.summitList}>
          {activeSummits.map((summit) => {
            const cps = checkpoints[summit.id] ?? [];
            const next = cps.find((c) => !c.done);
            const doneCount = cps.filter((c) => c.done).length;
            const progress = cps.length > 0 ? doneCount / cps.length : 0;
            return (
              <PressableScale
                key={summit.id}
                onPress={() => router.push(`/summit/${summit.id}`)}
                style={[
                  styles.summitCard,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
                testID={`home-summit-${summit.id}`}
              >
                <View style={styles.summitCardInner}>
                  <View style={[styles.summitArt, { borderColor: theme.hairline }]}>
                    <BlueprintMountain
                      width={86}
                      height={56}
                      checkpoints={cps.map((c) => ({
                        id: c.id,
                        title: "",
                        done: c.done,
                      }))}
                      accent={theme.accent}
                      lineColor={theme.textSecondary}
                      faintColor={theme.textFaint}
                      surfaceColor={theme.surface}
                    />
                  </View>
                  <View style={styles.summitBody}>
                    <View style={styles.summitTopRow}>
                      <Text
                        style={[styles.summitName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {summit.name}
                      </Text>
                      <View
                        style={[
                          styles.priorityDot,
                          {
                            backgroundColor: priorityColor(
                              summit.priority,
                              theme,
                            ),
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.summitStatsRow}>
                      <Text style={[styles.summitStatLabel, { color: theme.textFaint }]}>
                        {summit.term === "short" ? "SHORT-TERM" : "LONG-TERM"}
                      </Text>
                      <Text style={[styles.summitDivider, { color: theme.textFaint }]}>
                        ·
                      </Text>
                      <Text style={[styles.summitStatLabel, { color: theme.textFaint }]}>
                        {doneCount}/{cps.length} CPS
                      </Text>
                    </View>
                    <View style={styles.summitNextRow}>
                      <View style={styles.summitNextText}>
                        <Text
                          style={[styles.summitNextLabel, { color: theme.textFaint }]}
                        >
                          NEXT
                        </Text>
                        <Text
                          style={[styles.summitNextValue, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {next ? next.title : "All checkpoints complete"}
                        </Text>
                      </View>
                      {summit.deadline && (
                        <Text
                          style={[styles.summitDeadline, { color: theme.textSecondary }]}
                        >
                          {summit.deadline}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.progressBar,
                        { backgroundColor: theme.hairline },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          { backgroundColor: theme.accent, width: `${progress * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <ChevronRight size={16} color={theme.textFaint} />
                </View>
              </PressableScale>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  backfillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  backfillText: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
  },
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 2,
    paddingVertical: 2,
    gap: 2,
  },
  dayNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNavBtnDisabled: {
    opacity: 0.4,
  },
  dayNavLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.4,
    paddingHorizontal: 6,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  verseCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    marginBottom: 34,
  },
  verseText: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "500" as const,
    letterSpacing: 0.1,
  },
  verseRef: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  needsCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 34,
    overflow: "hidden" as const,
  },
  needsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  needsHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  needsTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
  },
  needsCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  needsCountText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  needsTaskList: {
    gap: 2,
  },
  needsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    marginLeft: 4,
    borderLeftWidth: 2.5,
  },
  needsRowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  needsItem: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500" as const,
  },
  needsTagPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  needsTag: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.1,
    fontWeight: "700" as const,
  },
  backlogSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingTop: 14,
    gap: 10,
  },
  backlogLabel: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  backlogDay: {
    gap: 4,
  },
  backlogDate: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  backlogItem: {
    fontSize: 13,
    paddingLeft: 14,
  },
  momentumHeader: {
    marginBottom: 6,
    gap: 10,
  },
  momentumNumbers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  momentumValue: {
    fontSize: 54,
    fontWeight: "800" as const,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  flipped: {
    transform: [{ scaleY: -1 }],
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  chartCaption: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: 10,
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 10,
    marginBottom: 34,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyCardSub: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  emptyCardBtn: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  emptyCardBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  objectivesCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 34,
  },
  objectiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
  },
  objectiveTextBlock: {
    flex: 1,
    gap: 3,
  },
  objectiveTitle: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  objectiveSummit: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
  },
  habitActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  habitActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  needsHabitActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  needsHabitBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  summitList: {
    gap: 12,
  },
  summitCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  summitCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summitArt: {
    width: 86,
    height: 56,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  summitBody: {
    flex: 1,
    gap: 5,
  },
  summitTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  summitName: {
    fontSize: 15,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
    flex: 1,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  summitStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summitStatLabel: {
    fontFamily: MONO,
    fontSize: 8.5,
    letterSpacing: 1.1,
  },
  summitDivider: {
    fontSize: 10,
  },
  summitNextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  summitNextText: {
    flex: 1,
    gap: 1,
  },
  summitNextLabel: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.2,
  },
  summitNextValue: {
    fontSize: 12.5,
    fontWeight: "600" as const,
  },
  summitDeadline: {
    fontFamily: MONO,
    fontSize: 10,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 1.5,
  },
});
