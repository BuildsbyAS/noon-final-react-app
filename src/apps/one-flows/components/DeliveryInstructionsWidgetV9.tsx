/**
 * "Give delivery instructions" — v9 (Figma 1105:52429, 351×252)
 *
 * An iteration of v7 where every touchpoint is a two-way TOGGLE instead of a
 * chip that opens an action sheet. Owned by v9 — model, icons, assets and the
 * record row are copies; nothing is imported from v7.
 *
 * The toggle: a tertiary track with a white pill. The chosen side shows its
 * icon and label on the pill; the other side is just its icon. Icons never
 * move — picking a side unfolds its label from zero width so the text grows the
 * toggle, while the white pill fades in behind it and the other side folds its
 * label away.
 *
 * The partner reuses v7's pose art: picking a call or doorbell answer pops them
 * into that answer's pose (squash-and-stretch from the base), holds it, then
 * pops back to v9's own full-body art. As in v7, a
 * long answer never runs its clause into the art — the partner slides right by
 * exactly the overlap.
 *
 * Reduced motion: the thumb jumps, labels and poses swap with a short fade.
 *
 * No <PageTransition> / <SkeletonGate> — this is a widget; OrderConfirmationPage
 * owns both for the screen.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { hapticTick } from "@ui";
import { InstructionCheckbox } from "./MCheckbox";
import { BubbleTail, Cross, MicFilled, PartnerChipGlyph, PlayCircle } from "./deliveryPartnerV9Icons";
import {
  DEFAULT_V9_CHOICES,
  PARTNER_NOTE_DURATION_MS,
  PARTNER_VOICE_LABEL,
  V9_SLOTS,
  type PartnerSlotId,
  type ToggleSlot,
  type V9Choices,
  type VoiceNoteState,
} from "./deliveryPartnerV9.model";
import riderV9Img from "../assets/delivery-partner-v9/rider-v9.png";
import patchVector from "../assets/delivery-partner-v9/vector-7785.svg";
import riderCallImg from "../assets/delivery-partner-v9/rider-call.png";
import riderNoCallImg from "../assets/delivery-partner-v9/rider-no-call.png";
import riderRingBellImg from "../assets/delivery-partner-v9/rider-ring-bell.png";
import riderNoRingImg from "../assets/delivery-partner-v9/rider-no-ring.png";
import riderGiveItemsImg from "../assets/delivery-partner-v9/rider-give-items.png";
import riderLeaveAtDoorImg from "../assets/delivery-partner-v9/rider-leave-at-door.png";

const INK_PRIMARY = "#1d2539";
const INK_SECONDARY = "#475067";
const INK_TERTIARY = "#666d85";
/** Figma's unselected toggle glyph ink. */
const INK_MUTED = "#989fb3";
const INK_ACTION = "#0f61ff";
/** Top stop of the record row's gradient — also the tail's fill. */
const SURFACE_SECONDARY = "#f9f9fb";
const SURFACE_TRACK = "#f2f3f7";

const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]";
const CHIP_SURFACE = "bg-[linear-gradient(180deg,#f9f9fb_30.823%,#eaecf0_126.25%)]";

/** Apple-style spring notation — settle time and overshoot. */
const SPRING = { type: "spring", duration: 0.46, bounce: 0.2 } as const;
const SPRING_SNAPPY = { type: "spring", duration: 0.34, bounce: 0.16 } as const;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* ================================================================
 *  Partner — v9's art, with v7's poses popping in on a pick
 * ================================================================ */

type Pose = "default" | "call" | "noCall" | "ringBell" | "noRing" | "giveItems" | "leaveAtDoor";

const POSE_SRC: Record<Exclude<Pose, "default">, string> = {
  call: riderCallImg,
  noCall: riderNoCallImg,
  ringBell: riderRingBellImg,
  noRing: riderNoRingImg,
  giveItems: riderGiveItemsImg,
  leaveAtDoor: riderLeaveAtDoorImg,
};

