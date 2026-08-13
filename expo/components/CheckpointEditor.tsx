import { GripVertical, Plus, Trash2, X } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import SectionLabel from "@/components/SectionLabel";
import { ThemeColors, MONO } from "@/constants/theme";
import { Checkpoint } from "@/mocks/data";

interface CheckpointEditorProps {
  checkpoints: Checkpoint[];
  onChange: (next: Checkpoint[]) => void;
  theme: ThemeColors;
  testID?: string;
}

interface LayoutInfo {
  y: number;
  height: number;
}

type PanStateEvent = {
  nativeEvent: {
    state: State;
    y: number;
    translationY: number;
  };
};

const GAP = 8;
const LONG_PRESS_MS = 400;
const SPRING_TENSION = 300;
const SPRING_FRICTION = 26;

function genId(): string {
  return `cp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Reusable editor for a Summit's checkpoint list.
 * Supports add / edit / delete / reorder via long-press-and-drag.
 * Operates on a controlled list via `onChange`.
 */
export default function CheckpointEditor({
  checkpoints,
  onChange,
  theme,
  testID,
}: CheckpointEditorProps) {
  const [adding, setAdding] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDue, setNewDue] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDue, setEditDue] = useState<string>("");

  // --- Drag render state ---
  const [activeId, setActiveId] = useState<string | null>(null);

  // --- Drag refs (avoid re-renders during gesture) ---
  const layoutsRef = useRef<Map<string, LayoutInfo>>(new Map());
  const checkpointsRef = useRef<Checkpoint[]>(checkpoints);
  checkpointsRef.current = checkpoints;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const activeTranslateY = useRef(new Animated.Value(0)).current;
  const rowAnimsRef = useRef<Map<string, Animated.Value>>(new Map());

  const activeIdRef = useRef<string | null>(null);
  const fromIndexRef = useRef<number>(-1);
  const hoverIndexRef = useRef<number>(-1);

  // Ensure each checkpoint has a displacement Animated.Value
  for (const cp of checkpoints) {
    if (!rowAnimsRef.current.has(cp.id)) {
      rowAnimsRef.current.set(cp.id, new Animated.Value(0));
    }
  }
  // Clean up values for deleted checkpoints
  const currentIds = new Set(checkpoints.map((c) => c.id));
  for (const id of Array.from(rowAnimsRef.current.keys())) {
    if (!currentIds.has(id)) {
      rowAnimsRef.current.delete(id);
      layoutsRef.current.delete(id);
    }
  }

  // --- Native-driven gesture event: translationY → activeTranslateY ---
  const onGestureEvent = useRef(
    Animated.event(
      [{ nativeEvent: { translationY: activeTranslateY } }],
      { useNativeDriver: true },
    ),
  ).current;

  // --- Listener: compute hover slot + displace other rows ---
  const handleTranslate = useCallback(({ value }: { value: number }) => {
    const cps = checkpointsRef.current;
    const aid = activeIdRef.current;
    const from = fromIndexRef.current;
    if (!aid || from < 0) return;

    const activeLay = layoutsRef.current.get(aid);
    if (!activeLay) return;

    const activeCenter = activeLay.y + activeLay.height / 2 + value;

    // Count non-active rows whose center is above the active row's center
    let slot = 0;
    for (let i = 0; i < cps.length; i++) {
      if (cps[i].id === aid) continue;
      const l = layoutsRef.current.get(cps[i].id);
      if (!l) continue;
      if (l.y + l.height / 2 < activeCenter) slot++;
    }
    slot = Math.max(0, Math.min(cps.length - 1, slot));

    if (slot === hoverIndexRef.current) return;
    hoverIndexRef.current = slot;
    Haptics.selectionAsync().catch(() => {});

    // Displace rows between `from` and `slot` to make space
    const shift = activeLay.height + GAP;
    for (let i = 0; i < cps.length; i++) {
      const cp = cps[i];
      if (cp.id === aid) continue;
      const anim = rowAnimsRef.current.get(cp.id);
      if (!anim) continue;

      let target = 0;
      if (from < slot) {
        // Active moved down: rows (from, slot] shift up
        if (i > from && i <= slot) target = -shift;
      } else if (from > slot) {
        // Active moved up: rows [slot, from) shift down
        if (i >= slot && i < from) target = shift;
      }

      Animated.spring(anim, {
        toValue: target,
        useNativeDriver: true,
        tension: SPRING_TENSION,
        friction: SPRING_FRICTION,
      }).start();
    }
  }, []);

  useEffect(() => {
    const id = activeTranslateY.addListener(handleTranslate);
    return () => activeTranslateY.removeListener(id);
  }, [activeTranslateY, handleTranslate]);

  // --- State change: start / end drag ---
  const onStateChange = useCallback(
    (evt: PanStateEvent) => {
      const { state, y } = evt.nativeEvent;

      if (state === State.ACTIVE) {
        // Long-press recognized — determine which row was pressed
        const cps = checkpointsRef.current;
        let pressedIdx = -1;
        for (let i = 0; i < cps.length; i++) {
          const l = layoutsRef.current.get(cps[i].id);
          if (!l) continue;
          if (y >= l.y && y <= l.y + l.height) {
            pressedIdx = i;
            break;
          }
        }
        if (pressedIdx < 0) return;

        activeIdRef.current = cps[pressedIdx].id;
        fromIndexRef.current = pressedIdx;
        hoverIndexRef.current = pressedIdx;
        activeTranslateY.setValue(0);
        rowAnimsRef.current.forEach((a) => a.setValue(0));
        setActiveId(cps[pressedIdx].id);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } else if (
        state === State.END ||
        state === State.CANCELLED ||
        state === State.FAILED
      ) {
        const cps = checkpointsRef.current;
        const from = fromIndexRef.current;
        const to = hoverIndexRef.current;
        const aid = activeIdRef.current;

        if (!aid || from < 0) return;

        const activeLay = layoutsRef.current.get(aid);
        const didReorder =
          to >= 0 && to !== from && to < cps.length && !!activeLay;

        if (didReorder && activeLay) {
          // Build the reordered array
          const next = [...cps];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);

          // Recompute layout positions for the new order immediately
          // so the next drag works without waiting for onLayout
          let cumY = 0;
          for (const cp of next) {
            const l = layoutsRef.current.get(cp.id);
            if (l) {
              layoutsRef.current.set(cp.id, { y: cumY, height: l.height });
              cumY += l.height + GAP;
            }
          }

          // Reset all drag state immediately — don't wait for spring callback
          // This prevents the gesture from locking after one reorder
          activeTranslateY.setValue(0);
          activeIdRef.current = null;
          fromIndexRef.current = -1;
          hoverIndexRef.current = -1;
          setActiveId(null);

          // Commit the reorder to parent state
          onChangeRef.current(next);

          // Spring displacement values back to 0 for visual smoothness
          rowAnimsRef.current.forEach((anim) => {
            Animated.spring(anim, {
              toValue: 0,
              useNativeDriver: true,
              tension: SPRING_TENSION,
              friction: 22,
            }).start();
          });

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } else {
          // No reorder needed — reset immediately and spring back
          activeTranslateY.setValue(0);
          activeIdRef.current = null;
          fromIndexRef.current = -1;
          hoverIndexRef.current = -1;
          setActiveId(null);

          rowAnimsRef.current.forEach((anim) => {
            Animated.spring(anim, {
              toValue: 0,
              useNativeDriver: true,
              tension: SPRING_TENSION,
              friction: 22,
            }).start();
          });
        }
      }
    },
    [activeTranslateY],
  );

  const recordLayout = useCallback((id: string, layout: LayoutInfo) => {
    layoutsRef.current.set(id, layout);
  }, []);

  // --- Add / Edit / Delete ---
  const commitAdd = () => {
    const trimmed = newTitle.trim();
    if (trimmed.length === 0) return;
    const cp: Checkpoint = {
      id: genId(),
      title: trimmed,
      done: false,
      dueDate: newDue.trim().length > 0 ? newDue.trim() : undefined,
    };
    onChange([...checkpoints, cp]);
    setNewTitle("");
    setNewDue("");
    setAdding(false);
  };

  const startEdit = (cp: Checkpoint) => {
    setEditingId(cp.id);
    setEditTitle(cp.title);
    setEditDue(cp.dueDate ?? "");
  };

  const commitEdit = () => {
    if (!editingId) return;
    const trimmed = editTitle.trim();
    if (trimmed.length === 0) return;
    onChange(
      checkpoints.map((c) =>
        c.id === editingId
          ? {
              ...c,
              title: trimmed,
              dueDate: editDue.trim().length > 0 ? editDue.trim() : undefined,
            }
          : c,
      ),
    );
    setEditingId(null);
    setEditTitle("");
    setEditDue("");
  };

  const remove = (id: string) => {
    onChange(checkpoints.filter((c) => c.id !== id));
  };

  return (
    <View testID={testID}>
      {checkpoints.length === 0 && !adding && (
        <View
          style={[
            styles.empty,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        >
          <Text style={[styles.emptyText, { color: theme.textFaint }]}>
            No checkpoints yet. Add the first step on the route.
          </Text>
        </View>
      )}

      <PanGestureHandler
        activateAfterLongPress={LONG_PRESS_MS}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onStateChange}
        shouldCancelWhenOutside={false}
      >
        <Animated.View style={styles.list}>
          {checkpoints.map((cp, i) => {
            const isActive = cp.id === activeId;
            const rowAnim = isActive
              ? activeTranslateY
              : rowAnimsRef.current.get(cp.id) ?? new Animated.Value(0);
            return (
              <CheckpointRow
                key={cp.id}
                cp={cp}
                index={i}
                isActive={isActive}
                translateAnim={rowAnim}
                theme={theme}
                onLayout={recordLayout}
                onEdit={() => startEdit(cp)}
                onDelete={() => remove(cp.id)}
              />
            );
          })}
        </Animated.View>
      </PanGestureHandler>

      {adding ? (
        <View
          style={[
            styles.addCard,
            { borderColor: theme.accent, backgroundColor: theme.surface },
          ]}
        >
          <SectionLabel color={theme.textFaint} style={styles.fieldLabel}>
            New Checkpoint
          </SectionLabel>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Checkpoint title"
            placeholderTextColor={theme.textFaint}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
            autoFocus
            maxLength={200}
            testID="cp-new-title"
          />
          <TextInput
            value={newDue}
            onChangeText={setNewDue}
            placeholder="Due date (optional)"
            placeholderTextColor={theme.textFaint}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
            maxLength={50}
            testID="cp-new-due"
          />
          <View style={styles.addActions}>
            <Pressable
              onPress={() => {
                setAdding(false);
                setNewTitle("");
                setNewDue("");
              }}
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
              testID="cp-add-cancel"
            >
              <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={commitAdd}
              disabled={newTitle.trim().length === 0}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: theme.inverse,
                  opacity: newTitle.trim().length === 0 ? 0.4 : 1,
                },
              ]}
              testID="cp-add-save"
            >
              <Text style={[styles.primaryBtnText, { color: theme.inverseText }]}>
                Add
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          style={[
            styles.addRow,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
          testID="cp-add-row"
        >
          <Plus size={16} color={theme.accent} strokeWidth={2.25} />
          <Text style={[styles.addRowText, { color: theme.accent }]}>
            Add checkpoint
          </Text>
        </Pressable>
      )}

      {/* Edit modal */}
      <Modal
        visible={editingId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingId(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEditingId(null)}
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
                Edit Checkpoint
              </Text>
              <Pressable
                onPress={() => setEditingId(null)}
                hitSlop={10}
                testID="cp-edit-close"
              >
                <X size={20} color={theme.textFaint} />
              </Pressable>
            </View>
            <SectionLabel color={theme.textFaint} style={styles.fieldLabel}>
              Title
            </SectionLabel>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Checkpoint title"
              placeholderTextColor={theme.textFaint}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              maxLength={200}
              testID="cp-edit-title"
            />
            <SectionLabel color={theme.textFaint} style={styles.fieldLabel}>
              Due date (optional)
            </SectionLabel>
            <TextInput
              value={editDue}
              onChangeText={setEditDue}
              placeholder="e.g. Sep 14"
              placeholderTextColor={theme.textFaint}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              maxLength={50}
              testID="cp-edit-due"
            />
            <View style={styles.addActions}>
              <Pressable
                onPress={() => setEditingId(null)}
                style={[styles.secondaryBtn, { borderColor: theme.border }]}
                testID="cp-edit-cancel"
              >
                <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={commitEdit}
                disabled={editTitle.trim().length === 0}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.inverse,
                    opacity: editTitle.trim().length === 0 ? 0.4 : 1,
                  },
                ]}
                testID="cp-edit-save"
              >
                <Text style={[styles.primaryBtnText, { color: theme.inverseText }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

interface RowProps {
  cp: Checkpoint;
  index: number;
  isActive: boolean;
  translateAnim: Animated.Value;
  theme: ThemeColors;
  onLayout: (id: string, layout: LayoutInfo) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const CheckpointRow = memo(function CheckpointRow({
  cp,
  index,
  isActive,
  translateAnim,
  theme,
  onLayout,
  onEdit,
  onDelete,
}: RowProps) {
  return (
    <Animated.View
      onLayout={(e) => onLayout(cp.id, e.nativeEvent.layout)}
      style={[
        styles.row,
        {
          borderColor: isActive ? theme.accent : theme.border,
          backgroundColor: theme.surface,
          transform: [{ translateY: translateAnim }],
          zIndex: isActive ? 100 : 1,
          elevation: isActive ? 8 : 0,
          shadowColor: "#000",
          shadowOpacity: isActive ? 0.25 : 0,
          shadowRadius: isActive ? 16 : 0,
          shadowOffset: { width: 0, height: 6 },
          opacity: isActive ? 0.95 : 1,
        },
      ]}
    >
      <View style={styles.gripHint}>
        <GripVertical
          size={16}
          color={isActive ? theme.accent : theme.textFaint}
        />
      </View>
      <View style={styles.rowIndex}>
        <Text style={[styles.rowIndexText, { color: theme.textFaint }]}>
          {String(index + 1).padStart(2, "0")}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowTitle,
            {
              color: cp.done ? theme.textFaint : theme.text,
              textDecorationLine: cp.done ? "line-through" : "none",
            },
          ]}
          numberOfLines={2}
        >
          {cp.title}
        </Text>
        {cp.dueDate ? (
          <Text style={[styles.rowDue, { color: theme.textFaint }]}>
            DUE {cp.dueDate.toUpperCase()}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowActions}>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          style={styles.iconBtn}
          testID={`cp-edit-${cp.id}`}
        >
          <Text style={[styles.editGlyph, { color: theme.textSecondary }]}>
            EDIT
          </Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={styles.iconBtn}
          testID={`cp-delete-${cp.id}`}
        >
          <Trash2 size={15} color={theme.negative} />
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  list: {
    gap: GAP,
    marginBottom: 10,
  },
  row: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gripHint: {
    width: 22,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIndex: {
    width: 24,
  },
  rowIndexText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: "700",
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowDue: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  editGlyph: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  addRow: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addRowText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  fieldLabel: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,12,16,0.45)",
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});
