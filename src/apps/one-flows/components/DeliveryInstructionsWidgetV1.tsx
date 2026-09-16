/**
 * "A message from your rider" — v1 (Figma 851:76662, 351×154)
 *
 * The delivery instructions read as a sentence in the rider's voice, with the
 * choosable parts set as chips. Tapping a chip opens that slot's options
 * (851:76326 / 851:77179 / 851:77661) anchored to the chip; picking one
 * rewrites the sentence.
 *
 * Geometry is the Figma frame exactly: header 42, body 112, three 24px rows
 * 8px apart, chips 24 tall with a 14px glyph.
 *
 * Two structural notes:
 *  - The 3px white frame is drawn as an inset shadow, not a border. Figma
 *    strokes don't consume layout, so a real border would push the header text
 *    off its 16px inset.
 *  - The card's rounded clip lives on an inner element, because the options
 *    popover has to escape the card's bounds (it opens ~88px above the top).
 *
 * MOTION — the panel resolves *out of focus*, the way iOS expands a menu out of
 * a tab bar: it scales up from the chip while a blur burns off, so the frames
 * where it's the wrong size are never legible. Nothing scales from 0, the
 * springs carry a little overshoot so things settle rather than stop, and exits
 * are roughly half the length of entrances. Content staggers in behind the
 * panel so the container reads as the thing that arrived, not the text.
 *
 * The chip itself is a layout animation: choosing a longer phrase morphs the
 * pill's width on a spring while the words crossfade through blur, which hides
 * the scale distortion that a width morph would otherwise show.
 *
 * The widget is controlled: the page owns the sentence, and is told when a
 * popover opens so it can recede behind it.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { hapticTick } from "@ui";
import { InstructionCheckbox } from "./MCheckbox";
import { RiderGlyph } from "./riderMessageIcons";
import {
  DEFAULT_RIDER_CHOICES,
  RIDER_SLOTS,
  SHEET_TITLE,
  optionFor,
  type RiderChoices,
  type RiderSlot,
  type RiderSlotId,
} from "./riderMessage.model";

const INK_PRIMARY = "#1d2539";
const INK_SECONDARY = "#475067";
const SURFACE_ACTION_SUBTLE = "#ebf4ff";
const SURFACE_SECONDARY = "#f9f9fb";
const BORDER_ACTION = "#d6e9ff";
const BORDER_SUBTLE = "#f2f3f7";

const CARD_W = 351;
/** Breathing room between the popover and the chip it belongs to. */
const ANCHOR_GAP = 8;
/** Smallest gap the popover keeps from the card's left/right edge. */
const GUTTER = 2;

/**
 * Apple-style spring notation — settle time and overshoot, rather than a
 * stiffness/damping pair nobody can picture. Bounce stays under 0.25: enough
 * that motion lands instead of stopping, not enough to read as springy.
 */
const SPRING = { type: "spring", duration: 0.52, bounce: 0.22 } as const;
const SPRING_SNAPPY = { type: "spring", duration: 0.36, bounce: 0.16 } as const;
/** Exits don't get a spring — you're done looking, so they leave on a curve. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Enough to smear the panel's contents, well under the ~20px Safari gets slow at. */
const PANEL_BLUR = 10;

/**
 * Which side of its chip each slot's popover opens on, straight from the Figma
 * frames: the first line opens downward, the other two upward. Either way the
 * popover never covers the line you're editing.
 */
const PLACEMENT: Record<RiderSlotId, "above" | "below"> = {
  call: "below",
  doorbell: "above",
  handoff: "above",
};

type Anchor = { top: number; bottom: number; right: number };
type Box = { left: number; top: number; originX: number };

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

function OptionsPopover({
  slot,
  anchor,
  selectedId,
  save,
  onSelect,
  onSaveChange,
  reduceMotion,
}: {
  slot: RiderSlot;
  anchor: Anchor;
  selectedId: string;
  save: boolean;
  onSelect: (optionId: string) => void;
  onSaveChange: (next: boolean) => void;
  reduceMotion: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [box, setBox] = useState<Box | null>(null);
  const placement = PLACEMENT[slot.id];

  // Measured rather than derived: the chip's width follows whichever option is
  // currently in the sentence, so its right edge moves as the copy changes.
  // useLayoutEffect lands this before paint, so the unplaced panel never shows.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    const maxLeft = Math.max(GUTTER, CARD_W - w - GUTTER);
    const left = Math.min(Math.max(anchor.right - w, GUTTER), maxLeft);
    setBox({
      left,
      top: placement === "above" ? anchor.top - ANCHOR_GAP - h : anchor.bottom + ANCHOR_GAP,
      // Grow from the chip, not the panel's centre. Once a wide panel clamps to
      // the card the chip is no longer at its edge, so this is a real offset.
      originX: Math.min(Math.max(anchor.right - left, 0), w),
    });
  }, [anchor, placement]);

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
          {SHEET_TITLE}
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
                <RiderGlyph
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

/* ================================================================
 *  Sentence chip
 * ================================================================ */

