/**
 * "Instruct your delivery partner" — v7 domain model (Figma 1038:47030)
 *
 * Copied from v6's model (deliveryPartner.model) and owned by v7, so v6 and v7
 * can change independently. The questions are v1's, answered through v1's
 * option panels (851:76326 / 851:77179 / 851:77661).
 *
 * The chip phrasing is v6's: a short label plus a trailing clause
 * ("Call me" … "when delivering") instead of v1's rider-voiced sentence. Figma
 * draws one chip per question; the rest are authored. Chip and panel read the
 * same words for every option (see `label`).
 */

export type PartnerSlotId = "call" | "doorbell" | "handoff";

/** Filled noon glyphs drawn on the panel's option cards. */
export type PartnerGlyphId = "call" | "callOff" | "bell" | "bellOff" | "hand" | "door";

/** Figma's outline system icons, used on the chips for the options it draws. */
export type OutlineGlyphId = "callRinging" | "notification" | "doorOpen";

export type ChipGlyph = { outline: OutlineGlyphId } | { filled: PartnerGlyphId };

export type PartnerOption = {
  id: string;
  /** Panel card glyph. */
  glyph: PartnerGlyphId;
  /**
   * The option's words — ONE string for both places, so the chip and the panel
   * card can never disagree. The card honours `\n` as a line break; the chip
   * reads it as a space.
   */
  label: string;
  /** Glyph shown in the chip once this option is picked. */
  chipGlyph: ChipGlyph;
};

/** The label as the chip reads it: one line. */
export function chipLabel(option: PartnerOption): string {
  return option.label.replace(/\n/g, " ");
}

export type PartnerSlot = {
  id: PartnerSlotId;
  /**
   * The clause after the chip. Handoff has none — Figma hides "& deliver it".
   * Where a long answer pushes a clause into the partner art, the widget nudges
   * the partner right to make room.
   */
  trailing: string | null;
  options: PartnerOption[];
};

/** All three panels share this title. */
export const PANEL_TITLE = "When delivering,";

export const PARTNER_SLOTS: PartnerSlot[] = [
  {
    id: "call",
    trailing: "when delivering",
    options: [
      { id: "call", glyph: "call", label: "Call me", chipGlyph: { outline: "callRinging" } },
      { id: "noCall", glyph: "callOff", label: "No calls", chipGlyph: { filled: "callOff" } },
    ],
  },
  {
    id: "doorbell",
    trailing: null,
    options: [
      { id: "ring", glyph: "bell", label: "Ring doorbell", chipGlyph: { outline: "notification" } },
      { id: "silent", glyph: "bellOff", label: "Don’t ring doorbell", chipGlyph: { filled: "bellOff" } },
    ],
  },
  {
    id: "handoff",
    trailing: null,
    options: [
      { id: "hand", glyph: "hand", label: "Give me\nthe items", chipGlyph: { filled: "hand" } },
      { id: "door", glyph: "door", label: "Leave items\nat the door", chipGlyph: { outline: "doorOpen" } },
    ],
  },
];

export type PartnerChoices = Record<PartnerSlotId, string>;

/** As Figma draws it — handoff defaults to the door here, unlike v1. */
export const DEFAULT_PARTNER_CHOICES: PartnerChoices = {
  call: "call",
  doorbell: "ring",
  handoff: "door",
};

export function partnerOptionFor(slot: PartnerSlot, choices: PartnerChoices): PartnerOption {
  return slot.options.find((o) => o.id === choices[slot.id]) ?? slot.options[0];
}

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
