import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Mountain, Plus } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BlueprintMountain from "@/components/BlueprintMountain";
import PressableScale from "@/components/PressableScale";
import SectionLabel from "@/components/SectionLabel";
import SummitFormModal, {
  EMPTY_SUMMIT_FORM,
  SummitFormValues,
} from "@/components/SummitFormModal";
import { MONO } from "@/constants/theme";
import { Priority, Summit } from "@/mocks/data";
import { useApp } from "@/providers/AppProvider";
import { addDays, dayDiff, formatKey } from "@/utils/date";
import { showDeleteConfirm } from "@/utils/confirmDelete";

function priorityColor(
  priority: Priority,
  theme: { negative: string; amber: string; textFaint: string },
): string {
  if (priority === "high") return theme.negative;
  if (priority === "medium") return theme.amber;
  return theme.textFaint;
}

export default function SummitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    theme,
    summits,
    checkpoints,
    addSummit,
    setCheckpointsForSummit,
    deleteSummit,
    summitMomentum,
    values,
    selectedDate,
    isViewingToday,
    todayKey,
    setSelectedDay,
    goToToday,
  } = useApp();

  const [formOpen, setFormOpen] = useState<boolean>(false);

  const active = useMemo(
    () => summits.filter((s) => s.status === "active"),
    [summits],
  );
  const background = useMemo(
    () => summits.filter((s) => s.status === "background"),
    [summits],
  );
  const completed = useMemo(
    () => summits.filter((s) => s.status === "completed"),
    [summits],
  );

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
  const shortDate = useMemo(
    () => formatKey(selectedDate, { month: "short", day: "numeric" }),
    [selectedDate],
  );

  const artWidth = Math.min(width - 44 - 36, 420);

  const handleCreate = (values: SummitFormValues) => {
    if (values.name.trim().length === 0) return;
    const summit = addSummit({
      name: values.name.trim(),
      purpose: values.purpose,
      forWhom: values.forWhom,
      term: values.term,
      deadline: values.hasDeadline ? values.deadline : undefined,
      details: values.details,
      priority: values.priority,
      values: values.values,
      hasReward: values.hasReward,
      reward: values.reward,
    });
    if (values.checkpoints.length > 0) {
      setCheckpointsForSummit(summit.id, values.checkpoints);
    }
    setFormOpen(false);
  };

  const confirmDelete = (summit: Summit) => {
    showDeleteConfirm(
      "Delete Summit",
      `Delete “${summit.name}”? This cannot be undone.`,
      () => deleteSummit(summit.id),
    );
  };

  const renderActiveCard = (summit: Summit) => {
    const cps = checkpoints[summit.id] ?? [];
    const next = cps.find((c) => !c.done);
    const doneCount = cps.filter((c) => c.done).length;
    const momentumSeries = summitMomentum(summit.id);
    const momentumNow =
      momentumSeries.length > 0
        ? Math.round(momentumSeries[momentumSeries.length - 1])
        : null;

    return (
      <PressableScale
        key={summit.id}
        onPress={() => router.push(`/summit/${summit.id}`)}
        onLongPress={() => confirmDelete(summit)}
        style={[
          styles.card,
          { borderColor: theme.border, backgroundColor: theme.surface },
        ]}
        testID={`summit-card-${summit.id}`}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTitleBlock}>
            <View style={styles.termRow}>
              <Text style={[styles.termText, { color: theme.textFaint }]}>
                {summit.term === "short" ? "SHORT-TERM" : "LONG-TERM"}
              </Text>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: priorityColor(summit.priority, theme) },
                ]}
              />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {summit.name}
            </Text>
          </View>
          <View style={styles.momentumBlock}>
            <Text style={[styles.momentumValue, { color: theme.accent }]}>
              {momentumNow ?? "—"}
            </Text>
            <Text style={[styles.momentumLabel, { color: theme.textFaint }]}>
              MOMENTUM
            </Text>
          </View>
        </View>

        <View style={styles.artWrap}>
          <BlueprintMountain
            width={artWidth}
            height={artWidth * 0.42}
            checkpoints={cps.map((c) => ({ id: c.id, title: "", done: c.done }))}
            accent={theme.accent}
            lineColor={theme.textSecondary}
            faintColor={theme.textFaint}
            surfaceColor={theme.surface}
          />
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.hairline }]}>
          <View style={styles.footerLeft}>
            <Text style={[styles.nextLabel, { color: theme.textFaint }]}>
              NEXT · {doneCount}/{cps.length}
            </Text>
            <Text
              style={[styles.nextCheckpoint, { color: theme.text }]}
              numberOfLines={1}
            >
              {next ? next.title : "All checkpoints complete"}
            </Text>
          </View>
          <View style={styles.footerRight}>
            {summit.deadline && (
              <Text style={[styles.deadline, { color: theme.textSecondary }]}>
                {summit.deadline}
              </Text>
            )}
            <ChevronRight size={16} color={theme.textFaint} />
          </View>
        </View>
      </PressableScale>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 18,
        paddingBottom: 80,
        paddingHorizontal: 22,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.text }]}>Summits</Text>
          {active.length > 0 && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {`${active.length} active climb${active.length === 1 ? "" : "s"}`}
            </Text>
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
              testID="summit-day-back"
            >
              <ChevronLeft size={16} color={canGoBack ? theme.text : theme.textFaint} />
            </Pressable>
            <Pressable onPress={goToToday} hitSlop={6} testID="summit-day-today">
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
              testID="summit-day-forward"
            >
              <ChevronRight size={16} color={canGoForward ? theme.text : theme.textFaint} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => setFormOpen(true)}
            style={[styles.addButton, { backgroundColor: theme.inverse }]}
            hitSlop={8}
            testID="add-summit"
          >
            <Plus size={20} color={theme.inverseText} strokeWidth={2.25} />
          </Pressable>
        </View>
      </View>

      {active.length === 0 && background.length === 0 && completed.length === 0 ? (
        <Pressable
          onPress={() => setFormOpen(true)}
          style={[
            styles.emptyHero,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
          testID="summits-empty"
        >
          <View
            style={[styles.emptyIcon, { backgroundColor: theme.accentFaint }]}
          >
            <Mountain size={26} color={theme.accent} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Create a Summit
          </Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            A Summit is a big goal with smaller checkpoints. Ready to start a climb?
          </Text>
          <View
            style={[
              styles.emptyBtn,
              { backgroundColor: theme.inverse, flexDirection: "row", gap: 8 },
            ]}
          >
            <Plus size={16} color={theme.inverseText} strokeWidth={2.5} />
            <Text style={[styles.emptyBtnText, { color: theme.inverseText }]}>
              New Summit
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.cardList}>{active.map(renderActiveCard)}</View>
      )}

      {background.length > 0 && (
        <>
          <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
            Background Summits
          </SectionLabel>
          <View style={styles.compactList}>
            {background.map((s) => {
              const cps = checkpoints[s.id] ?? [];
              const doneCount = cps.filter((c) => c.done).length;
              return (
                <PressableScale
                  key={s.id}
                  onPress={() => router.push(`/summit/${s.id}`)}
                  onLongPress={() => confirmDelete(s)}
                  style={[
                    styles.compactCard,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                  ]}
                  testID={`summit-row-${s.id}`}
                >
                  <View style={styles.compactBody}>
                    <Text style={[styles.compactTitle, { color: theme.text }]}>
                      {s.name}
                    </Text>
                    <Text style={[styles.compactMeta, { color: theme.textFaint }]}>
                      {doneCount}/{cps.length} CHECKPOINTS ·{" "}
                      {s.term === "short" ? "SHORT-TERM" : "LONG-TERM"}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.textFaint} />
                </PressableScale>
              );
            })}
          </View>
        </>
      )}

      {completed.length > 0 && (
        <>
          <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
            Completed
          </SectionLabel>
          <View style={styles.compactList}>
            {completed.map((s) => (
              <PressableScale
                key={s.id}
                onPress={() => router.push(`/summit/${s.id}`)}
                onLongPress={() => confirmDelete(s)}
                style={[
                  styles.compactCard,
                  styles.completedCard,
                  { borderColor: theme.hairline, backgroundColor: theme.background },
                ]}
                testID={`summit-completed-${s.id}`}
              >
                <View
                  style={[styles.flagMark, { backgroundColor: theme.accentFaint }]}
                >
                  <Text style={[styles.flagText, { color: theme.accent }]}>▲</Text>
                </View>
                <View style={styles.compactBody}>
                  <Text style={[styles.compactTitle, { color: theme.textSecondary }]}>
                    {s.name}
                  </Text>
                  <Text style={[styles.compactMeta, { color: theme.textFaint }]}>
                    SUMMITED {s.completedAt?.toUpperCase() ?? ""}
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.textFaint} />
              </PressableScale>
            ))}
          </View>
        </>
      )}

      <SummitFormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        theme={theme}
        initial={EMPTY_SUMMIT_FORM}
        title="New Summit"
        submitLabel="Create Summit"
        testID="summits-new"
        availableValues={values}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
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
  title: {
    fontSize: 30,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHero: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  emptyBtn: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  cardList: {
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 8,
  },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  termText: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
  },
  momentumBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  momentumValue: {
    fontSize: 26,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },
  momentumLabel: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.2,
  },
  artWrap: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerLeft: {
    flex: 1,
    gap: 4,
  },
  nextLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  nextCheckpoint: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deadline: {
    fontFamily: MONO,
    fontSize: 11,
  },
  sectionLabel: {
    marginTop: 34,
    marginBottom: 12,
  },
  compactList: {
    gap: 10,
  },
  compactCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  completedCard: {
    borderStyle: "dashed",
  },
  compactBody: {
    flex: 1,
    gap: 4,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  compactMeta: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
  },
  flagMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  flagText: {
    fontSize: 12,
  },
});
