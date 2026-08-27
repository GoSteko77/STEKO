import { useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  FileText,
  Moon,
  Plus,
  Shield,
  Sun,
  Tag,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
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

import SectionLabel from "@/components/SectionLabel";
import { ACCENTS, MONO } from "@/constants/theme";
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from "@/constants/legal";
import { useApp } from "@/providers/AppProvider";
import { showDeleteConfirm } from "@/utils/confirmDelete";

/** Open a URL in the system browser. */
async function openUrl(url: string): Promise<void> {
  try {
    const { openBrowserAsync } = await import("expo-web-browser");
    await openBrowserAsync(url);
  } catch {
    /* no-op */
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    theme,
    mode,
    accent,
    setThemeMode,
    setAccentKey,

    resetOnboarding,
    summits,
    checkpoints,
    objectives,
    values,
    addValue,
    deleteValue,
    exportData,
    importData,
  } = useApp();

  const activeCount = summits.filter((s) => s.status === "active").length;
  const totalCheckpoints = Object.values(checkpoints).reduce(
    (acc, list) => acc + list.length,
    0,
  );
  const completedObjectives = objectives.filter(
    (o) => o.completions.length > 0,
  ).length;
  const consistency =
    objectives.length > 0
      ? Math.round((completedObjectives / objectives.length) * 100)
      : 0;

  const [newValue, setNewValue] = useState<string>("");

  const submitNewValue = () => {
    const name = newValue.trim();
    if (name.length === 0) return;
    if (values.some((v) => v.toLowerCase() === name.toLowerCase())) {
      Alert.alert("Already exists", `“${name}” is already in your values.`);
      return;
    }
    addValue(name);
    setNewValue("");
  };

  const confirmDeleteValue = (name: string) => {
    showDeleteConfirm(
      "Delete Value",
      `Remove "${name}"? Existing Summits keep their saved value tags.`,
      () => deleteValue(name),
    );
  };

  const card = [
    styles.card,
    { backgroundColor: theme.surface, borderColor: theme.border },
  ];

  const { height } = useWindowDimensions();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 48,
          paddingHorizontal: 22,
          minHeight: height,
          justifyContent: "space-between",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
          <Pressable
            onPress={() => {
              try {
                if (router.canGoBack()) router.back();
                else router.replace("/(tabs)");
              } catch {
                router.replace("/(tabs)");
              }
            }}
            hitSlop={10}
            style={[styles.closeButton, { borderColor: theme.border }]}
            testID="close-settings"
          >
            <X size={18} color={theme.textSecondary} />
          </Pressable>
        </View>

        <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
          Appearance
        </SectionLabel>
        <View style={card}>
          <View style={styles.segmentRow}>
            {(
              [
                { key: "light", label: "Light", icon: Sun },
                { key: "dark", label: "Dark", icon: Moon },
              ] as const
            ).map((opt) => {
              const active = mode === opt.key;
              const Icon = opt.icon;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setThemeMode(opt.key)}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active ? theme.accentFaint : "transparent",
                      borderColor: active ? theme.accent : theme.border,
                    },
                  ]}
                  testID={`mode-${opt.key}`}
                >
                  <Icon
                    size={17}
                    color={active ? theme.accent : theme.textFaint}
                    strokeWidth={1.75}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? theme.accent : theme.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
          Accent Color
        </SectionLabel>
        <View style={card}>
          <View style={styles.swatchRow}>
            {ACCENTS.map((a) => {
              const active = accent === a.key;
              const swatchColor = mode === "dark" ? a.dark : a.light;
              return (
                <Pressable
                  key={a.key}
                  onPress={() => setAccentKey(a.key)}
                  style={styles.swatchItem}
                  testID={`accent-${a.key}`}
                >
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: swatchColor,
                        borderColor: active ? theme.text : "transparent",
                      },
                    ]}
                  >
                    {active && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text
                    style={[
                      styles.swatchLabel,
                      { color: active ? theme.text : theme.textFaint },
                    ]}
                    numberOfLines={1}
                  >
                    {a.label.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
          Values
        </SectionLabel>
        <View style={card}>
          <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
            The values you can attach to any Summit. Add your own or remove the
            defaults.
          </Text>
          <View style={[styles.valuesWrap, { marginVertical: 12 }]}>
            {values.length === 0 ? (
              <Text style={[styles.emptyValues, { color: theme.textFaint }]}>
                No values yet.
              </Text>
            ) : (
              values.map((v) => (
                <View
                  key={v}
                  style={[
                    styles.valueTag,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                  ]}
                >
                  <Tag size={11} color={theme.textFaint} strokeWidth={2} />
                  <Text
                    style={[styles.valueTagText, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {v}
                  </Text>
                  <Pressable
                    onPress={() => confirmDeleteValue(v)}
                    hitSlop={8}
                    style={styles.valueDelete}
                    testID={`delete-value-${v}`}
                  >
                    <Trash2 size={12} color={theme.negative} strokeWidth={1.9} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
          <View
            style={[styles.addValueRow, { borderTopColor: theme.hairline }]}
          >
            <TextInput
              value={newValue}
              onChangeText={setNewValue}
              placeholder="Add a value (e.g. Integrity)"
              placeholderTextColor={theme.textFaint}
              style={[
                styles.valueInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={submitNewValue}
              maxLength={40}
              testID="new-value-input"
            />
            <Pressable
              onPress={submitNewValue}
              disabled={newValue.trim().length === 0}
              style={({ pressed }) => [
                styles.addValueBtn,
                {
                  backgroundColor: theme.inverse,
                  opacity:
                    newValue.trim().length === 0 ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
              testID="add-value"
            >
              <Plus size={18} color={theme.inverseText} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
          Statistics
        </SectionLabel>
        <View style={card}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>{activeCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textFaint }]}>
                ACTIVE
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.hairline }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>{totalCheckpoints}</Text>
              <Text style={[styles.statLabel, { color: theme.textFaint }]}>
                CHECKPOINTS
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.hairline }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>{consistency}%</Text>
              <Text style={[styles.statLabel, { color: theme.textFaint }]}>
                CONSISTENCY
              </Text>
            </View>
          </View>
        </View>

        <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
          Data
        </SectionLabel>
        <View style={card}>
          <Pressable
            style={styles.row}
            onPress={async () => {
              try {
                await exportData();
                Alert.alert("Export complete", "Your STEKO data file has been saved.");
              } catch (e) {
                Alert.alert("Export failed", "Could not save your data file. Please try again.");
              }
            }}
            testID="export-data"
          >
            <FileText size={18} color={theme.textSecondary} strokeWidth={1.75} />
            <Text style={[styles.rowText, { color: theme.text }]}>
              Export my data
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
          <Pressable
            style={styles.row}
            onPress={() => {
              if (Platform.OS === "web") {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "application/json,.json";
                input.onchange = async (event) => {
                  const file = (event.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    // Guard against oversized files (max 10 MB) that could
                    // freeze or crash the app during JSON.parse.
                    if (text.length > 10_000_000) {
                      Alert.alert("Import failed", "The selected file is too large. STEKO backups are typically small JSON files.");
                      return;
                    }
                    const ok = await importData(text);
                    if (ok) {
                      Alert.alert("Import complete", "Your STEKO data has been restored.");
                    } else {
                      Alert.alert("Import failed", "The file does not contain valid STEKO data.");
                    }
                  } catch {
                    Alert.alert("Import failed", "Could not read the selected file.");
                  }
                };
                input.click();
              } else {
                Alert.alert("Import data", "On mobile, open your STEKO backup file and share it to the app.");
              }
            }}
            testID="import-data"
          >
            <FileText size={18} color={theme.textSecondary} strokeWidth={1.75} />
            <Text style={[styles.rowText, { color: theme.text }]}>
              Import my data
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
          <Pressable
            style={styles.row}
            onPress={() => {
              showDeleteConfirm(
                "Reset App",
                "This will erase all summits, habits, checkpoints, logs, values, and settings (theme and accent color), then return you to onboarding. This cannot be undone.",
                () => {
                  resetOnboarding();
                  router.replace("/onboarding");
                },
                "Reset",
              );
            }}
            testID="reset-app"
          >
            <Text style={[styles.signOut, { color: theme.negative }]}>
              Reset all data
            </Text>
          </Pressable>
        </View>

        <SectionLabel color={theme.textFaint} style={styles.sectionLabel}>
          Legal
        </SectionLabel>
        <View style={card}>
          <Pressable
            style={styles.row}
            onPress={() => void openUrl(PRIVACY_POLICY_URL)}
            testID="privacy-policy"
          >
            <Shield size={18} color={theme.textSecondary} strokeWidth={1.75} />
            <Text style={[styles.rowText, { color: theme.text }]}>
              Privacy Policy
            </Text>
            <ChevronDown
              size={16}
              color={theme.textFaint}
              style={{ transform: [{ rotate: "-90deg" }] }}
            />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
          <Pressable
            style={styles.row}
            onPress={() => void openUrl(TERMS_OF_SERVICE_URL)}
            testID="terms-of-service"
          >
            <FileText size={18} color={theme.textSecondary} strokeWidth={1.75} />
            <Text style={[styles.rowText, { color: theme.text }]}>
              Terms of Service
            </Text>
            <ChevronDown
              size={16}
              color={theme.textFaint}
              style={{ transform: [{ rotate: "-90deg" }] }}
            />
          </Pressable>
        </View>

        <Text style={[styles.version, { color: theme.textFaint }]}>
          Go Steko LLC
        </Text>
      </ScrollView>
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
    alignItems: "center",
    marginBottom: 26,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    marginBottom: 10,
    marginTop: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  segment: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  swatchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  swatchItem: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  rowText: {
    fontSize: 15,
    fontWeight: "500" as const,
    flex: 1,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  valuesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emptyValues: {
    fontSize: 13,
    paddingVertical: 8,
  },
  valueTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 7,
  },
  valueTagText: {
    fontSize: 13,
    fontWeight: "600" as const,
    flexShrink: 1,
  },
  valueDelete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  valueInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  addValueBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  signOut: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  emailSub: {
    fontSize: 12,
    marginTop: 2,
  },
  version: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.4,
    textAlign: "center",
    marginTop: 36,
  },
});