function SentenceChip({
  slot,
  optionId,
  glyph,
  chip,
  active,
  reduceMotion,
  onToggle,
  chipRef,
}: {
  slot: RiderSlot;
  optionId: string;
  glyph: Parameters<typeof RiderGlyph>[0]["glyph"];
  chip: string;
  active: boolean;
  reduceMotion: boolean;
  onToggle: () => void;
  chipRef: (el: HTMLButtonElement | null) => void;
}) {
  const swap = reduceMotion
    ? { duration: 0.12 }
    : { duration: 0.26, ease: EASE_OUT };

  return (
    <motion.button
      ref={chipRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={active}
      aria-label={`${slot.lead} ${chip}. Change.`}
      onClick={onToggle}
      // The pill resizes to fit whichever phrase is in it; `layout` morphs that
      // width on a spring instead of snapping, and the blurred word swap below
      // covers the scale distortion the morph introduces.
      layout={reduceMotion ? false : true}
      whileTap={reduceMotion ? undefined : { scale: 0.955 }}
      transition={{ layout: SPRING, scale: SPRING_SNAPPY }}
      className="
        shrink-0 h-6 flex items-center gap-1 pl-1.5 pr-2
        rounded-full border border-solid cursor-pointer
        outline-none focus-visible:outline focus-visible:outline-2
        focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]
      "
      style={{ backgroundColor: SURFACE_ACTION_SUBTLE, borderColor: BORDER_ACTION }}
    >
      <span className="relative block size-[14px] shrink-0">
        <AnimatePresence initial={false}>
          <motion.span
            key={glyph}
            className="absolute inset-0"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
            transition={swap}
          >
            <RiderGlyph glyph={glyph} size={14} ink={INK_PRIMARY} knockout={SURFACE_ACTION_SUBTLE} />
          </motion.span>
        </AnimatePresence>
      </span>

      {/* popLayout pulls the outgoing phrase out of flow, so the pill can start
          resizing to the new one immediately instead of waiting for it to go. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={optionId}
          className="text-[14px] leading-5 tracking-[-0.1px] font-semibold whitespace-nowrap"
          style={{ color: INK_PRIMARY }}
          initial={reduceMotion ? false : { opacity: 0, y: 7, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -7, filter: "blur(4px)" }}
          transition={swap}
        >
          {chip}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV1Props = {
  value: RiderChoices;
  onChange: (next: RiderChoices, slot: RiderSlotId, optionId: string) => void;
  /** Fires as a popover opens and closes, so the page can recede behind it. */
  onSheetOpenChange?: (open: boolean) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV1({
  value = DEFAULT_RIDER_CHOICES,
  onChange,
  onSheetOpenChange,
  className = "",
}: DeliveryInstructionsWidgetV1Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Partial<Record<RiderSlotId, HTMLButtonElement | null>>>({});
  const [open, setOpen] = useState<RiderSlotId | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [save, setSave] = useState(true);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    onSheetOpenChange?.(open !== null);
  }, [open, onSheetOpenChange]);

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
        chipRefs.current[open]?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const toggleSlot = (id: RiderSlotId) => {
    if (open === id) {
      close();
      return;
    }
    const root = rootRef.current;
    const chip = chipRefs.current[id];
    if (!root || !chip) return;
    const r = root.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    setAnchor({ top: c.top - r.top, bottom: c.bottom - r.top, right: c.right - r.left });
    setOpen(id);
    hapticTick();
  };

  const openSlot = RIDER_SLOTS.find((s) => s.id === open);

  return (
    // Height comes from the sentence rather than the Figma frame's 154px: a
    // longer phrase can wrap a row, and a fixed height would clip it against
    // the card's rounded overflow. shrink-0 keeps the page's flex column from
    // compressing it back.
    <div ref={rootRef} className={`relative w-[351px] shrink-0 ${className}`}>
      {/* The rounded clip sits here, inside the popover's positioning root, so
          the gradient header stays cropped while the popover can still escape. */}
      <section
        role="group"
        aria-labelledby={titleId}
        data-variant="1"
        className="
          w-full bg-white rounded-16 overflow-hidden flex flex-col
          shadow-[inset_0_0_0_3px_#ffffff]
        "
      >
        <div className="shrink-0 h-[42px] px-4 pt-3 pb-2.5 bg-gradient-to-r from-[#d6e9ff] to-white">
          <h2 id={titleId} className="text-[16px] leading-5 tracking-[-0.15px] font-bold" style={{ color: INK_PRIMARY }}>
            A message from your rider
          </h2>
        </div>

        <div className="flex-1 p-3">
          <div className="flex flex-col gap-2">
            {RIDER_SLOTS.map((slot) => {
              const option = optionFor(slot, value);
              const active = open === slot.id;
              const dimmed = open !== null && !active;
              return (
                <motion.div
                  key={slot.id}
                  className={`flex h-6 items-center gap-1.5 ${slot.id === "call" ? "pl-0.5" : ""}`}
                  initial={false}
                  // The lines you aren't editing pull back rather than just
                  // fade — the same defocus the page behind them gets.
                  animate={{
                    opacity: dimmed ? 0.32 : 1,
                    filter: dimmed && !reduceMotion ? "blur(1.5px)" : "blur(0px)",
                  }}
                  transition={{ duration: reduceMotion ? 0 : 0.24, ease: EASE_OUT }}
                >
                  <span
                    className="text-[14px] leading-5 tracking-[-0.1px] font-semibold whitespace-nowrap"
                    style={{ color: INK_PRIMARY }}
                  >
                    {slot.lead}
                  </span>
                  <SentenceChip
                    slot={slot}
                    optionId={option.id}
                    glyph={option.glyph}
                    chip={option.chip}
                    active={active}
                    reduceMotion={reduceMotion}
                    onToggle={() => toggleSlot(slot.id)}
                    chipRef={(el) => {
                      chipRefs.current[slot.id] = el;
                    }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {openSlot && anchor && (
          <OptionsPopover
            key={openSlot.id}
            slot={openSlot}
            anchor={anchor}
            selectedId={value[openSlot.id]}
            save={save}
            reduceMotion={reduceMotion}
            onSaveChange={setSave}
            onSelect={(optionId) => {
              onChange({ ...value, [openSlot.id]: optionId }, openSlot.id, optionId);
              hapticTick();
              // A beat on the picked card before the panel goes, so the choice
              // is seen landing rather than inferred from the sentence after.
              window.setTimeout(close, reduceMotion ? 0 : 220);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
