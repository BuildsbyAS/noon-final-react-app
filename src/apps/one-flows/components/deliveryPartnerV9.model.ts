/**
 * "Give delivery instructions" — v9 domain model (Figma 1105:52429, 351×252)
 *
 * An iteration of v7 where every touchpoint is a two-way TOGGLE instead of a
 * chip that opens an action sheet. The chosen side shows its icon and label on
 * a white thumb; the other side shows only its icon. Owned by v9 — nothing is
 * imported from v7.
 *
 * Labels are Figma's (1105:52455 / 52463); the undrawn sides are authored to
 * match. Handoff is a toggle too, although Figma still draws it as a chip.
 */

export type PartnerSlotId = "call" | "doorbell" | "handoff";

/** Filled noon glyphs. */
export type PartnerGlyphId = "call" | "callOff" | "bell" | "bellOff" | "hand" | "door";

/** Figma's outline system icons. */
export type OutlineGlyphId = "callRinging" | "notification" | "doorOpen";

export type ChipGlyph = { outline: OutlineGlyphId } | { filled: PartnerGlyphId };

export type ToggleOption = {
  id: string;
  label: string;
  glyph: ChipGlyph;
};

export type ToggleSlot = {
  id: PartnerSlotId;
  /** Accessible name for the toggle as a whole. */
  groupLabel: string;
  /** The clause after the toggle. Only calling keeps one; doorbell and handoff read on their own. */
  trailing: string | null;
  options: [ToggleOption, ToggleOption];
};

export const V9_SLOTS: ToggleSlot[] = [
  {
    id: "call",
    groupLabel: "Calling",
    trailing: "when delivering",
    options: [
      { id: "call", label: "Call me", glyph: { outline: "callRinging" } },
      { id: "noCall", label: "No calls", glyph: { filled: "callOff" } },
    ],
  },
  {
    id: "doorbell",
    groupLabel: "Doorbell",
    trailing: null,
    options: [
      { id: "ring", label: "Ring doorbell", glyph: { outline: "notification" } },
      { id: "silent", label: "Don’t ring doorbell", glyph: { filled: "bellOff" } },
    ],
  },
  {
    id: "handoff",
    groupLabel: "Handing over the order",
    trailing: null,
    options: [
      { id: "hand", label: "Give me the items", glyph: { filled: "hand" } },
      { id: "door", label: "Leave items at the door", glyph: { outline: "doorOpen" } },
    ],
  },
];

export type V9Choices = Record<PartnerSlotId, string>;

/** As Figma draws it. */
export const DEFAULT_V9_CHOICES: V9Choices = {
  call: "call",
  doorbell: "ring",
  handoff: "door",
};

/**
 * Figma draws only the idle record row; the rest mirror v3's voice note (play
 * plays it, Remove returns to idle). No real audio, so playback is a timed sweep.
 */
export type VoiceNoteState = "idle" | "recording" | "recorded" | "playing";

export const PARTNER_VOICE_LABEL: Record<VoiceNoteState, string> = {
  idle: "Tap to record instructions",
  recording: "Listening… tap to stop",
  recorded: "Voice instructions added",
  playing: "Playing your instructions…",
};

export const PARTNER_NOTE_DURATION_MS = 2800;
