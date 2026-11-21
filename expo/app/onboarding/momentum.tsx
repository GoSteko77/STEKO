import { useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MomentumChart from "@/components/MomentumChart";
import SectionLabel from "@/components/SectionLabel";
import { useWindowDimensions } from "react-native";
import { MONO } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";

const SAMPLE_SERIES = [50, 55, 60, 58, 65, 70, 68, 75, 80, 78, 82, 85];

export default function MomentumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, completeOnboarding } = useApp();
  const { height } = useWindowDimensions();

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
          testID="momentum-back"
        >
          <ArrowLeft size={22} color={theme.textSecondary} />
        </Pressable>

        <SectionLabel color={theme.accent}>The Momentum Score</SectionLabel>
        <Text style={[styles.title, { color: theme.text }]}>
          Growth compounds over time.
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Each day you can rate your progress on active summits. Active Summits are the ones your currently focused on. You'll log -5 to +5 representing upward or downward momentum. You can also log a note for your summit's history.
        </Text>
        <View
          style={[
            styles.scaleCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.scaleRow}>
            <View
              style={[
                styles.scalePole,
                styles.scalePoleLeft,
                { backgroundColor: theme.negative },
              ]}
            />
            <Text style={[styles.scalePoleLabel, { color: theme.negative }]}>
              -5
            </Text>
            <View
              style={[styles.scaleBar, { backgroundColor: theme.hairline }]}
            >
              {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((n) => {
                const isCenter = n === 0;
                const isPositive = n > 0;
                return (
                  <View
                    key={`tick-${n}`}
                    style={[
                      styles.scaleTick,
                      {
                        height: isCenter ? 16 : 8,
                        backgroundColor: isCenter
                          ? theme.text
                          : isPositive
                            ? theme.positive
                            : theme.negative,
                        opacity: isCenter ? 1 : 0.45,
                      },
                    ]}
                  />
                );
              })}
              <View
                style={[
                  styles.scaleThumb,
                  {
                    left: `${((2 - -5) / 10) * 100}%`,
                    borderColor: theme.positive,
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                <View
                  style={[
                    styles.scaleThumbDot,
                    { backgroundColor: theme.positive },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.scalePoleLabel, { color: theme.positive }]}>
              +5
            </Text>
            <View
              style={[
                styles.scalePole,
                styles.scalePoleRight,
                { backgroundColor: theme.positive },
              ]}
            />
          </View>
          <View style={styles.scaleLegend}>
            <Text style={[styles.scaleLegendText, { color: theme.negative }]}>
              Setback
            </Text>
            <Text style={[styles.scaleLegendText, { color: theme.textFaint }]}>
              Holding
            </Text>
            <Text style={[styles.scaleLegendText, { color: theme.positive }]}>
              Climb
            </Text>
          </View>
        </View>

        <Text style={[styles.scoringLabel, { color: theme.text }]}>
          Scoring explained
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          The momentum score is charted between 0-100. Each summit starts at 50 - neutral ground. Steko uses a rolling 10 day score. If you log +5 for 10 days in a row you will hit a perfect score of 100. If you log +3 on the 11th day your score will drop to 98 because it only uses 10 days of data.
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          There's an overall score on the dashboard that represents the average of your summits. Your logs visualize your progress.
        </Text>
        <Text style={[styles.bodyBold, { color: theme.textSecondary }]}>
          Log 10 days of data on your summits for an accurate score.
        </Text>

        <View
          style={[
            styles.scoreCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <SectionLabel color={theme.textFaint} style={styles.cardLabel}>
            The Momentum Score
          </SectionLabel>

          <View style={styles.zoneRow}>
            <View
              style={[styles.zoneBar, { backgroundColor: theme.negative }]}
            />
            <View style={styles.zoneTextBlock}>
              <Text style={[styles.zoneRange, { color: theme.negative }]}>
                0–29
              </Text>
              <Text style={[styles.zoneLabel, { color: theme.text }]}>
                Slipping
              </Text>
              <Text style={[styles.zoneDesc, { color: theme.textSecondary }]}>
                Your climb is being setback. Try to change direction with positive logs.
              </Text>
            </View>
          </View>

          <View style={[styles.zoneDivider, { backgroundColor: theme.hairline }]} />

          <View style={styles.zoneRow}>
            <View
              style={[styles.zoneBar, { backgroundColor: theme.textFaint }]}
            />
            <View style={styles.zoneTextBlock}>
              <Text style={[styles.zoneRange, { color: theme.textFaint }]}>
                30–69
              </Text>
              <Text style={[styles.zoneLabel, { color: theme.text }]}>
                Holding
              </Text>
              <Text style={[styles.zoneDesc, { color: theme.textSecondary }]}>
                Your in the neutral, gray area. Stack positives for real progress.
              </Text>
            </View>
          </View>

          <View style={[styles.zoneDivider, { backgroundColor: theme.hairline }]} />

          <View style={styles.zoneRow}>
            <View
              style={[styles.zoneBar, { backgroundColor: theme.positive }]}
            />
            <View style={styles.zoneTextBlock}>
              <Text style={[styles.zoneRange, { color: theme.positive }]}>
                70–100
              </Text>
              <Text style={[styles.zoneLabel, { color: theme.text }]}>
                Climbing
              </Text>
              <Text style={[styles.zoneDesc, { color: theme.textSecondary }]}>
                Your work is paying off. Consistency keeps you in the high numbers.
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.chartCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.chartHeader}>
            <View>
              <SectionLabel color={theme.textFaint}>Overall Momentum</SectionLabel>
              <Text style={[styles.chartNumber, { color: theme.text }]}>
                72
              </Text>
            </View>
          </View>
          <MomentumChart
            data={SAMPLE_SERIES}
            height={140}
            color={theme.accent}
            gridColor={theme.hairline}
            yMin={0}
            yMax={100}
            animated
          />
          <Text style={[styles.chartCaption, { color: theme.textFaint }]}>
            This is the average of your summit scores
          </Text>
        </View>

        <View style={styles.principles}>
          <View style={styles.principleRow}>
            <View
              style={[styles.principleCheck, { backgroundColor: theme.accentFaint }]}
            >
              <Check size={13} color={theme.accent} strokeWidth={3} />
            </View>
            <Text style={[styles.principleText, { color: theme.textSecondary }]}>
              Momentum points are your visual growth chart.
            </Text>
          </View>
          <View style={styles.principleRow}>
            <View
              style={[styles.principleCheck, { backgroundColor: theme.accentFaint }]}
            >
              <Check size={13} color={theme.accent} strokeWidth={3} />
            </View>
            <Text style={[styles.principleText, { color: theme.textSecondary }]}>
              Record a number on each active summit.
            </Text>
          </View>
          <View style={styles.principleRow}>
            <View
              style={[styles.principleCheck, { backgroundColor: theme.accentFaint }]}
            >
              <Check size={13} color={theme.accent} strokeWidth={3} />
            </View>
            <Text style={[styles.principleText, { color: theme.textSecondary }]}>
              Aim for a 70+ score to make progress.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => {
              completeOnboarding();
              router.replace("/(tabs)");
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.inverse, opacity: pressed ? 0.85 : 1 },
            ]}
            testID="momentum-continue"
          >
            <Text style={[styles.primaryButtonText, { color: theme.inverseText }]}>
              Start Climbing
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
    marginBottom: 14,
  },
  bodyBold: {
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 28,
    fontWeight: "600" as const,
  },
  scoringLabel: {
    fontSize: 18,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  scaleCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 18,
    marginBottom: 24,
  },
  cardLabel: {
    marginBottom: 2,
  },
  scaleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scalePole: {
    width: 4,
    height: 26,
    borderRadius: 2,
  },
  scalePoleLeft: {},
  scalePoleRight: {},
  scalePoleLabel: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1,
  },
  scaleBar: {
    flex: 1,
    height: 28,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  scaleTick: {
    width: 1.5,
    borderRadius: 1,
  },
  scaleThumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    marginLeft: -12,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleThumbDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  scaleLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scaleLegendText: {
    fontSize: 10,
    fontFamily: MONO,
    letterSpacing: 1.4,
  },
  scoreCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginTop: 18,
    gap: 16,
  },
  zoneRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  zoneBar: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginTop: 2,
  },
  zoneTextBlock: {
    flex: 1,
    gap: 3,
  },
  zoneRange: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.6,
  },
  zoneLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  zoneDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  zoneDivider: {
    height: StyleSheet.hairlineWidth,
  },
  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginTop: 18,
    gap: 14,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  chartNumber: {
    fontSize: 40,
    fontWeight: "700" as const,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
    marginTop: 4,
  },
  chartCaption: {
    fontSize: 12,
    fontStyle: "italic",
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
