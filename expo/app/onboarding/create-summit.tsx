import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SummitFormModal, {
  EMPTY_SUMMIT_FORM,
  SummitFormValues,
} from "@/components/SummitFormModal";
import SectionLabel from "@/components/SectionLabel";
import { useApp } from "@/providers/AppProvider";

/**
 * Onboarding: create your first Summit (with checkpoints).
 * The form is rendered inline via SummitFormModal but, during onboarding,
 * we present it as a full screen with a back button and commit the Summit
 * to app state on submit (so it appears after onboarding completes).
 */
export default function CreateSummitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, addSummit, setCheckpointsForSummit, setDraftSummit, values } =
    useApp();

  const [formOpen, setFormOpen] = useState<boolean>(true);

  const handleSubmit = (values: SummitFormValues) => {
    if (values.name.trim().length === 0) return;
    const summit = addSummit({
      name: values.name.trim(),
      purpose: values.purpose,
      forWhom: values.forWhom,
      term: values.term,
      deadline: values.hasDeadline ? values.deadline : undefined,
      details: values.details,
      priority: values.priority,
      values: values.values,
      hasReward: values.hasReward,
      reward: values.reward,
    });
    if (values.checkpoints.length > 0) {
      setCheckpointsForSummit(summit.id, values.checkpoints);
    }
    setDraftSummit({ name: values.name.trim() });
    setFormOpen(false);
    router.push("/onboarding/habits");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 60,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => {
            setFormOpen(false);
            try {
              if (router.canGoBack()) router.back();
              else router.replace("/onboarding");
            } catch {
              router.replace("/onboarding");
            }
          }}
          hitSlop={12}
          style={styles.back}
          testID="create-back"
        >
          <ArrowLeft size={22} color={theme.textSecondary} />
        </Pressable>

        <SectionLabel color={theme.accent}>The Mount Everest</SectionLabel>
        <Text style={[styles.title, { color: theme.text }]}>
          Your first Summit
        </Text>

        <Pressable
          onPress={() => setFormOpen(true)}
          style={[
            styles.openCard,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
          testID="open-summit-form"
        >
          <Text style={[styles.openTitle, { color: theme.text }]}>
            Tap to build your Summit
          </Text>
          <Text style={[styles.openSub, { color: theme.textFaint }]}>
            Name, purpose, checkpoints, and more.
          </Text>
        </Pressable>
      </ScrollView>

      <SummitFormModal
        visible={formOpen}
        onClose={() => {
          setFormOpen(false);
          try {
            if (router.canGoBack()) router.back();
            else router.replace("/onboarding");
          } catch {
            router.replace("/onboarding");
          }
        }}
        onSubmit={handleSubmit}
        theme={theme}
        initial={EMPTY_SUMMIT_FORM}
        title="First Summit"
        submitLabel="Continue"
        testID="onboarding-summit-form"
        availableValues={values}
      />
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
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    marginBottom: 30,
    lineHeight: 22,
  },
  openCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    gap: 6,
  },
  openTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  openSub: {
    fontSize: 13,
  },
});
