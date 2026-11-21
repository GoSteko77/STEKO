import { Alert, Platform } from "react-native";

/**
 * Show a reliable delete confirmation across native and web.
 *
 * React Native's `Alert.alert` is not guaranteed to render on the web export,
 * which is why the PWA delete buttons can feel unresponsive. On web we fall
 * back to the browser's native `confirm` dialog; on native we use the
 * platform Alert.
 */
export function showDeleteConfirm(
  title: string,
  message: string,
  onDelete: () => void,
  confirmLabel: string = "Delete",
): void {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof window.confirm === "function"
  ) {
    if (window.confirm(`${title}\n\n${message}`)) {
      onDelete();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onDelete },
  ]);
}
