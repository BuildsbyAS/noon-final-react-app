/**
 * v6's anchored options panel — v1's "Order options" panel (Figma 851:76326 /
 * 851:77179 / 851:77661), opened from a chip.
 *
 * Created as a copy of the panel inside DeliveryInstructionsWidgetV1 and owned
 * by v6 from here on; v1 keeps its own, and neither imports the other.
 *
 * Two pieces:
 *  - `useAnchoredOptions` owns which slot is open, where its trigger sits, and
 *    dismissal (outside tap, Escape with focus returned to the trigger).
 *  - `OptionsPopover` is the panel itself, placed against that anchor.
 *
 * The panel positions against the widget's root, so the root must be
 * `relative` and must NOT clip — the panel escapes the card's bounds. Put the
 * card's rounded clip on an inner element.
 *
 * MOTION — the panel resolves *out of focus*, the way iOS expands a menu out of
 * a tab bar: it scales up from the chip while a blur burns off, so the frames
 * where it's the wrong size are never legible. Nothing scales from 0, springs
 * carry a little overshoot so things settle rather than stop, and exits are
 * roughly half the length of entrances. Content staggers in behind the panel so
 * the container reads as the thing that arrived, not the text.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { hapticTick } from "@ui";
import { InstructionCheckbox } from "./MCheckbox";
import { PartnerGlyph } from "./deliveryPartnerIcons";
import { PANEL_TITLE, type PartnerSlot } from "./deliveryPartner.model";

const INK_PRIMARY = "#1d2539";
const INK_SECONDARY = "#475067";
const SURFACE_ACTION_SUBTLE = "#ebf4ff";
const SURFACE_SECONDARY = "#f9f9fb";
const BORDER_ACTION = "#d6e9ff";
const BORDER_SUBTLE = "#f2f3f7";

/** Breathing room between the popover and the chip it belongs to. */
const ANCHOR_GAP = 8;
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

  // Dismiss on an outside tap or Escape. A listener beats an invisible catcher
  // element here: the popover escapes the card, so a catcher would have to be
  // portalled out to cover the screen it's actually protecting.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggers.current[open]?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
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
 *  Options popover — Figma "Order options"
 * ================================================================ */

const panelVariants: Variants = {
  hidden: ({ lift, still }) =>
    still
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.9, y: lift, filter: `blur(${PANEL_BLUR}px)` },
  shown: ({ still }) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: still
      ? { duration: 0.12 }
      : {
          ...SPRING,
          // The blur burns off faster than the panel settles, so the overshoot
          // is watched in focus — the softness is the arrival, not the rest.
          filter: { duration: 0.26, ease: EASE_OUT },
          opacity: { duration: 0.18, ease: EASE_OUT },
          delayChildren: 0.05,
          staggerChildren: 0.035,
        },
  }),
  gone: ({ lift, still }) => ({
    ...(still
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.95, y: lift * 0.5, filter: `blur(${PANEL_BLUR * 0.7}px)` }),
    transition: { duration: still ? 0.1 : 0.19, ease: "easeIn" },
  }),
};

const itemVariants: Variants = {
  hidden: ({ still }) => (still ? { opacity: 0 } : { opacity: 0, scale: 0.92, filter: "blur(5px)" }),
  shown: ({ still }) => ({
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: still ? { duration: 0.12 } : SPRING_SNAPPY,
  }),
  // Leaving together reads as one object; only the panel needs to be watched out.
  gone: { opacity: 0, transition: { duration: 0.1 } },
};

