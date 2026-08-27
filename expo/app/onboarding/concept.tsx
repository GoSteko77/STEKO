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

import BlueprintMountain from "@/components/BlueprintMountain";
import SectionLabel from "@/components/SectionLabel";
import { MONO } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";

export default function ConceptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useApp();
  const { width, height } = useWindowDimensions();

  const artWidth = Math.min(width - 40, 420);

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
          testID="concept-back"
        >
          <ArrowLeft size={22} color={theme.textSecondary} />
        </Pressable>

        <SectionLabel color={theme.accent}>The Concept</SectionLabel>
        <Text style={[styles.title, { color: theme.text }]}>
          What is a Summit?
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          A summit represents a big goal in your life. It could take 2 months, or 20 years. It should be challenging, and a good accomplishment when completed. Steko uses Checkpoints along the way where smaller goals are completed during the climb. Habits represent daily climbing between checkpoints.
        </Text>

        <View
          style={[
            styles.purposeCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.purposeBody, { color: theme.textSecondary }]}>
            Each summit has a text box to input your purpose. This box is important. What is your motive and objective for this goal? How will it be used for the Lord? This box should take the longest. Be descriptive!
          </Text>
          <Text style={[styles.verse, { color: theme.text }]}>
            And whatsoever ye do, do it heartily, as to the Lord, and not unto men;
          </Text>
          <Text style={[styles.verseRef, { color: theme.accent }]}>
            Colossians 3:23
          </Text>
        </View>

        <View
          style={[
            styles.artCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.artHeader}>
            <SectionLabel color={theme.textFaint}>Summit</SectionLabel>
            <Text style={[styles.artSummit, { color: theme.text }]}>
              Run a Marathon
            </Text>
          </View>
          <BlueprintMountain
            width={artWidth - 40}
            height={(artWidth - 40) * 0.72}
            checkpoints={[
              { id: "1", title: "Sign up", done: true },
              { id: "2", title: "Create a warmup routine", done: true },
              { id: "3", title: "Run a 5k", done: false },
              { id: "4", title: "Run a 10k", done: false },
            ]}
            accent={theme.accent}
            lineColor={theme.text}
            faintColor={theme.textFaint}
            surfaceColor={theme.surface}
            labelColor={theme.textSecondary}
            showLabels
          />
        </View>

        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View
              style={[styles.legendCheck, { backgroundColor: theme.accentFaint }]}
            >
              <Check size={13} color={theme.accent} strokeWidth={3} />
            </View>
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              Summits are your big goals.
            </Text>
          </View>
          <View style={styles.legendRow}>
            <View
              style={[styles.legendCheck, { backgroundColor: theme.accentFaint }]}
            >
              <Check size={13} color={theme.accent} strokeWidth={3} />
            </View>
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              Checkpoints are smaller steps on the way to the top.
            </Text>
          </View>
          <View style={styles.legendRow}>
            <View
              style={[styles.legendCheck, { backgroundColor: theme.accentFaint }]}
            >
              <Check size={13} color={theme.accent} strokeWidth={3} />
            </View>
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              Habits are for daily upward movement.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => router.push("/onboarding/create-summit")}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.inverse, opacity: pressed ? 0.85 : 1 },
            ]}
            testID="concept-continue"
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
    marginBottom: 28,
  },
  artCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  artHeader: {
    marginBottom: 14,
    gap: 6,
  },
  artSummit: {
    fontSize: 20,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  legend: {
    marginTop: 26,
    gap: 14,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legendCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  legendText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  purposeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 28,
  },
  purposeBody: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 18,
  },
  verse: {
    fontSize: 15,
    lineHeight: 23,
    fontStyle: "italic",
    marginBottom: 6,
  },
  verseRef: {
    fontFamily: MONO,
    fontSize: 13,
    letterSpacing: 0.5,
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
