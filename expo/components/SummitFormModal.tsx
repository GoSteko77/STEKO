import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
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

import CheckpointEditor from "@/components/CheckpointEditor";
import SectionLabel from "@/components/SectionLabel";
import { ThemeColors, MONO } from "@/constants/theme";
import { Checkpoint, Priority, Summit, SummitTerm } from "@/mocks/data";

export interface SummitFormValues {
  name: string;
  purpose: string;
  forWhom: string;
  term: SummitTerm;
  hasDeadline: boolean;
  deadline: string;
  details: string;
  priority: Priority;
  values: string[];
  checkpoints: Checkpoint[];
  hasReward: boolean;
  reward: string;
}

export const EMPTY_SUMMIT_FORM: SummitFormValues = {
  name: "",
  purpose: "",
  forWhom: "",
  term: "short",
  hasDeadline: false,
  deadline: "",
  details: "",
  priority: "medium",
  values: [],
  checkpoints: [],
  hasReward: false,
  reward: "",
};

interface SummitFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: SummitFormValues) => void;
  theme: ThemeColors;
  initial?: Partial<SummitFormValues>;
  title?: string;
  submitLabel?: string;
  testID?: string;
  /** Available value tags the user can attach to the Summit. */
  availableValues?: string[];
}

/**
 * Modal form for creating or editing a Summit, including its checkpoints.
 * Used in onboarding and post-onboarding.
 */