export function OptionsPopover({
  slot,
  anchor,
  placement,
  containerWidth,
  selectedId,
  save,
  onSelect,
  onSaveChange,
  reduceMotion,
}: {
  slot: PartnerSlot;
  anchor: Anchor;
  placement: Placement;
  /** Width of the positioning root — the panel clamps inside it. */
  containerWidth: number;
  selectedId: string;
  save: boolean;
  onSelect: (optionId: string) => void;
  onSaveChange: (next: boolean) => void;
  reduceMotion: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [box, setBox] = useState<Box | null>(null);

  // Measured rather than derived: the chip's width follows whichever option is
  // currently in it, so its right edge moves as the copy changes.
  // useLayoutEffect lands this before paint, so the unplaced panel never shows.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    const maxLeft = Math.max(GUTTER, containerWidth - w - GUTTER);
    const left = Math.min(Math.max(anchor.right - w, GUTTER), maxLeft);
    setBox({
      left,
      top: placement === "above" ? anchor.top - ANCHOR_GAP - h : anchor.bottom + ANCHOR_GAP,
      // Grow from the chip, not the panel's centre. Once a wide panel clamps to
      // the card the chip is no longer at its edge, so this is a real offset.
      originX: Math.min(Math.max(anchor.right - left, 0), w),
    });
  }, [anchor, placement, containerWidth]);

  const custom = {
    lift: placement === "above" ? 10 : -10,
    still: reduceMotion,
  };

  return (
    <motion.div
      ref={ref}
      // A dialog wrapping a radiogroup, not a bare radiogroup: the panel also
      // carries the save toggle, so the chip's aria-haspopup="dialog" is only
      // honest if the whole panel is the dialog and the options are a group.
      role="dialog"
      aria-labelledby={titleId}
      custom={custom}
      variants={panelVariants}
      initial="hidden"
      animate={box ? "shown" : "hidden"}
      exit="gone"
      className="
        absolute z-20 w-max max-w-[347px]
        flex flex-col gap-2.5 pt-3
        bg-white rounded-16 overflow-hidden
        shadow-[0_4px_20px_0_rgba(14,14,14,0.08)]
        will-change-transform
      "
      style={{
        left: box?.left ?? 0,
        top: box?.top ?? 0,
        // Parked offscreen for the single unmeasured render rather than flashed at 0,0.
        visibility: box ? "visible" : "hidden",
        transformOrigin: `${box?.originX ?? 0}px ${placement === "above" ? "100%" : "0%"}`,
      }}
    >
      <motion.div custom={custom} variants={itemVariants} className="px-3 pb-1">
        <p id={titleId} className="text-[14px] leading-5 tracking-[-0.1px] font-bold text-black">
          {PANEL_TITLE}
        </p>
      </motion.div>

      <div role="radiogroup" aria-labelledby={titleId} className="flex items-stretch gap-3 px-3 pb-0.5">
        {slot.options.map((option) => {
          const on = option.id === selectedId;
          const surface = on ? SURFACE_ACTION_SUBTLE : "#ffffff";
          return (
            <motion.div
              key={option.id}
              custom={custom}
              variants={itemVariants}
              // grow, never shrink: the labels below are `pre`, so a card that
              // shrank past its content would clip rather than re-wrap.
              className="grow shrink-0 basis-auto flex"
            >
              <motion.button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onSelect(option.id)}
                whileTap={reduceMotion ? undefined : { scale: 0.955 }}
                initial={false}
                animate={{ backgroundColor: surface, borderColor: on ? BORDER_ACTION : BORDER_SUBTLE }}
                transition={{
                  backgroundColor: { duration: reduceMotion ? 0 : 0.2, ease: EASE_OUT },
                  borderColor: { duration: reduceMotion ? 0 : 0.2, ease: EASE_OUT },
                  scale: SPRING_SNAPPY,
                }}
                className="
                  grow
                  flex flex-col items-center justify-center gap-2
                  px-3 py-2 rounded-12 border border-solid cursor-pointer
                  outline-none focus-visible:outline focus-visible:outline-2
                  focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]
                "
              >
                <PartnerGlyph
                  glyph={option.glyph}
                  ink={on ? INK_PRIMARY : INK_SECONDARY}
                  knockout={surface}
                />
                {/* `pre`, not `pre-line`: the label breaks only where the design
                    breaks it. pre-line would also let the card re-wrap "Leave
                    order at the door" onto four lines once it got narrow. */}
                <span
                  className="text-[14px] leading-5 font-semibold text-center whitespace-pre"
                  style={{ color: on ? INK_PRIMARY : INK_SECONDARY }}
                >
                  {option.card}
                </span>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        custom={custom}
        variants={itemVariants}
        type="button"
        role="checkbox"
        aria-checked={save}
        onClick={() => {
          onSaveChange(!save);
          hapticTick();
        }}
        className="
          flex items-center gap-1.5 w-full px-3.5 py-3 cursor-pointer text-left
          outline-none focus-visible:outline focus-visible:outline-2
          focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]
        "
        style={{ backgroundColor: SURFACE_SECONDARY }}
      >
        <InstructionCheckbox checked={save} knockout={SURFACE_SECONDARY} reduceMotion={reduceMotion} />
        <span className="text-[13px] leading-5 tracking-[-0.1px]" style={{ color: INK_SECONDARY }}>
          Save for future orders at this address
        </span>
      </motion.button>
    </motion.div>
  );
}
