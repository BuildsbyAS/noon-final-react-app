/**
 * "Instructions your rider" — v13 (Figma 1205:12054 / 1205:12152, 351×205)
 *
 * v11, with one interaction changed: calling is answered IN PLACE. The chip
 * doesn't summon an action sheet — it grows into one. Tapping it widens the
 * same chip into a panel ("What should the rider do?" over Call me / Don't
 * call me) and the two toggles to its left are pushed off the card's edge,
 * the outermost fading out as it goes. Picking an answer collapses the chip
 * back to v11's resting state. Copied, never imported: v13 owns every piece.
 *
 * Three chips:
 *  - Leave items at the door, Don't ring my doorbell — TOGGLES (checkbox).
 *  - Call me if needed — EXPANDS into the calling panel.
 *
 * v4's showcase motion, as in v11: every change plays a short illustration
 * clip full-bleed inside the chip, and only when it ends does the chip settle
 * into its new state (checkbox fills / icon and label change). The answer
 * itself changes on tap, so assistive tech is never behind. Each direction has
 * its own clip — checking "Leave items" plays leave-at-door, unchecking plays
 * the hand-over; "Don't ring" plays the silent doorbell, un-setting it the
 * ring; the panel's Call me / Don't call me play call-me / avoid-calling.
 *
 * When a toggle's clip ends it settles exactly like v4: the selected blue
 * blooms from the tap point, the ring latches, the checkbox pops last; turning
 * it off dims the blue from the whole surface. (Copied from v5's engine.)
 *
 * The chip's round button is one element across both states — it holds its
 * place at the corner as the chip widens, and only the glyph inside crossfades
 * chevron → cross. That's what makes the panel read as the chip itself rather
 * than something new arriving.
 *
 * Calling starts on "Call me if needed".
 *
 * Reduced motion: no clips; states swap.
 *
 * No <PageTransition> / <SkeletonGate> — this is a widget; OrderConfirmationPage
 * owns both for the screen.
 */
import "motion-icons-react/style.css";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { hapticTick } from "@ui";
import { InstructionCheckbox } from "./MCheckbox";
import {
  ChevronDown16,
  Cross16,
  InfoCircle16,
  V13Glyph,
  type V13GlyphId,
} from "./deliveryInstructionsV13Icons";
import {
  AnswerPill,
  EASE_OUT,
  PICK_BEAT_MS,
  SPRING_CLOSE,
  SPRING_OPEN,
  useExpandable,
} from "./deliveryInstructionsV13Panel";
import {
  DEFAULT_V13_VALUE,
  V13_LABEL,
  V13_PANEL_OPTIONS,
  V13_PANEL_TITLE,
  type V13CallChoice,
  type V13Value,
} from "./deliveryInstructionsV13.model";
import leaveAtDoorClip from "../assets/order-confirmation/leave-at-door.mp4";
import dontRingClip from "../assets/order-confirmation/dont-ring-the-bell.mp4";
import avoidCallingClip from "../assets/order-confirmation/avoid-calling.mp4";
import giveItemsClip from "../assets/delivery-instructions-v13/give-items-to-me.mp4";
import ringBellClip from "../assets/delivery-instructions-v13/ring-bell.mp4";
import callMeClip from "../assets/delivery-instructions-v13/call-me.mp4";

const INK_PRIMARY = "#1d2539";
const INK_TERTIARY = "#666d85";
const SURFACE_CHIP = "#f9f9fb";
const SURFACE_TERTIARY = "#f2f3f7";
/** The hairline ring around the chip's round button. */
const BORDER_CHEVRON = "#d0d4dd";

const CARD_W = 351;
const ROW_PAD_X = 12;
const ROW_GAP = 10;
/** Three chips share the row, so each is a third of what's left of it. */
const CHIP_W = (CARD_W - ROW_PAD_X * 2 - ROW_GAP * 2) / 3;
/** If `ended` never fires (stalled decode), settle anyway. */
const CLIP_FALLBACK_MS = 2400;

const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]";

/* ================================================================
 *  Clip player — v4's showcase, one preloaded video per outcome
 * ================================================================ */

/**
 * Plays one of several clips full-bleed over its chip. play() must be called
 * inside the tap for iOS, so every clip stays mounted (hidden) and preloaded,
 * and `start` is called straight from the click handler. Returns which clip is
 * playing so the chip can hold its old state until it ends.
 */
