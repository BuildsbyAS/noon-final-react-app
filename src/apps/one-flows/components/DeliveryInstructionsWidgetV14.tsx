/**
 * "Instruct your rider" — v14 (Figma 1243:14256 default, 1243:14070 expanded)
 *
 * v12's widget with v13's calling interaction. Calling leaves the shared grey
 * card and becomes its own 96px card on the left; tapping it EXPANDS that card
 * in place into "What should the rider do during delivery?" over two answer
 * pills, pushing the switch card off the right edge of the widget. Doorbell and
 * handoff keep v12's switches — thumb, signature, sonar, caption morph — and
 * the partner still acts out whichever answer was picked, calling included.
 * Copied, never imported: v14 owns every piece (v12 and v13 stay untouched).
 *
 * v13's expansion, mirrored: that card was the rightmost item and grew
 * leftwards, so its contents were pinned to its right edge. This one is the
 * LEFTMOST item and grows rightwards, so everything is pinned to its left edge
 * — the edge that doesn't move — and the sweeping right edge uncovers the
 * panel rather than dragging it along. The pills follow that direction too.
 *
 * Reduced motion: no travel, stretch, sonar, signatures or pops; states swap.
 *
 * No <PageTransition> / <SkeletonGate> — this is a widget; OrderConfirmationPage
 * owns both for the screen.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
import TextMorph from "./deliveryInstructionsV14TextMorph";
import {
  ChevronDown16,
  Cross16,
  INK_ACTION,
  INK_PRIMARY,
  OptionGlyph,
} from "./deliveryInstructionsV14Glyphs";
import {
  AnswerPill,
  EASE_OUT,
  PICK_BEAT_MS,
  SPRING_CLOSE,
  SPRING_OPEN,
  useExpandable,
} from "./deliveryInstructionsV14Panel";
import {
  V14_CALL_CAPTION,
  V14_CALL_GLYPH,
  V14_CALL_W,
  V14_CAPTION_H,
  V14_CARDS,
  V14_PANEL_OPTIONS,
  V14_PANEL_TITLE,
  V14_ROW_H,
  V14_SWITCH_W,
  V14_TRACK_GAP,
  V14_TRACK_H,
  V14_TRACK_PAD,
  type V14Card,
  type V14CardId,
  type V14CallChoice,
  type V14Value,
} from "./deliveryInstructionsV14.model";
import riderImg from "../assets/delivery-instructions-v14/rider.png";
import riderCallImg from "../assets/delivery-instructions-v14/rider-call.png";
import riderNoCallImg from "../assets/delivery-instructions-v14/rider-no-call.png";
import riderRingBellImg from "../assets/delivery-instructions-v14/rider-ring-bell.png";
import riderNoRingImg from "../assets/delivery-instructions-v14/rider-no-ring.png";
import riderGiveItemsImg from "../assets/delivery-instructions-v14/rider-give-items.png";
import riderLeaveAtDoorImg from "../assets/delivery-instructions-v14/rider-leave-at-door.png";

const INK_TERTIARY = "#666d85";
/** The hairline ring around the calling card's round button. */
const BORDER_CHEVRON = "#f2f3f7";
const SURFACE_TRACK = "#f2f3f7";
const SURFACE_CARD = "#f9f9fb";
const BORDER_DASH = "#eaecf0";

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** Thumb travel, as v10: quick, with enough settle to feel like mass. */
const THUMB_SPRING = { stiffness: 420, damping: 30, mass: 0.9 };
/** Smooths the velocity-derived stretch so it can't jitter frame to frame. */
const SQUASH_SPRING = { stiffness: 480, damping: 26, mass: 0.6 };
const FULL_STRETCH_V = 360;

/** The thumb's height; its width is whatever half the track comes to. */
const SEGMENT_H = 36;

const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]";

/* ================================================================
 *  Sonar — sound leaving the thumb, clipped to the track (v10)
 * ================================================================ */

const SONAR_DELAYS = [0, 0.09];
const SONAR_D = 26;

