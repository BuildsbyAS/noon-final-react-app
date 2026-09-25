/**
 * "Instructions your rider" — v13 domain model (Figma 1205:12054 / 1205:12152)
 *
 * v11's card and answers; only the calling interaction changes. Instead of an
 * action sheet, the calling chip EXPANDS in place into a panel holding the two
 * answers, and the chips to its left are pushed out of the card. Owned by v13 —
 * nothing is imported from v11.
 */

export type V13CallChoice = "call" | "noCall";

export type V13Value = {
  leaveAtDoor: boolean;
  noRing: boolean;
  call: V13CallChoice;
  save: boolean;
};

export const DEFAULT_V13_VALUE: V13Value = {
  leaveAtDoor: false,
  noRing: false,
  call: "call",
  save: true,
};

/** Chip labels. `\n` reproduces Figma's two-line break. */
export const V13_LABEL = {
  leaveAtDoor: "Leave items\nat the door",
  noRing: "Don’t ring\nmy doorbell",
  call: "Call me\nif needed",
  noCall: "Don’t call me\nat delivery",
} as const;

/** The expanded panel (1241:14043): a question over two answer pills. */
export const V13_PANEL_TITLE = "What should the rider do?";
export const V13_PANEL_OPTIONS = [
  { id: "call", label: "Call me", glyph: "callRinging" },
  { id: "noCall", label: "Don’t call me", glyph: "callOff" },
] as const;
