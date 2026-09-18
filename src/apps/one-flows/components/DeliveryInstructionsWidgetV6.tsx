/**
 * "Instruct your delivery partner" — v6 (Figma 1038:47030, 351×263)
 *
 * Based on v1, and fully independent of it — v6 owns its model
 * (deliveryPartner.model), icons (deliveryPartnerIcons) and panel
 * (deliveryPartnerOptions), all started as copies of v1's.
 *
 * v1's interaction in a new card: each instruction is a dropdown chip followed
 * by a clause ("Call me ⌄ when delivering"), and tapping a chip opens v1's
 * options panel anchored to it while the rest of the screen recedes. Below the
 * chips, a record row speaks up to the rider illustration through a bubble
 * tail, and the save preference sits at the foot of the card — the only place it
 * lives, since the panels show just the options.
 *
 * Geometry is the Figma frame: header 44, body 177, save row 42. Two structural
 * notes carried over from v1:
 *  - The 3px white frame is a ring painted on top, not a border — Figma strokes
 *    don't consume layout, and the illustration runs under the frame's edge.
 *  - The rounded clip lives on the inner section; the root stays unclipped so
 *    the panel can escape the card.
 *
 * MOTION — the chip is a layout animation: a longer answer morphs the pill's
 * width on a spring while the words and glyph crossfade through blur, and the
 * trailing clause glides along with it. The chevron turns over while its panel
 * is open. Lines you aren't editing pull back out of focus, but the rider stays
 * sharp — they're who you're talking to.
 *
 * Reduced motion: no morphs, pulses or sweeps; states swap.
 *
 * No <PageTransition> / <SkeletonGate> — this is a widget; OrderConfirmationPage
 * owns both for the screen.
 */
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { hapticTick } from "@ui";
import { InstructionCheckbox } from "./MCheckbox";
import {
  EASE_OUT,
  OptionsPopover,
  SPRING,
  SPRING_SNAPPY,
  useAnchoredOptions,
  type Placement,
} from "./deliveryPartnerOptions";
import { BubbleTail, Chevron, Cross, MicFilled, PartnerChipGlyph, PlayCircle } from "./deliveryPartnerIcons";
import {
  DEFAULT_PARTNER_CHOICES,
  PARTNER_NOTE_DURATION_MS,
  PARTNER_SLOTS,
  PARTNER_VOICE_LABEL,
  chipLabel,
  partnerOptionFor,
  type PartnerChoices,
  type PartnerSlot,
  type PartnerSlotId,
  type VoiceNoteState,
} from "./deliveryPartner.model";
import riderImg from "../assets/delivery-partner/rider.png";

const INK_PRIMARY = "#1d2539";
const INK_SECONDARY = "#475067";
const INK_TERTIARY = "#666d85";
const INK_ACTION = "#0f61ff";
/** Top stop of the chips' secondary→muted gradient — also the tail's fill. */
const SURFACE_SECONDARY = "#f9f9fb";
/** Roughly where the chip gradient sits behind a glyph, for knocked-out strokes. */
const CHIP_KNOCKOUT = "#f4f5f8";

const CARD_W = 351;

const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]";
const CHIP_SURFACE = "bg-[linear-gradient(180deg,#f9f9fb_30.823%,#eaecf0_126.25%)]";

/**
 * Same sides as v1: the first line opens downward, the other two upward, so a
 * panel never covers the line being edited.
 */
const PLACEMENT: Record<PartnerSlotId, Placement> = {
  call: "below",
  doorbell: "above",
  handoff: "above",
};

/** Defocus for everything that isn't the line being edited. */
function recede(dimmed: boolean, reduceMotion: boolean) {
  return {
    animate: {
      opacity: dimmed ? 0.32 : 1,
      filter: dimmed && !reduceMotion ? "blur(1.5px)" : "blur(0px)",
    },
    transition: { duration: reduceMotion ? 0 : 0.24, ease: EASE_OUT },
  };
}

/* ================================================================
 *  Dropdown chip — Figma "Frame 2147242459"
 * ================================================================ */