function Sonar({ centreX }: { centreX: number }) {
  const box = {
    width: SONAR_D,
    height: SONAR_D,
    left: centreX - SONAR_D / 2,
    top: (V14_TRACK_H - SONAR_D) / 2,
  };
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
    >
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
  card: V14Card;
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

  // v12's columns were a fixed 85; v14's share the switch card, so the segment
  // width comes from the track itself and the thumb follows whatever it is.
  const trackRef = useRef<HTMLDivElement>(null);
  const [segW, setSegW] = useState(0);
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () =>
      setSegW((el.clientWidth - V14_TRACK_PAD * 2 - V14_TRACK_GAP) / 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const left = V14_TRACK_PAD + index * (segW + V14_TRACK_GAP);

  // The thumb is a physical object: x is where it's told to be, `thumbX` is
  // where it actually is, and the stretch is read off how fast it's moving.
  const x = useMotionValue(left);
  const thumbX = useSpring(x, THUMB_SPRING);
  const velocity = useVelocity(thumbX);
  const stretchX = useSpring(
    useTransform(
      velocity,
      [-FULL_STRETCH_V, 0, FULL_STRETCH_V],
      [1.16, 1, 1.16],
    ),
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
    <div className="relative flex min-w-px flex-1 flex-col items-center gap-3.5">
      <div
        ref={trackRef}
        role="radiogroup"
        aria-label={card.groupLabel}
        className="relative w-full shrink-0 rounded-full"
        style={{ height: V14_TRACK_H, backgroundColor: SURFACE_TRACK }}
      >
        {/* Its own AnimatePresence: the page sits in the app's page-transition
            AnimatePresence (initial={false}), which would otherwise make a
            late-mounting ripple skip straight to its end state. */}
        <AnimatePresence>
          {sonarKey > 0 && (
            <Sonar
              key={sonarKey}
              centreX={
                V14_TRACK_PAD + sonarIndex * (segW + V14_TRACK_GAP) + segW / 2
              }
            />
          )}
        </AnimatePresence>

        <motion.span
          aria-hidden="true"
          className="absolute rounded-full border border-white bg-white drop-shadow-[0_1px_3px_rgba(34,34,34,0.06)] pointer-events-none will-change-transform"
          style={{
            left: 0,
            top: (V14_TRACK_H - SEGMENT_H) / 2,
            width: segW,
            height: SEGMENT_H,
            x: reduceMotion ? x : thumbX,
            scaleX: reduceMotion ? 1 : stretchX,
            scaleY: reduceMotion ? 1 : stretchY,
          }}
        />

        <div
          className="relative flex h-full items-center"
          style={{ gap: V14_TRACK_GAP, padding: V14_TRACK_PAD }}
        >
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
                className={`flex min-w-px flex-1 items-center justify-center rounded-full cursor-pointer ${FOCUS_RING}`}
                style={{ height: SEGMENT_H }}
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

      <div className="w-full shrink-0 pl-0.5" style={{ height: V14_CAPTION_H }}>
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
      style={{
        backgroundImage: `repeating-linear-gradient(to bottom, ${BORDER_DASH} 0 5px, transparent 5px 8px)`,
      }}
    />
  );
}

/* ================================================================
 *  Partner — v10's art and poses, standing behind the grey card
 * ================================================================ */

type Pose =
  | "default"
  | "call"
  | "noCall"
  | "ringBell"
  | "noRing"
  | "giveItems"
  | "leaveAtDoor";

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
  ifNeeded: "call",
  avoid: "noCall",
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
    initial: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, scaleX: POP_X[0], scaleY: POP_Y[0] },
    animate: reduceMotion
      ? { opacity: 1, transition: { duration: 0.12 } }
      : {
          opacity: 1,
          scaleX: POP_X,
          scaleY: POP_Y,
          transition: {
            opacity: { duration: 0.08 },
            scaleX: {
              duration: 0.46,
              times: [0, 0.38, 0.7, 1],
              ease: "easeOut" as const,
            },
            scaleY: {
              duration: 0.46,
              times: [0, 0.38, 0.7, 1],
              ease: "easeOut" as const,
            },
          },
        },
    exit: reduceMotion
      ? { opacity: 0, transition: { duration: 0.12 } }
      : {
          opacity: 0,
          scaleX: damp(1.06),
          scaleY: damp(0.9),
          transition: { duration: 0.1, ease: "easeIn" as const },
        },
  };
}

