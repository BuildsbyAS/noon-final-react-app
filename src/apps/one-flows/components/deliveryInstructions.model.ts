/**
 * Delivery instructions — domain model
 *
 * Figma: "Delivery Instructions" component set 401:156069, laid out in the
 * Order confirmation page's widget 699:40691.
 *
 * Deliberately NOT reusing `DeliveryPreferences` from ../data/orders.ts: that
 * model (hand_to_me / leave_at_door / meet_at_lobby + free text + contact
 * channel) belongs to the track-order DeliveryPreferenceSheet and describes a
 * different decision. Forcing these four chips into it would distort both.
 */

export type InstructionId = "door" | "security" | "call" | "bell";

/** Row order, left to right. Card 4 deliberately overflows the widget. */
export const INSTRUCTION_ORDER: InstructionId[] = ["door", "security", "call", "bell"];

/**
 * Visible labels. The `\n` reproduces Figma's exact two-line wrap and is
 * rendered with `whitespace-pre-line` — never a <br>, so the accessible name
 * stays clean. Note the curly apostrophe in "Don’t", per the design.
 */
export const INSTRUCTION_LABEL: Record<InstructionId, string> = {
  door: "Leave at\nthe door",
  security: "Leave with security",
  call: "Avoid\ncalling",
  bell: "Don’t ring\nthe bell",
};

/** Unwrapped equivalents — what a screen reader should announce. */
export const INSTRUCTION_ARIA_LABEL: Record<InstructionId, string> = {
  door: "Leave at the door",
  security: "Leave with security",
  call: "Avoid calling",
  bell: "Don’t ring the bell",
};

/**
 * The two handoff options answer the same question ("where does the parcel end
 * up?") so they're mutually exclusive. The other two are independent add-ons
 * layered on top of whichever handoff is chosen.
 */
export const HANDOFF_GROUP: InstructionId[] = ["door", "security"];

/**
 * Toggle `id` within `selected`.
 *
 * - Tapping an unselected handoff option selects it and clears the other one.
 * - Tapping any selected option clears it (so "no preference" stays reachable).
 * - Add-ons toggle freely and never disturb the handoff choice.
 */
export function toggleInstruction(
  selected: ReadonlySet<InstructionId>,
  id: InstructionId,
): Set<InstructionId> {
  const next = new Set(selected);

  if (next.has(id)) {
    next.delete(id);
    return next;
  }

  if (HANDOFF_GROUP.includes(id)) {
    for (const other of HANDOFF_GROUP) next.delete(other);
  }
  next.add(id);
  return next;
}
