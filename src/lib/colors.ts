import type { UsageLevel } from "./types";

/** Color mapping for usage bar fills */
export const usageLevelColors: Record<UsageLevel, string> = {
  low: "#40c057",
  medium: "#fab005",
  high: "#fd7e14",
  critical: "#fa5252",
};

/** Provider brand colors */
export const providerColors: Record<string, string> = {
  claude: "#e67700",
  codex: "#099268",
  cursor: "#7048e8",
  gemini: "#1c7ed6",
  copilot: "#5c7cfa",
};

/** Provider icons */
export const providerIcons: Record<string, string> = {
  claude: "\u{1F9E0}",
  codex: "\u{1F916}",
  cursor: "\u{26A1}",
  gemini: "\u{2728}",
  copilot: "\u{1F419}",
};