function Partner({
  pose,
  reduceMotion,
}: {
  pose: Pose;
  reduceMotion: boolean;
}) {
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
    <div
      aria-hidden="true"
      className="absolute left-[259px] top-[-7px] h-[100px] w-[68px] pointer-events-none select-none"
    >
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
 *  Calling card — v13's expansion, mirrored to grow rightwards
 * ================================================================ */

function CallingCard({
  value,
  onPick,
  onExpandChange,
  reduceMotion,
}: {
  value: V14CallChoice;
  onPick: (next: V14CallChoice) => void;
  /** So the widget can stand the switch card down while the panel is open. */
  onExpandChange: (expanded: boolean) => void;
  reduceMotion: boolean;
}) {
  const { rootRef, triggerRef, open, toggle, close } = useExpandable({
    reduceMotion,
    onOpenChange: onExpandChange,
  });
  const titleId = useId();
  const [pressed, setPressed] = useState(false);
  /** Bumped on every pick, so the resting icon replays its signature. */
  const [playKey, setPlayKey] = useState(0);

  // The card's expanded width is its panel's own width. Measured off the panel
  // (always mounted at max-content, just invisible while collapsed), so the
  // card animates between two numbers and never has to guess.
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelW, setPanelW] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const measure = () => setPanelW(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const expanded = open && panelW !== null;

  const pick = (next: V14CallChoice) => {
    setPlayKey((k) => k + 1);
    onPick(next);
    // The picked pill holds its answer for a beat before the card closes over it.
    window.setTimeout(
      () => close({ returnFocus: true }),
      reduceMotion ? 0 : PICK_BEAT_MS,
    );
  };

  return (
    <motion.div
      ref={rootRef}
      // Figma: 24 at the top, 20 at the bottom — same as the switch card, so
      // the two read as one row of surfaces.
      className="relative shrink-0 overflow-hidden rounded-t-[24px] rounded-b-[20px]"
      style={{ height: V14_ROW_H, backgroundColor: SURFACE_CARD }}
      initial={false}
      animate={{
        width: expanded ? (panelW ?? V14_CALL_W) : V14_CALL_W,
        scale: pressed && !reduceMotion ? 0.96 : 1,
      }}
      transition={{
        width: reduceMotion
          ? { duration: 0 }
          : expanded
            ? SPRING_OPEN
            : SPRING_CLOSE,
        scale: { type: "spring", duration: 0.25, bounce: 0 },
      }}
    >
      {/* Panel — pinned to the card's LEFT edge, the one that doesn't move:
          opening sweeps the right edge out and uncovers this in place. */}
      <motion.div
        ref={panelRef}
        className="absolute top-0 left-0 flex h-full w-max flex-col justify-between p-2.5"
        initial={false}
        animate={{
          opacity: expanded ? 1 : 0,
          filter: expanded || reduceMotion ? "blur(0px)" : "blur(3px)",
        }}
        transition={{
          duration: reduceMotion ? 0 : 0.24,
          delay: expanded && !reduceMotion ? 0.06 : 0,
          ease: EASE_OUT,
        }}
        aria-hidden={!expanded}
        inert={!expanded || undefined}
      >
        {/* pr: the round button sits beside the title's first lines. */}
        <p
          id={titleId}
          className="whitespace-pre-line pr-[30px] text-[14px] leading-5 tracking-[-0.1px] font-bold"
          style={{ color: INK_PRIMARY }}
        >
          {V14_PANEL_TITLE}
        </p>
        <div
          role="radiogroup"
          aria-labelledby={titleId}
          className="flex items-center gap-2"
        >
          <AnimatePresence initial={false}>
            {expanded &&
              V14_PANEL_OPTIONS.map((option, i) => (
                <AnswerPill
                  key={option.id}
                  option={option}
                  index={i}
                  selected={value === option.id}
                  onSelect={() => pick(option.id)}
                  reduceMotion={reduceMotion}
                />
              ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Resting face — pinned to the same edge at its resting width, so it
          holds still while the card grows past it. Never a target itself. */}
      <motion.div
        className="absolute top-0 left-0 flex h-full flex-col justify-between p-2.5 pointer-events-none"
        style={{ width: V14_CALL_W }}
        initial={false}
        animate={{
          opacity: expanded ? 0 : 1,
          filter: expanded && !reduceMotion ? "blur(3px)" : "blur(0px)",
        }}
        transition={{
          duration: reduceMotion ? 0 : 0.2,
          delay: expanded || reduceMotion ? 0 : 0.08,
          ease: EASE_OUT,
        }}
        aria-hidden="true"
      >
        {/* The same white thumb the switches use, holding the answer's icon. */}
        <span className="flex h-9 w-10 shrink-0 items-center justify-center rounded-full border border-white bg-white drop-shadow-[0_1px_3px_rgba(34,34,34,0.06)]">
          <span className="relative block size-5">
            <AnimatePresence initial={false}>
              <motion.span
                key={V14_CALL_GLYPH[value]}
                className="absolute inset-0"
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.7, filter: "blur(3px)" }
                }
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.7, filter: "blur(3px)" }
                }
                transition={{
                  duration: reduceMotion ? 0.1 : 0.24,
                  ease: EASE_OUT,
                }}
              >
                <OptionGlyph
                  glyph={V14_CALL_GLYPH[value]}
                  size={20}
                  selected
                  playKey={playKey}
                  reduceMotion={reduceMotion}
                />
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        <span className="block w-full pl-0.5" style={{ height: V14_CAPTION_H }}>
          <TextMorph
            text={V14_CALL_CAPTION[value]}
            reduceMotion={reduceMotion}
            className="w-full text-left text-[13px] leading-5 tracking-[-0.1px] font-semibold text-[#1d2539]"
          />
        </span>
      </motion.div>

      {/* v1's chevron, so the card says it opens. One button across both
          states: it rides the sweeping right edge and only its glyph changes,
          chevron → cross. Centred on the badge beside it (top 16, not 10). */}
      <motion.button
        type="button"
        aria-label="Close"
        aria-hidden={!expanded}
        tabIndex={expanded ? 0 : -1}
        onClick={() => {
          close({ returnFocus: true });
          hapticTick();
        }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        transition={{ type: "spring", duration: 0.25, bounce: 0 }}
        // 24px button, 40px target, clear of the pills below it.
        className={`absolute top-4 right-2.5 z-20 flex size-6 items-center justify-center rounded-full border border-solid bg-white transition-[background-color] duration-150 ease-out before:absolute before:-inset-2 before:content-[''] ${
          expanded
            ? "cursor-pointer [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#f4f5f9]"
            : "pointer-events-none"
        } ${FOCUS_RING}`}
        style={{ borderColor: BORDER_CHEVRON }}
      >
        <span className="relative block size-4">
          <AnimatePresence initial={false}>
            <motion.span
              key={expanded ? "cross" : "chevron"}
              className="absolute inset-0"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, rotate: expanded ? -90 : 90, scale: 0.8 }
              }
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, rotate: expanded ? 90 : -90, scale: 0.8 }
              }
              transition={{
                duration: reduceMotion ? 0.1 : 0.22,
                ease: EASE_OUT,
              }}
            >
              {expanded ? <Cross16 /> : <ChevronDown16 />}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.button>

      {/* Collapsed, the whole card is the target; expanded, the pills are, so
          this steps aside. It stays mounted either way — closing hands focus
          back to it, and an unmounted trigger can't take focus. */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={expanded}
        aria-hidden={expanded || undefined}
        tabIndex={expanded ? -1 : 0}
        aria-label={`${V14_CALL_CAPTION[value].replace("\n", " ")}. Change.`}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onClick={() => {
          setPressed(false);
          toggle();
          hapticTick();
        }}
        className={`absolute inset-0 z-10 rounded-t-[24px] rounded-b-[20px] ${
          expanded ? "pointer-events-none" : "cursor-pointer"
        } ${FOCUS_RING}`}
      />
    </motion.div>
  );
}

