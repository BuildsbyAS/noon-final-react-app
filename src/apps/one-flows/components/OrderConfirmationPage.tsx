/**
 * Order confirmation — Figma 699:40366 (375×812)
 *
 * A prototype scaffold: the header, order-placed card, delivery-info card and
 * footer ship as flat PNG exports because they're non-interactive here. Only
 * the Delivery instructions widget (699:40691) is real, tappable code.
 *
 * Where a tap on flat artwork has to do something, a transparent button is
 * overlaid on it — sized to 44×44 minimum rather than to the visual box.
 *
 * Layout is a plain flex column; it lands on the Figma pixels exactly:
 *   header 375×101 → content px-3 pt-4 gap-4 → footer 375×90
 *   widget tops at y 117 / 293 / 471; footer button at y 736
 * Content ends at y=631 and the footer starts at 722, so nothing scrolls
 * vertically — the only scroll on this page is the instruction row.
 *
 * No <PageTransition>: one-flows' App.tsx owns the page slide via its own
 * AnimatePresence + pageVariants. Wrapping again would double-animate.
 */
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Skel } from "./Skeleton";
import DeliveryInstructionsWidgetV1 from "./DeliveryInstructionsWidgetV1";
import DeliveryInstructionsWidgetV2 from "./DeliveryInstructionsWidgetV2";
import DeliveryInstructionsWidgetV3 from "./DeliveryInstructionsWidgetV3";
import DeliveryInstructionsWidgetV4 from "./DeliveryInstructionsWidgetV4";
import DeliveryInstructionsWidgetV5 from "./DeliveryInstructionsWidgetV5";
import DeliveryInstructionsWidgetV6 from "./DeliveryInstructionsWidgetV6";
import DeliveryInstructionsWidgetV7 from "./DeliveryInstructionsWidgetV7";
import DeliveryInstructionsWidgetV8 from "./DeliveryInstructionsWidgetV8";
import DeliveryInstructionsWidgetV9 from "./DeliveryInstructionsWidgetV9";
import DeliveryInstructionsWidgetV10 from "./DeliveryInstructionsWidgetV10";
import DeliveryInstructionsWidgetV11 from "./DeliveryInstructionsWidgetV11";
import DeliveryInstructionsWidgetV12 from "./DeliveryInstructionsWidgetV12";
import DeliveryInstructionsWidgetV13 from "./DeliveryInstructionsWidgetV13";
import DeliveryInstructionsWidgetV14 from "./DeliveryInstructionsWidgetV14";
import type { InstructionId } from "./deliveryInstructions.model";
import {
  DEFAULT_DELIVERY_PREFERENCES,
  type DeliveryPreferences,
} from "./deliveryPreferences.model";
import { DEFAULT_RIDER_CHOICES, type RiderChoices } from "./riderMessage.model";
import { DEFAULT_CAROUSEL_CHOICES, type CarouselChoices } from "./deliveryCarousel.model";
import { DEFAULT_PARTNER_CHOICES, type PartnerChoices } from "./deliveryPartner.model";
import {
  DEFAULT_PARTNER_CHOICES as DEFAULT_PARTNER_V7_CHOICES,
  type PartnerChoices as PartnerV7Choices,
} from "./deliveryPartnerV7.model";
import { DEFAULT_V8_VALUE, type V8Value } from "./deliveryInstructionsV8.model";
import { DEFAULT_V9_CHOICES, type V9Choices } from "./deliveryPartnerV9.model";
import { DEFAULT_V10_VALUE, type V10Value } from "./deliveryInstructionsV10.model";
import { DEFAULT_V11_VALUE, type V11Value } from "./deliveryInstructionsV11.model";
import { DEFAULT_V12_VALUE, type V12Value } from "./deliveryInstructionsV12.model";
import { DEFAULT_V13_VALUE, type V13Value } from "./deliveryInstructionsV13.model";
import { DEFAULT_V14_VALUE, type V14Value } from "./deliveryInstructionsV14.model";
import headerImg from "../assets/order-confirmation/header.png";
import orderPlacedImg from "../assets/order-confirmation/order-placed.png";
import deliveryInfoImg from "../assets/order-confirmation/delivery-info.png";
import footerImg from "../assets/order-confirmation/footer.png";

