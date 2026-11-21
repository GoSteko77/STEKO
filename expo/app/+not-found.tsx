import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { MONO } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.label}>SUMMIT NOT FOUND</Text>
        <Text style={styles.body}>
          This route doesn&apos;t exist or may have been moved.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Return to base camp</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0B0D11",
  },
  code: {
    fontSize: 64,
    fontWeight: "800" as const,
    letterSpacing: 8,
    color: "#2B5BE3",
  },
  label: {
    fontFamily: MONO,
    fontSize: 12,
    letterSpacing: 2.4,
    marginTop: 8,
    color: "#5C6472",
    textTransform: "uppercase",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 16,
    textAlign: "center",
    color: "#9AA1AE",
  },
  link: {
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232834",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
    color: "#7C9BFF",
  },
});
