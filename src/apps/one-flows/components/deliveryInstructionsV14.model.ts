/**
 * "Instruct your rider" — v14 domain model (Figma 1243:14256 default,
 * 1243:14070 expanded)
 *
 * v12 with v13's calling interaction. Calling leaves the switch card and
 * becomes its own card on the left, which EXPANDS in place into the two answer
 * pills; doorbell and handoff keep v12's switches exactly. Owned by v14 —
 * nothing is imported from v12 or v13.
 */

export type V14CardId = "doorbell" | "handoff";

export type V14GlyphId =
  "call" | "callOff" | "bell" | "bellOff" | "doorOpen" | "door";

export type V14Option = {
  id: string;
  glyph: V14GlyphId;
  /** The caption under the switch while this answer is chosen. */
  caption: string;
  /** Answers that stand for a sound send v12's sonar ripple out on pick. */
  sound: boolean;
};

export type V14Card = {
  id: V14CardId;
  groupLabel: string;
  options: [V14Option, V14Option];
};

/** The two switches, as v12 draws them. */
export const V14_CARDS: V14Card[] = [
  {
    id: "doorbell",
    groupLabel: "Doorbell",
    options: [
      { id: "ring", glyph: "bell", caption: "Ring my\ndoorbell", sound: true },
      {
        id: "silent",
        glyph: "bellOff",
        caption: "Don’t ring\nmy doorbell",
        sound: false,
      },
    ],
  },
  {
    id: "handoff",
    groupLabel: "Handing over the order",
    options: [
      {
        id: "hand",
        glyph: "doorOpen",
        caption: "Don’t leave\nitems at door",
        sound: false,
      },
      {
        id: "door",
        glyph: "door",
        caption: "Leave items\nat door",
        sound: false,
      },
    ],
  },
];

export type V14CallChoice = "call" | "noCall";

/** The calling card's caption, which the expanded panel answers. */
export const V14_CALL_CAPTION: Record<V14CallChoice, string> = {
  call: "Call me\nif needed",
  // "Don’t call me" needs ~83px; this card gives the caption 74. The panel
  // spells the answer out in full — the card just has to name it.
  noCall: "No calls\nat delivery",
};

export const V14_CALL_GLYPH: Record<V14CallChoice, V14GlyphId> = {
  call: "call",
  noCall: "callOff",
};

/** The expanded panel (1243:14707). */
export const V14_PANEL_TITLE = "What should the rider do\nduring delivery?";
export const V14_PANEL_OPTIONS = [
  { id: "call", label: "Call me", glyph: "call" },
  { id: "noCall", label: "Don’t call me", glyph: "callOff" },
] as const;

/** Figma geometry (1243:14256). */
export const V14_CARD_W = 351;
export const V14_ROW_PAD_X = 10;
export const V14_ROW_GAP = 10;
/** The calling card at rest; the switch card takes what's left of the row. */
export const V14_CALL_W = 96;
export const V14_SWITCH_W =
  V14_CARD_W - V14_ROW_PAD_X * 2 - V14_ROW_GAP - V14_CALL_W;
export const V14_ROW_H = 112;
export const V14_TRACK_H = 40;
export const V14_TRACK_PAD = 2;
export const V14_TRACK_GAP = 2;
/** Two lines of B13 (20px leading) — fixed, so captions never reflow a card. */
export const V14_CAPTION_H = 40;

export type V14Value = {
  choice: Record<V14CardId, string>;
  call: V14CallChoice;
  save: boolean;
};

/** As Figma draws it. */
export const DEFAULT_V14_VALUE: V14Value = {
  choice: { doorbell: "ring", handoff: "hand" },
  call: "call",
  save: true,
};
