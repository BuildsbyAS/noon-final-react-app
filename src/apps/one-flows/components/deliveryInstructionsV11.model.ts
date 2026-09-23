/**
 * "Instructions your rider" — v11 domain model (Figma 1196:61474, 351×205)
 *
 * v4 without "Leave with security": two instruction toggles (leave items at
 * the door, don't ring my doorbell) and one calling preference answered in an
 * action sheet. Owned by v11.
 *
 * Calling starts on "Call me at delivery" (ringing phone, "Call me" picked in
 * the sheet); "No calls" swaps the chip to the crossed-out phone.
 */

export type V11CallChoice = "call" | "noCall";

export type V11Value = {
  leaveAtDoor: boolean;
  noRing: boolean;
  call: V11CallChoice;
  save: boolean;
};

export const DEFAULT_V11_VALUE: V11Value = {
  leaveAtDoor: false,
  noRing: false,
  call: "call",
  save: true,
};

/** Chip labels. `\n` reproduces Figma's two-line break. */
export const V11_LABEL = {
  leaveAtDoor: "Leave items\nat the door",
  noRing: "Don’t ring\nmy doorbell",
  call: "Call me\nat delivery",
  noCall: "Don’t call me\nat delivery",
} as const;

export const V11_SHEET_TITLE = "At delivery, the rider should";