/** Figma page background — colour/border/subtle #f2f3f7, uniform behind everything. */
const PAGE_BG = "#f2f3f7";

/**
 * Iterations of the delivery-instructions widget, switched live by the pill
 * below the frame (`?v=2` picks one for a demo link).
 *
 * Three of them are their own design and own their own piece of state: v1 (the
 * rider's message as an editable sentence), v2 (segmented controls with a
 * per-choice caption) and v3 (the carousel of different-width slides).
 *
 * v4 and v5 are motion studies over the same four-chip card and share one
 * selection Set, which is why flipping between those two keeps the picks. v5 is
 * the engine; v4 is a thin wrapper over it.
 *
 * v3 and v5 were swapped on request — the carousel took the v3 pill and the
 * chip card moved to v5, so a `?v=3` link now opens the carousel.
 */
export type WidgetVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
/**
 * The switcher's sections. v11–v14 are the final round, shown there as
 * v1–v4 in Anurag's order; their ids (and `?v=` links) are unchanged.
 */
const VARIANT_GROUPS: { title: string; items: { id: WidgetVariant; label: string }[] }[] = [
  {
    title: "Initial Iterations",
    items: ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((id) => ({ id, label: `v${id}` })),
  },
  {
    title: "Final versions",
    // Anurag's running order, which is not the order they were built in: the
    // labels number the positions, while `id` (and every `?v=` link) stays put.
    items: [
      { id: 13, label: "v1" },
      { id: 12, label: "v2" },
      { id: 14, label: "v3" },
      { id: 11, label: "v4" },
    ],
  },
];
const VARIANTS = VARIANT_GROUPS.flatMap((g) => g.items);

export function parseWidgetVariant(raw: string | null): WidgetVariant {
  const n = Number(raw);
  return VARIANTS.some((v) => v.id === n) ? (n as WidgetVariant) : 1;
}

const CHIP_WIDGET: Record<4 | 5, typeof DeliveryInstructionsWidgetV5> = {
  4: DeliveryInstructionsWidgetV4,
  5: DeliveryInstructionsWidgetV5,
};

/**
 * Swapping versions: the old widget sinks out of focus the way it's leaving,
 * the new one resolves out of a blur from the other side on a soft spring.
 * Exits are quicker than entrances so the new one is what you watch.
 */
type SwapCustom = { direction: number; still: boolean };
const VARIANT_SWAP: Variants = {
  enter: ({ direction, still }: SwapCustom) =>
    still ? { opacity: 0 } : { opacity: 0, y: 18 * direction, scale: 0.97, filter: "blur(8px)" },
  shown: ({ still }: SwapCustom) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: still
      ? { duration: 0.15 }
      : {
          type: "spring",
          duration: 0.5,
          bounce: 0.2,
          opacity: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
          filter: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
        },
  }),
  exit: ({ direction, still }: SwapCustom) => ({
    ...(still ? { opacity: 0 } : { opacity: 0, y: -12 * direction, scale: 0.98, filter: "blur(6px)" }),
    transition: { duration: still ? 0.1 : 0.18, ease: [0.23, 1, 0.32, 1] },
  }),
};

/** Slot geometry of a switch column: 40px buttons, 2px gap, 2px padding. */
const SWITCH_SLOT = 40;
const SWITCH_GAP = 2;
const PILL_SPRING = { type: "spring", duration: 0.42, bounce: 0.18 } as const;
const EASE_OUT_UI = [0.23, 1, 0.32, 1] as const;

