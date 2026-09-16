/**
 * Delivery preferences — domain model for the v2 widget
 *
 * Figma: "Post Order Updates" → Frame 2147242428 (859:81436), with the four
 * cards at 873:6517 (voice note), 873:6528 (call), 873:6555 (doorbell) and
 * 873:6579 (handoff).
 *
 * This is a different decision shape from `deliveryInstructions.model`, which
 * v3/v4 still use. There, four independent chips are each on or off and "no
 * preference" is a reachable state. Here every card is a *question that is
 * always answered*: each segmented control has exactly one segment on, and the
 * caption underneath is the readout of that answer. Nothing is ever blank, so
 * the rider always has instructions.
 *
 * The all-caps kicker above each control is the card's CATEGORY, not the
 * answer — it doesn't change with the segment. That's how Figma draws it, which
 * is why `bell` and `handoff` share "AT THE DOOR".
 *
 * Card widths are hard-coded because Figma hugs each card to its widest child
 * and the row overflows the 351px widget on purpose — the fourth card clipping
 * at the edge is the affordance that says "scroll me", same as v3.
 */
import type { RiderGlyphId } from "./riderMessage.model";

export type PreferenceCardId = "call" | "bell" | "handoff";

export type PreferenceSegment = {
  id: string;
  glyph: RiderGlyphId;
  /**
   * The line that reads under the control while this segment is on — and the
   * segment's accessible name, since the caption is exactly what picking it
   * means. Kept to two lines at the card's width so the caption box never
   * reflows (see CAPTION_H).
   */
  caption: string;
};

export type PreferenceCard = {
  id: PreferenceCardId;
  /** All-caps strip above the control. Category, not answer. */
  kicker: string;
  /**
   * Accessible name for the radiogroup. Not the kicker: two cards share the
   * kicker "AT THE DOOR", and two groups with the same name are unnavigable.
   */
  groupLabel: string;
  /** Figma card width. */
  width: number;
  /** Figma body padding. */
  padX: number;
  padY: number;
  /** One segment's width; every segment in a card is the same width. */
  segWidth: number;
  glyphSize: number;
  segments: PreferenceSegment[];
};

/** Row height, and the caption box inside it — both fixed, so nothing reflows. */
export const CARD_H = 140;
export const CAPTION_H = 36;
/** The switch track, from Figma: 36px thumb + 2px padding each side. */
export const TRACK_H = 40;
export const THUMB_H = 36;
export const TRACK_PAD = 2;
export const TRACK_GAP = 2;

/**
 * The voice-note card — its own layout, no kicker, no segmented control.
 * Figma draws two of its four states: default 873:6517 and, once a note
 * exists, 877:6922 (play button + "Voice note added" + a Remove text button).
 *
 * Four states, and which control you're looking at in each:
 *
 *   idle       the whole card is the button        → recording
 *   recording  the whole card is the button        → recorded
 *   recorded   the disc is a play button           → playing
 *   playing    the disc is a pause button          → recorded (or on its own,
 *                                                    when the note runs out)
 *
 * `recorded` and `playing` also carry Remove, which returns to `idle`. That's
 * why the card can't be one big <button> the way it was before the selected
 * state existed — two controls can't nest inside one.
 */
export const NOTE_CARD = {
  width: 103,
  padX: 12,
  captionWidth: 79,
  caption: {
    idle: "Leave a note for your rider",
    recording: "Recording your note",
    recorded: "Voice note added",
    playing: "Playing your note",
  },
  /** Announced by whichever control owns the state; captions are decorative. */
  ariaLabel: {
    idle: "Leave a voice note for your rider",
    recording: "Recording voice note. Tap to stop",
    recorded: "Play your voice note",
    playing: "Pause your voice note",
  },
  removeLabel: "Remove voice note",
} as const;

export type NoteState = keyof typeof NOTE_CARD.caption;

/** True once a note exists — the states that show a play button and Remove. */
export function noteExists(state: NoteState): boolean {
  return state === "recorded" || state === "playing";
}

/**
 * The prototype has no audio, so playback is a fixed, believable length. It's
 * also what the progress ring sweeps over, so it has to be long enough to read
 * as progress and short enough that nobody waits for it.
 */
export const NOTE_DURATION_MS = 3200;

export const PREFERENCE_CARDS: PreferenceCard[] = [
  {
    id: "call",
    kicker: "DELIVERY",
    groupLabel: "Phone calls while delivering",
    width: 106,
    padX: 10,
    padY: 10,
    segWidth: 40,
    glyphSize: 18,
    segments: [
      { id: "call", glyph: "call", caption: "Call me while delivering" },
      { id: "noCall", glyph: "callOff", caption: "Don’t call me" },
    ],
  },
  {
    id: "bell",
    kicker: "AT THE DOOR",
    groupLabel: "Doorbell",
    width: 110,
    padX: 12,
    padY: 10,
    segWidth: 40,
    glyphSize: 18,
    segments: [
      { id: "ring", glyph: "bell", caption: "Ring the doorbell" },
      { id: "silent", glyph: "bellOff", caption: "Don’t ring the bell" },
    ],
  },
  {
    id: "handoff",
    kicker: "AT THE DOOR",
    groupLabel: "Where to leave the order",
    width: 140,
    padX: 12,
    padY: 12,
    segWidth: 36,
    glyphSize: 20,
    segments: [
      { id: "hand", glyph: "hand", caption: "Hand over the order to me" },
      { id: "door", glyph: "door", caption: "Leave it at my door" },
      { id: "security", glyph: "security", caption: "Leave it with security" },
    ],
  },
];

export type DeliveryPreferences = {
  note: NoteState;
  /** Selected segment id, per card. */
  choice: Record<PreferenceCardId, string>;
  /** "Save this for future orders on this address" — checked in the design. */
  save: boolean;
};

/** Exactly the state Figma draws. */
export const DEFAULT_DELIVERY_PREFERENCES: DeliveryPreferences = {
  note: "idle",
  choice: { call: "call", bell: "ring", handoff: "hand" },
  save: true,
};

export function segmentIndex(card: PreferenceCard, choice: string): number {
  const i = card.segments.findIndex((s) => s.id === choice);
  return i === -1 ? 0 : i;
}

/** Track width for a card: n thumbs + the gaps between them + both paddings. */
export function trackWidth(card: PreferenceCard): number {
  const n = card.segments.length;
  return n * card.segWidth + (n - 1) * TRACK_GAP + TRACK_PAD * 2;
}
