/**
 * "Instruct your delivery partner" — v7 domain model (Figma 1038:47030)
 *
 * Copied from v6's model (deliveryPartner.model) and owned by v7, so v6 and v7
 * can change independently. The questions are v1's, answered through v1's
 * option panels (851:76326 / 851:77179 / 851:77661).
 *
 * The chip phrasing is v6's: a short label plus a trailing clause
 * ("Call me" … "when delivering") instead of v1's rider-voiced sentence. Figma
 * draws one chip per question; the other chip labels are authored to fit the
 * same clause.
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
  /** Panel card label. `\n` reproduces the design's hard wrap. */
  card: string;
  /** What the chip reads once this option is picked. */
  chip: { label: string; glyph: ChipGlyph };
};

export type PartnerSlot = {
  id: PartnerSlotId;
  /** The clause after the chip. Handoff has none — Figma hides "& deliver it". */
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
      { id: "call", glyph: "call", card: "Call me", chip: { label: "Call me", glyph: { outline: "callRinging" } } },
      { id: "noCall", glyph: "callOff", card: "No calls", chip: { label: "Don’t call me", glyph: { filled: "callOff" } } },
    ],
  },
  {
    id: "doorbell",
    trailing: "when you reach",
    options: [
      { id: "ring", glyph: "bell", card: "Ring doorbell", chip: { label: "Ring bell", glyph: { outline: "notification" } } },
      {
        id: "silent",
        glyph: "bellOff",
        card: "Don’t ring the bell",
        chip: { label: "Don’t ring bell", glyph: { filled: "bellOff" } },
      },
    ],
  },
  {
    id: "handoff",
    trailing: null,
    options: [
      { id: "hand", glyph: "hand", card: "Hand it\nto me", chip: { label: "Hand it to me", glyph: { filled: "hand" } } },
      {
        id: "door",
        glyph: "door",
        card: "Leave order\nat the door",
        chip: { label: "Leave items at the door", glyph: { outline: "doorOpen" } },
      },
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
