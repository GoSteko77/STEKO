import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnimatedCheckbox from "@/components/AnimatedCheckbox";
import BlueprintMountain from "@/components/BlueprintMountain";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/constants/legal";
import { MONO } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";

/** Open a URL in the system browser. */
async function openUrl(url: string): Promise<void> {
  try {
    const { openBrowserAsync } = await import("expo-web-browser");
    await openBrowserAsync(url);
  } catch {
    /* no-op — browser unavailable */
  }
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, hasAcceptedPolicies, acceptPolicies } = useApp();
  const { width } = useWindowDimensions();

  const [consentChecked, setConsentChecked] = useState<boolean>(hasAcceptedPolicies);

  const fadeTitle = useRef(new Animated.Value(0)).current;
  const fadeBody = useRef(new Animated.Value(0)).current;
  const fadeArt = useRef(new Animated.Value(0)).current;
  const fadeAuth = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.stagger(160, [
      Animated.parallel([
        Animated.timing(fadeTitle, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(fadeArt, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(fadeBody, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAuth, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeTitle, fadeBody, fadeArt, fadeAuth, rise]);

  const artWidth = Math.min(width - 48, 400);

  const handleContinue = () => {
    if (!consentChecked) return;
    acceptPolicies();
    router.push("/onboarding/concept");
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <Animated.View
        style={{ opacity: fadeTitle, transform: [{ translateY: rise }] }}
      >
        <Text style={[styles.wordmark, { color: theme.text }]}>STEKO</Text>
        <Text style={[styles.tagline, { color: theme.accent }]}>
          Climb with Purpose
        </Text>
      </Animated.View>

      <Animated.View style={[styles.art, { opacity: fadeArt }]}>
        <BlueprintMountain
          width={artWidth}
          height={artWidth * 0.62}
          checkpoints={[
            { id: "a", title: "", done: true },
            { id: "b", title: "", done: true },
            { id: "c", title: "", done: false },
          ]}
          accent={theme.accent}
          lineColor={theme.text}
          faintColor={theme.textFaint}
          surfaceColor={theme.background}
        />
      </Animated.View>

      <Animated.View style={{ opacity: fadeBody }}>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Steko is a goal tracker made for Christians to help them achieve big goals with purpose!
        </Text>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAuth }}>
        <View style={styles.consentRow}>
          <AnimatedCheckbox
            checked={consentChecked}
            onToggle={() => {
              const next = !consentChecked;
              setConsentChecked(next);
              if (next) acceptPolicies();
            }}
            accent={theme.accent}
            borderColor={theme.border}
            checkColor="#fff"
            size={24}
            testID="policy-consent-checkbox"
          />
          <Text style={[styles.consentLabel, { color: theme.textSecondary }]}>
            {"Please review and accept the "}
            <Text
              style={styles.legalLink}
              onPress={() => void openUrl(PRIVACY_POLICY_URL)}
            >
              Privacy Policy
            </Text>
            {" and "}
            <Text
              style={styles.legalLink}
              onPress={() => void openUrl(TERMS_OF_SERVICE_URL)}
            >
              Terms of Service
            </Text>
          </Text>
        </View>
        <Pressable
          onPress={handleContinue}
          disabled={!consentChecked}
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: theme.accent,
              opacity: !consentChecked ? 0.4 : pressed ? 0.8 : 1,
            },
          ]}
          testID="get-started-button"
        >
          <Text style={[styles.startButtonText, { color: "#fff" }]}>
            Get started
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  wordmark: {
    fontSize: 52,
    fontWeight: "800" as const,
    letterSpacing: 10,
  },
  tagline: {
    fontFamily: MONO,
    fontSize: 13,
    letterSpacing: 2.4,
    marginTop: 12,
    textTransform: "uppercase",
  },
  art: {
    alignItems: "center",
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
  },
  startButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  consentLabel: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    flexShrink: 1,
  },
  legalLink: {
    textDecorationLine: "underline",
    fontWeight: "600" as const,
  },
});
