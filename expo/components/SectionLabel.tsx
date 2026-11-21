import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

import { LABEL_SPACING, MONO } from "@/constants/theme";

interface SectionLabelProps {
  children: string;
  color: string;
  style?: StyleProp<TextStyle>;
}

/** Blueprint-style small-caps annotation label used across screens. */
export default function SectionLabel({ children, color, style }: SectionLabelProps) {
  return (
    <Text style={[styles.label, { color }, style]}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: LABEL_SPACING,
  },
});
