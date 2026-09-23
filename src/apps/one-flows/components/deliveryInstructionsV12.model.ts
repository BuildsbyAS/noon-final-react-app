/**
 * "Instruct your rider" — v12 domain model (Figma 1196:60380, 351×229)
 *
 * v10 with a new UI: the three switches share ONE grey card, split by dashed
 * dividers, the record row is gone, and each switch's answer is written under
 * it in the card. Owned by v12 — nothing is imported from v10.
 *
 * Order and captions are Figma's: calling, doorbell, handoff. `\n` is where
 * Figma's 85px column breaks each caption; the words both answers share stay
 * on the same line, so the morph only rewrites what changes.
 */

export type V12CardId = "call" | "doorbell" | "handoff";

export type V12GlyphId = "call" | "callOff" | "bell" | "bellOff" | "doorOpen" | "door";

export type V12Option = {
  id: string;
  glyph: V12GlyphId;
  /** The caption under the switch while this answer is chosen. */
  caption: string;
  /** Answers that stand for a sound send v10's sonar ripple out on pick. */
  sound: boolean;
};

export type V12Card = {
  id: V12CardId;
  groupLabel: string;
  options: [V12Option, V12Option];
};

export const V12_CARDS: V12Card[] = [
  {
    id: "call",
    groupLabel: "Calling",
    options: [
      { id: "call", glyph: "call", caption: "Call me\nat delivery", sound: true },
      { id: "noCall", glyph: "callOff", caption: "Don’t call me\nat delivery", sound: false },
    ],
  },
  {
    id: "doorbell",
    groupLabel: "Doorbell",
    options: [
      { id: "ring", glyph: "bell", caption: "Ring my\ndoorbell", sound: true },
      { id: "silent", glyph: "bellOff", caption: "Don’t ring\nmy doorbell", sound: false },
    ],
  },
  {
    id: "handoff",
    groupLabel: "Handing over the order",
    options: [
      { id: "hand", glyph: "doorOpen", caption: "Don’t leave\nitems at door", sound: false },
      { id: "door", glyph: "door", caption: "Leave items\nat door", sound: false },
    ],
  },
];

/** Figma geometry. */
export const V12_COLUMN_W = 85;
export const V12_TRACK_H = 40;
export const V12_TRACK_PAD = 2;
export const V12_TRACK_GAP = 2;
/** (85 − 2·2 padding − 2 gap) / 2 */
export const V12_SEGMENT_W = 39.5;
export const V12_SEGMENT_H = 36;
/** Two lines of B13 (20px leading) — a fixed box, so captions never reflow the card. */
export const V12_CAPTION_H = 40;

export type V12Value = {
  choice: Record<V12CardId, string>;
  save: boolean;
};

/** As Figma draws it. */
export const DEFAULT_V12_VALUE: V12Value = {
  choice: { call: "noCall", doorbell: "ring", handoff: "hand" },
  save: true,
};
