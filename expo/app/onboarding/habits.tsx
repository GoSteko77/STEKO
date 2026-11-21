import { useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SectionLabel from "@/components/SectionLabel";
import StickmanClimber from "@/components/StickmanClimber";
import { useApp } from "@/providers/AppProvider";

export default function HabitsConceptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useApp();
  const { width, height } = useWindowDimensions();

  const artWidth = Math.min(width - 80, 280);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          minHeight: height,
          justifyContent: "space-between",
        }}
        showsVerticalScrollIndicator={false}
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
          testID="habits-back"
        >
          <ArrowLeft size={22} color={theme.textSecondary} />
        </Pressable>

        <SectionLabel color={theme.accent}>Daily Steps</SectionLabel>
        <Text style={[styles.title, { color: theme.text }]}>
          Habits keep you fit for the climb.
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Habits are the daily climbing between summits. It could be a habit you do 2 or 7 days/week (you choose which days). You can select what summit(s) you want them associated with.
        </Text>
        <Text style={[styles.note, { color: theme.textFaint }]}>
          NOTE: Daily habit completion doesn't affect your momentum scores.
        </Text>

        <View
          style={[
            styles.illustrationCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.illustrationHeader}>
            <SectionLabel color={theme.textFaint}>Example Habit</SectionLabel>
            <Text style={[styles.illustrationTitle, { color: theme.text }]}>
              Run for 15m
            </Text>
          </View>

          <View style={styles.stickmanWrap}>
            <StickmanClimber
              width={artWidth}
              height={artWidth * 0.6}
              color={theme.accent}
              faintColor={theme.textFaint}
            />
          </View>
        </View>

        <View style={styles.principles}>
          <View style={styles.principleRow}>
            <View
              style={[styles.principleCheck, { backgroundColor: theme.accentFaint }]}
            >
              <Check size={13} color={theme.accent} strokeWidth={3} />
            </View>
            <Text style={[styles.principleText, { color: theme.textSecondary }]}>
              Habits are the daily climbing.
            </Text>
          </View>
          <View style={styles.principleRow}>
            <View
              style={[styles.principleCheck, { backgroundColor: theme.accentFaint }]}
            >
              <Check size={13} color={theme.accent} strokeWidth={3} />
            </View>
            <Text style={[styles.principleText, { color: theme.textSecondary }]}>
              They're tied to your summits.
            </Text>
          </View>

        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => router.push("/onboarding/create-habit")}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.inverse, opacity: pressed ? 0.85 : 1 },
            ]}
            testID="habits-continue"
          >
            <Text style={[styles.primaryButtonText, { color: theme.inverseText }]}>
              Continue
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
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
    marginBottom: 14,
  },
  body: {
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 16,
  },
  note: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
    fontStyle: "italic" as const,
  },
  illustrationCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    alignItems: "center",
  },
  illustrationHeader: {
    gap: 6,
    alignSelf: "flex-start",
  },
  illustrationTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  stickmanWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  principles: {
    marginTop: 26,
    gap: 14,
  },
  principleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  principleCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  principleText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    paddingTop: 16,
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
});
