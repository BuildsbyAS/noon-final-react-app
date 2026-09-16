/**
 * "A message from your rider" — domain model
 *
 * Figma: widget 851:76662, option sheets 851:76326 / 851:77179 / 851:77661.
 *
 * The widget states the delivery as a sentence the rider is speaking, with the
 * choosable parts rendered as chips. Each chip owns one slot; a slot is a
 * single choice, so unlike the four-chip card (deliveryInstructions.model)
 * there is no "nothing selected" state — the sentence always reads.
 *
 * Figma only draws each slot's default option, so the `chip` fragments for the
 * alternatives are authored here: they're what makes the sentence re-read
 * correctly after a change, and they keep the rider's voice ("I will …").
 */

export type RiderSlotId = "call" | "doorbell" | "handoff";

export type RiderGlyphId =
  | "call"
  | "callOff"
  | "bell"
  | "bellOff"
  | "hand"
  | "door"
  | "security";

export type RiderOption = {
  id: string;
  glyph: RiderGlyphId;
  /** Option-card label. `\n` reproduces the design's hard wrap. */
  card: string;
  /** The fragment that reads inside the sentence chip. */
  chip: string;
};

export type RiderSlot = {
  id: RiderSlotId;
  /** The words that run before the chip. */
  lead: string;
  options: RiderOption[];
};

/** All three sheets share this title. */
export const SHEET_TITLE = "When delivering,";

export const RIDER_SLOTS: RiderSlot[] = [
  {
    id: "call",
    lead: "While delivering, I will",
    options: [
      { id: "call", glyph: "call", card: "Call me", chip: "call you when needed" },
      { id: "noCall", glyph: "callOff", card: "No calls", chip: "not call you" },
    ],
  },
  {
    id: "doorbell",
    lead: "At your address, I will",
    options: [
      { id: "ring", glyph: "bell", card: "Ring doorbell", chip: "ring the doorbell" },
      { id: "silent", glyph: "bellOff", card: "Don’t ring the bell", chip: "not ring the doorbell" },
    ],
  },
  {
    id: "handoff",
    lead: "and",
    options: [
      { id: "hand", glyph: "hand", card: "Hand it\nto me", chip: "hand your order to you" },
      { id: "door", glyph: "door", card: "Leave order\nat the door", chip: "leave your order at the door" },
      { id: "security", glyph: "security", card: "Leave order\nwith security", chip: "leave your order with security" },
    ],
  },
];

export type RiderChoices = Record<RiderSlotId, string>;

/** The sentence as Figma draws it. */
export const DEFAULT_RIDER_CHOICES: RiderChoices = {
  call: "call",
  doorbell: "ring",
  handoff: "hand",
};

export function optionFor(slot: RiderSlot, choices: RiderChoices): RiderOption {
  return slot.options.find((o) => o.id === choices[slot.id]) ?? slot.options[0];
}
