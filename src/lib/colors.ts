import type { UsageLevel } from "./types";

/** Color mapping for usage levels */
export const usageLevelColors: Record<UsageLevel, string> = {
  low: "#22c55e",      // green-500
  medium: "#eab308",   // yellow-500
  high: "#f97316",     // orange-500
  critical: "#ef4444", // red-500
};

/** Tailwind class mapping */
export const usageLevelClasses: Record<UsageLevel, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

/** Text color classes */
export const usageLevelTextClasses: Record<UsageLevel, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

/** Provider brand colors */
export const providerColors: Record<string, string> = {
  claude: "#d97706",   // amber-600
  codex: "#10b981",    // emerald-500
  cursor: "#8b5cf6",   // violet-500
  gemini: "#3b82f6",   // blue-500
  copilot: "#6366f1",  // indigo-500
};

/** Provider icons (emoji fallbacks) */
export const providerIcons: Record<string, string> = {
  claude: "🦀",
  codex: "🤖",
  cursor: "⚡",
  gemini: "✨",
  copilot: "🐙",
};
