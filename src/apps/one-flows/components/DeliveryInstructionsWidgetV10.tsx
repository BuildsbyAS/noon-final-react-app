/**
 * "Give delivery instructions" — v10 (Figma 1121:52583, 351×289)
 *
 * A mix of v2 and v9. Three cards — handoff, call, doorbell — each an
 * icon-only two-way switch with its answer written underneath, v9's partner
 * peeking over the card's top-right edge, then the record and save rows.
 * Copied, never imported: v10 owns every piece (v2 and v9 stay untouched).
 *
 * From v2, on a tap:
 *  1. The white thumb flies to the picked side on a spring and STRETCHES with
 *     its own velocity (useVelocity → useTransform → a smoothing spring).
 *  2. The icon plays its signature: phone shakes, bell swings, door swings open
 *     in 3D, the palm lifts.
 *  3. Sound answers (call me, ring my doorbell) send a sonar ripple out of the
 *     thumb, clipped to the track.
 *  4. The caption re-reads itself — surviving words slide, new ones assemble
 *     letter by letter (TextMorph).
 * Re-tapping the chosen side replays 2–4's motion without changing anything.
 *
 * From v9: the partner pops into the pose for the answer just picked
 * (squash-and-stretch from the base), holds it, then pops back.
 *
 * The partner stands BEHIND the doorbell card — that card alone is opaque white
 * in Figma, which is what hides the partner's lower half. The white frame ring
 * is painted under the partner so its top edge doesn't slice through them.
 *
 * Reduced motion: no travel, stretch, sonar, signatures or pops; states swap.
 *
 * No <PageTransition> / <SkeletonGate> — this is a widget; OrderConfirmationPage
 * owns both for the screen.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
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
import TextMorph from "./deliveryInstructionsV10TextMorph";
import {
  CrossGlyph,
  DISC_IN_BOX,
  INK_ACTION,
  INK_PRIMARY,
  MicGlyph,
  OptionGlyph,
  PauseGlyph,
  PlayGlyph,
  PlaybackRing,
  WaveformGlyph,
} from "./deliveryInstructionsV10Glyphs";
import {
  V10_CAPTION_H,
  V10_CARD_H,
  V10_CARD_W,
  V10_CARDS,
  V10_NOTE_ARIA,
  V10_NOTE_CAPTION,
  V10_NOTE_DURATION_MS,
  V10_TRACK_GAP,
  V10_TRACK_H,
  V10_TRACK_PAD,
  type V10Card,
  type V10CardId,
  type V10NoteState,
  type V10Value,
} from "./deliveryInstructionsV10.model";
import riderImg from "../assets/delivery-instructions-v10/rider.png";
import riderCallImg from "../assets/delivery-instructions-v10/rider-call.png";
import riderNoCallImg from "../assets/delivery-instructions-v10/rider-no-call.png";
import riderRingBellImg from "../assets/delivery-instructions-v10/rider-ring-bell.png";
import riderNoRingImg from "../assets/delivery-instructions-v10/rider-no-ring.png";
import riderGiveItemsImg from "../assets/delivery-instructions-v10/rider-give-items.png";
import riderLeaveAtDoorImg from "../assets/delivery-instructions-v10/rider-leave-at-door.png";

const INK_SECONDARY = "#475067";
const INK_TERTIARY = "#666d85";
const SURFACE_TRACK = "#f2f3f7";
const ROW_SURFACE = "bg-[linear-gradient(180deg,#f9f9fb_30.823%,#eaecf0_126.25%)]";

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** Thumb travel, as v2: quick, with enough settle to feel like mass. */
const THUMB_SPRING = { stiffness: 420, damping: 30, mass: 0.9 };
/** Smooths the velocity-derived stretch so it can't jitter frame to frame. */
const SQUASH_SPRING = { stiffness: 480, damping: 26, mass: 0.6 };
/** v10's hop is ~40px (v2's shortest was wider), so full stretch comes sooner. */
const FULL_STRETCH_V = 360;

const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]";

/* ================================================================
 *  Sonar — sound leaving the thumb, clipped to the track (v2)
 * ================================================================ */

/** Two rings, the second a beat behind, so it reads as a pulse not a blip. */
const SONAR_DELAYS = [0, 0.09];
const SONAR_D = 26;

