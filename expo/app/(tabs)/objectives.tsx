import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DayOfWeekPicker, {
  ALL_DAYS,
  DayKey,
} from "@/components/DayOfWeekPicker";
import SectionLabel from "@/components/SectionLabel";
import { MONO } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import {
  Objective,
  WeekDay,
  habitStatusOn,
  isActiveOnDate,
  isDoneOn,
  isMissedOn,
} from "@/mocks/data";
import { addDays, dayDiff, formatKey } from "@/utils/date";
import { showDeleteConfirm } from "@/utils/confirmDelete";

/** Fixed habit logging colors — these do not change with the theme. */
const HABIT_DONE_BLUE = "#2B5BE3";
const HABIT_DONE_BLUE_FAINT = "rgba(43, 91, 227, 0.12)";
const HABIT_MISSED_RED = "#B8433C";
const HABIT_MISSED_RED_FAINT = "rgba(184, 67, 60, 0.12)";

interface HabitFormValues {
  title: string;
  purpose: string;
  summitIds: string[];
  days: DayKey[];
}

const EMPTY_HABIT: HabitFormValues = {
  title: "",
  purpose: "",
  summitIds: [],
  days: [...ALL_DAYS],
};

export default function ObjectivesScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    objectives,
    addObjective,
    updateObjective,
    deleteObjective,
    summits,
    selectedDate,
    isViewingToday,
    todayKey,
    setSelectedDay,
    goToToday,
    setObjectiveStatus,
  } = useApp();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitFormValues>(EMPTY_HABIT);

  const todayObjectives = useMemo(
    () =>
      objectives.filter(
        (o) => o.createdAt <= selectedDate && isActiveOnDate(o, selectedDate),
      ),
    [objectives, selectedDate],
  );
  const otherObjectives = useMemo(
    () =>
      objectives.filter(
        (o) => o.createdAt <= selectedDate && !isActiveOnDate(o, selectedDate),
      ),
    [objectives, selectedDate],
  );

  const completed = todayObjectives.filter((o) => isDoneOn(o, selectedDate)).length;
  const missed = todayObjectives.filter((o) => isMissedOn(o, selectedDate)).length;
  const total = todayObjectives.length;
  const ratio = total > 0 ? completed / total : 0;
  const missedRatio = total > 0 ? missed / total : 0;

  // True 7-day completion rate: count completions across the last 7 days
  // for habits that were active on each respective day.
  const weeklyConsistency = useMemo(() => {
    if (objectives.length === 0) return 0;
    let scheduled = 0;
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const dateKey = addDays(todayKey, -i);
      for (const o of objectives) {
        if (o.createdAt <= dateKey && isActiveOnDate(o, dateKey)) {
          scheduled++;
          if (isDoneOn(o, dateKey)) done++;
        }
      }
    }
    return scheduled > 0 ? Math.round((done / scheduled) * 100) : 0;
  }, [objectives, todayKey]);

  const hasAny = objectives.length > 0;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const missedAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: ratio,
      duration: 500,
      useNativeDriver: false,
    }).start();
    Animated.timing(missedAnim, {
      toValue: missedRatio,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [ratio, missedRatio, progressAnim, missedAnim]);

  const summitNameById = useMemo(() => {
    const map: Record<string, string> = {};
    summits.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [summits]);

  const activeSummits = summits.filter(
    (s) => s.status === "active" || s.status === "background",
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

  const earliestHabitDate = useMemo(() => {
    if (objectives.length === 0) return todayKey;
    return objectives.reduce(
      (min, o) => (o.createdAt < min ? o.createdAt : min),
      todayKey,
    );
  }, [objectives, todayKey]);

  const canGoBack = dayOffset < 7 && selectedDate > earliestHabitDate;
  const canGoForward = !isViewingToday;
  const shortDate = useMemo(
    () => formatKey(selectedDate, { month: "short", day: "numeric" }),
    [selectedDate],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_HABIT);
    setModalVisible(true);
  };

  const openEdit = (obj: Objective) => {
    setEditingId(obj.id);
    setForm({
      title: obj.title,
      purpose: obj.purpose ?? "",
      summitIds: obj.summitIds,
      days: obj.daysOfWeek.length === 0 ? [...ALL_DAYS] : obj.daysOfWeek,
    });
    setModalVisible(true);
  };

  const toggleSummitSelection = (sid: string) => {
    setForm((prev) => ({
      ...prev,
      summitIds: prev.summitIds.includes(sid)
        ? prev.summitIds.filter((x) => x !== sid)
        : [...prev.summitIds, sid],
    }));
  };

  const toggleDay = (day: DayKey) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((x) => x !== day)
        : [...prev.days, day],
    }));
  };

  const submitForm = () => {
    const title = form.title.trim();
    if (title.length === 0) return;
    if (editingId) {
      updateObjective(editingId, {
        title,
        purpose: form.purpose.trim(),
        summitIds: form.summitIds,
        daysOfWeek: form.days as WeekDay[],
      });
    } else {
      addObjective(title, form.summitIds, form.days as WeekDay[], form.purpose.trim());
    }
    setModalVisible(false);
    setEditingId(null);
    setForm(EMPTY_HABIT);
  };

  const confirmDelete = (obj: Objective) => {
    showDeleteConfirm(
      "Delete Habit",
      `Delete "${obj.title}"? This cannot be undone.`,
      () => deleteObjective(obj.id),
    );
  };

  const isEditing = editingId !== null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: 120,
          paddingHorizontal: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: theme.text }]}>
              Daily Habits
            </Text>
            {total > 0 && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {`${completed} of ${total} completed`}
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
                testID="obj-day-back"
              >
                <ChevronLeft size={16} color={canGoBack ? theme.text : theme.textFaint} />
              </Pressable>
              <Pressable onPress={goToToday} hitSlop={6} testID="obj-day-today">
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
                testID="obj-day-forward"
              >
                <ChevronRight size={16} color={canGoForward ? theme.text : theme.textFaint} />
              </Pressable>
            </View>
            <Pressable
              onPress={openCreate}
              style={[styles.addButton, { backgroundColor: theme.inverse }]}
              hitSlop={8}
              testID="add-objective"
            >
              <Plus size={20} color={theme.inverseText} strokeWidth={2.25} />
            </Pressable>
          </View>
        </View>

        {total > 0 ? (
          <View
            style={[
              styles.summaryCard,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          >
            <View style={[styles.progressTrack, { backgroundColor: theme.hairline }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: HABIT_DONE_BLUE,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: HABIT_MISSED_RED,
                    width: missedAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                    left: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {Math.round(ratio * 100)}%
                </Text>
                <SectionLabel color={theme.textFaint} style={styles.summaryLabel}>
                  Complete
                </SectionLabel>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.hairline }]} />
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {Math.round(missedRatio * 100)}%
                </Text>
                <SectionLabel color={theme.textFaint} style={styles.summaryLabel}>
                  Incomplete
                </SectionLabel>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.hairline }]} />
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {weeklyConsistency}%
                </Text>
                <SectionLabel color={theme.textFaint} style={styles.summaryLabel}>
                  Completion
                </SectionLabel>
              </View>
            </View>
          </View>
        ) : null}

        {!hasAny ? (
          <View
            style={[
              styles.emptyHero,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No habits yet
            </Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Create a habit that can be tied to your Summits.
            </Text>
            <Pressable
              onPress={openCreate}
              style={[
                styles.emptyBtn,
                { backgroundColor: theme.inverse, flexDirection: "row", gap: 8 },
              ]}
              testID="empty-add-habit"
            >
              <Plus size={16} color={theme.inverseText} strokeWidth={2.5} />
              <Text style={[styles.emptyBtnText, { color: theme.inverseText }]}>
                Add a Habit
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <SectionLabel
              color={theme.textFaint}
              style={styles.sectionHeading}
            >
              {isViewingToday ? "Today" : shortDate}
            </SectionLabel>
            {todayObjectives.length > 0 ? (
              <View style={styles.list}>
                {todayObjectives.map((o) => {
                  const status = habitStatusOn(o, selectedDate);
                  const done = status === "done";
                  const missed = status === "missed";
                  return (
                    <View
                      key={o.id}
                      style={[
                        styles.objectiveCard,
                        { borderColor: theme.border, backgroundColor: theme.surface },
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
                              borderColor: "transparent",
                              backgroundColor: done
                                ? HABIT_DONE_BLUE
                                : HABIT_DONE_BLUE_FAINT,
                            },
                          ]}
                          hitSlop={8}
                          testID={`objective-done-${o.id}`}
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
                              borderColor: "transparent",
                              backgroundColor: missed
                                ? HABIT_MISSED_RED
                                : HABIT_MISSED_RED_FAINT,
                            },
                          ]}
                          hitSlop={8}
                          testID={`objective-missed-${o.id}`}
                        >
                          <X
                            size={16}
                            color={missed ? "#FFFFFF" : HABIT_MISSED_RED}
                            strokeWidth={2.5}
                          />
                        </Pressable>
                      </View>
                      <View style={styles.objectiveBody}>
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
                      <Pressable
                        onPress={() => openEdit(o)}
                        hitSlop={8}
                        style={styles.rowAction}
                        testID={`edit-objective-${o.id}`}
                      >
                        <Pencil size={14} color={theme.textFaint} strokeWidth={1.9} />
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDelete(o)}
                        hitSlop={8}
                        style={styles.rowAction}
                        testID={`delete-objective-${o.id}`}
                      >
                        <Trash2 size={14} color={theme.negative} strokeWidth={1.9} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.emptyDayCard,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              >
                <Text style={[styles.emptyDayText, { color: theme.textFaint }]}>
                  No habits scheduled for {isViewingToday ? "today" : shortDate}.
                </Text>
              </View>
            )}

            {otherObjectives.length > 0 && (
              <View>
                <SectionLabel
                  color={theme.textFaint}
                  style={styles.sectionHeadingAlt}
                >
                  All Habits
                </SectionLabel>
                <View style={styles.list}>
                  {otherObjectives.map((o) => {
                    const status = habitStatusOn(o, selectedDate);
                    const done = status === "done";
                    const missed = status === "missed";
                    return (
                      <View
                        key={o.id}
                        style={[
                          styles.objectiveCard,
                          styles.objectiveCardMuted,
                          { borderColor: theme.border, backgroundColor: theme.surface },
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
                                borderColor: done ? HABIT_DONE_BLUE : HABIT_DONE_BLUE,
                                backgroundColor: done
                                  ? HABIT_DONE_BLUE
                                  : HABIT_DONE_BLUE_FAINT,
                              },
                            ]}
                            hitSlop={8}
                            testID={`objective-done-${o.id}`}
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
                                borderColor: missed ? HABIT_MISSED_RED : HABIT_MISSED_RED,
                                backgroundColor: missed
                                  ? HABIT_MISSED_RED
                                  : HABIT_MISSED_RED_FAINT,
                              },
                            ]}
                            hitSlop={8}
                            testID={`objective-missed-${o.id}`}
                          >
                            <X
                              size={16}
                              color={missed ? "#FFFFFF" : HABIT_MISSED_RED}
                              strokeWidth={2.5}
                            />
                          </Pressable>
                        </View>
                        <View style={styles.objectiveBody}>
                          <Text
                            style={[
                              styles.objectiveTitle,
                              {
                                color: done || missed ? theme.textFaint : theme.textSecondary,
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
                        <Pressable
                          onPress={() => openEdit(o)}
                          hitSlop={8}
                          style={styles.rowAction}
                          testID={`edit-objective-${o.id}`}
                        >
                          <Pencil size={14} color={theme.textFaint} strokeWidth={1.9} />
                        </Pressable>
                        <Pressable
                          onPress={() => confirmDelete(o)}
                          hitSlop={8}
                          style={styles.rowAction}
                          testID={`delete-objective-${o.id}`}
                        >
                          <Trash2 size={14} color={theme.negative} strokeWidth={1.9} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {isEditing ? "Edit Habit" : "New Daily Habit"}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={10}
                testID="close-modal"
              >
                <X size={20} color={theme.textFaint} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <TextInput
                value={form.title}
                onChangeText={(v) => setForm((prev) => ({ ...prev, title: v }))}
                placeholder="Walk for 20 minutes"
                placeholderTextColor={theme.textFaint}
                style={[
                  styles.modalInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
                autoFocus
                maxLength={200}
                testID="new-objective-input"
              />
              <SectionLabel color={theme.textFaint} style={styles.modalLabel}>
                PURPOSE
              </SectionLabel>
              <TextInput
                value={form.purpose}
                onChangeText={(v) => setForm((prev) => ({ ...prev, purpose: v }))}
                placeholder="Why does this habit matter?"
                placeholderTextColor={theme.textFaint}
                style={[
                  styles.modalInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
                multiline
                maxLength={500}
                testID="new-objective-purpose"
              />
              <SectionLabel color={theme.textFaint} style={styles.modalLabel}>
                Tie to Summits — select any
              </SectionLabel>
              {activeSummits.length === 0 ? (
                <View
                  style={[
                    styles.emptySummits,
                    { borderColor: theme.border, backgroundColor: theme.background },
                  ]}
                >
                  <Text style={[styles.emptySummitsText, { color: theme.textFaint }]}>
                    No Summits yet. You can tie this habit later.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  {activeSummits.map((s) => {
                    const active = form.summitIds.includes(s.id);
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => toggleSummitSelection(s.id)}
                        style={[
                          styles.chip,
                          {
                            borderColor: active ? theme.accent : theme.border,
                            backgroundColor: active ? theme.accentFaint : "transparent",
                          },
                        ]}
                        testID={`modal-summit-${s.id}`}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: active ? theme.accent : theme.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {s.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <SectionLabel color={theme.textFaint} style={styles.modalLabel}>
                Active Days
              </SectionLabel>
              <DayOfWeekPicker
                selected={form.days}
                onToggle={toggleDay}
                onSet={(d) => setForm((prev) => ({ ...prev, days: d }))}
                theme={theme}
                testID="new-habit-days"
              />
            </ScrollView>
            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                onPress={submitForm}
                style={({ pressed }) => [
                  styles.modalButton,
                  {
                    backgroundColor: theme.inverse,
                    opacity: pressed || form.title.trim().length === 0 ? 0.6 : 1,
                  },
                ]}
                disabled={form.title.trim().length === 0}
                testID="save-objective"
              >
                <Text style={[styles.modalButtonText, { color: theme.inverseText }]}>
                  {isEditing ? "Save Changes" : "Add Habit"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
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
  summaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
    gap: 18,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryStat: {
    flex: 1,
    gap: 6,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },
  summaryLabel: {
    fontSize: 9,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginHorizontal: 16,
  },
  list: {
    gap: 12,
  },
  objectiveCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  objectiveBody: {
    flex: 1,
    gap: 4,
  },
  objectiveTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  objectiveSummit: {
    fontFamily: MONO,
    fontSize: 10,
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,12,16,0.45)",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 22,
    paddingHorizontal: 22,
    maxHeight: "90%",
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalFooter: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "transparent",
  },
  sectionHeading: {
    fontSize: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeadingAlt: {
    fontSize: 10,
    marginBottom: 12,
    marginTop: 28,
  },
  emptyDayCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  emptyDayText: {
    fontSize: 13,
  },
  objectiveCardMuted: {
    opacity: 0.7,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  modalLabel: {
    marginBottom: 10,
  },
  emptySummits: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  emptySummitsText: {
    fontSize: 13,
    textAlign: "center",
  },
  chipScroll: {
    gap: 8,
    paddingBottom: 20,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 200,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  modalButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
