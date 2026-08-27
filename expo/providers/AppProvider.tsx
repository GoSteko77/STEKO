import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DayKey } from "@/components/DayOfWeekPicker";
import {
  ACCENTS,
  AccentKey,
  buildTheme,
  ThemeColors,
  ThemeMode,
} from "@/constants/theme";
import {
  Checkpoint,
  HabitStatus,
  isDoneOn,
  isLoggedOn,
  isMissedOn,
  Objective,
  Priority,
  PRIORITY_ORDER,
  Summit,
  SummitStatus,
  SummitTerm,
  VALUE_OPTIONS,
  WeekDay,
} from "@/mocks/data";
import { Platform } from "react-native";

import { WEB_BASE_URL } from "@/constants/config";
import { getTodayKey, addDays, weekdayOf } from "@/utils/date";

const SETTINGS_KEY = "steko.settings.v1";
const DATA_KEY = "steko.data.v1";

/** Old default values that were replaced. These should be stripped from
 * persisted/cloud data if the user never customized them. */
const LEGACY_DEFAULT_VALUES = new Set([
  "Discipline",
  "Stewardship",
  "Courage",
  "Wisdom",
  "Health",
  "Family",
  "Diligence",
  "Integrity",
]);

/**
 * Remove old default values that are no longer in VALUE_OPTIONS, and ensure
 * all current default values are present. Custom values the user added are
 * preserved. Returns the cleaned list and whether any changes were made.
 */
function migrateValues(stored: string[]): { values: string[]; changed: boolean } {
  const currentDefaults = new Set(VALUE_OPTIONS);
  // Strip legacy defaults that are no longer current.
  const filtered = stored.filter(
    (v) => !LEGACY_DEFAULT_VALUES.has(v) || currentDefaults.has(v),
  );
  // Ensure every current default is present (deduped, case-insensitive).
  const present = new Set(filtered.map((v) => v.toLowerCase()));
  const withDefaults = [...filtered];
  for (const d of VALUE_OPTIONS) {
    if (!present.has(d.toLowerCase())) {
      withDefaults.push(d);
    }
  }
  return {
    values: withDefaults,
    changed: withDefaults.length !== stored.length ||
      withDefaults.some((v, i) => v !== stored[i]),
  };
}

interface PersistedSettings {
  mode: ThemeMode;
  accent: AccentKey;
  hasOnboarded: boolean;
  hasAcceptedPolicies: boolean;
}

interface ProgressLog {
  summitId: string;
  score: number;
  note: string;
  date: string;
}

interface PersistedData {
  summits: Summit[];
  checkpoints: Record<string, Checkpoint[]>;
  objectives: Objective[];
  logs: ProgressLog[];
  values: string[];
}

const EMPTY_DATA: PersistedData = {
  summits: [],
  checkpoints: {},
  objectives: [],
  logs: [],
  values: [...VALUE_OPTIONS],
};

const DEFAULT_SETTINGS: PersistedSettings = {
  mode: "light",
  accent: "blueprint",
  hasOnboarded: false,
  hasAcceptedPolicies: false,
};

/** Momentum starting baseline. */
const MOMENTUM_BASELINE = 50;
const MOMENTUM_MIN = 0;
const MOMENTUM_MAX = 100;

/** Number of days in the rolling momentum window. */
export const MOMENTUM_WINDOW = 10;

/**
 * Internal helper: derive a momentum score series with corresponding
 * calendar-day labels. The series spans every calendar day from the
 * first log to today (or the last log, whichever is later), so missed
 * days contribute 0 to the rolling sum and the score decays toward
 * baseline when logging stops.
 */
interface MomentumSeriesWithDays {
  days: string[];
  scores: number[];
}

function deriveMomentumSeriesWithDays(
  logs: ProgressLog[],
  summitId: string,
): MomentumSeriesWithDays {
  const summitLogs = logs
    .filter((l) => l.summitId === summitId)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (summitLogs.length === 0) {
    return { days: [], scores: [MOMENTUM_BASELINE] };
  }

  // Group by day, last entry wins (overwrite).
  const byDay = new Map<string, number>();
  for (const log of summitLogs) {
    const day = log.date.slice(0, 10);
    byDay.set(day, log.score);
  }

  const logDays = Array.from(byDay.keys()).sort();
  const firstDay = logDays[0];
  const lastLogDay = logDays[logDays.length - 1];
  const today = getTodayKey();
  const endDay = today > lastLogDay ? today : lastLogDay;

  // Build a continuous calendar from the first log to today (or last log).
  // Missing days contribute 0 to the rolling sum, causing the score to
  // decay toward baseline when the user stops logging.
  const calendarDays: string[] = [];
  let current = firstDay;
  while (current <= endDay) {
    calendarDays.push(current);
    current = addDays(current, 1);
  }

  const scores: number[] = [];
  for (let i = 0; i < calendarDays.length; i++) {
    // Sum the last MOMENTUM_WINDOW calendar days (inclusive of current day).
    const windowStart = Math.max(0, i - MOMENTUM_WINDOW + 1);
    let sum = 0;
    for (let j = windowStart; j <= i; j++) {
      sum += byDay.get(calendarDays[j]) ?? 0;
    }
    scores.push(
      Math.max(
        MOMENTUM_MIN,
        Math.min(MOMENTUM_MAX, MOMENTUM_BASELINE + sum),
      ),
    );
  }
  return { days: calendarDays, scores };
}