export default function SummitFormModal({
  visible,
  onClose,
  onSubmit,
  theme,
  initial,
  title = "New Summit",
  submitLabel = "Save Summit",
  testID,
  availableValues = [],
}: SummitFormModalProps) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<SummitFormValues>(EMPTY_SUMMIT_FORM);

  // Only reset the form when the modal opens (visible transitions to true).
  // We intentionally do NOT depend on `initial` here — the parent may
  // re-render with a new `initial` object reference on every keystroke,
  // which would discard the user's in-progress edits. The form is seeded
  // once when the modal opens and then lives its own lifecycle.
  useEffect(() => {
    if (visible) {
      setForm({ ...EMPTY_SUMMIT_FORM, ...initial });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const set = <K extends keyof SummitFormValues>(key: K, value: SummitFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleValue = (v: string) =>
    setForm((prev) => ({
      ...prev,
      values: prev.values.includes(v)
        ? prev.values.filter((x) => x !== v)
        : [...prev.values, v],
    }));

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
  ];

  const canSubmit = form.name.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      ...form,
      name: form.name.trim(),
      purpose: form.purpose.trim(),
      forWhom: form.forWhom.trim(),
      // The deadline field is always visible (no toggle), so any non-empty
      // value means the user set an estimated completion date.
      hasDeadline: form.deadline.trim().length > 0,
      deadline: form.deadline.trim(),
      details: form.details.trim(),
      reward: form.hasReward ? form.reward.trim() : "",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: "rgba(10,12,16,0.5)" }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[styles.closeBtn, { borderColor: theme.border }]}
              testID="summit-form-close"
            >
              <X size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 22,
              paddingTop: 6,
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <SectionLabel color={theme.textFaint} style={styles.label}>
                Summit Name
              </SectionLabel>
              <TextInput
                value={form.name}
                onChangeText={(v) => set("name", v)}
                placeholder="Run a marathon"
                placeholderTextColor={theme.textFaint}
                style={[...inputStyle, styles.nameInput]}
                maxLength={120}
                testID="form-summit-name"
              />
            </View>

            <View style={styles.field}>
              <SectionLabel color={theme.textFaint} style={styles.label}>
                Purpose
              </SectionLabel>
              <TextInput
                value={form.purpose}
                onChangeText={(v) => set("purpose", v)}
                placeholder="Why does this summit matter?"
                placeholderTextColor={theme.textFaint}
                style={[...inputStyle, styles.multiline]}
                multiline
                maxLength={500}
                testID="form-summit-purpose"
              />
            </View>

            <View style={styles.field}>
              <SectionLabel color={theme.textFaint} style={styles.label}>
                Who is this goal for?
              </SectionLabel>
              <TextInput
                value={form.forWhom}
                onChangeText={(v) => set("forWhom", v)}
                placeholder="My family, my community…"
                placeholderTextColor={theme.textFaint}
                style={inputStyle}
                maxLength={200}
                testID="form-summit-for"
              />
            </View>

            <View style={styles.field}>
              <SectionLabel color={theme.textFaint} style={styles.label}>
                Horizon
              </SectionLabel>
              <View style={styles.segmentRow}>
                {(
                  [
                    { key: "short", label: "Short-term", sub: "Under 2 years" },
                    { key: "long", label: "Long-term", sub: "2+ years" },
                  ] as const
                ).map((opt) => {
                  const active = form.term === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => set("term", opt.key)}
                      style={[
                        styles.segmentCard,
                        {
                          borderColor: active ? theme.accent : theme.border,
                          backgroundColor: active ? theme.accentFaint : theme.surface,
                        },
                      ]}
                      testID={`form-term-${opt.key}`}
                    >
                      <Text
                        style={[
                          styles.segmentTitle,
                          { color: active ? theme.accent : theme.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.segmentSub, { color: theme.textFaint }]}>
                        {opt.sub}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <SectionLabel color={theme.textFaint} style={styles.label}>
                Estimated Completion Date
              </SectionLabel>
              <TextInput
                value={form.deadline}
                onChangeText={(v) => set("deadline", v)}
                placeholder="Due date (optional)"
                placeholderTextColor={theme.textFaint}
                style={[
                  ...inputStyle,
                  { fontFamily: MONO },
                ]}
                maxLength={50}
                testID="form-deadline-input"
              />
            </View>

            <View style={styles.field}>
              <SectionLabel color={theme.textFaint} style={styles.label}>
                Priority
              </SectionLabel>
              <View style={styles.chipRow}>
                {(["low", "medium", "high"] as const).map((p) => {
                  const active = form.priority === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => set("priority", p)}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? theme.accent : theme.border,
                          backgroundColor: active ? theme.accentFaint : theme.surface,
                        },
                      ]}
                      testID={`form-priority-${p}`}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? theme.accent : theme.textSecondary },
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <SectionLabel color={theme.textFaint} style={styles.label}>
                Values
              </SectionLabel>
              {availableValues.length === 0 ? (
                <Text style={[styles.fieldHint, { color: theme.textFaint }]}>
                  No values yet. Add some in Settings to tag your Summits.
                </Text>
              ) : (
                <View style={styles.chipWrap}>
                  {availableValues.map((v) => {
                    const active = form.values.includes(v);
                    return (
                      <Pressable
                        key={v}
                        onPress={() => toggleValue(v)}
                        style={[
                          styles.chip,
                          {
                            borderColor: active ? theme.accent : theme.border,
                            backgroundColor: active ? theme.accentFaint : theme.surface,
                          },
                        ]}
                        testID={`form-value-${v}`}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: active ? theme.accent : theme.textSecondary },
                          ]}
                        >
                          {v}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <SectionLabel color={theme.textFaint} style={styles.label}>
                Details
              </SectionLabel>
              <TextInput
                value={form.details}
                onChangeText={(v) => set("details", v)}
                placeholder="The plan, thoughts, etc."
                placeholderTextColor={theme.textFaint}
                style={[...inputStyle, styles.multiline]}
                multiline
                maxLength={1000}
                testID="form-summit-details"
              />
            </View>

            <View style={styles.field}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelBlock}>
                  <SectionLabel color={theme.textFaint} style={styles.label}>
                    Reward for Completion
                  </SectionLabel>
                </View>
                <Pressable
                  onPress={() => set("hasReward", !form.hasReward)}
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: form.hasReward ? theme.accent : theme.surface,
                      borderColor: form.hasReward ? theme.accent : theme.border,
                    },
                  ]}
                  testID="form-reward-toggle"
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      {
                        backgroundColor: form.hasReward ? theme.inverseText : theme.textFaint,
                        transform: [{ translateX: form.hasReward ? 22 : 2 }],
                      },
                    ]}
                  />
                </Pressable>
              </View>
              {form.hasReward && (
                <TextInput
                  value={form.reward}
                  onChangeText={(v) => set("reward", v)}
                  placeholder="Steak dinner"
                  placeholderTextColor={theme.textFaint}
                  style={[...inputStyle, styles.multiline]}
                  multiline
                  maxLength={500}
                  testID="form-reward-input"
                />
              )}
            </View>

            <View style={styles.field}>
              <SectionLabel color={theme.textFaint} style={styles.label}>
                Checkpoints
              </SectionLabel>
              <Text style={[styles.fieldHint, { color: theme.textFaint }]}>
                The smaller goals along the way. You can add, edit, and reorder these later.
              </Text>
              <CheckpointEditor
                checkpoints={form.checkpoints}
                onChange={(next) => set("checkpoints", next)}
                theme={theme}
                testID="form-checkpoints"
              />
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                borderTopColor: theme.hairline,
                paddingHorizontal: 22,
                paddingTop: 14,
              },
            ]}
          >
            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: theme.inverse,
                  opacity: !canSubmit ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
              testID={testID ? `${testID}-submit` : "summit-form-submit"}
            >
              <Text style={[styles.primaryButtonText, { color: theme.inverseText }]}>
                {submitLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    marginBottom: 22,
  },
  label: {
    marginBottom: 10,
  },
  fieldHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  nameInput: {
    fontSize: 19,
    fontWeight: "600",
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 12,
  },
  segmentCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  segmentTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  segmentSub: {
    fontSize: 12,
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 14,
  },
  toggleLabelBlock: {
    flex: 1,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
});
