/**
 * "Instruct your rider" — v12 (Figma 1196:60380, 351×229)
 *
 * v10 with a new UI. The three icon-only switches — calling, doorbell,
 * handoff — now share ONE grey card, split by vertical dashed dividers, each
 * with its answer written under it; the record row is gone; the header gains a
 * subtitle. The picked side's icon is filled, the other side's an outline.
 * Copied, never imported: v12 owns every piece (v10 stays untouched).
 *
 * v10's motion:
 *  1. The white thumb flies to the picked side on a spring and STRETCHES with
 *     its own velocity (useVelocity → useTransform → a smoothing spring).
 *  2. The icon plays its signature and fills as the thumb lands.
 *  3. Sound answers (call me, ring my doorbell) send a sonar ripple out of the
 *     thumb, clipped to the track.
 *  4. The caption re-reads itself (TextMorph).
 *  5. The partner pops into the pose for the answer just picked, holds it,
 *     then pops back — with 20% less squash-and-stretch than v10's.
 * Re-tapping the chosen side replays the motion without changing anything.
 *
 * The partner stands BEHIND the grey card, which hides their lower half.
 *
 * Reduced motion: no travel, stretch, sonar, signatures or pops; states swap.
 *
 * No <PageTransition> / <SkeletonGate> — this is a widget; OrderConfirmationPage
 * owns both for the screen.
 */
import { useEffect, useId, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { hapticTick } from "@ui";
import { InstructionCheckbox } from "./MCheckbox";
import TextMorph from "./deliveryInstructionsV12TextMorph";
import { INK_ACTION, INK_PRIMARY, OptionGlyph } from "./deliveryInstructionsV12Glyphs";
import {
  V12_CAPTION_H,
  V12_CARDS,
  V12_COLUMN_W,
  V12_SEGMENT_H,
  V12_SEGMENT_W,
  V12_TRACK_GAP,
  V12_TRACK_H,
  V12_TRACK_PAD,
  type V12Card,
  type V12CardId,
  type V12Value,
} from "./deliveryInstructionsV12.model";
import riderImg from "../assets/delivery-instructions-v12/rider.png";
import riderCallImg from "../assets/delivery-instructions-v12/rider-call.png";
import riderNoCallImg from "../assets/delivery-instructions-v12/rider-no-call.png";
import riderRingBellImg from "../assets/delivery-instructions-v12/rider-ring-bell.png";
import riderNoRingImg from "../assets/delivery-instructions-v12/rider-no-ring.png";
import riderGiveItemsImg from "../assets/delivery-instructions-v12/rider-give-items.png";
import riderLeaveAtDoorImg from "../assets/delivery-instructions-v12/rider-leave-at-door.png";

const INK_TERTIARY = "#666d85";
const SURFACE_TRACK = "#f2f3f7";
const SURFACE_CARD = "#f9f9fb";
const BORDER_DASH = "#eaecf0";

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** Thumb travel, as v10: quick, with enough settle to feel like mass. */
const THUMB_SPRING = { stiffness: 420, damping: 30, mass: 0.9 };
/** Smooths the velocity-derived stretch so it can't jitter frame to frame. */
const SQUASH_SPRING = { stiffness: 480, damping: 26, mass: 0.6 };
const FULL_STRETCH_V = 360;

const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]";

/* ================================================================
 *  Sonar — sound leaving the thumb, clipped to the track (v10)
 * ================================================================ */

const SONAR_DELAYS = [0, 0.09];
const SONAR_D = 26;