function DropdownChip({
  slot,
  optionId,
  active,
  reduceMotion,
  onToggle,
  chipRef,
}: {
  slot: PartnerSlot;
  optionId: string;
  active: boolean;
  reduceMotion: boolean;
  onToggle: () => void;
  chipRef: (el: HTMLElement | null) => void;
}) {
  const option = slot.options.find((o) => o.id === optionId) ?? slot.options[0];
  const label = chipLabel(option);
  const { trailing } = slot;
  const swap = reduceMotion ? { duration: 0.12 } : { duration: 0.26, ease: EASE_OUT };

  return (
    <motion.button
      ref={chipRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={active}
      aria-label={`${label}${trailing ? ` ${trailing}` : ""}. Change.`}
      onClick={onToggle}
      // The pill resizes to whichever answer is in it; `layout` morphs that
      // width on a spring, and the blurred swap below hides the scale distortion.
      layout={reduceMotion ? false : true}
      whileTap={reduceMotion ? undefined : { scale: 0.955 }}
      transition={{ layout: SPRING, scale: SPRING_SNAPPY }}
      // Radius as a style so Motion corrects it during the layout morph.
      style={{ borderRadius: 9999 }}
      className={`shrink-0 h-8 flex items-center gap-1 pl-2 pr-1.5 cursor-pointer ${CHIP_SURFACE} ${FOCUS_RING}`}
    >
      <span className="relative block size-[18px] shrink-0">
        <AnimatePresence initial={false}>
          <motion.span
            key={optionId}
            className="absolute inset-0"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
            transition={swap}
          >
            <PartnerChipGlyph glyph={option.chipGlyph} ink={INK_PRIMARY} knockout={CHIP_KNOCKOUT} />
          </motion.span>
        </AnimatePresence>
      </span>

      {/* popLayout pulls the outgoing label out of flow, so the pill can start
          resizing to the new one immediately instead of waiting for it to go. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={optionId}
          className="text-[13px] leading-5 tracking-[-0.1px] font-semibold whitespace-nowrap"
          style={{ color: INK_PRIMARY }}
          initial={reduceMotion ? false : { opacity: 0, y: 7, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -7, filter: "blur(4px)" }}
          transition={swap}
        >
          {label}
        </motion.span>
      </AnimatePresence>

      <motion.span
        layout={reduceMotion ? false : "position"}
        className="block shrink-0"
        initial={false}
        animate={{ rotate: active ? 180 : 0 }}
        transition={reduceMotion ? { duration: 0 } : SPRING_SNAPPY}
      >
        <Chevron />
      </motion.span>
    </motion.button>
  );
}

/* ================================================================
 *  Record row — Figma "Delivery Instructions" 1038:47070
 * ================================================================ */

const PULSE_DELAYS = [0, 0.5];

function ProgressRing() {
  const r = 12;
  const circumference = 2 * Math.PI * r;
  return (
    <svg aria-hidden="true" className="absolute pointer-events-none" width={28} height={28} viewBox="0 0 28 28" fill="none">
      <motion.circle
        cx={14}
        cy={14}
        r={r}
        stroke={INK_ACTION}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        transform="rotate(-90 14 14)"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: PARTNER_NOTE_DURATION_MS / 1000, ease: "linear" }}
      />
    </svg>
  );
}

function RecordRow({ dimmed, reduceMotion }: { dimmed: boolean; reduceMotion: boolean }) {
  const [state, setState] = useState<VoiceNoteState>("idle");
  const timer = useRef<number | null>(null);
  const recording = state === "recording";
  const playing = state === "playing";
  const answered = state === "recorded" || playing;

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const toggleRecord = () => {
    setState(recording ? "recorded" : "recording");
    hapticTick();
  };
  const togglePlay = () => {
    hapticTick();
    clearTimer();
    if (playing) {
      setState("recorded");
      return;
    }
    setState("playing");
    timer.current = window.setTimeout(() => setState("recorded"), PARTNER_NOTE_DURATION_MS);
  };
  const remove = () => {
    clearTimer();
    setState("idle");
    hapticTick();
  };

  const { animate, transition } = recede(dimmed, reduceMotion);

  return (
    <motion.div
      initial={false}
      animate={animate}
      transition={transition}
      className={`absolute left-3 top-[130px] flex h-10 w-[327px] items-center gap-2 rounded-12 px-3 ${CHIP_SURFACE}`}
    >
      {/* Figma's vector sits 10px above the row, its shape bottom-aligned inside. */}
      <span aria-hidden="true" className="absolute right-[29px] top-[-8.577px] pointer-events-none">
        <BubbleTail fill={SURFACE_SECONDARY} />
      </span>

      {/* Before there's a note the whole row is the target; once there is one it
          holds two real controls, so the overlay gets out of the way. */}
      {!answered && (
        <button
          type="button"
          aria-label={PARTNER_VOICE_LABEL[state]}
          aria-pressed={recording}
          onClick={toggleRecord}
          className={`absolute inset-0 z-10 rounded-12 cursor-pointer ${FOCUS_RING}`}
        />
      )}

      <span className="relative flex size-5 shrink-0 items-center justify-center">
        {recording &&
          !reduceMotion &&
          PULSE_DELAYS.map((delay) => (
            <motion.span
              key={delay}
              aria-hidden="true"
              className="absolute size-5 rounded-full"
              style={{ border: `1.5px solid ${INK_ACTION}` }}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1.4, delay, repeat: Infinity, ease: EASE_OUT }}
            />
          ))}
        {playing && !reduceMotion && <ProgressRing />}
        {answered ? (
          <motion.button
            type="button"
            aria-label={playing ? "Stop playing your instructions" : "Play your instructions"}
            onClick={togglePlay}
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING_SNAPPY}
            className={`relative z-20 flex size-6 items-center justify-center rounded-full cursor-pointer ${FOCUS_RING}`}
          >
            <PlayCircle size={24} ink={INK_ACTION} />
          </motion.button>
        ) : (
          <MicFilled size={17} ink={recording ? INK_ACTION : INK_PRIMARY} />
        )}
      </span>

      <span className="relative flex min-w-0 flex-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state}
            className="text-[13px] leading-5 tracking-[-0.1px] font-semibold whitespace-nowrap"
            style={{ color: recording ? INK_ACTION : INK_PRIMARY }}
            initial={reduceMotion ? false : { opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: reduceMotion ? 0.1 : 0.24, ease: EASE_OUT }}
          >
            {PARTNER_VOICE_LABEL[state]}
          </motion.span>
        </AnimatePresence>
      </span>

      <AnimatePresence initial={false}>
        {answered && (
          <motion.button
            type="button"
            onClick={remove}
            initial={reduceMotion ? false : { opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 6 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: EASE_OUT }}
            className={`relative z-20 flex h-6 shrink-0 items-center gap-1 rounded-4 px-1.5 cursor-pointer active:bg-black/5 ${FOCUS_RING}`}
          >
            <Cross size={16} ink={INK_PRIMARY} />
            <span className="text-[12px] leading-4 font-semibold whitespace-nowrap" style={{ color: INK_PRIMARY }}>
              Remove
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV6Props = {
  value: PartnerChoices;
  onChange: (next: PartnerChoices, slot: PartnerSlotId, optionId: string) => void;
  /** Fires as a panel opens and closes, so the page can recede behind it. */
  onSheetOpenChange?: (open: boolean) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV6({
  value = DEFAULT_PARTNER_CHOICES,
  onChange,
  onSheetOpenChange,
  className = "",
}: DeliveryInstructionsWidgetV6Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();
  const [save, setSave] = useState(true);
  const { rootRef, triggerRef, open, anchor, toggle, closeAfterPick } = useAnchoredOptions<PartnerSlotId>({
    reduceMotion,
    onOpenChange: onSheetOpenChange,
  });

  const openSlot = PARTNER_SLOTS.find((s) => s.id === open);
  const anyOpen = open !== null;

  return (
    <div ref={rootRef} className={`relative w-[351px] shrink-0 ${className}`}>
      <section
        role="group"
        aria-labelledby={titleId}
        data-variant="6"
        className="
          relative flex h-[263px] w-full flex-col overflow-hidden rounded-16
          bg-[linear-gradient(209.52deg,#fff7c2_0%,#ffffff_42%)]
        "
        // Figma exports this wash as stops at 31% → 37%, but those are measured
        // along its own gradient handles, not CSS's corner-to-corner line —
        // taken literally they draw a hard band. These stops match the render.
      >
        <motion.div
          initial={false}
          {...recede(anyOpen, reduceMotion)}
          className="flex h-11 shrink-0 items-center px-3.5"
        >
          <h2 id={titleId} className="text-[16px] leading-5 tracking-[-0.15px] font-bold" style={{ color: INK_PRIMARY }}>
            Instruct your delivery partner
          </h2>
        </motion.div>

        <div className="relative h-[177px] shrink-0">
          {/* Figma's box is 171×154 at (215, -24) with the art placed 128 wide at
              x+21.5 inside it — so the rider starts at x 236.5, rises into the
              header, and runs past the card's right edge, which clips it. */}
          <img
            src={riderImg}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute left-[236.5px] top-[-24px] h-auto w-[128px] max-w-none pointer-events-none select-none"
          />

          <div className="absolute left-0 top-1 flex w-[272px] flex-col gap-2 px-3 pb-3">
            {PARTNER_SLOTS.map((slot) => {
              const active = open === slot.id;
              const { trailing } = slot;
              return (
                <motion.div
                  key={slot.id}
                  initial={false}
                  {...recede(anyOpen && !active, reduceMotion)}
                  className="flex h-8 items-center gap-1.5"
                >
                  <DropdownChip
                    slot={slot}
                    optionId={partnerOptionFor(slot, value).id}
                    active={active}
                    reduceMotion={reduceMotion}
                    onToggle={() => toggle(slot.id)}
                    chipRef={triggerRef(slot.id)}
                  />
                  {trailing && (
                    <motion.span
                      aria-hidden="true"
                      layout={reduceMotion ? false : "position"}
                      transition={{ layout: SPRING }}
                      className="text-[14px] leading-5 tracking-[-0.1px] font-medium whitespace-nowrap"
                      style={{ color: INK_TERTIARY }}
                    >
                      {trailing}
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>

          <RecordRow dimmed={anyOpen} reduceMotion={reduceMotion} />
        </div>

        <motion.button
          type="button"
          role="checkbox"
          aria-checked={save}
          onClick={() => {
            setSave((s) => !s);
            hapticTick();
          }}
          initial={false}
          {...recede(anyOpen, reduceMotion)}
          className={`flex h-[42px] shrink-0 items-start gap-1.5 px-3.5 pt-2.5 text-left cursor-pointer ${FOCUS_RING}`}
        >
          <InstructionCheckbox checked={save} knockout="#ffffff" reduceMotion={reduceMotion} />
          <span className="w-[286px] text-[13px] leading-5 tracking-[-0.1px]" style={{ color: INK_SECONDARY }}>
            Save this for future orders on this address
          </span>
        </motion.button>

        {/* The white frame, painted over everything — including the rider, who
            runs under the card's right edge. */}
        <span aria-hidden="true" className="absolute inset-0 rounded-16 pointer-events-none shadow-[inset_0_0_0_3px_#ffffff]" />
      </section>

      <AnimatePresence>
        {openSlot && anchor && (
          <OptionsPopover
            key={openSlot.id}
            slot={openSlot}
            anchor={anchor}
            placement={PLACEMENT[openSlot.id]}
            containerWidth={CARD_W}
            selectedId={value[openSlot.id]}
            reduceMotion={reduceMotion}
            onSelect={(optionId) => {
              onChange({ ...value, [openSlot.id]: optionId }, openSlot.id, optionId);
              closeAfterPick();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
