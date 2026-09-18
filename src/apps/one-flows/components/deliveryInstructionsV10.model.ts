/**
 * "Give delivery instructions" — v10 domain model (Figma 1121:52583)
 *
 * A mix of v2 and v9: three cards, each an icon-only two-way switch with a
 * caption under it that IS the answer (v2), and v9's partner who acts out
 * whichever answer was just picked. Owned by v10 — nothing is imported from
 * v2, v8 or v9.
 *
 * Captions are Anurag's copy. `\n` is a forced break, placed so the words the
 * two answers share stay on the same line ("items", "during delivery") and the
 * morph only rewrites what actually changes. Every caption is at most two lines,
 * so the caption box never reflows mid-morph.
 */

export type V10CardId = "handoff" | "call" | "doorbell";

export type V10GlyphId = "hand" | "door" | "call" | "callOff" | "bell" | "bellOff";

export type V10Option = {
  id: string;
  glyph: V10GlyphId;
  /** Figma draws these at 18 or 20. */
  glyphSize: 18 | 20;
  /** The caption under the switch while this answer is chosen. */
  caption: string;
  /** Answers that stand for a sound send v2's sonar ripple out on pick. */
  sound: boolean;
};

export type V10Card = {
  id: V10CardId;
  groupLabel: string;
  /** Switch geometry from Figma: segment box and track width. */
  segment: { w: number; h: number };
  trackWidth: number;
  /** Caption measure, as drawn. */
  captionWidth: number;
  options: [V10Option, V10Option];
};

export const V10_CARDS: V10Card[] = [
  {
    id: "handoff",
    groupLabel: "Handing over the order",
    segment: { w: 36, h: 36 },
    trackWidth: 78,
    captionWidth: 84,
    options: [
      { id: "hand", glyph: "hand", glyphSize: 20, caption: "Hand items\nto me", sound: false },
      { id: "door", glyph: "door", glyphSize: 20, caption: "Leave items\nat the door", sound: false },
    ],
  },
  {
    id: "call",
    groupLabel: "Calling",
    segment: { w: 40, h: 36 },
    trackWidth: 86,
    captionWidth: 100,
    options: [
      { id: "call", glyph: "call", glyphSize: 18, caption: "Call me\nduring delivery", sound: true },
      { id: "noCall", glyph: "callOff", glyphSize: 20, caption: "Don’t call me\nduring delivery", sound: false },
    ],
  },
  {
    id: "doorbell",
    groupLabel: "Doorbell",
    segment: { w: 40, h: 36 },
    trackWidth: 86,
    captionWidth: 82,
    options: [
      { id: "ring", glyph: "bell", glyphSize: 18, caption: "Ring my doorbell", sound: true },
      { id: "silent", glyph: "bellOff", glyphSize: 18, caption: "Don’t ring my doorbell", sound: false },
    ],
  },
];

/** Figma geometry. */
export const V10_CARD_W = 100;
export const V10_CARD_H = 120;
export const V10_TRACK_H = 40;
export const V10_TRACK_PAD = 2;
export const V10_TRACK_GAP = 2;
/** Two lines of B12 (18px leading) — a fixed box, so captions never reflow the card. */
export const V10_CAPTION_H = 36;

export type V10NoteState = "idle" | "recording" | "recorded" | "playing";

export const V10_NOTE_CAPTION: Record<V10NoteState, string> = {
  idle: "Tap to record instructions",
  recording: "Listening… tap to stop",
  recorded: "Voice instructions added",
  playing: "Playing your instructions",
};

export const V10_NOTE_ARIA: Record<V10NoteState, string> = {
  idle: "Record voice instructions",
  recording: "Stop recording",
  recorded: "Play your voice instructions",
  playing: "Pause your voice instructions",
};

/** No real audio in the prototype, so playback is a timed sweep. */
export const V10_NOTE_DURATION_MS = 2800;

export type V10Value = {
  choice: Record<V10CardId, string>;
  note: V10NoteState;
  save: boolean;
};

/** As Figma draws it. */
export const DEFAULT_V10_VALUE: V10Value = {
  choice: { handoff: "hand", call: "call", doorbell: "ring" },
  note: "idle",
  save: true,
};
