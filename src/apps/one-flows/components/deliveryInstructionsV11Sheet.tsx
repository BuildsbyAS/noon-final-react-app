/**
 * v11's anchored action sheet — opened by the calling chip only (the other two
 * chips are toggles). Figma: "At delivery, the rider should" over two option
 * cards (Figma 1205:3513), dropped over the chip just under its chevron while
 * the page recedes.
 *
 * The open/anchor/dismiss hook is copied from v7's (deliveryPartnerV7Options),
 * including its close-only outside tap; the panel itself is v11's. Owned by v11.
 *
 * MOTION — the panel resolves out of focus: it scales up from the chip while a
 * blur burns off, springs carry a little overshoot, exits are about half the
 * length of entrances, and content staggers in behind the panel.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { hapticTick } from "@ui";
import { V11Glyph, type V11GlyphId } from "./deliveryInstructionsV11Icons";

/**
 * Figma 1205:3513 overlaps the sheet onto its chip: its top sits 41px below the
 * chip's top (just under the chevron) and its right edge 3px inside the chip's.
 */
const SHEET_TOP_FROM_CHIP = 41;
const SHEET_RIGHT_INSET = 3;
/** Smallest gap the popover keeps from the card's left/right edge. */
const GUTTER = 2;

/**
 * Apple-style spring notation — settle time and overshoot, rather than a
 * stiffness/damping pair nobody can picture. Bounce stays under 0.25: enough
 * that motion lands instead of stopping, not enough to read as springy.
 */
export const SPRING = { type: "spring", duration: 0.52, bounce: 0.22 } as const;
export const SPRING_SNAPPY = { type: "spring", duration: 0.36, bounce: 0.16 } as const;
/** Exits don't get a spring — you're done looking, so they leave on a curve. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Enough to smear the panel's contents, well under the ~20px Safari gets slow at. */
const PANEL_BLUR = 10;

/** How long the picked card is seen landing before the panel goes. */
const PICK_BEAT_MS = 220;

export type Placement = "above" | "below";
export type Anchor = { top: number; bottom: number; right: number };
type Box = { left: number; top: number; originX: number };

/* ================================================================
 *  Open state, anchoring and dismissal
 * ================================================================ */

export function useAnchoredOptions<Id extends string>({
  reduceMotion,
  onOpenChange,
}: {
  reduceMotion: boolean;
  /** Fires as a panel opens and closes, so the page can recede behind it. */
  onOpenChange?: (open: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggers = useRef<Partial<Record<Id, HTMLElement | null>>>({});
  const [open, setOpen] = useState<Id | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    onOpenChange?.(open !== null);
  }, [open, onOpenChange]);

  // Dismiss on any tap outside the panel — including elsewhere on the card — or
  // Escape. A listener beats an invisible catcher element here: the popover
  // escapes the card, so a catcher would have to be portalled out to cover the
  // screen it's actually protecting.
  //
  // The dismissing tap only dismisses: it's stopped in the capture phase so it
  // never reaches what's underneath (no accidental recording, no second panel
  // opening, no press feedback), and the click it would produce is swallowed.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (target.closest?.("[data-options-panel]")) return;
      // The open chip toggles itself closed on click; closing here first would
      // let that click reopen it.
      if (triggers.current[open]?.contains(target)) return;

      event.stopPropagation();
      const swallowClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
      const release = () => document.removeEventListener("click", swallowClick, true);
      document.addEventListener("click", swallowClick, { capture: true, once: true });
      // If the tap turns into a scroll there is no click to swallow, so let go
      // shortly after the finger lifts rather than eating a later, real tap.
      document.addEventListener("pointerup", () => window.setTimeout(release, 400), { capture: true, once: true });
      document.addEventListener("pointercancel", release, { capture: true, once: true });

      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggers.current[open]?.focus();
      }
    };
    // Capture phase, so the dismissing tap is caught before React or Motion see it.
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const toggle = (id: Id) => {
    if (open === id) {
      close();
      return;
    }
    const root = rootRef.current;
    const trigger = triggers.current[id];
    if (!root || !trigger) return;
    const r = root.getBoundingClientRect();
    const t = trigger.getBoundingClientRect();
    setAnchor({ top: t.top - r.top, bottom: t.bottom - r.top, right: t.right - r.left });
    setOpen(id);
    hapticTick();
  };

  /** After a pick: a beat on the chosen card, so the choice is seen landing. */
  const closeAfterPick = () => {
    hapticTick();
    window.setTimeout(close, reduceMotion ? 0 : PICK_BEAT_MS);
  };

  const triggerRef = (id: Id) => (el: HTMLElement | null) => {
    triggers.current[id] = el;
  };

  return { rootRef, triggerRef, open, anchor, toggle, close, closeAfterPick };
}