function poseFor(slot: PartnerSlotId, optionId: string): Pose {
  if (slot === "call") return optionId === "call" ? "call" : "noCall";
  if (slot === "doorbell") return optionId === "ring" ? "ringBell" : "noRing";
  return optionId === "hand" ? "giveItems" : "leaveAtDoor";
}

/** How long a reaction pose stays before the partner pops back. */
const POSE_HOLD_MS = 1500;

/** Figma's image frame: 108×192 at (260, -26) in the body, rounded bottom-right. */
const ART_LEFT = 260;
/** Clear air kept between the longest line of text and the partner art. */
const ART_GAP = 6;

const popIn = (reduceMotion: boolean) => ({
  initial: reduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: 1.14, scaleY: 0.84 },
  animate: reduceMotion
    ? { opacity: 1, transition: { duration: 0.12 } }
    : {
        opacity: 1,
        scaleX: [1.14, 0.93, 1.03, 1],
        scaleY: [0.84, 1.09, 0.98, 1],
        transition: {
          opacity: { duration: 0.08 },
          scaleX: { duration: 0.46, times: [0, 0.38, 0.7, 1], ease: "easeOut" as const },
          scaleY: { duration: 0.46, times: [0, 0.38, 0.7, 1], ease: "easeOut" as const },
        },
      },
  // The old pose ducks out fast so the pop reads as one partner changing.
  exit: reduceMotion
    ? { opacity: 0, transition: { duration: 0.12 } }
    : { opacity: 0, scaleX: 1.06, scaleY: 0.9, transition: { duration: 0.1, ease: "easeIn" as const } },
});

