/**
 * "Give delivery instructions" — v8 domain model (Figma 1065:50139, 351×264)
 *
 * Three cards (1065:50108 call, 1065:50120 handoff, 1065:50129 doorbell), each
 * a two-option vertical switch that is always answered, plus a voice note and
 * the save preference. Owned by v8 alone; v2's mechanics are copied, not
 * imported.
 *
 * "Anurag" is the recipient shown on the order, as Figma writes it.
 */

export type V8CardId = "call" | "handoff" | "doorbell";

export type V8GlyphId = "call" | "callOff" | "user" | "door" | "bell" | "bellOff";

export type V8Option = {
  id: string;
  glyph: V8GlyphId;
  /** Figma draws these at 18 or 20; both sit centred in a 20px slot. */
  glyphSize: 18 | 20;
  /** `\n` reproduces Figma's hard break. */
  label: string;
  /** Options that stand for a sound send the sonar ripple out on pick. */
  sound: boolean;
};

export type V8Card = {
  id: V8CardId;
  groupLabel: string;
  options: [V8Option, V8Option];
};

export const V8_CARDS: V8Card[] = [
  {
    id: "call",
    groupLabel: "Calling",
    options: [
      { id: "call", glyph: "call", glyphSize: 18, label: "Call\nAnurag", sound: true },
      { id: "noCall", glyph: "callOff", glyphSize: 20, label: "Don’t call Anurag", sound: false },
    ],
  },
  {
    id: "handoff",
    groupLabel: "Handing over the order",
    options: [
      { id: "hand", glyph: "user", glyphSize: 20, label: "Give me\nthe order", sound: false },
      { id: "door", glyph: "door", glyphSize: 20, label: "Leave at doorstep", sound: false },
    ],
  },
  {
    id: "doorbell",
    groupLabel: "Doorbell",
    options: [
      { id: "ring", glyph: "bell", glyphSize: 18, label: "Ring doorbell", sound: true },
      { id: "silent", glyph: "bellOff", glyphSize: 18, label: "Don’t ring doorbell", sound: false },
    ],
  },
];

/* Figma geometry. */
export const V8_CARD_W = 136;
export const V8_CARD_H = 114;
/**
 * Figma pads the card 4px and strokes it 1px without the stroke taking layout.
 * In CSS the border does take layout, so 1px border + 3px padding lands the
 * options at Figma's 128 wide and two 53-tall rows.
 */
export const V8_CARD_INSET = 4;
export const V8_OPTION_W = 128;
export const V8_OPTION_H = 53;

export type V8NoteState = "idle" | "recording" | "recorded" | "playing";

export const V8_NOTE_CAPTION: Record<V8NoteState, string> = {
  idle: "Tap to record instructions",
  recording: "Listening… tap to stop",
  recorded: "Voice instructions added",
  playing: "Playing your instructions",
};

export const V8_NOTE_ARIA: Record<V8NoteState, string> = {
  idle: "Record voice instructions",
  recording: "Stop recording",
  recorded: "Play your voice instructions",
  playing: "Pause your voice instructions",
};

/** No real audio in the prototype, so playback is a timed sweep. */
export const V8_NOTE_DURATION_MS = 2800;

export type V8Value = {
  choice: Record<V8CardId, string>;
  note: V8NoteState;
  save: boolean;
};

/** As Figma draws it. */
export const DEFAULT_V8_VALUE: V8Value = {
  choice: { call: "call", handoff: "hand", doorbell: "ring" },
  note: "idle",
  save: true,
};
