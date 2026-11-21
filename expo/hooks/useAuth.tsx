import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useState } from "react";

interface AuthContextType {
  isLoading: boolean;
  isSignedIn: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Minimal auth provider for the local-only PWA. There is no sign-in, no
 * cloud account, and no OAuth. The provider exists only so components that
 * previously consumed `useAuth` continue to work without prop-drilling changes.
 */
export const [AuthProvider, useAuth] = createContextHook((): AuthContextType => {
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  return { isLoading: false, isSignedIn: false, error, clearError };
});