function Partner({ pose, nudge, reduceMotion }: { pose: Pose; nudge: number; reduceMotion: boolean }) {
  // Warm the reaction poses so the first pop doesn't wait on a 1MB download.
  useEffect(() => {
    for (const src of Object.values(POSE_SRC)) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  const pop = popIn(reduceMotion);

  return (
    <motion.div
      aria-hidden="true"
      className="absolute top-[-26px] h-[192px] w-[108px] pointer-events-none select-none"
      style={{ left: ART_LEFT }}
      initial={false}
      animate={{ x: nudge }}
      transition={reduceMotion ? { duration: 0 } : SPRING}
    >
      {/* Its own AnimatePresence, so the pop plays even though the page sits in
          the app's page-transition AnimatePresence (initial={false}). */}
      <AnimatePresence initial={false}>
        {pose === "default" ? (
          <motion.div
            key="default"
            className="absolute inset-0 will-change-transform"
            style={{ transformOrigin: "50% 70%" }}
            {...pop}
          >
            {/* Figma crops the full-body art into this frame from the top; its
                bottom-right corner is rounded away, as drawn. */}
            <div className="absolute inset-0 overflow-hidden rounded-br-[110px]">
              <img
                src={riderV9Img}
                alt=""
                draggable={false}
                className="absolute left-[-0.09%] top-0 h-[137.28%] w-[100.18%] max-w-none"
              />
            </div>
            {/* Two touch-ups Figma lays over the art, reproduced as drawn. */}
            <span className="absolute left-[56px] top-[65px] h-3 w-[11px] bg-[#fed73e]" />
            <img src={patchVector} alt="" draggable={false} className="absolute left-[95.5px] top-[66.5px] h-[23px] w-[8.5px]" />
          </motion.div>
        ) : (
          // v7's pose art is framed waist-up, so it's drawn at v7's scale and
          // top-aligned here: it lands just above the record row, as in v7.
          <motion.img
            key={pose}
            src={POSE_SRC[pose]}
            alt=""
            draggable={false}
            className="absolute left-[-6px] top-[2px] h-auto w-[124px] max-w-none will-change-transform"
            style={{ transformOrigin: "50% 100%" }}
            {...pop}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================================================
 *  Toggle — Figma 1105:52452 (annotated "build toggle instead of dropdown")
 * ================================================================ */

function Toggle({
  slot,
  choice,
  onPick,
  reduceMotion,
}: {
  slot: ToggleSlot;
  choice: string;
  onPick: (optionId: string) => void;
  reduceMotion: boolean;
}) {
  // Icons never travel. Each segment's icon sits at a fixed inset; picking a
  // side unfolds its label from zero width, so the TEXT grows the toggle while
  // the white pill fades in behind it, and the other side folds its label away.
  const unfold = reduceMotion ? { duration: 0 } : { duration: 0.32, ease: EASE_OUT };
  return (
    <div
      role="radiogroup"
      aria-label={slot.groupLabel}
      data-toggle
      className="flex h-[34px] shrink-0 items-center gap-1 rounded-full p-0.5"
      style={{ backgroundColor: SURFACE_TRACK }}
    >
      {slot.options.map((option) => {
        const on = option.id === choice;
        return (
          <motion.button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={option.label}
            onClick={() => onPick(option.id)}
            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            className={`relative flex h-[30px] shrink-0 items-center rounded-full pl-1.5 pr-2.5 cursor-pointer ${FOCUS_RING}`}
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-white bg-white drop-shadow-[0_1px_3px_rgba(34,34,34,0.06)]"
              initial={false}
              animate={{ opacity: on ? 1 : 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }}
            />
            <span className="relative z-10 block">
              <PartnerChipGlyph
                glyph={option.glyph}
                size={18}
                ink={on ? INK_PRIMARY : INK_MUTED}
                knockout={on ? "#ffffff" : SURFACE_TRACK}
              />
            </span>
            {/* Figma: 2px icon→label gap, and the chosen side's right padding is
                8 against the icon-only side's 10 — so the unfolded label adds
                exactly its own width (2 + label − 2). */}
            <motion.span
              aria-hidden="true"
              className="relative z-10 block overflow-hidden"
              initial={false}
              animate={{ width: on ? "auto" : 0, marginRight: on ? -2 : 0 }}
              transition={unfold}
            >
              <motion.span
                className="block whitespace-nowrap pl-0.5 text-[13px] leading-5 tracking-[-0.1px] font-semibold"
                style={{ color: INK_PRIMARY }}
                initial={false}
                animate={{ opacity: on ? 1 : 0, filter: on || reduceMotion ? "blur(0px)" : "blur(3px)" }}
                transition={reduceMotion ? { duration: 0 } : { duration: on ? 0.24 : 0.14, delay: on ? 0.06 : 0, ease: EASE_OUT }}
              >
                {option.label}
              </motion.span>
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ================================================================
 *  Record row — Figma "Delivery Instructions" 1105:52473 (v7's, copied)
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

function RecordRow({ reduceMotion }: { reduceMotion: boolean }) {
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

  return (
    <div
      className={`absolute left-3 top-[126px] flex h-10 w-[327px] items-center gap-2 rounded-12 px-3 ${CHIP_SURFACE}`}
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
    </div>
  );
}



/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV9Props = {
  value: V9Choices;
  onChange: (next: V9Choices, slot: PartnerSlotId, optionId: string) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV9({
  value = DEFAULT_V9_CHOICES,
  onChange,
  className = "",
}: DeliveryInstructionsWidgetV9Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();
  const [save, setSave] = useState(true);

  const [pose, setPose] = useState<Pose>("default");
  const poseTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (poseTimer.current !== null) window.clearTimeout(poseTimer.current);
    },
    [],
  );

  const pick = (slot: PartnerSlotId, optionId: string) => {
    onChange({ ...value, [slot]: optionId }, slot, optionId);
    hapticTick();
    // Re-tapping the chosen side replays the pose too — the control never feels dead.
    if (poseTimer.current !== null) window.clearTimeout(poseTimer.current);
    const next = poseFor(slot, optionId);
    setPose(next);
    if (next === "default") return;
    poseTimer.current = window.setTimeout(() => {
      poseTimer.current = null;
      setPose("default");
    }, POSE_HOLD_MS);
  };

  // A long answer can push its clause into the partner art; slide the partner
  // right by exactly the overlap. Measured from layout offsets, walking up to
  // the rows container.
  const rowsRef = useRef<HTMLDivElement>(null);
  const [nudge, setNudge] = useState(0);
  useLayoutEffect(() => {
    const rows = rowsRef.current;
    if (!rows) return;
    const rightEdge = (el: HTMLElement) => {
      let x = el.offsetLeft + el.offsetWidth;
      let parent = el.offsetParent as HTMLElement | null;
      while (parent && parent !== rows) {
        x += parent.offsetLeft;
        parent = parent.offsetParent as HTMLElement | null;
      }
      return x + rows.offsetLeft;
    };
    const measure = () => {
      const clauses = rows.querySelectorAll<HTMLElement>("[data-trailing]");
      const right = Math.max(0, ...[...clauses].map(rightEdge));
      setNudge(Math.max(0, right + ART_GAP - ART_LEFT));
    };
    measure();
    void document.fonts?.ready.then(measure);
    // Toggles unfold their labels over ~300ms, so the clause keeps moving after
    // this effect runs; follow it as each toggle resizes.
    const observer = new ResizeObserver(measure);
    rows.querySelectorAll("[data-toggle]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className={`relative w-[351px] shrink-0 ${className}`}>
      <section
        role="group"
        aria-labelledby={titleId}
        data-variant="9"
        className="
          relative flex h-[252px] w-full flex-col overflow-hidden rounded-16
          bg-[linear-gradient(208.48deg,#ebf4ff_0%,#ffffff_42%)]
        "
        // Figma exports this wash at 31% → 37% along its own gradient handles,
        // which draws a hard band in CSS; these stops match v6/v7's soft render.
      >
        <div className="flex h-11 shrink-0 items-center px-3.5">
          <h2 id={titleId} className="text-[16px] leading-5 tracking-[-0.15px] font-bold" style={{ color: INK_PRIMARY }}>
            Give delivery instructions
          </h2>
        </div>

        <div className="relative h-[166px] shrink-0">
          <Partner pose={pose} nudge={nudge} reduceMotion={reduceMotion} />

          <div ref={rowsRef} className="absolute left-0 top-0.5 flex w-[272px] flex-col gap-[7px] px-3 pb-3">
            {V9_SLOTS.map((slot) => (
              <div key={slot.id} className="flex h-[34px] items-center gap-1.5">
                <Toggle
                  slot={slot}
                  choice={value[slot.id]}
                  onPick={(optionId) => pick(slot.id, optionId)}
                  reduceMotion={reduceMotion}
                />
                {slot.trailing && (
                  <span
                    aria-hidden="true"
                    data-trailing
                    className="whitespace-nowrap text-[14px] leading-5 tracking-[-0.1px] font-medium"
                    style={{ color: INK_TERTIARY }}
                  >
                    {slot.trailing}
                  </span>
                )}
              </div>
            ))}
          </div>

          <RecordRow reduceMotion={reduceMotion} />
        </div>

        <button
          type="button"
          role="checkbox"
          aria-checked={save}
          onClick={() => {
            setSave((s) => !s);
            hapticTick();
          }}
          className={`flex h-[42px] shrink-0 items-start gap-1.5 px-3.5 pt-2.5 text-left cursor-pointer ${FOCUS_RING}`}
        >
          <InstructionCheckbox checked={save} knockout="#ffffff" reduceMotion={reduceMotion} />
          <span className="w-[286px] text-[13px] leading-5 tracking-[-0.1px]" style={{ color: INK_SECONDARY }}>
            Save this for future orders on this address
          </span>
        </button>

        {/* The white frame, painted over everything — including the partner. */}
        <span aria-hidden="true" className="absolute inset-0 rounded-16 pointer-events-none shadow-[inset_0_0_0_3px_#ffffff]" />
      </section>
    </div>
  );
}