function useClips<K extends string>(
  reduceMotion: boolean,
  opts: { settle?: Transition; reveal?: Transition } = {},
) {
  const refs = useRef<Partial<Record<K, HTMLVideoElement | null>>>({});
  const [playing, setPlaying] = useState<K | null>(null);

  useEffect(() => {
    if (playing === null) return;
    const id = window.setTimeout(() => setPlaying(null), CLIP_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [playing]);

  const start = (key: K) => {
    const clip = refs.current[key];
    if (!clip || reduceMotion) return;
    for (const [k, other] of Object.entries(refs.current) as [
      K,
      HTMLVideoElement | null,
    ][]) {
      if (other && k !== key) other.pause();
    }
    clip.currentTime = 0;
    setPlaying(key);
    clip.play().catch(() => setPlaying((p) => (p === key ? null : p)));
  };

  const video = (key: K, src: string) => (
    <motion.video
      key={key}
      ref={(el) => {
        refs.current[key] = el;
      }}
      src={src}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      className="absolute inset-0 z-20 h-full w-full object-cover pointer-events-none"
      initial={false}
      animate={{ opacity: playing === key ? 1 : 0 }}
      transition={
        playing === key
          ? (opts.reveal ?? { duration: 0.12, ease: "easeOut" })
          : (opts.settle ?? { duration: 0.28, ease: "easeOut" })
      }
      onEnded={() => setPlaying((p) => (p === key ? null : p))}
    />
  );

  return { playing, start, video };
}

/** Figma's checkbox is 24px; the shared M-Checkbox draws at 20, so it's scaled up. */
function Checkbox24({
  checked,
  knockout,
  reduceMotion,
  className = "",
}: {
  checked: boolean;
  knockout: string;
  reduceMotion: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-6 shrink-0 items-center justify-center ${className}`}
    >
      <span className="block scale-[1.2]">
        <InstructionCheckbox
          checked={checked}
          knockout={knockout}
          reduceMotion={reduceMotion}
        />
      </span>
    </span>
  );
}

const CHIP_CLASS = `relative flex h-[100px] w-full flex-col items-start gap-4 overflow-hidden rounded-12 p-2.5 text-left cursor-pointer ${FOCUS_RING}`;
const LABEL_CLASS =
  "block whitespace-pre-line pl-0.5 text-[13px] leading-5 tracking-[-0.1px] font-medium";

/* ================================================================
 *  Blue fill — v4's bloom, copied from DeliveryInstructionsWidgetV5
 *  (palette "blue"). A wash warms under the finger, the selected blue
 *  floods from the tap point, the ring latches, sparks leave the tap;
 *  deselect dims from the whole surface.
 * ================================================================ */

type Point = { x: number; y: number };

const SURFACE_SELECTED = "#ebf4ff";
const BORDER_ACTION = "214,233,255"; // #d6e9ff as rgb parts so the ring's alpha can animate
const WASH = "#bddbff";
const SPARK = "#0f61ff";
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** Covers the chip from any tap point. */
const INK_DIAMETER = 320;
/** Keyboard toggles bloom from the checkbox (24px, 10px in from the corner). */
const CHECKBOX_CENTRE: Point = { x: CHIP_W - 10 - 12, y: 10 + 12 };
/** The checkbox confirms once the bloom has landed. */
const CONFIRM_DELAY_MS = 260;

const SPREAD = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
  mass: 0.9,
};
const GLOW = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
  mass: 0.6,
};
const BLUE_DELAY_S = 0.22;

function Ink({
  selected,
  pressed,
  origin,
  reduceMotion,
}: {
  selected: boolean;
  pressed: boolean;
  origin: Point;
  reduceMotion: boolean;
}) {
  if (reduceMotion) {
    return (
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: SURFACE_SELECTED }}
        initial={false}
        animate={{ opacity: selected ? 1 : 0 }}
        transition={{ duration: 0.1 }}
      />
    );
  }

  const disc = {
    width: INK_DIAMETER,
    height: INK_DIAMETER,
    left: origin.x - INK_DIAMETER / 2,
    top: origin.y - INK_DIAMETER / 2,
  };

  return (
    <>
      <WashDisc
        selected={selected}
        pressed={pressed}
        style={{ ...disc, backgroundColor: WASH }}
      />
      <motion.span
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none will-change-transform"
        style={{ ...disc, backgroundColor: SURFACE_SELECTED }}
        initial={false}
        animate={{
          scale: selected ? 1 : 0,
          opacity: selected ? (pressed ? 0.88 : 1) : 0,
        }}
        transition={
          selected
            ? {
                scale: { ...SPREAD, delay: BLUE_DELAY_S },
                opacity: { duration: 0.05, delay: BLUE_DELAY_S },
              }
            : {
                opacity: { duration: 0.22, delay: 0.04, ease: "easeOut" },
                scale: { duration: 0, delay: 0.3 },
              }
        }
      />
    </>
  );
}

function WashDisc({
  selected,
  pressed,
  style,
}: {
  selected: boolean;
  pressed: boolean;
  style: React.CSSProperties;
}) {
  const wash = useAnimationControls();
  const wasSelected = useRef(selected);

  useEffect(() => {
    const justSelected = selected && !wasSelected.current;
    wasSelected.current = selected;
    if (selected) {
      if (justSelected) wash.set({ opacity: 1 });
      wash.start({
        scale: 1,
        opacity: 1,
        transition: { scale: SPREAD, opacity: { duration: 0 } },
      });
    } else if (pressed) {
      wash.start({
        scale: 0.12,
        opacity: 1,
        transition: { scale: GLOW, opacity: { duration: 0.1 } },
      });
    } else {
      wash.start({
        opacity: 0,
        scale: 0,
        transition: {
          opacity: { duration: 0.08 },
          scale: { duration: 0, delay: 0.3 },
        },
      });
    }
  }, [selected, pressed, wash]);

  return (
    <motion.span
      aria-hidden="true"
      className="absolute rounded-full pointer-events-none will-change-transform"
      style={style}
      initial={{ scale: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
      animate={wash}
    />
  );
}

const SPARKS = [0, 55, 120, 190, 250, 305].map((angle, i) => {
  const dist = 22 + (i % 3) * 5;
  return {
    size: i % 2 === 0 ? 4 : 3,
    delay: (i % 3) * 0.015,
    dx: Math.cos((angle * Math.PI) / 180) * dist,
    dy: Math.sin((angle * Math.PI) / 180) * dist,
  };
});

function Sparks({ playKey, origin }: { playKey: number; origin: Point }) {
  if (playKey === 0) return null;
  return (
    <span
      key={playKey}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
    >
      {SPARKS.map((s, i) => (
        <motion.i
          key={i}
          className="absolute block rounded-full"
          style={{
            width: s.size,
            height: s.size,
            left: origin.x - s.size / 2,
            top: origin.y - s.size / 2,
            backgroundColor: i % 3 === 2 ? "#ffffff" : SPARK,
          }}
          initial={{ x: 0, y: 0, scale: 0.6, opacity: 1 }}
          animate={{ x: s.dx, y: s.dy, scale: 0, opacity: 0 }}
          transition={{ duration: 0.46, delay: s.delay, ease: EASE_OUT_EXPO }}
        />
      ))}
    </span>
  );
}

/* ================================================================
 *  Toggle chip — Figma "Delivery Instructions" 1196:61491
 * ================================================================ */

function ToggleChip({
  glyph,
  label,
  checked,
  clipOn,
  clipOff,
  onToggle,
  reduceMotion,
}: {
  glyph: V13GlyphId;
  label: string;
  checked: boolean;
  /** Plays when the chip turns on / off. */
  clipOn: string;
  clipOff: string;
  onToggle: () => void;
  reduceMotion: boolean;
}) {
  const { playing, start, video } = useClips<"on" | "off">(reduceMotion, {
    // ended on: let the bloom start under the clip's last frame before it fades
    settle: checked
      ? { duration: 0.28, delay: 0.2, ease: "easeOut" }
      : undefined,
  });
  // The answer flips on tap; the fill waits for the clip, which IS the change.
  const [shown, setShown] = useState(checked);
  useEffect(() => {
    if (playing === null) setShown(checked);
  }, [playing, checked]);

  const [origin, setOrigin] = useState<Point>(CHECKBOX_CENTRE);
  const [pressed, setPressed] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  // the checkbox lags the bloom on select and leads it on deselect
  const [confirmed, setConfirmed] = useState(shown);
  const [confirmToggles, setConfirmToggles] = useState(0);
  const wasShown = useRef(shown);
  const wasConfirmed = useRef(confirmed);

  useEffect(() => {
    if (wasShown.current === shown) return;
    wasShown.current = shown;
    if (!shown || reduceMotion) {
      setConfirmed(shown);
      return;
    }
    setBurstKey((k) => k + 1);
    const id = window.setTimeout(() => setConfirmed(true), CONFIRM_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [shown, reduceMotion]);

  useEffect(() => {
    if (wasConfirmed.current === confirmed) return;
    wasConfirmed.current = confirmed;
    setConfirmToggles((n) => n + 1);
  }, [confirmed]);

  const knockout = shown ? SURFACE_SELECTED : SURFACE_CHIP;
  // motion-icons-react keyframes: pop when it confirms, dip when it withdraws.
  const checkboxClass =
    confirmToggles === 0 ? "" : confirmed ? "motion-success" : "motion-press";

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label.replace("\n", " ")}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setOrigin({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        setPressed(true);
      }}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={(event) => {
        // keyboard activation has no pointer: bloom from the checkbox
        if (event.detail === 0) setOrigin(CHECKBOX_CENTRE);
        start(checked ? "off" : "on");
        onToggle();
        hapticTick();
      }}
      whileTap={reduceMotion ? undefined : { scale: 0.965 }}
      initial={false}
      animate={{
        boxShadow: shown
          ? `inset 0 0 0 1px rgba(${BORDER_ACTION},1)`
          : `inset 0 0 0 1px rgba(${BORDER_ACTION},0)`,
      }}
      transition={{
        // the ring latches after the ink has spread, and unlatches first on deselect
        boxShadow: reduceMotion
          ? { duration: 0 }
          : shown
            ? { duration: 0.2, delay: 0.14, ease: EASE_OUT_EXPO }
            : { duration: 0.08, ease: "easeOut" },
        scale: { type: "spring", stiffness: 700, damping: 34, mass: 0.5 },
      }}
      className={`${CHIP_CLASS} isolate`}
      style={{ backgroundColor: SURFACE_CHIP, clipPath: "inset(0 round 12px)" }}
    >
      <Ink
        selected={shown}
        pressed={pressed && playing === null}
        origin={origin}
        reduceMotion={reduceMotion}
      />
      <Sparks playKey={burstKey} origin={origin} />
      <span className="relative flex w-full items-start justify-between">
        <V13Glyph glyph={glyph} ink={INK_PRIMARY} knockout={knockout} />
        <Checkbox24
          checked={confirmed}
          knockout={knockout}
          reduceMotion={reduceMotion}
          className={checkboxClass}
        />
      </span>
      <span
        className={`relative ${LABEL_CLASS}`}
        style={{ color: INK_PRIMARY }}
      >
        {label}
      </span>
      {video("on", clipOn)}
      {video("off", clipOff)}
    </motion.button>
  );
}

/* ================================================================
 *  Calling chip — opens the action sheet
 * ================================================================ */

const CALL_GLYPH: Record<V13CallChoice, V13GlyphId> = {
  call: "callRinging",
  noCall: "callOff",
};
const CALL_LABEL: Record<V13CallChoice, string> = {
  call: V13_LABEL.call,
  noCall: V13_LABEL.noCall,
};

/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV13Props = {
  value: V13Value;
  onChange: (next: V13Value) => void;
  /** Fires as the calling chip expands and collapses. */
  onExpandChange?: (expanded: boolean) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV13({
  value = DEFAULT_V13_VALUE,
  onChange,
  onExpandChange,
  className = "",
}: DeliveryInstructionsWidgetV13Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();
  const panelTitleId = useId();
  const { rootRef, triggerRef, open, toggle, close } = useExpandable({
    reduceMotion,
    onOpenChange: onExpandChange,
  });

  // The clip starts inside the tap (iOS), but waits out the pick beat before
  // it's shown — so you see your answer land, then the chip closes over it.
  const callClips = useClips<"call" | "noCall">(reduceMotion, {
    reveal: {
      duration: 0.16,
      delay: reduceMotion ? 0 : PICK_BEAT_MS / 1000,
      ease: "easeOut",
    },
  });
  const [shownCall, setShownCall] = useState<V13CallChoice>(value.call);
  useEffect(() => {
    if (callClips.playing === null) setShownCall(value.call);
  }, [callClips.playing, value.call]);

  // The chip's expanded width is its panel's own width. Measured off the panel
  // (which is always mounted at max-content, just invisible while collapsed),
  // so the chip animates between two numbers and never has to guess.
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

  // The chip is pressable as a whole while it's closed.
  const [pressed, setPressed] = useState(false);

  const pick = (next: V13CallChoice) => {
    onChange({ ...value, call: next });
    hapticTick();
    // play() has to run inside the tap for iOS, so the clip starts now — but
    // it stays hidden for a beat (see CLIP_REVEAL_DELAY_S) while the pill you
    // just chose holds its answer. Then the chip closes over it.
    callClips.start(next);
    window.setTimeout(close, reduceMotion ? 0 : PICK_BEAT_MS);
  };

  /** The two toggles: pushed out of the card, the outermost fading as it goes. */
  const pushed = (fade: boolean) => ({
    initial: false as const,
    animate: {
      opacity: expanded && fade ? 0.1 : 1,
      filter: expanded && fade && !reduceMotion ? "blur(2px)" : "blur(0px)",
    },
    transition: { duration: reduceMotion ? 0 : 0.24, ease: EASE_OUT },
  });

  return (
    <div className={`relative w-[351px] shrink-0 ${className}`}>
      <section
        role="group"
        aria-labelledby={titleId}
        data-variant="13"
        className="flex w-full flex-col overflow-hidden rounded-16 bg-white"
      >
        <div className="flex h-11 shrink-0 items-center gap-1 px-4">
          <h2
            id={titleId}
            className="text-[16px] leading-5 tracking-[-0.15px] font-bold"
            style={{ color: INK_PRIMARY }}
          >
            Instructions your rider
          </h2>
          {/* Figma defines no behaviour for this glyph, so it stays decorative. */}
          <InfoCircle16 />
        </div>

        {/* justify-end: when the calling chip widens past the row, the toggles
            are what overflows, off the card's left edge. */}
        <div className="flex shrink-0 items-start justify-end gap-2.5 px-3 pt-1 pb-3">
          <motion.div
            {...pushed(true)}
            className="shrink-0"
            style={{ width: CHIP_W }}
            aria-hidden={expanded}
            inert={expanded || undefined}
          >
            <ToggleChip
              glyph="door"
              label={V13_LABEL.leaveAtDoor}
              checked={value.leaveAtDoor}
              clipOn={leaveAtDoorClip}
              clipOff={giveItemsClip}
              onToggle={() =>
                onChange({ ...value, leaveAtDoor: !value.leaveAtDoor })
              }
              reduceMotion={reduceMotion}
            />
          </motion.div>
          <motion.div
            {...pushed(false)}
            className="shrink-0"
            style={{ width: CHIP_W }}
            aria-hidden={expanded}
            inert={expanded || undefined}
          >
            <ToggleChip
              glyph="bellOff"
              label={V13_LABEL.noRing}
              checked={value.noRing}
              clipOn={dontRingClip}
              clipOff={ringBellClip}
              onToggle={() => onChange({ ...value, noRing: !value.noRing })}
              reduceMotion={reduceMotion}
            />
          </motion.div>

          {/* The calling chip IS the panel: one box that changes width. It's
              also the whole of the "inside": a tap anywhere else — including
              the card space the toggles just vacated — dismisses. */}
          <motion.div
            ref={rootRef}
            className="relative h-[100px] shrink-0 overflow-hidden rounded-12"
            style={{
              backgroundColor: SURFACE_CHIP,
              clipPath: "inset(0 round 12px)",
            }}
            initial={false}
            animate={{
              width: expanded ? (panelW ?? CHIP_W) : CHIP_W,
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
            {/* Panel — always mounted so its width can be measured; it only
                becomes visible (and reachable) once the chip has room for it.
                Pinned to the chip's right edge, which is the edge that doesn't
                move: opening sweeps the LEFT edge out and uncovers this, so the
                words are revealed rather than dragged along. */}
            <motion.div
              ref={panelRef}
              className="absolute top-0 right-0 flex w-max flex-col gap-4 p-2.5"
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
              {/* pr: the round button sits above this row's right end. */}
              <p
                id={panelTitleId}
                className="pr-[30px] text-[14px] leading-5 tracking-[-0.1px] font-bold whitespace-nowrap"
                style={{ color: "#000000" }}
              >
                {V13_PANEL_TITLE}
              </p>
              <div
                role="radiogroup"
                aria-labelledby={panelTitleId}
                className="flex items-center gap-2"
              >
                <AnimatePresence initial={false}>
                  {expanded &&
                    V13_PANEL_OPTIONS.map((option, i) => (
                      <AnswerPill
                        key={option.id}
                        option={option}
                        index={i}
                        lastIndex={V13_PANEL_OPTIONS.length - 1}
                        selected={value.call === option.id}
                        onSelect={() => pick(option.id)}
                        reduceMotion={reduceMotion}
                      />
                    ))}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Resting face — icon and answer, over the panel it collapses to.
                Never a target itself: the chip's own button is, and while the
                panel is open this layer must not swallow taps meant for it. */}
            <motion.div
              className="absolute top-0 right-0 h-full flex flex-col items-start gap-4 p-2.5 pointer-events-none"
              style={{ width: CHIP_W }}
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
              <span className="relative block size-6 shrink-0">
                <AnimatePresence initial={false}>
                  <motion.span
                    key={CALL_GLYPH[shownCall]}
                    className="absolute inset-0"
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.6, filter: "blur(3px)" }
                    }
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.6, filter: "blur(3px)" }
                    }
                    transition={{
                      duration: reduceMotion ? 0.1 : 0.26,
                      ease: EASE_OUT,
                    }}
                  >
                    <V13Glyph
                      glyph={CALL_GLYPH[shownCall]}
                      ink={INK_PRIMARY}
                      knockout={SURFACE_CHIP}
                    />
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="relative block w-full">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={CALL_LABEL[shownCall]}
                    className={LABEL_CLASS}
                    style={{ color: INK_PRIMARY }}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: 6, filter: "blur(4px)" }
                    }
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -6, filter: "blur(4px)" }
                    }
                    transition={{
                      duration: reduceMotion ? 0.1 : 0.26,
                      ease: EASE_OUT,
                    }}
                  >
                    {CALL_LABEL[shownCall]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.div>

            {/* One button across both states: it holds the corner while the chip
                widens underneath it, and only its glyph changes. */}
            <motion.button
              ref={triggerRef}
              type="button"
              aria-label="Close"
              aria-hidden={!expanded}
              tabIndex={expanded ? 0 : -1}
              onClick={() => {
                close();
                hapticTick();
              }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              transition={{ type: "spring", duration: 0.25, bounce: 0 }}
              // 24px button, 40px target: the pseudo-element bleeds past the
              // box without touching the pills 12px below it.
              className={`absolute top-2.5 right-2.5 z-10 flex size-6 items-center justify-center rounded-full border border-solid bg-white transition-[background-color] duration-150 ease-out before:absolute before:-inset-2 before:content-[''] ${
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
                        : {
                            opacity: 0,
                            rotate: expanded ? -90 : 90,
                            scale: 0.8,
                          }
                    }
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            rotate: expanded ? 90 : -90,
                            scale: 0.8,
                          }
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

            {/* Collapsed, the whole chip is the target; expanded, the panel's own
                controls are, so this steps aside. */}
            {!expanded && (
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={expanded}
                aria-label={`${CALL_LABEL[value.call].replace("\n", " ")}. Change.`}
                onPointerDown={() => setPressed(true)}
                onPointerUp={() => setPressed(false)}
                onPointerCancel={() => setPressed(false)}
                onPointerLeave={() => setPressed(false)}
                onClick={() => {
                  setPressed(false);
                  toggle();
                  hapticTick();
                }}
                className={`absolute inset-0 z-20 rounded-12 cursor-pointer ${FOCUS_RING}`}
              />
            )}

            {callClips.video("call", callMeClip)}
            {callClips.video("noCall", avoidCallingClip)}
          </motion.div>
        </div>

        <div
          aria-hidden="true"
          className="h-px w-full shrink-0"
          style={{ backgroundColor: SURFACE_TERTIARY }}
        />

        <button
          type="button"
          role="checkbox"
          aria-checked={value.save}
          onClick={() => {
            onChange({ ...value, save: !value.save });
            hapticTick();
          }}
          className={`flex h-11 shrink-0 items-center gap-1.5 px-3.5 text-left cursor-pointer ${FOCUS_RING}`}
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
    </div>
  );
}
