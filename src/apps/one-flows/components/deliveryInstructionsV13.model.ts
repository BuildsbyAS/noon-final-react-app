/**
 * "Instructions your rider" — v13 domain model (Figma 1205:12054 / 1205:12152)
 *
 * v11's card and answers; only the calling interaction changes. Instead of an
 * action sheet, the calling chip EXPANDS in place into a panel holding the two
 * answers. Calling leads the row, so it opens rightwards and pushes the two
 * toggles off the card's right edge. Owned by v13 — nothing is imported from
 * v11.
 */

/** Three answers: always call, call only if needed, or avoid calling. */
export type V13CallChoice = "call" | "ifNeeded" | "avoid";

export type V13Value = {
  leaveAtDoor: boolean;
  noRing: boolean;
  call: V13CallChoice;
  save: boolean;
};

export const DEFAULT_V13_VALUE: V13Value = {
  leaveAtDoor: false,
  noRing: false,
  call: "ifNeeded",
  save: true,
};

/** Chip labels. `\n` reproduces Figma's two-line break. */
export const V13_LABEL = {
  leaveAtDoor: "Leave items\nat the door",
  noRing: "Don’t ring\nmy doorbell",
} as const;

/** What the calling chip says once an answer is picked. */
export const V13_CALL_LABEL: Record<V13CallChoice, string> = {
  call: "Call me\nat delivery",
  ifNeeded: "Call me\nif needed",
  avoid: "Avoid\ncalling me",
};

/**
 * The expanded panel (1241:14043): a question over three answer pills. They
 * carry no icons — two answers would share the same phone, and with icons the
 * three measure ~375px against the 327 this row has.
 */
export const V13_PANEL_TITLE = "What should the rider do?";
export const V13_PANEL_OPTIONS = [
  { id: "call", label: "Call" },
  { id: "ifNeeded", label: "Call if needed" },
  { id: "avoid", label: "Avoid calling" },
] as const;