/** The pill's window onto the dark copy of the row: one 40px circle. */
function pillClip(index: number, count: number) {
  const left = SWITCH_GAP + index * (SWITCH_SLOT + SWITCH_GAP);
  const right = SWITCH_GAP + (count - 1 - index) * (SWITCH_SLOT + SWITCH_GAP);
  return `inset(${SWITCH_GAP}px ${right}px ${SWITCH_GAP}px ${left}px round ${SWITCH_SLOT / 2}px)`;
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="#0f61ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Picks which round of iterations the row below shows. Opens centred under
 * its trigger (origin top-centre) out of a slight blur; Escape, an outside tap or a
 * pick closes it.
 */
function GroupDropdown({
  groupIndex,
  onPick,
  reduceMotion,
}: {
  groupIndex: number;
  onPick: (index: number) => void;
  reduceMotion: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    optionRefs.current[groupIndex]?.focus();
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, groupIndex]);

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", duration: 0.25, bounce: 0 }}
        className="flex h-10 items-center gap-1.5 rounded-full bg-white pl-4 pr-3 shadow-xs text-[13px] leading-5 font-semibold text-[#1d2539] whitespace-nowrap cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff]"
      >
        {/* The label swaps through a blur so the width change doesn't read as a jump. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={groupIndex}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.2, ease: EASE_OUT_UI }}
          >
            {VARIANT_GROUPS[groupIndex].title}
          </motion.span>
        </AnimatePresence>
        <motion.span
          className="text-[#475067]"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0 }}
        >
          <Chevron />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={listId}
            role="listbox"
            aria-label="Iteration round"
            onKeyDown={(e) => {
              if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
              e.preventDefault();
              const i = optionRefs.current.findIndex((el) => el === document.activeElement);
              const n = VARIANT_GROUPS.length;
              optionRefs.current[(i + (e.key === "ArrowDown" ? 1 : -1) + n) % n]?.focus();
            }}
            className="absolute left-1/2 top-full z-30 mt-1.5 flex w-max flex-col gap-0.5 rounded-16 bg-white p-1 shadow-[0_4px_20px_0_rgba(14,14,14,0.08)] origin-top"
            initial={reduceMotion ? { opacity: 0, x: "-50%" } : { opacity: 0, x: "-50%", scale: 0.96, y: -4, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: "-50%", scale: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.18, ease: EASE_OUT_UI } }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: 0.1 } }
                : { opacity: 0, scale: 0.98, y: -2, filter: "blur(2px)", transition: { duration: 0.12, ease: EASE_OUT_UI } }
            }
          >
            {VARIANT_GROUPS.map((g, i) => (
              <button
                key={g.title}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                role="option"
                aria-selected={i === groupIndex}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  onPick(i);
                }}
                className="flex h-10 items-center justify-between gap-4 rounded-12 px-3 text-left text-[13px] leading-5 font-semibold text-[#1d2539] whitespace-nowrap cursor-pointer outline-none transition-colors duration-150 focus-visible:bg-[#f2f3f7] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#f2f3f7]"
              >
                <span>
                  {g.title}
                  <span className="ml-1.5 font-medium text-[#666d85]">
                    {g.items[0].label}–{g.items[g.items.length - 1].label}
                  </span>
                </span>
                <span className="flex size-4 items-center justify-center">{i === groupIndex && <Check />}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Version switcher: a dropdown for the iteration round, and under it a row
 * of that round's versions. Picking a round opens the version last viewed in
 * it (its first, the first time).
 */
export function VariantSwitch({ value, onChange }: { value: WidgetVariant; onChange: (v: WidgetVariant) => void }) {
  const reduceMotion = useReducedMotion() ?? false;
  const groupIndex = Math.max(
    0,
    VARIANT_GROUPS.findIndex((g) => g.items.some((v) => v.id === value)),
  );
  const group = VARIANT_GROUPS[groupIndex];
  const index = group.items.findIndex((v) => v.id === value);
  const lastInGroup = useRef<Partial<Record<number, WidgetVariant>>>({});
  lastInGroup.current[groupIndex] = value;
  const refs = useRef<Partial<Record<WidgetVariant, HTMLButtonElement | null>>>({});

  // Arrow keys walk the row like a native radio group (focus follows selection).
  const step = (delta: number) => {
    const n = group.items.length;
    const next = group.items[(index + delta + n) % n].id;
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    // Sits above the frame, centred across the full width.
    <div className="flex w-full shrink-0 flex-col items-center justify-center gap-3 self-stretch">
      <GroupDropdown
        groupIndex={groupIndex}
        reduceMotion={reduceMotion}
        onPick={(i) => {
          if (i !== groupIndex) onChange(lastInGroup.current[i] ?? VARIANT_GROUPS[i].items[0].id);
        }}
      />
      {/* The row for the new round resolves in as the old one leaves. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={group.title}
          role="radiogroup"
          aria-label={`${group.title} versions`}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowRight") step(1);
            else if (e.key === "ArrowUp" || e.key === "ArrowLeft") step(-1);
            else return;
            e.preventDefault();
          }}
          className="relative flex flex-row items-center gap-0.5 p-0.5 rounded-full bg-white shadow-xs origin-top"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -6, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(4px)" }}
          transition={reduceMotion ? { duration: 0.12 } : { type: "spring", duration: 0.4, bounce: 0.12, opacity: { duration: 0.2 } }}
        >
          {group.items.map((v) => (
            <motion.button
              key={v.id}
              ref={(el) => {
                refs.current[v.id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={v.id === value}
              tabIndex={v.id === value ? 0 : -1}
              onClick={() => onChange(v.id)}
              whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              transition={{ type: "spring", duration: 0.25, bounce: 0 }}
              className="size-10 shrink-0 px-0 rounded-full text-[14px] leading-5 font-semibold text-[#475067] cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] transition-colors duration-200 [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#1d2539]"
            >
              {v.label}
            </motion.button>
          ))}
          {/* The active pill: a dark copy of the column, clipped to one slot. The
              clip glides between slots, so each label turns white exactly where
              the pill's edge crosses it; a per-button colour swap can't line up. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-row items-center gap-0.5 p-0.5 rounded-full bg-[#1d2539]"
            initial={false}
            animate={{ clipPath: pillClip(Math.max(index, 0), group.items.length) }}
            transition={reduceMotion ? { duration: 0 } : PILL_SPRING}
          >
            {group.items.map((v) => (
              <span
                key={v.id}
                className="flex size-10 shrink-0 items-center justify-center text-[14px] leading-5 font-semibold text-white"
              >
                {v.label}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function OrderConfirmationPage({
  onBack,
  onContinueShopping,
  variant,
}: {
  onBack: () => void;
  onContinueShopping: () => void;
  variant: WidgetVariant;
}) {
  const [instructions, setInstructions] = useState<ReadonlySet<InstructionId>>(new Set());
  const [riderChoices, setRiderChoices] = useState<RiderChoices>(DEFAULT_RIDER_CHOICES);
  const [preferences, setPreferences] = useState<DeliveryPreferences>(DEFAULT_DELIVERY_PREFERENCES);
  const [carouselChoices, setCarouselChoices] = useState<CarouselChoices>(DEFAULT_CAROUSEL_CHOICES);
  // v6 is based on v1 but owns its own model and answers.
  const [partnerChoices, setPartnerChoices] = useState<PartnerChoices>(DEFAULT_PARTNER_CHOICES);
  const [partnerV7Choices, setPartnerV7Choices] = useState<PartnerV7Choices>(DEFAULT_PARTNER_V7_CHOICES);
  const [v8Value, setV8Value] = useState<V8Value>(DEFAULT_V8_VALUE);
  const [v9Choices, setV9Choices] = useState<V9Choices>(DEFAULT_V9_CHOICES);
  const [v10Value, setV10Value] = useState<V10Value>(DEFAULT_V10_VALUE);
  const [v11Value, setV11Value] = useState<V11Value>(DEFAULT_V11_VALUE);
  const [v12Value, setV12Value] = useState<V12Value>(DEFAULT_V12_VALUE);
  const [v13Value, setV13Value] = useState<V13Value>(DEFAULT_V13_VALUE);
  const [v14Value, setV14Value] = useState<V14Value>(DEFAULT_V14_VALUE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;
  // Which way the switch moved: a higher version rises in from below (the
  // switch is a column), a lower one drops in from above.
  const [shownVariant, setShownVariant] = useState(variant);
  const [direction, setDirection] = useState(1);
  if (variant !== shownVariant) {
    setDirection(variant > shownVariant ? 1 : -1);
    setShownVariant(variant);
  }

  const ChipWidget = variant === 4 || variant === 5 ? CHIP_WIDGET[variant] : null;

  // v1's options popover floats over the page, so everything that isn't the
  // widget defocuses while it's open — fading *and* blurring, the way iOS pulls
  // a background behind a sheet, so the panel reads as the only live layer.
  //
  // Opacity on the artwork rather than a scrim overlay: the popover escapes the
  // widget's card, so a scrim would have to sit above the content it dims but
  // below the popover inside it.
  const recede = `transition-[opacity,filter] duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity ${
    sheetOpen ? "opacity-30 blur-[3px] motion-reduce:blur-none" : "opacity-100 blur-0"
  }`;

  return (
    <div
      className="relative w-[375px] h-[812px] overflow-hidden"
      style={{ backgroundColor: PAGE_BG }}
    >
      {/* Header PNG already contains the iOS status bar — don't also render
          <StatusBar />. It's transparent apart from its glyphs, so the page
          colour shows through; there is no white header plate. */}
      <img
        src={headerImg}
        alt=""
        aria-hidden="true"
        width={375}
        height={101}
        draggable={false}
        className={`absolute left-0 top-0 block w-[375px] h-[101px] ${recede}`}
      />
      {/* Live hit targets over the flat header. Visual boxes are 36×36 at
          (12,57) and (259,57); these are grown to 44 tall and centred on them. */}
      <button
        type="button"
        aria-label="Back"
        onClick={onBack}
        className="absolute left-2 top-[53px] size-11 rounded-full cursor-pointer"
      />
      <button
        type="button"
        aria-label="Need help?"
        className="absolute left-[255px] top-[53px] w-28 h-11 rounded-full cursor-pointer"
      />

      <div
        className={`absolute left-0 top-[101px] w-[375px] flex flex-col gap-4 px-3 pt-4 ${
          // v10 stands 289 tall, which would run under the footer on this fixed
          // 812 screen — so for v10 alone the content scrolls above the footer.
          variant === 10
            ? "bottom-[90px] overflow-y-auto overscroll-contain pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : ""
        }`}
      >
        {/* These two carry real information as flat pixels, so they get
            descriptive alt text rather than being marked decorative. */}
        <img
          src={orderPlacedImg}
          alt="Order placed. Arriving May 19 to 24. Shipment 1, 2 items, express delivery."
          width={351}
          height={160}
          draggable={false}
          className={`block w-[351px] h-[160px] ${recede}`}
        />
        <img
          src={deliveryInfoImg}
          alt="Delivering to Home — 3207, 32nd floor, Sama towers, Dubai. Anurag, +971 (0) 412 3456. The rider will contact this number if needed."
          width={351}
          height={162}
          draggable={false}
          className={`block w-[351px] h-[162px] ${recede}`}
        />

        <AnimatePresence mode="popLayout" initial={false} custom={{ direction, still: reduceMotion }}>
          <motion.div
            key={variant}
            custom={{ direction, still: reduceMotion }}
            variants={VARIANT_SWAP}
            initial="enter"
            animate="shown"
            exit="exit"
            className="w-[351px] origin-top"
          >
            {ChipWidget ? (
              <ChipWidget value={instructions} onChange={setInstructions} />
            ) : variant === 2 ? (
              <DeliveryInstructionsWidgetV2 value={preferences} onChange={setPreferences} />
            ) : variant === 3 ? (
              <DeliveryInstructionsWidgetV3 value={carouselChoices} onChange={setCarouselChoices} />
            ) : variant === 6 ? (
              <DeliveryInstructionsWidgetV6
                value={partnerChoices}
                onChange={setPartnerChoices}
                onSheetOpenChange={setSheetOpen}
              />
            ) : variant === 7 ? (
              <DeliveryInstructionsWidgetV7
                value={partnerV7Choices}
                onChange={setPartnerV7Choices}
                onSheetOpenChange={setSheetOpen}
              />
            ) : variant === 8 ? (
              <DeliveryInstructionsWidgetV8 value={v8Value} onChange={setV8Value} />
            ) : variant === 9 ? (
              <DeliveryInstructionsWidgetV9 value={v9Choices} onChange={setV9Choices} />
            ) : variant === 10 ? (
              <DeliveryInstructionsWidgetV10 value={v10Value} onChange={setV10Value} />
            ) : variant === 14 ? (
              <DeliveryInstructionsWidgetV14 value={v14Value} onChange={setV14Value} />
            ) : variant === 13 ? (
              <DeliveryInstructionsWidgetV13 value={v13Value} onChange={setV13Value} />
            ) : variant === 12 ? (
              <DeliveryInstructionsWidgetV12 value={v12Value} onChange={setV12Value} />
            ) : variant === 11 ? (
              <DeliveryInstructionsWidgetV11 value={v11Value} onChange={setV11Value} onSheetOpenChange={setSheetOpen} />
            ) : (
              <DeliveryInstructionsWidgetV1
                value={riderChoices}
                onChange={setRiderChoices}
                onSheetOpenChange={setSheetOpen}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Decorative once its button below is labelled. */}
      <img
        src={footerImg}
        alt=""
        aria-hidden="true"
        width={375}
        height={90}
        draggable={false}
        className={`absolute left-0 bottom-0 block w-[375px] h-[90px] ${recede}`}
      />
      <button
        type="button"
        aria-label="Continue shopping"
        onClick={onContinueShopping}
        className="absolute left-3 bottom-6 w-[351px] h-[52px] rounded-12 cursor-pointer"
      />
    </div>
  );
}

/**
 * Silhouette of this screen. Offsets are the real ones: 105 + 12 = 117,
 * 105 + 188 = 293, 105 + 366 = 471; card row at widget-y 44 + 4 = 48.
 *
 * The fourth chip block clips at the widget edge on purpose — the skeleton
 * previews the overflow, so the real row's clipping doesn't read as a bug.
 *
 * It takes the variant because the iterations aren't the same height: the chip
 * card is 160, v2 stands 232 (140-tall segmented cards plus a "save this
 * address" row) and v3's carousel 214. A skeleton that guessed one height for
 * all of them would hand the screen a pop on first paint, which is the one
 * thing a skeleton exists to prevent.
 *
 * Every Skel sits inside a positioned wrapper rather than carrying `absolute`
 * itself: Skel prepends its own `relative`, and Tailwind emits `.relative`
 * after `.absolute`, so `<Skel className="absolute …">` silently stays in flow.
 * Same wrapper pattern as PaymentMethodSkeleton in ./Skeleton.tsx.
 */
export function OrderConfirmationSkeleton({ variant = 1 }: { variant?: WidgetVariant }) {
  // The two variants whose widget is not the 160-tall chip card: v2 is 232
  // (segmented cards + save row), v3 is the 214-tall carousel.
  const v2 = variant === 2;
  const carousel = variant === 3;
  // v7 is v6's layout with an interactive partner, so they share a silhouette.
  const partner = variant === 6 || variant === 7;
  const v8 = variant === 8;
  const v9 = variant === 9;
  const v10 = variant === 10;
  const v11 = variant === 11;
  const v12 = variant === 12;
  const v13 = variant === 13;
  const v14 = variant === 14;
  return (
    <div
      className="relative w-[375px] h-[812px] overflow-hidden"
      style={{ backgroundColor: PAGE_BG }}
      aria-hidden="true"
    >
      <div className="absolute left-3 top-[57px]">
        <Skel className="size-9 rounded-full" />
      </div>
      <div className="absolute left-[259px] top-[57px]">
        <Skel className="w-[104px] h-9 rounded-full" />
      </div>

      <div className="absolute left-3 top-[117px]">
        <Skel className="w-[351px] h-[160px] rounded-16" />
      </div>
      <div className="absolute left-3 top-[293px]">
        <Skel className="w-[351px] h-[162px] rounded-16" />
      </div>

      <div
        className="absolute left-3 top-[471px] w-[351px] rounded-16 bg-white overflow-hidden"
        style={{
          height: v2 ? 232 : carousel ? 214 : partner ? 263 : v8 ? 264 : v9 ? 252 : v10 ? 289 : v11 || v13 ? 205 : v12 || v14 ? 222 : 160,
          // v10's card sits 16px lower (room for the partner peeking over it).
          marginTop: v10 ? 16 : 0,
        }}
      >
        <div className="absolute left-4 top-[15px]">
          <Skel className="h-4 w-[132px] rounded-4" />
        </div>
        {v2 ? (
          <>
            {/* The real card widths: 103 / 106 / 110 / 140 at x 12 / 125 / 241 /
                361, so the fourth clips exactly where it clips for real. */}
            {[
              [12, 103],
              [125, 106],
              [241, 110],
              [361, 140],
            ].map(([left, width]) => (
              <div key={left} className="absolute top-12" style={{ left }}>
                <Skel className="h-[140px] rounded-12" style={{ width }} />
              </div>
            ))}
            <div className="absolute left-[14px] top-[200px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[200px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : carousel ? (
          <>
            {/* Slide widths 103 / 261 / 318 at x 12 / 125 / 396, so the third
                clips exactly where it clips for real. */}
            {[
              [12, 103],
              [125, 261],
              [396, 318],
            ].map(([left, width]) => (
              <div key={left} className="absolute top-12" style={{ left }}>
                <Skel className="h-[122px] rounded-12" style={{ width }} />
              </div>
            ))}
            <div className="absolute left-[14px] top-[182px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[182px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : v12 || v14 ? (
          <>
            {/* v12: subtitle at y 46, the shared 331×112 switch card at (10, 64),
                the save row at 178. */}
            <div className="absolute left-3.5 top-[46px]">
              <Skel className="h-3 w-[230px] rounded-4" />
            </div>
            <div className="absolute left-2.5 top-16">
              <Skel className="w-[331px] h-[112px] rounded-t-[24px] rounded-b-[20px]" />
            </div>
            <div className="absolute left-[14px] top-[178px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[178px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : v11 || v13 ? (
          <>
            {/* v11 and v13: three ~102×100 chips at x 12 / 124 / 237 (y 48), a
                divider at 160 and the save row at 173. */}
            {[12, 124, 237].map((left) => (
              <div key={left} className="absolute top-12" style={{ left }}>
                <Skel className="w-[102px] h-[100px] rounded-12" />
              </div>
            ))}
            <div className="absolute left-[14px] top-[173px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[173px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : v10 ? (
          <>
            {/* v10: address line at y 44, three 100×120 cards at x 10 / 120 / 230
                (y 69), the record row at y 201, the save row at 257. */}
            <div className="absolute left-3 top-[44px]">
              <Skel className="h-4 w-[210px] rounded-4" />
            </div>
            {[10, 120, 230].map((left) => (
              <div key={left} className="absolute top-[69px]" style={{ left }}>
                <Skel className="w-[100px] h-[120px] rounded-12" />
              </div>
            ))}
            <div className="absolute left-3 top-[201px]">
              <Skel className="w-[327px] h-10 rounded-12" />
            </div>
            <div className="absolute left-[14px] top-[257px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[257px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : v9 ? (
          <>
            {/* v9: three toggle rows at y 46 / 87 / 128, the partner frame at
                (260, 18), the record row at y 170, the save row at 220. */}
            {[
              [46, 122],
              [87, 128],
              [128, 213],
            ].map(([top, width]) => (
              <div key={top} className="absolute left-3" style={{ top }}>
                <Skel className="h-[34px] rounded-full" style={{ width }} />
              </div>
            ))}
            <div className="absolute left-[260px] top-[18px]">
              <Skel className="w-[91px] h-[150px] rounded-16" />
            </div>
            <div className="absolute left-3 top-[170px]">
              <Skel className="w-[327px] h-10 rounded-12" />
            </div>
            <div className="absolute left-[14px] top-[220px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[220px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : v8 ? (
          <>
            {/* v8: three 136×114 switch cards at x 12 / 158 / 304 (the third clips),
                the record row at y 174, the save row at 230. */}
            {[12, 158, 304].map((left) => (
              <div key={left} className="absolute top-12" style={{ left }}>
                <Skel className="w-[136px] h-[114px] rounded-16" />
              </div>
            ))}
            <div className="absolute left-3 top-[174px]">
              <Skel className="w-[327px] h-11 rounded-12" />
            </div>
            <div className="absolute left-[14px] top-[230px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[230px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : partner ? (
          <>
            {/* v6: three chips at y 48 / 88 / 128 (widths 100 / 106 / 195), the
                rider at (237, 20), the record row at y 174, the save row at 231. */}
            {[
              [48, 100],
              [88, 106],
              [128, 195],
            ].map(([top, width]) => (
              <div key={top} className="absolute left-3" style={{ top }}>
                <Skel className="h-8 rounded-full" style={{ width }} />
              </div>
            ))}
            <div className="absolute left-[237px] top-5">
              <Skel className="w-[114px] h-[150px] rounded-16" />
            </div>
            <div className="absolute left-3 top-[174px]">
              <Skel className="w-[327px] h-10 rounded-12" />
            </div>
            <div className="absolute left-[14px] top-[231px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[231px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : (
          [12, 118, 224, 330].map((left) => (
            <div key={left} className="absolute top-12" style={{ left }}>
              <Skel className="w-24 h-[100px] rounded-12" />
            </div>
          ))
        )}
      </div>

      <div className="absolute left-3 bottom-6">
        <Skel className="w-[351px] h-[52px] rounded-12" />
      </div>
    </div>
  );
}