/* ================================================================
 *  Action sheet — "At delivery, the rider should"
 * ================================================================ */

const INK_ACTION = "#0f61ff";
const SURFACE_ACTION_SUBTLE = "#ebf4ff";
const BORDER_DEFAULT = "#f2f3f7";
const INK_TERTIARY = "#666d85";

export type SheetOption = { id: string; label: string; glyph: V11GlyphId };

const panelVariants: Variants = {
  hidden: ({ lift, still }) =>
    still ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: lift, filter: `blur(${PANEL_BLUR}px)` },
  shown: ({ still }) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: still
      ? { duration: 0.12 }
      : {
          ...SPRING,
          filter: { duration: 0.26, ease: EASE_OUT },
          opacity: { duration: 0.18, ease: EASE_OUT },
          delayChildren: 0.05,
          staggerChildren: 0.035,
        },
  }),
  gone: ({ lift, still }) => ({
    ...(still ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: lift * 0.5, filter: `blur(${PANEL_BLUR * 0.7}px)` }),
    transition: { duration: still ? 0.1 : 0.19, ease: "easeIn" },
  }),
};

const itemVariants: Variants = {
  hidden: ({ still }) => (still ? { opacity: 0 } : { opacity: 0, scale: 0.92, filter: "blur(5px)" }),
  shown: ({ still }) => ({ opacity: 1, scale: 1, filter: "blur(0px)", transition: still ? { duration: 0.12 } : SPRING_SNAPPY }),
  gone: { opacity: 0, transition: { duration: 0.1 } },
};

export function ActionSheet({
  title,
  options,
  anchor,
  containerWidth,
  selectedId,
  onSelect,
  reduceMotion,
}: {
  title: string;
  options: SheetOption[];
  anchor: Anchor;
  containerWidth: number;
  selectedId: string | null;
  onSelect: (optionId: string) => void;
  reduceMotion: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  // Measured before paint, right-aligned to the chip and clamped to the card.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const maxLeft = Math.max(GUTTER, containerWidth - w - GUTTER);
    const right = anchor.right - SHEET_RIGHT_INSET;
    const left = Math.min(Math.max(right - w, GUTTER), maxLeft);
    setBox({ left, top: anchor.top + SHEET_TOP_FROM_CHIP, originX: Math.min(Math.max(right - left - 12, 0), w) });
  }, [anchor, containerWidth]);

  const custom = { lift: -10, still: reduceMotion };

  return (
    <motion.div
      ref={ref}
      role="dialog"
      data-options-panel
      aria-label={title}
      custom={custom}
      variants={panelVariants}
      initial="hidden"
      animate={box ? "shown" : "hidden"}
      exit="gone"
      className="absolute z-20 flex w-max flex-col gap-2.5 overflow-hidden rounded-16 bg-white py-3 shadow-[0_4px_20px_0_rgba(14,14,14,0.08)] will-change-transform"
      style={{
        left: box?.left ?? 0,
        top: box?.top ?? 0,
        visibility: box ? "visible" : "hidden",
        transformOrigin: `${box?.originX ?? 0}px 0%`,
      }}
    >
      <motion.p custom={custom} variants={itemVariants} className="px-3 text-[13px] leading-5 tracking-[-0.1px] font-bold text-[#1d2539]">
        {title}
      </motion.p>
      <div role="radiogroup" aria-label={title} className="flex gap-2 px-3">
        {options.map((option) => {
          const on = option.id === selectedId;
          return (
            <motion.button
              key={option.id}
              custom={custom}
              variants={itemVariants}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(option.id)}
              whileTap={reduceMotion ? undefined : { scale: 0.955 }}
              className="flex w-[88px] flex-col items-start justify-center gap-2 rounded-12 border border-solid px-3 pt-3 pb-2.5 text-left cursor-pointer outline-none transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]"
              style={{
                backgroundColor: on ? SURFACE_ACTION_SUBTLE : "#ffffff",
                borderColor: on ? INK_ACTION : BORDER_DEFAULT,
              }}
            >
              <V11Glyph glyph={option.glyph} ink={on ? INK_ACTION : INK_TERTIARY} knockout={on ? SURFACE_ACTION_SUBTLE : "#ffffff"} />
              {/* Figma: the picked answer is Medium, the other SemiBold. */}
              <span
                className={`whitespace-nowrap text-[13px] leading-5 tracking-[-0.1px] ${on ? "font-medium" : "font-semibold"}`}
                style={{ color: on ? INK_ACTION : INK_TERTIARY }}
              >
                {option.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