/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV14Props = {
  value: V14Value;
  onChange: (next: V14Value) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV14({
  value,
  onChange,
  className = "",
}: DeliveryInstructionsWidgetV14Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();

  const [callOpen, setCallOpen] = useState(false);
  const [pose, setPose] = useState<Pose>("default");
  const poseTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (poseTimer.current !== null) window.clearTimeout(poseTimer.current);
    },
    [],
  );

  /** Every answer — switches and calling alike — sends the partner into its pose. */
  const react = (optionId: string) => {
    hapticTick();
    if (poseTimer.current !== null) window.clearTimeout(poseTimer.current);
    setPose(OPTION_POSE[optionId] ?? "default");
    poseTimer.current = window.setTimeout(() => {
      poseTimer.current = null;
      setPose("default");
    }, POSE_HOLD_MS);
  };

  const pickSwitch = (cardId: V14CardId, optionId: string) => {
    onChange({ ...value, choice: { ...value.choice, [cardId]: optionId } });
    react(optionId);
  };

  return (
    <section
      role="group"
      aria-labelledby={titleId}
      data-variant="14"
      // Clipped on X only: the expanded calling card pushes the switch card off
      // the right edge, while the partner still rises above the top edge.
      className={`relative flex w-[351px] shrink-0 flex-col overflow-x-clip rounded-16 bg-white ${className}`}
    >
      <Partner pose={pose} reduceMotion={reduceMotion} />

      <div className="relative flex shrink-0 flex-col justify-center gap-0.5 px-3.5 py-3 whitespace-nowrap">
        <h2
          id={titleId}
          className="text-[16px] leading-5 tracking-[-0.15px] font-bold"
          style={{ color: INK_PRIMARY }}
        >
          Instruct your rider
        </h2>
        <p
          className="text-[12px] leading-[18px] tracking-[-0.1px]"
          style={{ color: INK_TERTIARY }}
        >
          Help us deliver as per your convenience
        </p>
      </div>

      <div className="relative flex shrink-0 items-center gap-2.5 px-2.5 pb-3">
        <CallingCard
          value={value.call}
          onPick={(next) => {
            onChange({ ...value, call: next });
            react(next);
          }}
          onExpandChange={setCallOpen}
          reduceMotion={reduceMotion}
        />

        {/* Fixed width, never shrinks: when the calling card expands this is
            what gets pushed out, rather than the switches squeezing. Pushed
            out, it also stands down — half a switch shouldn't be tappable. */}
        <div
          className="shrink-0"
          style={{ width: V14_SWITCH_W }}
          aria-hidden={callOpen}
          inert={callOpen || undefined}
        >
          <div
            className="flex items-center gap-3.5 overflow-clip rounded-t-[24px] rounded-b-[20px] px-3 pt-2 pb-2.5"
            style={{ backgroundColor: SURFACE_CARD }}
          >
            {V14_CARDS.map((card, i) => (
              <div key={card.id} className="contents">
                {i > 0 && <DashedDivider />}
                <SwitchColumn
                  card={card}
                  choice={value.choice[card.id]}
                  onPick={(optionId) => pickSwitch(card.id, optionId)}
                  reduceMotion={reduceMotion}
                />
              </div>
            ))}
          </div>
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
        <InstructionCheckbox
          checked={value.save}
          knockout="#ffffff"
          reduceMotion={reduceMotion}
        />
        <span
          className="w-[286px] text-[13px] leading-5 tracking-[-0.1px] font-medium"
          style={{ color: INK_TERTIARY }}
        >
          Save this for future orders on this address
        </span>
      </button>
    </section>
  );
}