/**
 * Derive a momentum score series from daily progress logs using a rolling
 * 10-day window. Each summit starts at 50 (baseline). The score for each
 * day is: clamp(50 + sum of the last 10 daily scores, 0, 100).
 *
 * The series is indexed by calendar day (not just logged days), so missed
 * days contribute 0 to the rolling sum and the score decays toward baseline
 * when logging stops. Returns [baseline] if no logs exist.
 */
export function deriveMomentumSeries(
  logs: ProgressLog[],
  summitId: string,
): number[] {
  return deriveMomentumSeriesWithDays(logs, summitId).scores;
}

/**
 * Combined momentum across active summits. The overall score is the average
 * of each active summit's latest momentum score. New summits with no logs
 * contribute the baseline (50) until the user starts logging — this is by
 * design, since the score requires 10 days of logging to be accurate.
 * The series carries forward each summit's last known score so the final
 * point matches the displayed average.
 */
function deriveOverallMomentum(
  logs: ProgressLog[],
  summits: Summit[],
): { series: number[]; latest: number | null } {
  const activeSummits = summits.filter((s) => s.status === "active");
  if (activeSummits.length === 0) return { series: [], latest: null };

  // For each active summit, compute the calendar-day series.
  const summitInfo = activeSummits.map((summit) =>
    deriveMomentumSeriesWithDays(logs, summit.id),
  );

  // Build the union of all calendar days across active summits.
  const allDays = new Set<string>();
  for (const { days } of summitInfo) {
    for (const day of days) {
      allDays.add(day);
    }
  }

  const sortedDays = Array.from(allDays).sort();
  if (sortedDays.length === 0) return { series: [], latest: null };

  // For each day, average each summit's latest known score (carry-forward).
  const series: number[] = [];
  const pointers = summitInfo.map(() => 0);

  for (const day of sortedDays) {
    let sum = 0;
    for (let si = 0; si < summitInfo.length; si++) {
      const { days, scores } = summitInfo[si];
      while (
        pointers[si] < days.length - 1 &&
        days[pointers[si] + 1] <= day
      ) {
        pointers[si]++;
      }
      if (days.length > 0 && days[pointers[si]] <= day) {
        sum += scores[pointers[si]] ?? MOMENTUM_BASELINE;
      } else {
        sum += MOMENTUM_BASELINE;
      }
    }
    series.push(sum / activeSummits.length);
  }

  return { series, latest: series[series.length - 1] };
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [mode, setMode] = useState<ThemeMode>(DEFAULT_SETTINGS.mode);
  const [accent, setAccent] = useState<AccentKey>(DEFAULT_SETTINGS.accent);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(
    DEFAULT_SETTINGS.hasOnboarded,
  );
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState<boolean>(
    DEFAULT_SETTINGS.hasAcceptedPolicies,
  );
  const [summits, setSummits] = useState<Summit[]>([]);
  const [checkpoints, setCheckpoints] = useState<Record<string, Checkpoint[]>>(
    {},
  );
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [values, setValues] = useState<string[]>([...VALUE_OPTIONS]);

  // Currently selected day for logging/backfill (YYYY-MM-DD). Defaults to today.
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getTodayKey(),
  );

  // Drafts used during onboarding.
  const [draftSummit, setDraftSummit] = useState<Partial<Summit> | null>(null);
  const [draftCheckpoints, setDraftCheckpoints] = useState<Checkpoint[]>([]);
  const [draftHabitName, setDraftHabitName] = useState<string>("");
  const [draftHabitSummitIds, setDraftHabitSummitIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AsyncStorage.getItem(SETTINGS_KEY),
      AsyncStorage.getItem(DATA_KEY),
    ])
      .then(([settingsRaw, dataRaw]) => {
        if (cancelled) return;
        if (settingsRaw) {
          try {
            const parsed = JSON.parse(settingsRaw) as Partial<PersistedSettings>;
            if (parsed.mode === "light" || parsed.mode === "dark") {
              setMode(parsed.mode);
            }
            if (ACCENTS.some((a) => a.key === parsed.accent)) {
              setAccent(parsed.accent as AccentKey);
            }
            if (typeof parsed.hasOnboarded === "boolean") {
              setHasOnboarded(parsed.hasOnboarded);
            }
            // Grandfather existing users who already onboarded before the
            // consent gate was added — treat them as having accepted.
            if (typeof parsed.hasAcceptedPolicies === "boolean") {
              setHasAcceptedPolicies(parsed.hasAcceptedPolicies);
            } else if (typeof parsed.hasOnboarded === "boolean" && parsed.hasOnboarded) {
              setHasAcceptedPolicies(true);
            }
          } catch {
            // Corrupted settings JSON — fall back to defaults silently.
          }
        }
        if (dataRaw) {
          try {
            const parsed = JSON.parse(dataRaw) as Partial<PersistedData>;
            // Migrate legacy "backlog" status to "background"
            // Also backfill hasReward/reward for summits created before the feature existed.
            const migratedSummits = (parsed.summits ?? []).map((s) => {
              const statusFixed =
                (s.status as string) === "backlog"
                  ? { ...s, status: "background" as const }
                  : s;
              const rewardBackfilled =
                typeof statusFixed.hasReward === "boolean"
                  ? statusFixed
                  : { ...statusFixed, hasReward: false, reward: "" };
              return rewardBackfilled;
            });
            setSummits(migratedSummits);
            setCheckpoints(parsed.checkpoints ?? {});
            // Migrate objectives: add createdAt and misses if missing.
            const todayStr = getTodayKey();
            const migratedObjectives = (parsed.objectives ?? []).map((o) => ({
              ...o,
              createdAt: o.createdAt ? o.createdAt : todayStr,
              misses: Array.isArray(o.misses) ? o.misses : [],
            }));
            setObjectives(migratedObjectives);
            setLogs(parsed.logs ?? []);
            if (Array.isArray(parsed.values)) {
              const { values: cleaned, changed } = migrateValues(parsed.values);
              setValues(cleaned);
              if (changed) {
                persistData({ values: cleaned });
              }
            }
          } catch {
            // Corrupted data JSON — fall back to empty state silently.
          }
        }
      })
      .catch(() => {
        // AsyncStorage read failure — proceed with defaults.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSettings = useCallback(
    (next: Partial<PersistedSettings>) => {
      const merged: PersistedSettings = {
        mode,
        accent,
        hasOnboarded,
        hasAcceptedPolicies,
        ...next,
      };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)).catch(() => {
        // Settings persistence failure — non-critical, data stays in memory.
      });
    },
    [mode, accent, hasOnboarded, hasAcceptedPolicies],
  );

  const persistData = useCallback(
    (next: Partial<PersistedData>) => {
      const merged: PersistedData = {
        summits,
        checkpoints,
        objectives,
        logs,
        values,
        ...next,
      };
      AsyncStorage.setItem(DATA_KEY, JSON.stringify(merged)).catch(() => {
        // Data persistence failure — non-critical, data stays in memory.
      });
    },
    [summits, checkpoints, objectives, logs, values],
  );

  // ── Service worker registration (web only) ───────────────────────────
  // Do not register the service worker until the user has accepted the
  // privacy policy and terms of service — no background caching before consent.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!hydrated || !hasAcceptedPolicies) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Use a path relative to the page so it works on root domains and
    // subpaths (e.g. /STEKO/ on GitHub Pages) without hardcoding.
    const swPath = `${WEB_BASE_URL}/sw.js`;
    navigator.serviceWorker.register(swPath).then((reg) => {
      // When a new SW takes over, reload the page so users see the latest code.
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    }).catch(() => {
      // SW registration failure — app still works online without offline cache.
    });
    // If a new SW is already waiting to activate, reload so it takes over.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, [hydrated, hasAcceptedPolicies]);

  const setThemeMode = useCallback(
    (next: ThemeMode) => {
      setMode(next);
      persistSettings({ mode: next });
    },
    [persistSettings],
  );

  const setAccentKey = useCallback(
    (next: AccentKey) => {
      setAccent(next);
      persistSettings({ accent: next });
    },
    [persistSettings],
  );

  const completeOnboarding = useCallback(() => {
    setHasOnboarded(true);
    persistSettings({ hasOnboarded: true });
  }, [persistSettings]);

  const acceptPolicies = useCallback(() => {
    setHasAcceptedPolicies(true);
    persistSettings({ hasAcceptedPolicies: true });
  }, [persistSettings]);

  const resetOnboarding = useCallback(() => {
    // 1. Wipe React state to defaults — every single piece of app state.
    setHasOnboarded(false);
    setHasAcceptedPolicies(false);
    setMode(DEFAULT_SETTINGS.mode);
    setAccent(DEFAULT_SETTINGS.accent);
    setSummits([]);
    setCheckpoints({});
    setObjectives([]);
    setLogs([]);
    setValues([...VALUE_OPTIONS]);
    setDraftSummit(null);
    setDraftCheckpoints([]);
    setDraftHabitName("");
    setDraftHabitSummitIds([]);
    setSelectedDate(getTodayKey());

    // 2. Directly write known-good empty state to AsyncStorage.
    //    Don't rely on persistSettings/persistData which merge with
    //    potentially stale closure state — write the final values directly.
    const cleanSettings: PersistedSettings = {
      mode: DEFAULT_SETTINGS.mode,
      accent: DEFAULT_SETTINGS.accent,
      hasOnboarded: false,
      hasAcceptedPolicies: false,
    };
    const cleanData: PersistedData = {
      summits: [],
      checkpoints: {},
      objectives: [],
      logs: [],
      values: [...VALUE_OPTIONS],
    };
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(cleanSettings)).catch(() => {});
    AsyncStorage.setItem(DATA_KEY, JSON.stringify(cleanData)).catch(() => {});

    // 3. On web, unregister the service worker so cached app shell and
    //    SW-level state are also cleared. The SW effect above won't
    //    re-register it until the user consents again.
    if (Platform.OS === "web" && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  // ── Local backup / restore ───────────────────────────────────────────
  // Export all app data to a JSON file the user can save elsewhere. Import
  // reads that same file back so progress can be restored on a new device.

  const buildDataSnapshot = useCallback(
    (): PersistedData => ({ summits, checkpoints, objectives, logs, values }),
    [summits, checkpoints, objectives, logs, values],
  );

  const buildSettingsSnapshot = useCallback(
    (): PersistedSettings => ({ mode, accent, hasOnboarded, hasAcceptedPolicies }),
    [mode, accent, hasOnboarded, hasAcceptedPolicies],
  );

  const exportData = useCallback(async (): Promise<void> => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: buildSettingsSnapshot(),
      data: buildDataSnapshot(),
    };
    const json = JSON.stringify(payload, null, 2);

    if (Platform.OS === "web") {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `steko-backup-${getTodayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const { Share } = await import("react-native");
    await Share.share({
      message: json,
      title: "STEKO Backup",
    });
  }, [buildDataSnapshot, buildSettingsSnapshot]);

  const importData = useCallback(
    async (raw: string): Promise<boolean> => {
      try {
        const parsed = JSON.parse(raw) as {
          version?: number;
          settings?: Partial<PersistedSettings>;
          data?: Partial<PersistedData>;
        };
        if (!parsed.data) return false;

        // ── Validate and sanitize every imported field ──────────────
        // Imported JSON may come from a corrupted or hand-edited file.
        // Each field is checked for type correctness and clamped to valid
        // ranges so the app never crashes from bad import data.

        const validStatuses = new Set(["active", "background", "completed"]);
        const validPriorities = new Set(["high", "medium", "low"]);
        const validTerms = new Set(["short", "long"]);

        const sanitizedName = (v: unknown): string =>
          typeof v === "string" ? v.slice(0, 200) : "";
        const sanitizedString = (v: unknown, max = 1000): string =>
          typeof v === "string" ? v.slice(0, max) : "";
        const sanitizedOptString = (v: unknown, max = 1000): string | undefined =>
          typeof v === "string" && v.length > 0 ? v.slice(0, max) : undefined;
        const sanitizedStringArray = (v: unknown): string[] =>
          Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 100) : [];
        const sanitizedBool = (v: unknown, fallback = false): boolean =>
          typeof v === "boolean" ? v : fallback;

        const importedSummits: Summit[] = Array.isArray(parsed.data.summits)
          ? parsed.data.summits
              .filter((s) => s && typeof s === "object" && typeof s.id === "string")
              .slice(0, 500)
              .map((s) => ({
                id: String(s.id).slice(0, 100),
                name: sanitizedName(s.name),
                purpose: sanitizedString(s.purpose, 500),
                forWhom: sanitizedString(s.forWhom, 200),
                term: validTerms.has(s.term as string) ? (s.term as SummitTerm) : "short",
                deadline: sanitizedOptString(s.deadline, 50),
                details: sanitizedString(s.details, 2000),
                priority: validPriorities.has(s.priority as string)
                  ? (s.priority as Priority)
                  : "medium",
                values: sanitizedStringArray(s.values),
                status: validStatuses.has(s.status as string)
                  ? (s.status as SummitStatus)
                  : "active",
                startedAt: typeof s.startedAt === "string" ? s.startedAt.slice(0, 10) : getTodayKey(),
                completedAt: typeof s.completedAt === "string" ? s.completedAt.slice(0, 10) : undefined,
                hasReward: sanitizedBool(s.hasReward),
                reward: sanitizedString(s.reward, 500),
              }))
          : EMPTY_DATA.summits;

        const importedCheckpoints: Record<string, Checkpoint[]> =
          parsed.data.checkpoints && typeof parsed.data.checkpoints === "object"
            ? Object.fromEntries(
                Object.entries(parsed.data.checkpoints)
                  .slice(0, 500)
                  .map(([key, list]) => [
                    String(key).slice(0, 100),
                    Array.isArray(list)
                      ? list
                          .filter((c) => c && typeof c === "object" && typeof c.id === "string")
                          .slice(0, 200)
                          .map((c) => ({
                            id: String(c.id).slice(0, 100),
                            title: sanitizedString(c.title, 200),
                            done: sanitizedBool(c.done),
                            dueDate: sanitizedOptString(c.dueDate, 50),
                            detail: sanitizedOptString(c.detail, 500),
                          }))
                      : [],
                  ]),
              )
            : EMPTY_DATA.checkpoints;

        const importedObjectives: Objective[] = Array.isArray(parsed.data.objectives)
          ? parsed.data.objectives
              .filter((o) => o && typeof o === "object" && typeof o.id === "string")
              .slice(0, 500)
              .map((o) => ({
                id: String(o.id).slice(0, 100),
                title: sanitizedString(o.title, 200),
                summitIds: sanitizedStringArray(o.summitIds),
                value: typeof o.value === "number" && o.value >= 1 && o.value <= 3 ? o.value : 1,
                purpose: sanitizedString(o.purpose, 500),
                completions: Array.isArray(o.completions)
                  ? o.completions.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 3650)
                  : [],
                misses: Array.isArray(o.misses)
                  ? o.misses.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 3650)
                  : [],
                daysOfWeek: sanitizedStringArray(o.daysOfWeek).filter((d) =>
                  ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].includes(d),
                ) as WeekDay[],
                createdAt: typeof o.createdAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.createdAt)
                  ? o.createdAt
                  : getTodayKey(),
              }))
          : EMPTY_DATA.objectives;

        const importedLogs: ProgressLog[] = Array.isArray(parsed.data.logs)
          ? parsed.data.logs
              .filter((l) => l && typeof l === "object" && typeof l.summitId === "string")
              .slice(0, 10000)
              .map((l) => ({
                summitId: String(l.summitId).slice(0, 100),
                score: typeof l.score === "number" ? Math.max(-5, Math.min(5, l.score)) : 0,
                note: sanitizedString(l.note, 500),
                date: typeof l.date === "string" ? l.date.slice(0, 24) : getTodayKey(),
              }))
          : EMPTY_DATA.logs;

        const importedValues: string[] = migrateValues(
          Array.isArray(parsed.data.values) ? sanitizedStringArray(parsed.data.values).slice(0, 50) : EMPTY_DATA.values,
        ).values;

        const importedData: PersistedData = {
          summits: importedSummits,
          checkpoints: importedCheckpoints,
          objectives: importedObjectives,
          logs: importedLogs,
          values: importedValues,
        };

        // Build the settings snapshot *from parsed data*, not from current
        // state — state updates below are async, so buildSettingsSnapshot()
        // would return stale values.
        const importedSettings: PersistedSettings = {
          mode: parsed.settings?.mode === "light" || parsed.settings?.mode === "dark"
            ? parsed.settings.mode
            : mode,
          accent: ACCENTS.some((a) => a.key === parsed.settings?.accent)
            ? (parsed.settings!.accent as AccentKey)
            : accent,
          hasOnboarded: typeof parsed.settings?.hasOnboarded === "boolean"
            ? parsed.settings.hasOnboarded
            : hasOnboarded,
          hasAcceptedPolicies: typeof parsed.settings?.hasAcceptedPolicies === "boolean"
            ? parsed.settings.hasAcceptedPolicies
            : hasAcceptedPolicies,
        };

        setSummits(importedData.summits);
        setCheckpoints(importedData.checkpoints);
        setObjectives(importedData.objectives);
        setLogs(importedData.logs);
        setValues(importedData.values);
        setMode(importedSettings.mode);
        setAccent(importedSettings.accent);
        setHasOnboarded(importedSettings.hasOnboarded);
        setHasAcceptedPolicies(importedSettings.hasAcceptedPolicies);

        await AsyncStorage.setItem(DATA_KEY, JSON.stringify(importedData));
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(importedSettings));
        return true;
      } catch {
        return false;
      }
    },
    [mode, accent, hasOnboarded, hasAcceptedPolicies],
  );

  // ── Summit CRUD ───────────────────────────────────────────────────────

  const addSummit = useCallback(
    (input: Omit<Summit, "id" | "status" | "startedAt" | "momentum">) => {
      const summit: Summit = {
        ...input,
        id: genId("summit"),
        status: "active",
        startedAt: getTodayKey(),
      };
      setSummits((prev) => {
        const next = [...prev, summit];
        persistData({ summits: next });
        return next;
      });
      return summit;
    },
    [persistData],
  );

  const updateSummit = useCallback(
    (id: string, patch: Partial<Summit>) => {
      setSummits((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
        persistData({ summits: next });
        return next;
      });
    },
    [persistData],
  );

  const deleteSummit = useCallback(
    (id: string) => {
      // Compute all next-state slices up front, then persist once to avoid
      // stale-closure race conditions between multiple persistData calls.
      const nextSummits = summits.filter((s) => s.id !== id);
      const nextCheckpoints = { ...checkpoints };
      delete nextCheckpoints[id];
      const nextObjectives = objectives.map((o) => ({
        ...o,
        summitIds: o.summitIds.filter((sid) => sid !== id),
      }));
      const nextLogs = logs.filter((l) => l.summitId !== id);

      setSummits(nextSummits);
      setCheckpoints(nextCheckpoints);
      setObjectives(nextObjectives);
      setLogs(nextLogs);

      persistData({
        summits: nextSummits,
        checkpoints: nextCheckpoints,
        objectives: nextObjectives,
        logs: nextLogs,
      });
    },
    [summits, checkpoints, objectives, logs, persistData],
  );

  const setSummitStatus = useCallback(
    (id: string, status: Summit["status"]) => {
      setSummits((prev) => {
        const next = prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status,
                completedAt:
                  status === "completed"
                    ? getTodayKey()
                    : undefined,
              }
            : s,
        );
        persistData({ summits: next });
        return next;
      });
    },
    [persistData],
  );

  // ── Checkpoint CRUD ───────────────────────────────────────────────────

  const setCheckpointsForSummit = useCallback(
    (summitId: string, next: Checkpoint[]) => {
      setCheckpoints((prev) => {
        const updated = { ...prev, [summitId]: next };
        persistData({ checkpoints: updated });
        return updated;
      });
    },
    [persistData],
  );

  const addCheckpoint = useCallback(
    (summitId: string, title: string, dueDate?: string, detail?: string) => {
      const cp: Checkpoint = {
        id: genId("cp"),
        title,
        done: false,
        dueDate: dueDate && dueDate.trim().length > 0 ? dueDate.trim() : undefined,
        detail: detail && detail.trim().length > 0 ? detail.trim() : undefined,
      };
      setCheckpoints((prev) => {
        const next = { ...prev, [summitId]: [...(prev[summitId] ?? []), cp] };
        persistData({ checkpoints: next });
        return next;
      });
      return cp;
    },
    [persistData],
  );

  const updateCheckpoint = useCallback(
    (summitId: string, checkpointId: string, patch: Partial<Checkpoint>) => {
      setCheckpoints((prev) => {
        const next = {
          ...prev,
          [summitId]: (prev[summitId] ?? []).map((c) =>
            c.id === checkpointId ? { ...c, ...patch } : c,
          ),
        };
        persistData({ checkpoints: next });
        return next;
      });
    },
    [persistData],
  );

  const deleteCheckpoint = useCallback(
    (summitId: string, checkpointId: string) => {
      setCheckpoints((prev) => {
        const next = {
          ...prev,
          [summitId]: (prev[summitId] ?? []).filter((c) => c.id !== checkpointId),
        };
        persistData({ checkpoints: next });
        return next;
      });
    },
    [persistData],
  );

  const reorderCheckpoint = useCallback(
    (summitId: string, fromIndex: number, toIndex: number) => {
      setCheckpoints((prev) => {
        const list = [...(prev[summitId] ?? [])];
        if (
          fromIndex < 0 ||
          fromIndex >= list.length ||
          toIndex < 0 ||
          toIndex >= list.length
        ) {
          return prev;
        }
        const [moved] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, moved);
        const next = { ...prev, [summitId]: list };
        persistData({ checkpoints: next });
        return next;
      });
    },
    [persistData],
  );

  const toggleCheckpoint = useCallback(
    (summitId: string, checkpointId: string) => {
      setCheckpoints((prev) => {
        const next = {
          ...prev,
          [summitId]: (prev[summitId] ?? []).map((c) =>
            c.id === checkpointId ? { ...c, done: !c.done } : c,
          ),
        };
        persistData({ checkpoints: next });
        return next;
      });
    },
    [persistData],
  );

  // ── Objective CRUD ────────────────────────────────────────────────────

  const addObjective = useCallback(
    (
      title: string,
      summitIds: string[],
      daysOfWeek: WeekDay[] = [],
      purpose: string = "",
    ) => {
      const objective: Objective = {
        id: genId("o"),
        title,
        summitIds,
        value: 1,
        purpose,
        daysOfWeek,
        completions: [],
        misses: [],
        createdAt: getTodayKey(),
      };
      setObjectives((prev) => {
        const next = [...prev, objective];
        persistData({ objectives: next });
        return next;
      });
      return objective;
    },
    [persistData],
  );

  const updateObjective = useCallback(
    (id: string, patch: Partial<Objective>) => {
      setObjectives((prev) => {
        const next = prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
        persistData({ objectives: next });
        return next;
      });
    },
    [persistData],
  );

  const deleteObjective = useCallback(
    (id: string) => {
      setObjectives((prev) => {
        const next = prev.filter((o) => o.id !== id);
        persistData({ objectives: next });
        return next;
      });
    },
    [persistData],
  );

  const toggleObjective = useCallback(
    (id: string, dateKey: string) => {
      setObjectives((prev) => {
        const next = prev.map((o) => {
          if (o.id !== id) return o;
          const has = o.completions.includes(dateKey);
          return {
            ...o,
            completions: has
              ? o.completions.filter((d) => d !== dateKey)
              : [...o.completions, dateKey],
            misses: o.misses.filter((d) => d !== dateKey),
          };
        });
        persistData({ objectives: next });
        return next;
      });
    },
    [persistData],
  );

  const setObjectiveStatus = useCallback(
    (id: string, dateKey: string, status: HabitStatus) => {
      setObjectives((prev) => {
        const next = prev.map((o) => {
          if (o.id !== id) return o;
          const nextCompletions = o.completions.filter((d) => d !== dateKey);
          const nextMisses = o.misses.filter((d) => d !== dateKey);
          if (status === "done") {
            return { ...o, completions: [...nextCompletions, dateKey], misses: nextMisses };
          }
          if (status === "missed") {
            return { ...o, completions: nextCompletions, misses: [...nextMisses, dateKey] };
          }
          return { ...o, completions: nextCompletions, misses: nextMisses };
        });
        persistData({ objectives: next });
        return next;
      });
    },
    [persistData],
  );

  // ── Progress logs ─────────────────────────────────────────────────────

  const logProgress = useCallback(
    (summitId: string, score: number, note: string, dateKey: string) => {
      const entry: ProgressLog = {
        summitId,
        score: Math.max(-5, Math.min(5, score)),
        note,
        date: `${dateKey}T12:00:00.000Z`,
      };
      setLogs((prev) => {
        const next = [
          ...prev.filter(
            (l) =>
              !(
                l.summitId === summitId &&
                l.date.slice(0, 10) === dateKey
              ),
          ),
          entry,
        ];
        persistData({ logs: next });
        return next;
      });
    },
    [persistData],
  );

  const deleteLog = useCallback(
    (summitId: string, dateKey: string) => {
      setLogs((prev) => {
        const next = prev.filter(
          (l) =>
            !(
              l.summitId === summitId &&
              l.date.slice(0, 10) === dateKey
            ),
        );
        persistData({ logs: next });
        return next;
      });
    },
    [persistData],
  );

  const logFor = useCallback(
    (summitId: string, dateKey: string): ProgressLog | undefined =>
      logs.find(
        (l) => l.summitId === summitId && l.date.slice(0, 10) === dateKey,
      ),
    [logs],
  );

  const todayLogFor = useCallback(
    (summitId: string): ProgressLog | undefined => {
      const today = getTodayKey();
      return logFor(summitId, today);
    },
    [logFor],
  );

  // ── Derived data ──────────────────────────────────────────────────────

  const theme: ThemeColors = useMemo(
    () => buildTheme(mode, accent),
    [mode, accent],
  );

  const summitMomentum = useCallback(
    (summitId: string): number[] => deriveMomentumSeries(logs, summitId),
    [logs],
  );

  const overallMomentum = useMemo(
    () => deriveOverallMomentum(logs, summits),
    [logs, summits],
  );

  const sortedSummits = useMemo(
    () =>
      [...summits].sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
      ),
    [summits],
  );

  // ── "Needs logging" computed data ───────────────────────────────────
  const needsLoggingToday = useMemo(() => {
    const today = getTodayKey();
    return summits.filter(
      (s) =>
        s.status === "active" &&
        !logs.some(
          (l) => l.summitId === s.id && l.date.slice(0, 10) === today,
        ),
    );
  }, [summits, logs]);

  const needsHabitsToday = useMemo(() => {
    const today = getTodayKey();
    const keys: WeekDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const weekday = keys[weekdayOf(today)];
    return objectives.filter(
      (o) =>
        o.createdAt <= today &&
        (o.daysOfWeek.length === 0 || o.daysOfWeek.includes(weekday)) &&
        !isLoggedOn(o, today),
    );
  }, [objectives]);

  const backloggedItems = useMemo(() => {
    const today = getTodayKey();
    const keys: WeekDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const items: {
      date: string;
      summits: Summit[];
      habits: Objective[];
    }[] = [];
    for (let i = 1; i <= 7; i++) {
      const dateKey = addDays(today, -i);
      const weekday = keys[weekdayOf(dateKey)];
      const missingSummits = summits.filter(
        (s) =>
          s.status === "active" &&
          s.startedAt <= dateKey &&
          !logs.some(
            (l) => l.summitId === s.id && l.date.slice(0, 10) === dateKey,
          ),
      );
      const missingHabits = objectives.filter(
        (o) =>
          o.createdAt <= dateKey &&
          (o.daysOfWeek.length === 0 || o.daysOfWeek.includes(weekday)) &&
          !isLoggedOn(o, dateKey),
      );
      if (missingSummits.length > 0 || missingHabits.length > 0) {
        items.push({
          date: dateKey,
          summits: missingSummits,
          habits: missingHabits,
        });
      }
    }
    return items;
  }, [summits, logs, objectives]);

  // ── Values CRUD ──────────────────────────────────────────────────────

  const addValue = useCallback(
    (raw: string) => {
      const name = raw.trim();
      if (name.length === 0) return;
      setValues((prev) => {
        if (prev.some((v) => v.toLowerCase() === name.toLowerCase())) {
          return prev;
        }
        const next = [...prev, name];
        persistData({ values: next });
        return next;
      });
    },
    [persistData],
  );

  const deleteValue = useCallback(
    (name: string) => {
      setValues((prev) => {
        const next = prev.filter((v) => v !== name);
        persistData({ values: next });
        return next;
      });
    },
    [persistData],
  );

  // ── Selected day ──────────────────────────────────────────────────────

  const setSelectedDay = useCallback((dateKey: string) => {
    setSelectedDate(dateKey);
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(getTodayKey());
  }, []);

  const todayKey = getTodayKey();
  const isViewingToday = selectedDate === todayKey;

  return {
    hydrated,
    mode,
    accent,
    theme,
    hasOnboarded,
    hasAcceptedPolicies,
    summits: sortedSummits,
    checkpoints,
    objectives,
    logs,
    values,
    selectedDate,
    isViewingToday,
    todayKey,
    needsLoggingToday,
    needsHabitsToday,
    backloggedItems,
    // settings
    setThemeMode,
    setAccentKey,

    completeOnboarding,
    acceptPolicies,
    resetOnboarding,
    exportData,
    importData,
    // values
    addValue,
    deleteValue,
    // selected day
    setSelectedDay,
    goToToday,
    // summit CRUD
    addSummit,
    updateSummit,
    deleteSummit,
    setSummitStatus,
    // checkpoint CRUD
    setCheckpointsForSummit,
    addCheckpoint,
    updateCheckpoint,
    deleteCheckpoint,
    reorderCheckpoint,
    toggleCheckpoint,
    // objective CRUD
    addObjective,
    updateObjective,
    deleteObjective,
    toggleObjective,
    setObjectiveStatus,
    // logs / momentum
    logProgress,
    todayLogFor,
    logFor,
    deleteLog,
    summitMomentum,
    overallMomentum,
    // onboarding drafts
    draftSummit,
    setDraftSummit,
    draftCheckpoints,
    setDraftCheckpoints,
    draftHabitName,
    setDraftHabitName,
    draftHabitSummitIds,
    setDraftHabitSummitIds,
  };
});
