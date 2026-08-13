import { useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import React, { useRef, useState } from "react";
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

import DayOfWeekPicker, {
  ALL_DAYS,
  DayKey,
} from "@/components/DayOfWeekPicker";
import SectionLabel from "@/components/SectionLabel";
import { useApp } from "@/providers/AppProvider";
import { WeekDay } from "@/mocks/data";

const DEFAULT_VALUE = 1;

export default function CreateHabitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const {
    theme,
    summits,
    draftHabitName,
    setDraftHabitName,
    draftHabitSummitIds,
    setDraftHabitSummitIds,
    addObjective,
  } = useApp();

  const scrollRef = useRef<ScrollView>(null);
  const [title, setTitle] = useState<string>(draftHabitName);
  const [purpose, setPurpose] = useState<string>("");
  const [selected, setSelected] = useState<string[]>(draftHabitSummitIds);
  const [value] = useState<number>(DEFAULT_VALUE);
  const [days, setDays] = useState<DayKey[]>([...ALL_DAYS]);

  const activeSummits = summits.filter(
    (s) => s.status === "active" || s.status === "background",
  );

  // Pre-select the first (most recently relevant) summit if nothing is chosen yet,
  // so the user's just-created Summit is tied by default during onboarding.
  React.useEffect(() => {
    if (selected.length === 0 && activeSummits.length > 0) {
      setSelected([activeSummits[0].id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (sid: string) => {
    setSelected((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    );
  };

  const toggleDay = (day: DayKey) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((x) => x !== day) : [...prev, day],
    );
  };

  const finish = () => {
    const trimmed = title.trim();
    setDraftHabitName(trimmed);
    setDraftHabitSummitIds(selected);
    if (trimmed.length > 0) {
      addObjective(trimmed, selected, days as WeekDay[], purpose.trim());
    }
    router.push("/onboarding/momentum");
  };

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          minHeight: height,
          justifyContent: "space-between",
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Pressable
          onPress={() => {
            try {
              if (router.canGoBack()) router.back();
              else router.replace("/onboarding");
            } catch {
              router.replace("/onboarding");
            }
          }}
          hitSlop={12}
          style={styles.back}
          testID="create-habit-back"
        >
          <ArrowLeft size={22} color={theme.textSecondary} />
        </Pressable>

        <SectionLabel color={theme.accent}>Every Step Counts</SectionLabel>
        <Text style={[styles.title, { color: theme.text }]}>
          Your first habit.
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Create a habit that will help you keep climbing. It should be doable, and relevant to your summit(s).
        </Text>

        <View style={styles.section}>
          <SectionLabel color={theme.textFaint} style={styles.fieldLabel}>
            Habit
          </SectionLabel>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Run for 10m"
            placeholderTextColor={theme.textFaint}
            style={[...inputStyle, styles.titleInput]}
            maxLength={200}
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }, 120);
            }}
            testID="habit-name-input"
          />
        </View>

        <View style={styles.section}>
          <SectionLabel color={theme.textFaint} style={styles.fieldLabel}>
            PURPOSE
          </SectionLabel>
          <TextInput
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Why does this habit matter?"
            placeholderTextColor={theme.textFaint}
            style={[...inputStyle, styles.multiline]}
            multiline
            maxLength={500}
            testID="habit-purpose-input"
          />
        </View>

        <View style={styles.section}>
          <SectionLabel color={theme.textFaint} style={styles.fieldLabel}>
            Tie to Summits — select any
          </SectionLabel>
          {activeSummits.length === 0 ? (
            <View
              style={[
                styles.emptySummits,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <Text style={[styles.emptyText, { color: theme.textFaint }]}>
                No Summits yet. You can tie this habit later.
              </Text>
            </View>
          ) : (
            <View style={styles.summitList}>
              {activeSummits.map((s) => {
                const active = selected.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggle(s.id)}
                    style={[
                      styles.summitRow,
                      {
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active
                          ? theme.accentFaint
                          : theme.surface,
                      },
                    ]}
                    testID={`tie-summit-${s.id}`}
                  >
                    <View
                      style={[
                        styles.summitCheck,
                        {
                          backgroundColor: active
                            ? theme.accent
                            : "transparent",
                          borderColor: active ? theme.accent : theme.border,
                        },
                      ]}
                    >
                      {active && (
                        <Check size={13} color={theme.surface} strokeWidth={3} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.summitRowText,
                        { color: active ? theme.accent : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      ▲ {s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel color={theme.textFaint} style={styles.fieldLabel}>
            Active Days
          </SectionLabel>
          <Text
            style={[styles.fieldHint, { color: theme.textFaint }]}
          >
            Choose which days this habit runs.
          </Text>
          <DayOfWeekPicker
            selected={days}
            onToggle={toggleDay}
            onSet={setDays}
            theme={theme}
            testID="habit-days"
          />
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={finish}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.inverse, opacity: pressed ? 0.85 : 1 },
            ]}
            testID="finish-habit"
          >
            <Text style={[styles.primaryButtonText, { color: theme.inverseText }]}>
              Continue
            </Text>
          </Pressable>
          <Pressable onPress={finish} hitSlop={8} testID="skip-habit">
            <Text style={[styles.skip, { color: theme.textFaint }]}>
              Skip for now
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  back: {
    width: 44,
    height: 44,
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    marginBottom: 30,
    lineHeight: 22,
  },
  fieldHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  section: {
    marginBottom: 26,
  },
  fieldLabel: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  titleInput: {
    fontSize: 19,
    fontWeight: "600" as const,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  emptySummits: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
  summitList: {
    gap: 10,
  },
  summitRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summitCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  summitRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  footer: {
    paddingTop: 16,
    gap: 14,
    alignItems: "stretch",
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  skip: {
    fontSize: 14,
    textAlign: "center",
  },
});
