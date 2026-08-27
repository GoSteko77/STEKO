import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { Zap, Moon } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BlueprintMountain from "@/components/BlueprintMountain";
import CheckpointEditor from "@/components/CheckpointEditor";
import MomentumChart from "@/components/MomentumChart";
import RatingSlider from "@/components/RatingSlider";
import SectionLabel from "@/components/SectionLabel";
import SummitFormModal, {
  SummitFormValues,
} from "@/components/SummitFormModal";
import { MONO } from "@/constants/theme";
import { PRIORITY_LABEL, Summit } from "@/mocks/data";
import { MOMENTUM_WINDOW, useApp } from "@/providers/AppProvider";
import { formatKey } from "@/utils/date";
import { showDeleteConfirm } from "@/utils/confirmDelete";

const MIN_DATA_POINTS = MOMENTUM_WINDOW;

export default function SummitDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const {
    theme,
    summits,
    checkpoints,
    toggleCheckpoint,
    setCheckpointsForSummit,
    logProgress,
    todayLogFor,
    logFor,
    selectedDate,
    isViewingToday,
    summitMomentum,
    updateSummit,
    deleteSummit,
    setSummitStatus,
    values,
    deleteLog,
    objectives,
    logs,
  } = useApp();

  const summit = summits.find((s) => s.id === id);
  const cps = useMemo(() => checkpoints[id ?? ""] ?? [], [checkpoints, id]);
  const tiedHabits = useMemo(
    () => objectives.filter((o) => o.summitIds.includes(id ?? "")),
    [objectives, id],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [editingCps, setEditingCps] = useState<boolean>(false);
  const [editSummitOpen, setEditSummitOpen] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // All logs for this summit, newest first. Memoized before the early
  // return to satisfy the Rules of Hooks.
  const summitLogs = useMemo(
    () =>
      logs
        .filter((l) => l.summitId === (summit?.id ?? id))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [logs, summit?.id, id],
  );

  // Tracks an in-flight deletion so the early-return below renders null
  // (instead of "Summit not found") while the useEffect navigates away.
  const isDeletingRef = useRef<boolean>(false);

  // Memoize edit form initial values. MUST be called before the early
  // return to satisfy the Rules of Hooks — otherwise deleting a summit
  // (which makes summit undefined) causes React to throw "Rendered fewer
  // hooks than expected" and the screen goes blank.
  const editInitial: Partial<SummitFormValues> = useMemo(
    () =>
      summit
        ? {
            name: summit.name,
            purpose: summit.purpose,
            forWhom: summit.forWhom,
            term: summit.term,
            hasDeadline: Boolean(summit.deadline),
            deadline: summit.deadline ?? "",
            details: summit.details,
            priority: summit.priority,
            values: summit.values,
            checkpoints: cps,
            hasReward: summit.hasReward,
            reward: summit.reward,
          }
        : {},
    [summit, cps],
  );

  // After deleteSummit removes the summit from state, the component
  // re-renders with summit === undefined. This effect fires post-commit
  // and performs the navigation — much more reliable on web PWA than
  // calling router.replace synchronously inside the confirm callback.
  useEffect(() => {
    if (!summit && isDeletingRef.current) {
      isDeletingRef.current = false;
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    }
  }, [summit, router]);

  if (!summit) {
    if (isDeletingRef.current) return null;
    return (
      <View style={[styles.missing, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Summit not found.</Text>
      </View>
    );
  }

  const todayLog = isViewingToday
    ? todayLogFor(summit.id)
    : logFor(summit.id, selectedDate);
  const selected = cps.find((c) => c.id === selectedId) ?? null;
  const artWidth = width - 44;
  const momentumSeries = summitMomentum(summit.id);
  const hasEnoughData = momentumSeries.length >= MIN_DATA_POINTS;
  const momentumNow =
    momentumSeries.length > 0
      ? Math.round(momentumSeries[momentumSeries.length - 1])
      : 50;
  // Always show a chart — prepend the baseline (50) so the line always
  // renders from the neutral starting point. Flat line at 50 if no data.
  const summitChartData = momentumSeries.length > 0 ? [50, ...momentumSeries] : [50, 50];
  const doneCount = cps.filter((c) => c.done).length;

  const priorityTint =
    summit.priority === "high"
      ? theme.negative
      : summit.priority === "medium"
        ? theme.amber
        : theme.textFaint;

  const submitLog = () => {
    logProgress(summit.id, rating, note.trim(), selectedDate);
    setNote("");
    setEditingLog(false);
  };

  const startEditLog = () => {
    if (todayLog) {
      setRating(todayLog.score);
      setNote(todayLog.note);
      setEditingLog(true);
    }
  };

  const cancelEditLog = () => {
    setRating(0);
    setNote("");
    setEditingLog(false);
  };

  const deleteLogEntry = () => {
    showDeleteConfirm(
      "Delete Log",
      isViewingToday
        ? "Remove today's progress log?"
        : `Remove the log for ${selectedDate}?`,
      () => {
        deleteLog(summit.id, selectedDate);
        setEditingLog(false);
        setRating(0);
        setNote("");
      },
    );
  };

  const confirmDelete = () => {
    const summitId = summit.id;
    showDeleteConfirm(
      "Delete Summit",
      `Delete "${summit.name}"? This removes its checkpoints, momentum logs, and habit ties. This cannot be undone.`,
      () => {
        // Set the flag so the early-return renders null (not "Summit not
        // found") and the useEffect above handles navigation after the
        // state update commits. This avoids a synchronous router.replace
        // getting lost when deleteSummit triggers a re-render first.
        isDeletingRef.current = true;
        deleteSummit(summitId);
      },
    );
  };

  const handleEditSubmit = (values: SummitFormValues) => {
    updateSummit(summit.id, {
      name: values.name.trim(),
      purpose: values.purpose,
      forWhom: values.forWhom,
      term: values.term,
      deadline: values.hasDeadline ? values.deadline : undefined,
      details: values.details,
      priority: values.priority,
      values: values.values,
      hasReward: values.hasReward,
      reward: values.hasReward ? values.reward.trim() : "",
    });
    setCheckpointsForSummit(summit.id, values.checkpoints);
    setEditSummitOpen(false);
  };

  const statusToggleLabel =
    summit.status === "completed" ? "Reopen Summit" : "Mark Summited";

  const toggleStatus = () => {
    setSummitStatus(
      summit.id,
      summit.status === "completed" ? "active" : "completed",
    );
  };

  const isActive = summit.status === "active";
  const isBackground = summit.status === "background";

  const setSummitMode = (mode: "active" | "background") => {
    if (summit.status === "completed") return;
    setSummitStatus(summit.id, mode);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 60,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)");
            }}
            hitSlop={12}
            style={styles.backButton}
            testID="summit-back"
          >
            <ArrowLeft size={22} color={theme.textSecondary} />
          </Pressable>
          <View style={styles.topActions}>
            <Pressable
              onPress={() => setEditSummitOpen(true)}
              hitSlop={10}
              style={[styles.iconAction, { borderColor: theme.border }]}
              testID="edit-summit"
            >
              <Pencil size={15} color={theme.textSecondary} strokeWidth={1.9} />
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              hitSlop={10}
              style={[styles.iconAction, { borderColor: theme.border }]}
              testID="delete-summit"
            >
              <Trash2 size={15} color={theme.negative} strokeWidth={1.9} />
            </Pressable>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]}>{summit.name}</Text>

          {summit.status !== "completed" && (
            <View style={[styles.modeTabs, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Pressable
                onPress={() => setSummitMode("active")}
                style={[
                  styles.modeTab,
                  isActive && { backgroundColor: theme.inverse },
                ]}
                testID="summit-mode-active"
              >
                <Zap size={13} color={isActive ? theme.inverseText : theme.textSecondary} strokeWidth={2} />
                <Text style={[
                  styles.modeTabText,
                  { color: isActive ? theme.inverseText : theme.textSecondary },
                ]}>
                  Active
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSummitMode("background")}
                style={[
                  styles.modeTab,
                  isBackground && { backgroundColor: theme.accentFaint },
                ]}
                testID="summit-mode-background"
              >
                <Moon size={13} color={isBackground ? theme.accent : theme.textSecondary} strokeWidth={2} />
                <Text style={[
                  styles.modeTabText,
                  { color: isBackground ? theme.accent : theme.textSecondary },
                ]}>
                  Background
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { borderColor: theme.border }]}>
              <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>
                {summit.term === "short" ? "SHORT-TERM" : "LONG-TERM"}
              </Text>
            </View>
            <View style={[styles.metaChip, { borderColor: theme.border }]}>
              <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>
                CREATED {formatKey(summit.startedAt, { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
              </Text>
            </View>
            {summit.deadline && (
              <View style={[styles.metaChip, { borderColor: theme.border }]}>
                <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>
                  DUE {summit.deadline.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.metaChip, { borderColor: theme.border }]}>
              <View style={[styles.priorityDot, { backgroundColor: priorityTint }]} />
              <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>
                {PRIORITY_LABEL[summit.priority].toUpperCase()}
              </Text>
            </View>
            {summit.status === "completed" && (
              <View
                style={[styles.metaChip, styles.completedChip, { borderColor: theme.accent }]}
              >
                <Text style={[styles.metaChipText, { color: theme.accent }]}>
                  SUMMITED
                </Text>
              </View>
            )}
          </View>
        </View>

        {summit.status === "completed" && summit.hasReward && summit.reward.length > 0 && (
          <View style={styles.rewardSection}>
            <View
              style={[styles.rewardCard, { backgroundColor: theme.accentFaint, borderColor: theme.accent }]}
            >
              <View style={[styles.rewardBadge, { backgroundColor: theme.accent }]}>
                <Text style={[styles.rewardBadgeText, { color: theme.inverseText }]}>
                  ★
                </Text>
              </View>
              <Text style={[styles.rewardTitle, { color: theme.accent }]}>
                You earned a reward!
              </Text>
              <Text style={[styles.rewardText, { color: theme.text }]}>
                {summit.reward}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.mountainWrap}>
          <BlueprintMountain
            width={artWidth}
            height={artWidth * 0.78}
            checkpoints={cps.map((c) => ({ id: c.id, title: c.title, done: c.done }))}
            accent={theme.accent}
            lineColor={theme.text}
            faintColor={theme.textFaint}
            surfaceColor={theme.background}
            labelColor={theme.textSecondary}
            showLabels
            interactive
            selectedId={selectedId}
            onPressCheckpoint={(cid) =>
              setSelectedId((prev) => (prev === cid ? null : cid))
            }
            summitLabel={`${doneCount}/${cps.length}`}
          />
        </View>

        {selected && (
          <View
            style={[
              styles.checkpointCard,
              { borderColor: theme.accent, backgroundColor: theme.surface },
            ]}
          >
            <View style={styles.checkpointHeader}>
              <View style={styles.checkpointHeaderText}>
                <SectionLabel color={theme.textFaint}>Checkpoint</SectionLabel>
                <Text style={[styles.checkpointTitle, { color: theme.text }]}>
                  {selected.title}
                </Text>
              </View>
              {selected.dueDate && (
                <Text style={[styles.checkpointDue, { color: theme.textSecondary }]}>
                  {selected.dueDate}
                </Text>
              )}
            </View>
            {selected.detail && (
              <Text style={[styles.checkpointDetail, { color: theme.textSecondary }]}>
                {selected.detail}
              </Text>
            )}
            <Pressable
              onPress={() => toggleCheckpoint(summit.id, selected.id)}
              style={[
                styles.checkpointAction,
                {
                  backgroundColor: selected.done ? "transparent" : theme.inverse,
                  borderColor: theme.border,
                  borderWidth: selected.done ? 1 : 0,
                },
              ]}
              testID="toggle-checkpoint"
            >
              {selected.done ? (
                <Text style={[styles.checkpointActionText, { color: theme.textSecondary }]}>
                  Mark Incomplete
                </Text>
              ) : (
                <>
                  <Check size={16} color={theme.inverseText} strokeWidth={2.5} />
                  <Text style={[styles.checkpointActionText, { color: theme.inverseText }]}>
                    Mark Complete
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.checkpointsHeader}>
            <SectionLabel color={theme.textFaint}>
              {`Checkpoints · ${doneCount}/${cps.length}`}
            </SectionLabel>
            <Pressable
              onPress={() => setEditingCps((v) => !v)}
              hitSlop={8}
              testID="toggle-edit-checkpoints"
            >
              <Text style={[styles.editLink, { color: theme.accent }]}>
                {editingCps ? "Done" : "Edit"}
              </Text>
            </Pressable>
          </View>
          {editingCps ? (
            <CheckpointEditor
              checkpoints={cps}
              onChange={(next) => setCheckpointsForSummit(summit.id, next)}
              theme={theme}
              testID="summit-checkpoint-editor"
            />
          ) : cps.length === 0 ? (
            <View
              style={[
                styles.emptyCps,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <Text style={[styles.emptyCpsText, { color: theme.textFaint }]}>
                No checkpoints yet. Tap Edit to add the steps on the route.
              </Text>
            </View>
          ) : (
            <View style={styles.cpList}>
              {cps.map((c, i) => {
                  const isSelected = selectedId === c.id;
                  const isLast = i === cps.length - 1;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() =>
                        setSelectedId((prev) => (prev === c.id ? null : c.id))
                      }
                      style={({ pressed }) => [
                        styles.cpRow,
                        {
                          borderColor: isSelected ? theme.accent : theme.border,
                          backgroundColor: isSelected
                            ? theme.accentFaint
                            : theme.surface,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      testID={`cp-row-${c.id}`}
                    >
                      {/* Connector line to next checkpoint */}
                      {!isLast && (
                        <View
                          style={[
                            styles.cpConnector,
                            {
                              backgroundColor: c.done ? theme.accent : theme.hairline,
                              left: 27,
                            },
                          ]}
                        />
                      )}
                      <View
                        style={[
                          styles.cpDot,
                          {
                            backgroundColor: c.done
                              ? theme.accent
                              : isSelected
                                ? theme.accentFaint
                                : theme.background,
                            borderColor: c.done ? theme.accent : theme.border,
                          },
                        ]}
                      >
                        {c.done ? (
                          <Check size={11} color={theme.surface} strokeWidth={3} />
                        ) : (
                          <Text
                            style={[
                              styles.cpDotNum,
                              { color: isSelected ? theme.accent : theme.textFaint },
                            ]}
                          >
                            {i + 1}
                          </Text>
                        )}
                      </View>
                      <View style={styles.cpBody}>
                        <Text
                          style={[
                            styles.cpTitle,
                            {
                              color: c.done ? theme.textFaint : theme.text,
                              textDecorationLine: c.done ? "line-through" : "none",
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {c.title}
                        </Text>
                        {c.dueDate && (
                          <View style={styles.cpDueRow}>
                            <View
                              style={[
                                styles.cpDueDot,
                                { backgroundColor: theme.textFaint },
                              ]}
                            />
                            <Text style={[styles.cpDue, { color: theme.textFaint }]}>
                              {c.dueDate.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      {c.done && (
                        <View
                          style={[
                            styles.cpDoneBadge,
                            { backgroundColor: theme.accentFaint },
                          ]}
                        >
                          <Text style={[styles.cpDoneText, { color: theme.accent }]}>
                            DONE
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
            </View>
          )}
        </View>

        {isActive && (
        <View style={styles.section}>
          <View style={styles.momentumHeader}>
            <SectionLabel color={theme.textFaint}>Summit Momentum</SectionLabel>
            <Text style={[styles.momentumValue, { color: theme.text }]}>
              {momentumNow}
            </Text>
          </View>
          <MomentumChart
            data={summitChartData}
            height={150}
            color={theme.accent}
            gridColor={theme.hairline}
            yMin={0}
            yMax={100}
          />
          {hasEnoughData ? (
            <Text style={[styles.chartCaption, { color: theme.textFaint }]}>
              {momentumSeries.length} DAYS · ROLLING {MOMENTUM_WINDOW}-DAY SCORE
            </Text>
          ) : (
            <Text style={[styles.chartCaption, { color: theme.textFaint, fontSize: 13, letterSpacing: 0.5, lineHeight: 19 }]}>
              Summits require {MOMENTUM_WINDOW} days of logging to view an accurate score.
            </Text>
          )}
        </View>
        )}

        {isActive && selectedDate < summit.startedAt && (
          <View style={styles.section}>
            <View style={[styles.backgroundNotice, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Moon size={18} color={theme.textFaint} strokeWidth={1.75} />
              <Text style={[styles.backgroundNoticeText, { color: theme.textSecondary }]}>
                This summit was created on {summit.startedAt}. Logging is only available from that date forward.
              </Text>
            </View>
          </View>
        )}

        {isActive && selectedDate >= summit.startedAt && (
        <View style={styles.section}>
          <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
            {isViewingToday ? "Rate your progress today" : `Rate ${selectedDate}`}
          </SectionLabel>
          {todayLog && !editingLog ? (
            <View
              style={[
                styles.loggedCard,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <View style={[styles.loggedBadge, { backgroundColor: theme.accentFaint }]}>
                <Check size={14} color={theme.accent} strokeWidth={2.5} />
              </View>
              <View style={styles.loggedBody}>
                <Text style={[styles.loggedTitle, { color: theme.text }]}>
                  Logged {todayLog.score > 0 ? `+${todayLog.score}` : todayLog.score}{" "}
                  {isViewingToday ? "for today" : `for ${selectedDate}`}
                </Text>
                {todayLog.note.length > 0 && (
                  <Text style={[styles.loggedNote, { color: theme.textSecondary }]}>
                    “{todayLog.note}”
                  </Text>
                )}
                <View style={styles.loggedActions}>
                  <Pressable
                    onPress={startEditLog}
                    hitSlop={8}
                    style={[styles.loggedActionBtn, { borderColor: theme.border }]}
                  >
                    <Pencil size={13} color={theme.textSecondary} strokeWidth={1.9} />
                    <Text style={[styles.loggedActionText, { color: theme.textSecondary }]}>
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={deleteLogEntry}
                    hitSlop={8}
                    style={[styles.loggedActionBtn, { borderColor: theme.border }]}
                  >
                    <Trash2 size={13} color={theme.negative} strokeWidth={1.9} />
                    <Text style={[styles.loggedActionText, { color: theme.negative }]}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : todayLog && editingLog ? (
            <View
              style={[
                styles.rateCard,
                { borderColor: theme.accent, backgroundColor: theme.surface },
              ]}
            >
              <View style={styles.editingHeader}>
                <Text style={[styles.editingLabel, { color: theme.accent }]}>
                  EDITING LOG
                </Text>
                <Pressable
                  onPress={cancelEditLog}
                  hitSlop={10}
                  style={[styles.editingClose, { borderColor: theme.border }]}
                >
                  <X size={14} color={theme.textSecondary} strokeWidth={2} />
                </Pressable>
              </View>
              <RatingSlider
                value={rating}
                onChange={setRating}
                positiveColor={theme.positive}
                negativeColor={theme.negative}
                neutralColor={theme.textSecondary}
                trackColor={theme.border}
                surfaceColor={theme.surface}
                textColor={theme.text}
                faintColor={theme.textFaint}
              />
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note"
                placeholderTextColor={theme.textFaint}
                style={[
                  styles.noteInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
                multiline
                maxLength={500}
                testID="note-input-edit"
              />
              <View style={[styles.editActions, { marginTop: 14 }]}>
                <Pressable
                  onPress={deleteLogEntry}
                  style={({ pressed }) => [
                    styles.editDeleteBtn,
                    {
                      borderColor: theme.negative,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Trash2 size={16} color={theme.negative} strokeWidth={1.9} />
                  <Text style={[styles.editDeleteText, { color: theme.negative }]}>
                    Delete
                  </Text>
                </Pressable>
                <Pressable
                  onPress={submitLog}
                  style={({ pressed }) => [
                    styles.logButton,
                    {
                      flex: 1,
                      backgroundColor: theme.inverse,
                      opacity: pressed ? 0.85 : 1,
                      marginTop: 0,
                    },
                  ]}
                  testID="save-edited-log"
                >
                  <Check size={18} color={theme.inverseText} strokeWidth={2.5} />
                  <Text style={[styles.logButtonText, { color: theme.inverseText }]}>
                    Save Changes
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.rateCard,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <RatingSlider
                value={rating}
                onChange={setRating}
                positiveColor={theme.positive}
                negativeColor={theme.negative}
                neutralColor={theme.textSecondary}
                trackColor={theme.border}
                surfaceColor={theme.surface}
                textColor={theme.text}
                faintColor={theme.textFaint}
              />
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note"
                placeholderTextColor={theme.textFaint}
                style={[
                  styles.noteInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
                multiline
                maxLength={500}
                testID="note-input"
              />
              <Pressable
                onPress={submitLog}
                style={({ pressed }) => [
                  styles.logButton,
                  { backgroundColor: theme.inverse, opacity: pressed ? 0.85 : 1 },
                ]}
                testID="log-progress"
              >
                <Text style={[styles.logButtonText, { color: theme.inverseText }]}>
                  {isViewingToday ? "Log Today" : `Log ${selectedDate}`}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        )}

        {isBackground && (
          <View style={styles.section}>
            <View style={[styles.backgroundNotice, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Moon size={18} color={theme.textFaint} strokeWidth={1.75} />
              <Text style={[styles.backgroundNoticeText, { color: theme.textSecondary }]}>
                This is a Background Summit. Momentum logging is only available for Active Summits. Switch to Active to track daily progress.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Pressable
            onPress={() => setShowHistory((v) => !v)}
            style={[
              styles.historyBtn,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
            testID="toggle-log-history"
          >
            <Text style={[styles.historyBtnText, { color: theme.textSecondary }]}>
              View Log History
            </Text>
            {showHistory ? (
              <ChevronUp size={14} color={theme.textSecondary} strokeWidth={2} />
            ) : (
              <ChevronDown size={14} color={theme.textSecondary} strokeWidth={2} />
            )}
          </Pressable>
          {showHistory && (
            <View
              style={[
                styles.historyCard,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              {summitLogs.length === 0 ? (
                <Text style={[styles.historyEmpty, { color: theme.textFaint }]}>
                  No logs yet.
                </Text>
              ) : (
                summitLogs.map((log, i) => {
                  const score = log.score;
                  const scoreText = score > 0 ? `+${score}` : `${score}`;
                  const scoreColor =
                    score > 0
                      ? theme.positive
                      : score < 0
                        ? theme.negative
                        : theme.textSecondary;
                  return (
                    <React.Fragment key={`${log.summitId}-${log.date}`}>
                      <View style={styles.historyRow}>
                        <Text style={[styles.historyDate, { color: theme.textFaint }]}>
                          {formatKey(log.date.slice(0, 10), {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }).toUpperCase()}
                        </Text>
                        <View
                          style={[
                            styles.historyScorePill,
                            { backgroundColor: theme.hairline },
                          ]}
                        >
                          <Text style={[styles.historyScoreText, { color: scoreColor }]}>
                            {scoreText}
                          </Text>
                        </View>
                      </View>
                      {log.note.length > 0 && (
                        <Text style={[styles.historyNote, { color: theme.textSecondary }]}>
                          “{log.note}”
                        </Text>
                      )}
                      {i < summitLogs.length - 1 && (
                        <View style={[styles.historyDivider, { backgroundColor: theme.hairline }]} />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </View>
          )}
        </View>

        {tiedHabits.length > 0 && (
          <View style={styles.section}>
            <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
              Habits
            </SectionLabel>
            <View
              style={[
                styles.aboutCard,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              {tiedHabits.map((habit, i) => (
                <React.Fragment key={habit.id}>
                  <View style={styles.aboutRow}>
                    <View style={styles.habitDotRow}>
                      <View style={[styles.habitDot, { backgroundColor: theme.accent }]} />
                      <Text style={[styles.habitTitle, { color: theme.text }]} numberOfLines={1}>
                        {habit.title}
                      </Text>
                    </View>
                  </View>
                  {i < tiedHabits.length - 1 && (
                    <View style={[styles.aboutDivider, { backgroundColor: theme.hairline }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
            The Why
          </SectionLabel>
          <View
            style={[
              styles.aboutCard,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          >
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textFaint }]}>
                PURPOSE
              </Text>
              <Text style={[styles.aboutValue, { color: summit.purpose ? theme.text : theme.textFaint }]}>
                {summit.purpose || "—"}
              </Text>
            </View>
            <View style={[styles.aboutDivider, { backgroundColor: theme.hairline }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textFaint }]}>
                FOR
              </Text>
              <Text style={[styles.aboutValue, { color: summit.forWhom ? theme.text : theme.textFaint }]}>
                {summit.forWhom || "—"}
              </Text>
            </View>
            <View style={[styles.aboutDivider, { backgroundColor: theme.hairline }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textFaint }]}>
                VALUES
              </Text>
              {summit.values.length === 0 ? (
                <Text style={[styles.aboutValue, { color: theme.textFaint }]}>—</Text>
              ) : (
                <View style={styles.valuesRow}>
                  {summit.values.map((v) => (
                    <View
                      key={v}
                      style={[styles.valueChip, { backgroundColor: theme.accentFaint }]}
                    >
                      <Text style={[styles.valueChipText, { color: theme.accent }]}>
                        {v}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            {summit.deadline && (
              <>
                <View style={[styles.aboutDivider, { backgroundColor: theme.hairline }]} />
                <View style={styles.aboutRow}>
                  <Text style={[styles.aboutLabel, { color: theme.textFaint }]}>
                    DEADLINE
                  </Text>
                  <Text style={[styles.aboutValue, { color: theme.text }]}>
                    {summit.deadline}
                  </Text>
                </View>
              </>
            )}
            <View style={[styles.aboutDivider, { backgroundColor: theme.hairline }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textFaint }]}>
                DETAILS
              </Text>
              <Text style={[styles.aboutValue, { color: summit.details ? theme.textSecondary : theme.textFaint }]}>
                {summit.details || "—"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            onPress={toggleStatus}
            style={[
              styles.statusBtn,
              {
                borderColor: summit.status === "completed" ? theme.border : theme.accent,
                backgroundColor:
                  summit.status === "completed" ? "transparent" : theme.accentFaint,
              },
            ]}
            testID="toggle-summit-status"
          >
            <Text
              style={[
                styles.statusBtnText,
                {
                  color:
                    summit.status === "completed" ? theme.textSecondary : theme.accent,
                },
              ]}
            >
              {statusToggleLabel}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <SummitFormModal
        visible={editSummitOpen}
        onClose={() => setEditSummitOpen(false)}
        onSubmit={handleEditSubmit}
        theme={theme}
        initial={editInitial}
        title="Edit Summit"
        submitLabel="Save Changes"
        testID="summit-edit-form"
        availableValues={values}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    paddingHorizontal: 22,
    marginBottom: 8,
    gap: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  completedChip: {
    backgroundColor: "transparent",
  },
  metaChipText: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mountainWrap: {
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  checkpointCard: {
    marginHorizontal: 22,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    marginBottom: 26,
  },
  checkpointHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  checkpointHeaderText: {
    flex: 1,
    gap: 6,
  },
  checkpointTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  checkpointDue: {
    fontFamily: MONO,
    fontSize: 11,
  },
  checkpointDetail: {
    fontSize: 14,
    lineHeight: 21,
  },
  checkpointAction: {
    height: 46,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  checkpointActionText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  section: {
    paddingHorizontal: 22,
    marginTop: 26,
  },
  sectionLabel: {
    marginBottom: 14,
  },
  checkpointsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  editLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyCps: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  emptyCpsText: {
    fontSize: 13,
    textAlign: "center",
  },
  cpList: {
    gap: 10,
  },
  cpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
  },
  cpConnector: {
    position: "absolute",
    width: 2,
    top: 36,
    height: 22,
  },
  cpDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cpDotNum: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: "700",
  },
  cpBody: {
    flex: 1,
    gap: 4,
  },
  cpTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  cpDueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cpDueDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  cpDue: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  cpDoneBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cpDoneText: {
    fontFamily: MONO,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  momentumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  momentumValue: {
    fontSize: 24,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
    fontVariant: ["tabular-nums"],
  },
  chartCaption: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: 10,
  },
  rateCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: "top",
    marginTop: 22,
  },
  logButton: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  loggedCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  loggedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loggedBody: {
    flex: 1,
    gap: 5,
  },
  loggedActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  loggedActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  loggedActionText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  editingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editingLabel: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  editingClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  editDeleteBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  editDeleteText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  loggedTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  loggedNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  aboutCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  aboutRow: {
    paddingVertical: 12,
    gap: 8,
  },
  aboutLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  aboutValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  aboutDivider: {
    height: StyleSheet.hairlineWidth,
  },
  habitDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  habitDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  habitTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500" as const,
    lineHeight: 22,
  },
  valuesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  valueChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  valueChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  statusBtn: {
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modeTabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  modeTab: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  backgroundNotice: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  backgroundNoticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  historyBtn: {
    borderWidth: 1,
    borderRadius: 14,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  historyBtnText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.4,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  historyDate: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.1,
    flex: 1,
  },
  historyScorePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 44,
    alignItems: "center",
  },
  historyScoreText: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  historyNote: {
    fontSize: 14,
    lineHeight: 20,
    paddingBottom: 12,
  },
  historyEmpty: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  historyDivider: {
    height: StyleSheet.hairlineWidth,
  },
  rewardSection: {
    paddingHorizontal: 22,
    marginTop: 4,
    marginBottom: 6,
  },
  rewardCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },
  rewardBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardBadgeText: {
    fontSize: 22,
    fontWeight: "800" as const,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  rewardText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