function Sonar({ centreX }: { centreX: number }) {
  const box = { width: SONAR_D, height: SONAR_D, left: centreX - SONAR_D / 2, top: (V12_TRACK_H - SONAR_D) / 2 };
  return (
    <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
      <motion.span
        className="absolute rounded-full will-change-transform"
        style={{ ...box, backgroundColor: INK_ACTION }}
        initial={{ scale: 0.4, opacity: 0.16 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      />
      {SONAR_DELAYS.map((delay) => (
        <motion.span
          key={delay}
          className="absolute rounded-full will-change-transform"
          style={{ ...box, border: `2px solid ${INK_ACTION}` }}
          initial={{ scale: 0.34, opacity: 0.62 }}
          animate={{ scale: 2.7, opacity: 0 }}
          transition={{ duration: 0.62, delay, ease: EASE_OUT_EXPO }}
        />
      ))}
    </span>
  );
}

/* ================================================================
 *  Switch column — Figma 1196:60409 (switch over its caption)
 * ================================================================ */

function SwitchColumn({
  card,
  choice,
  onPick,
  reduceMotion,
}: {
  card: V12Card;
  choice: string;
  onPick: (optionId: string) => void;
  reduceMotion: boolean;
}) {
  const index = Math.max(
    0,
    card.options.findIndex((o) => o.id === choice),
  );
  /** Bumped by every tap — including one that doesn't change the answer. */
  const [playKey, setPlayKey] = useState(0);
  const [sonarKey, setSonarKey] = useState(0);
  const [sonarIndex, setSonarIndex] = useState(index);

  const left = V12_TRACK_PAD + index * (V12_SEGMENT_W + V12_TRACK_GAP);

  // The thumb is a physical object: x is where it's told to be, `thumbX` is
  // where it actually is, and the stretch is read off how fast it's moving.
  const x = useMotionValue(left);
  const thumbX = useSpring(x, THUMB_SPRING);
  const velocity = useVelocity(thumbX);
  const stretchX = useSpring(
    useTransform(velocity, [-FULL_STRETCH_V, 0, FULL_STRETCH_V], [1.16, 1, 1.16]),
    SQUASH_SPRING,
  );
  const stretchY = useSpring(
    useTransform(velocity, [-FULL_STRETCH_V, 0, FULL_STRETCH_V], [0.9, 1, 0.9]),
    SQUASH_SPRING,
  );

  useEffect(() => {
    x.set(left);
  }, [left, x]);

  const tap = (optionIndex: number) => {
    const option = card.options[optionIndex];
    setPlayKey((k) => k + 1);
    if (option.sound && !reduceMotion) {
      setSonarIndex(optionIndex);
      setSonarKey((k) => k + 1);
    }
    onPick(option.id);
  };

  return (
    <div className="relative flex shrink-0 flex-col items-center gap-3.5" style={{ width: V12_COLUMN_W }}>
      <div
        role="radiogroup"
        aria-label={card.groupLabel}
        className="relative w-full shrink-0 rounded-full"
        style={{ height: V12_TRACK_H, backgroundColor: SURFACE_TRACK }}
      >
        {/* Its own AnimatePresence: the page sits in the app's page-transition
            AnimatePresence (initial={false}), which would otherwise make a
            late-mounting ripple skip straight to its end state. */}
        <AnimatePresence>
          {sonarKey > 0 && (
            <Sonar
              key={sonarKey}
              centreX={V12_TRACK_PAD + sonarIndex * (V12_SEGMENT_W + V12_TRACK_GAP) + V12_SEGMENT_W / 2}
            />
          )}
        </AnimatePresence>

        <motion.span
          aria-hidden="true"
          className="absolute rounded-full border border-white bg-white drop-shadow-[0_1px_3px_rgba(34,34,34,0.06)] pointer-events-none will-change-transform"
          style={{
            left: 0,
            top: (V12_TRACK_H - V12_SEGMENT_H) / 2,
            width: V12_SEGMENT_W,
            height: V12_SEGMENT_H,
            x: reduceMotion ? x : thumbX,
            scaleX: reduceMotion ? 1 : stretchX,
            scaleY: reduceMotion ? 1 : stretchY,
          }}
        />

        <div className="relative flex h-full items-center" style={{ gap: V12_TRACK_GAP, padding: V12_TRACK_PAD }}>
          {card.options.map((option, i) => {
            const on = i === index;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={option.caption.replace("\n", " ")}
                onClick={() => tap(i)}
                className={`flex items-center justify-center rounded-full cursor-pointer ${FOCUS_RING}`}
                style={{ width: V12_SEGMENT_W, height: V12_SEGMENT_H }}
              >
                <OptionGlyph
                  glyph={option.glyph}
                  size={20}
                  selected={on}
                  playKey={on ? playKey : 0}
                  reduceMotion={reduceMotion}
                />
              </button>
            );
          })}
        </div>

        {/* Figma's inner shadow on the track, above the thumb as it is there. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0px_1px_4px_0px_rgba(36,36,36,0.04)]"
        />
      </div>

      <div className="w-full shrink-0 pl-0.5" style={{ height: V12_CAPTION_H }}>
        <TextMorph
          text={card.options[index].caption}
          reduceMotion={reduceMotion}
          className="w-full text-left text-[13px] leading-5 tracking-[-0.1px] font-semibold text-[#1d2539]"
        />
      </div>
    </div>
  );
}

/** Figma's M-Divider "Dashed", stood on end: 1px, 4/4 dashes with square caps. */
function DashedDivider() {
  return (
    <span
      aria-hidden="true"
      className="w-px shrink-0 self-stretch"
      style={{ backgroundImage: `repeating-linear-gradient(to bottom, ${BORDER_DASH} 0 5px, transparent 5px 8px)` }}
    />
  );
}

/* ================================================================
 *  Partner — v10's art and poses, standing behind the grey card
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

const OPTION_POSE: Record<string, Exclude<Pose, "default">> = {
  hand: "giveItems",
  door: "leaveAtDoor",
  call: "call",
  noCall: "noCall",
  ring: "ringBell",
  silent: "noRing",
};

/** How long a reaction pose stays before the partner pops back. */
const POSE_HOLD_MS = 1500;

/**
 * v10's squash-and-stretch pop, with every deviation from rest cut by 20%
 * (Anurag: the bounce and vertical movement read too big on each switch).
 * Scaling from the feet, scaleY is what reads as vertical travel.
 */
const POP_DAMP = 0.8;
const damp = (v: number) => 1 + (v - 1) * POP_DAMP;
const POP_X = [1.14, 0.93, 1.03, 1].map(damp);
const POP_Y = [0.84, 1.09, 0.98, 1].map(damp);

function popIn(reduceMotion: boolean) {
  return {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: POP_X[0], scaleY: POP_Y[0] },
    animate: reduceMotion
      ? { opacity: 1, transition: { duration: 0.12 } }
      : {
          opacity: 1,
          scaleX: POP_X,
          scaleY: POP_Y,
          transition: {
            opacity: { duration: 0.08 },
            scaleX: { duration: 0.46, times: [0, 0.38, 0.7, 1], ease: "easeOut" as const },
            scaleY: { duration: 0.46, times: [0, 0.38, 0.7, 1], ease: "easeOut" as const },
          },
        },
    exit: reduceMotion
      ? { opacity: 0, transition: { duration: 0.12 } }
      : { opacity: 0, scaleX: damp(1.06), scaleY: damp(0.9), transition: { duration: 0.1, ease: "easeIn" as const } },
  };
}

function Partner({ pose, reduceMotion }: { pose: Pose; reduceMotion: boolean }) {
  // Warm the reaction poses so the first pop doesn't wait on a 1MB download.
  useEffect(() => {
    for (const src of Object.values(POSE_SRC)) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  const pop = popIn(reduceMotion);

  return (
    // Figma: 68×100 at (259, −7) — 7px above the card's top edge; everything
    // below the grey card's top edge is hidden behind it.
    <div aria-hidden="true" className="absolute left-[259px] top-[-7px] h-[100px] w-[68px] pointer-events-none select-none">
      <AnimatePresence initial={false}>
        {pose === "default" ? (
          <motion.div
            key="default"
            className="absolute inset-0 overflow-hidden rounded-br-[1.136px] will-change-transform"
            style={{ transformOrigin: "50% 80%" }}
            {...pop}
          >
            <img
              src={riderImg}
              alt=""
              draggable={false}
              className="absolute left-[-0.09%] top-0 h-[165.07%] w-[100.18%] max-w-none"
            />
          </motion.div>
        ) : (
          // v10's pose framing, scaled to this smaller partner (68 / 73.7).
          <motion.img
            key={pose}
            src={POSE_SRC[pose]}
            alt=""
            draggable={false}
            className="absolute left-[-5.5px] top-[-3.7px] h-auto w-[79.4px] max-w-none will-change-transform"
            style={{ transformOrigin: "50% 100%" }}
            {...pop}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV12Props = {
  value: V12Value;
  onChange: (next: V12Value) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV12({ value, onChange, className = "" }: DeliveryInstructionsWidgetV12Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();

  const [pose, setPose] = useState<Pose>("default");
  const poseTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (poseTimer.current !== null) window.clearTimeout(poseTimer.current);
    },
    [],
  );

  const pick = (cardId: V12CardId, optionId: string) => {
    onChange({ ...value, choice: { ...value.choice, [cardId]: optionId } });
    hapticTick();
    if (poseTimer.current !== null) window.clearTimeout(poseTimer.current);
    setPose(OPTION_POSE[optionId] ?? "default");
    poseTimer.current = window.setTimeout(() => {
      poseTimer.current = null;
      setPose("default");
    }, POSE_HOLD_MS);
  };

  return (
    <section
      role="group"
      aria-labelledby={titleId}
      data-variant="12"
      // Not overflow-hidden: the partner rises above the top edge.
      className={`relative flex w-[351px] shrink-0 flex-col rounded-16 bg-white ${className}`}
    >
      <Partner pose={pose} reduceMotion={reduceMotion} />

      <div className="relative flex shrink-0 flex-col justify-center gap-0.5 px-3.5 py-3 whitespace-nowrap">
        <h2 id={titleId} className="text-[16px] leading-5 tracking-[-0.15px] font-bold" style={{ color: INK_PRIMARY }}>
          Instruct your rider
        </h2>
        <p className="text-[12px] leading-[18px] tracking-[-0.1px]" style={{ color: INK_TERTIARY }}>
          Help us deliver as per your convenience
        </p>
      </div>

      <div className="relative flex shrink-0 px-2.5 pb-3">
        {/* Painted after the partner, so it hides their lower half. */}
        <div
          className="flex min-w-px flex-1 items-center justify-center gap-3.5 overflow-clip rounded-t-[24px] rounded-b-[20px] px-2 pt-2 pb-2.5"
          style={{ backgroundColor: SURFACE_CARD }}
        >
          {V12_CARDS.map((card, i) => (
            <div key={card.id} className="contents">
              {i > 0 && <DashedDivider />}
              <SwitchColumn
                card={card}
                choice={value.choice[card.id]}
                onPick={(optionId) => pick(card.id, optionId)}
                reduceMotion={reduceMotion}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        role="checkbox"
        aria-checked={value.save}
        onClick={() => {
          onChange({ ...value, save: !value.save });
          hapticTick();
        }}
        className={`relative flex shrink-0 items-center gap-2 px-3.5 pt-0.5 pb-3 text-left cursor-pointer ${FOCUS_RING}`}
      >
        <InstructionCheckbox checked={value.save} knockout="#ffffff" reduceMotion={reduceMotion} />
        <span className="w-[286px] text-[13px] leading-5 tracking-[-0.1px] font-medium" style={{ color: INK_TERTIARY }}>
          Save this for future orders on this address
        </span>
      </button>
    </section>
  );
}