function Sonar({ centreX }: { centreX: number }) {
  const box = { width: SONAR_D, height: SONAR_D, left: centreX - SONAR_D / 2, top: (V10_TRACK_H - SONAR_D) / 2 };
  return (
    // Its own clip layer, so the thumb's shadow isn't clipped with the rings.
    <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
      {/* Pressure: a filled wave that gives the rings something to be the edge of. */}
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
 *  Switch card — Figma "Delivery Instructions" 1121:52607
 * ================================================================ */

function SwitchCard({
  card,
  choice,
  opaque,
  onPick,
  reduceMotion,
}: {
  card: V10Card;
  choice: string;
  /** The doorbell card is white in Figma — it hides the partner standing behind it. */
  opaque: boolean;
  onPick: (optionId: string) => void;
  reduceMotion: boolean;
}) {
  const index = Math.max(
    0,
    card.options.findIndex((o) => o.id === choice),
  );
  const { w: segW, h: segH } = card.segment;
  /** Bumped by every tap — including one that doesn't change the answer. */
  const [playKey, setPlayKey] = useState(0);
  const [sonarKey, setSonarKey] = useState(0);
  const [sonarIndex, setSonarIndex] = useState(index);

  const left = V10_TRACK_PAD + index * (segW + V10_TRACK_GAP);

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
    <div
      className="relative flex shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-12 border border-solid border-[#f2f3f7]"
      style={{ width: V10_CARD_W, height: V10_CARD_H, backgroundColor: opaque ? "#ffffff" : undefined }}
    >
      <div
        role="radiogroup"
        aria-label={card.groupLabel}
        className="relative shrink-0 rounded-full"
        style={{ width: card.trackWidth, height: V10_TRACK_H, backgroundColor: SURFACE_TRACK }}
      >
        {/* Its own AnimatePresence: the page sits in the app's page-transition
            AnimatePresence (initial={false}), which would otherwise make a
            late-mounting ripple skip straight to its end state. */}
        <AnimatePresence>
          {sonarKey > 0 && (
            <Sonar key={sonarKey} centreX={V10_TRACK_PAD + sonarIndex * (segW + V10_TRACK_GAP) + segW / 2} />
          )}
        </AnimatePresence>

        <motion.span
          aria-hidden="true"
          className="absolute rounded-full border border-white bg-white drop-shadow-[0_1px_3px_rgba(34,34,34,0.06)] pointer-events-none will-change-transform"
          style={{
            left: 0,
            top: (V10_TRACK_H - segH) / 2,
            width: segW,
            height: segH,
            x: reduceMotion ? x : thumbX,
            scaleX: reduceMotion ? 1 : stretchX,
            scaleY: reduceMotion ? 1 : stretchY,
          }}
        />

        <div className="relative flex h-full items-center" style={{ gap: V10_TRACK_GAP, padding: V10_TRACK_PAD }}>
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
                style={{ width: segW, height: segH }}
              >
                <OptionGlyph
                  glyph={option.glyph}
                  size={option.glyphSize}
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

      <div className="shrink-0" style={{ width: card.captionWidth, height: V10_CAPTION_H }}>
        <TextMorph
          text={card.options[index].caption}
          reduceMotion={reduceMotion}
          className="w-full text-center text-[12px] leading-[18px] tracking-[-0.1px] font-semibold text-[#1d2539]"
        />
      </div>
    </div>
  );
}

/* ================================================================
 *  Partner — v9's art and poses, standing behind the doorbell card
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

function popIn(reduceMotion: boolean) {
  return {
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
    exit: reduceMotion
      ? { opacity: 0, transition: { duration: 0.12 } }
      : { opacity: 0, scaleX: 1.06, scaleY: 0.9, transition: { duration: 0.1, ease: "easeIn" as const } },
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
    // Figma: 73.7×109 at (250, −15.66) — it rises above the card's top edge and
    // its lower half disappears behind the (white) doorbell card.
    <div aria-hidden="true" className="absolute left-[250px] top-[-15.66px] h-[109px] w-[73.7px] pointer-events-none select-none">
      <AnimatePresence initial={false}>
        {pose === "default" ? (
          <motion.div
            key="default"
            className="absolute inset-0 overflow-hidden will-change-transform"
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
          // Pose art is framed waist-up; drawn so its head sits where the
          // default's does and its lower half tucks behind the doorbell card.
          <motion.img
            key={pose}
            src={POSE_SRC[pose]}
            alt=""
            draggable={false}
            className="absolute left-[-6px] top-[-4px] h-auto w-[86px] max-w-none will-change-transform"
            style={{ transformOrigin: "50% 100%" }}
            {...pop}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
 *  Record row — Figma 1121:52666 (v2's voice note as a row, via v8; copied)
 * ================================================================ */

const DISC_D = 26;
/** The play/pause artwork box that puts its disc at DISC_D. */
const DISC_ART = (DISC_D * 37) / DISC_IN_BOX;
/** Pulse rings are centred on the disc: row padding 12 + half the grown slot. */
const DISC_CX = 12 + (DISC_D + 2) / 2;

const DISC_SPRING = { type: "spring" as const, stiffness: 560, damping: 28, mass: 0.6 };

const NEXT_ON_TAP: Record<V10NoteState, V10NoteState> = {
  idle: "recording",
  recording: "recorded",
  recorded: "playing",
  playing: "recorded",
};

function RecordRow({
  state,
  onChange,
  reduceMotion,
}: {
  state: V10NoteState;
  onChange: (next: V10NoteState) => void;
  reduceMotion: boolean;
}) {
  const idle = state === "idle";
  const recording = state === "recording";
  const playing = state === "playing";
  const hasNote = state === "recorded" || playing;
  const [pressed, setPressed] = useState(false);

  // Playback ends by itself; re-keyed on `playing` so replay restarts the clock.
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => onChange("recorded"), V10_NOTE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [playing, onChange]);

  const advance = () => {
    onChange(NEXT_ON_TAP[state]);
    hapticTick();
  };

  const layer = (on: boolean) => ({
    initial: false as const,
    animate: { opacity: on ? 1 : 0, scale: on ? 1 : 0.72 },
    transition: { duration: reduceMotion ? 0 : 0.18, ease: "easeOut" as const },
    className: "absolute flex items-center justify-center pointer-events-none",
  });

  const disc = (
    // Figma's idle slot is the 20px mic. Once the 26px disc exists the slot
    // grows to hold it, so the caption slides over instead of crowding it.
    <motion.span
      aria-hidden="true"
      className="relative flex h-5 shrink-0 items-center justify-center"
      initial={false}
      animate={{ width: idle ? 20 : DISC_D + 2 }}
      transition={reduceMotion ? { duration: 0 } : DISC_SPRING}
    >
      <motion.span
        className="absolute rounded-full"
        style={{ width: DISC_D, height: DISC_D, backgroundColor: INK_ACTION }}
        initial={false}
        animate={{ scale: idle ? 0.55 : 1, opacity: idle ? 0 : 1 }}
        transition={reduceMotion ? { duration: 0 } : DISC_SPRING}
      />
      <motion.span {...layer(idle)}>
        <MicGlyph size={20} />
      </motion.span>
      <motion.span {...layer(recording)}>
        <WaveformGlyph size={16} ink="#ffffff" live={recording} reduceMotion={reduceMotion} />
      </motion.span>
      <motion.span {...layer(state === "recorded")}>
        <PlayGlyph size={DISC_ART} />
      </motion.span>
      <motion.span {...layer(playing)}>
        <PauseGlyph size={DISC_ART} />
      </motion.span>
    </motion.span>
  );

  return (
    <motion.div
      className={`relative flex h-10 w-[327px] items-center gap-2 overflow-hidden rounded-12 px-3 ${ROW_SURFACE}`}
      style={{ clipPath: "inset(0 round 12px)" }}
      initial={false}
      animate={{ scale: pressed && !reduceMotion ? 0.98 : 1 }}
      transition={{ type: "spring", stiffness: 700, damping: 34, mass: 0.5 }}
    >
      {/* Listening: discs leave the mic on a slow loop, clipped by the row. In
          their own AnimatePresence for the same reason as the sonar. */}
      <AnimatePresence>
        {recording &&
          !reduceMotion &&
          SONAR_DELAYS.map((_, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="absolute rounded-full pointer-events-none will-change-transform"
              style={{ width: DISC_D, height: DISC_D, left: DISC_CX - DISC_D / 2, top: 20 - DISC_D / 2, backgroundColor: INK_ACTION }}
              initial={{ scale: 1, opacity: 0.22 }}
              animate={{ scale: 3.4, opacity: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 1.6, delay: i * 0.8, repeat: Infinity, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>

      {hasNote ? (
        <motion.button
          type="button"
          aria-label={V10_NOTE_ARIA[state]}
          onClick={advance}
          whileTap={reduceMotion ? undefined : { scale: 0.9 }}
          className={`relative z-20 flex h-5 shrink-0 items-center justify-center rounded-full cursor-pointer ${FOCUS_RING}`}
        >
          <AnimatePresence>
            {playing && !reduceMotion && (
              <motion.span
                key="ring"
                aria-hidden="true"
                className="absolute pointer-events-none"
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <PlaybackRing box={36} r={16} durationMs={V10_NOTE_DURATION_MS} />
              </motion.span>
            )}
          </AnimatePresence>
          {disc}
        </motion.button>
      ) : (
        disc
      )}

      <span className="relative block min-w-0 flex-1">
        <TextMorph
          text={V10_NOTE_CAPTION[state]}
          reduceMotion={reduceMotion}
          className="whitespace-nowrap text-left text-[14px] leading-5 tracking-[-0.1px] font-semibold text-[#1d2539]"
        />
      </span>

      <AnimatePresence initial={false}>
        {hasNote && (
          <motion.button
            key="remove"
            type="button"
            aria-label="Remove voice instructions"
            onClick={() => {
              onChange("idle");
              hapticTick();
            }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            className={`relative z-20 flex h-6 shrink-0 items-center gap-1 rounded-4 px-1.5 cursor-pointer ${FOCUS_RING}`}
            initial={{ opacity: 0, x: 6, filter: "blur(3px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 6, filter: "blur(3px)" }}
            transition={{ duration: reduceMotion ? 0 : 0.22, delay: 0.06, ease: "easeOut" }}
          >
            <CrossGlyph size={16} />
            <span className="text-[12px] leading-4 font-semibold whitespace-nowrap" style={{ color: INK_PRIMARY }}>
              Remove
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Before a note exists the whole row is the target; once it does, play and
          Remove are real controls, so the overlay steps aside. */}
      {!hasNote && (
        <button
          type="button"
          aria-label={V10_NOTE_ARIA[state]}
          onClick={advance}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerCancel={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          className={`absolute inset-0 z-10 rounded-12 cursor-pointer ${FOCUS_RING}`}
        />
      )}
    </motion.div>
  );
}


/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV10Props = {
  value: V10Value;
  onChange: (next: V10Value) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV10({ value, onChange, className = "" }: DeliveryInstructionsWidgetV10Props) {
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

  const pick = (cardId: V10CardId, optionId: string) => {
    onChange({ ...value, choice: { ...value.choice, [cardId]: optionId } });
    hapticTick();
    if (poseTimer.current !== null) window.clearTimeout(poseTimer.current);
    setPose(OPTION_POSE[optionId] ?? "default");
    poseTimer.current = window.setTimeout(() => {
      poseTimer.current = null;
      setPose("default");
    }, POSE_HOLD_MS);
  };

  // Stable, so RecordRow's playback timer isn't reset by unrelated re-renders.
  const valueRef = useRef(value);
  valueRef.current = value;
  const setNote = useCallback((note: V10NoteState) => onChange({ ...valueRef.current, note }), [onChange]);

  return (
    <section
      role="group"
      aria-labelledby={titleId}
      data-variant="10"
      className={`relative mt-4 flex w-[351px] shrink-0 flex-col rounded-16 bg-[linear-gradient(211.89deg,#ebf4ff_0%,#ffffff_42%)] ${className}`}
      // Not overflow-hidden: the partner rises above the top edge. Figma's wash
      // stops (31% → 37%) are measured on its own handles; these match v9's render.
    >
      {/* The white frame first, so the partner crossing the top edge sits over it. */}
      <span aria-hidden="true" className="absolute inset-0 rounded-16 pointer-events-none shadow-[inset_0_0_0_3px_#ffffff]" />
      <Partner pose={pose} reduceMotion={reduceMotion} />

      <div className="relative flex h-11 shrink-0 items-center px-3.5">
        <h2 id={titleId} className="text-[16px] leading-5 tracking-[-0.15px] font-bold" style={{ color: INK_PRIMARY }}>
          Give delivery instructions
        </h2>
      </div>

      <div className="relative h-[25px] shrink-0">
        <p
          className="absolute left-3 top-[-6.36px] whitespace-nowrap text-[13px] leading-5 tracking-[-0.1px]"
          style={{ color: INK_TERTIARY }}
        >
          3207, 32nd floor, Sama towers, Dubai
        </p>
      </div>

      <div className="relative flex shrink-0 items-center justify-center gap-2.5 px-2.5">
        {V10_CARDS.map((card) => (
          <SwitchCard
            key={card.id}
            card={card}
            choice={value.choice[card.id]}
            opaque={card.id === "doorbell"}
            onPick={(optionId) => pick(card.id, optionId)}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      <div className="relative shrink-0 px-3 pt-3 pb-1.5">
        <RecordRow state={value.note} onChange={setNote} reduceMotion={reduceMotion} />
      </div>

      <button
        type="button"
        role="checkbox"
        aria-checked={value.save}
        onClick={() => {
          onChange({ ...value, save: !value.save });
          hapticTick();
        }}
        className={`relative flex h-[42px] shrink-0 items-start gap-1.5 px-3.5 pt-2.5 text-left cursor-pointer ${FOCUS_RING}`}
      >
        <InstructionCheckbox checked={value.save} knockout="#ffffff" reduceMotion={reduceMotion} />
        <span className="w-[286px] text-[13px] leading-5 tracking-[-0.1px]" style={{ color: INK_SECONDARY }}>
          Save this for future orders on this address
        </span>
      </button>
    </section>
  );
}
