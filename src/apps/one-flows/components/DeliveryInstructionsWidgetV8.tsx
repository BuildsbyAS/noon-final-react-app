/**
 * "Give delivery instructions" — v8 (Figma 1065:50139, 351×264)
 *
 * Three cards in a horizontally scrolling row — call (1065:50108), handoff
 * (1065:50120), doorbell (1065:50129) — each a two-option vertical switch that
 * is always answered. The third card overflows the frame, which says "scroll".
 * Below: a record row and the save preference.
 *
 * v2's interaction language, copied (v8 imports nothing from v2). On a tap:
 *
 *  1. The white thumb flies to the picked option on a spring and STRETCHES
 *     along the way. The stretch is derived from the thumb's own velocity
 *     (`useVelocity` → `useTransform` → a smoothing spring), so it reads as a
 *     physical object, not a keyframe.
 *  2. The glyph plays its signature: the phone shakes about its earpiece, the
 *     bell swings from its crown, the door swings open in 3D about its hinge,
 *     the person lifts to receive.
 *  3. Options that stand for a SOUND ("Call Anurag", "Ring doorbell") send a
 *     sonar ripple — a pressure wave and two rings — out from the thumb,
 *     clipped to the card.
 *  4. The label's weight and ink crossfade between selected and not.
 *
 * Tapping the option that's already on replays 2 and 3 without changing
 * anything, so the control never feels dead.
 *
 * The record row walks idle → recording → recorded ⇄ playing, plus Remove:
 * pulse rings while it listens, a live level meter in the disc, a progress ring
 * while it plays, and the caption re-reads itself through TextMorph.
 *
 * Reduced motion: the thumb jumps, no stretch, sonar, pulses or signatures;
 * colours and captions swap.
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
import TextMorph from "./deliveryInstructionsV8TextMorph";
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
} from "./deliveryInstructionsV8Glyphs";
import {
  V8_CARD_H,
  V8_CARD_INSET,
  V8_CARD_W,
  V8_CARDS,
  V8_NOTE_ARIA,
  V8_NOTE_CAPTION,
  V8_NOTE_DURATION_MS,
  V8_OPTION_H,
  V8_OPTION_W,
  type V8Card,
  type V8CardId,
  type V8NoteState,
  type V8Value,
} from "./deliveryInstructionsV8.model";

const INK_SECONDARY = "#475067";
const INK_TERTIARY = "#666d85";
const SURFACE_ROW = "#f9f9fb";

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** A horizontal drag on the scrolling row must not read as a tap. */
const DRAG_SLOP_PX = 8;

/** Thumb travel, as v2: quick, with enough settle to feel like mass. */
const THUMB_SPRING = { stiffness: 420, damping: 30, mass: 0.9 };
/** Smooths the velocity-derived stretch so it can't jitter frame to frame. */
const SQUASH_SPRING = { stiffness: 480, damping: 26, mass: 0.6 };
/**
 * Velocity at which the thumb is fully stretched, px/s. v8's only hop is 52px
 * (v2's shortest was wider), so full stretch arrives sooner to keep the effect.
 */
const FULL_STRETCH_V = 380;

const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]";

/* ================================================================
 *  Sonar — sound leaving the thumb, clipped to the card
 * ================================================================ */

/** Two rings, the second a beat behind, so it reads as a pulse not a blip. */
const SONAR_DELAYS = [0, 0.09];
const SONAR_D = 30;

function Sonar({ centreY }: { centreY: number }) {
  const box = {
    width: SONAR_D,
    height: SONAR_D,
    left: V8_OPTION_W / 2 - SONAR_D / 2,
    top: centreY - SONAR_D / 2,
  };
  return (
    // Under the thumb, which is opaque — so what you see is the wave leaving the
    // pill and washing across the rest of the card.
    <span aria-hidden="true" className="absolute inset-0 pointer-events-none">
      {/* Pressure: a filled wave that gives the rings something to be the edge of. */}
      <motion.span
        className="absolute rounded-full will-change-transform"
        style={{ ...box, backgroundColor: INK_ACTION }}
        initial={{ scale: 0.4, opacity: 0.16 }}
        animate={{ scale: 4.4, opacity: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
      />
      {SONAR_DELAYS.map((delay) => (
        <motion.span
          key={delay}
          className="absolute rounded-full will-change-transform"
          style={{ ...box, border: `2px solid ${INK_ACTION}` }}
          initial={{ scale: 0.34, opacity: 0.62 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.68, delay, ease: EASE_OUT_EXPO }}
        />
      ))}
    </span>
  );
}

/* ================================================================
 *  Switch card — Figma "Delivery Instructions" 1065:50156
 * ================================================================ */

function SwitchCard({
  card,
  choice,
  onPick,
  reduceMotion,
}: {
  card: V8Card;
  choice: string;
  onPick: (optionId: string) => void;
  reduceMotion: boolean;
}) {
  const index = Math.max(
    0,
    card.options.findIndex((o) => o.id === choice),
  );
  const ref = useRef<HTMLDivElement>(null);
  const pointerDownX = useRef<number | null>(null);
  /** Bumped by every tap — including one that doesn't change the choice. */
  const [playKey, setPlayKey] = useState(0);
  const [sonarKey, setSonarKey] = useState(0);
  const [sonarIndex, setSonarIndex] = useState(index);

  const top = index * V8_OPTION_H;

  // The thumb is a physical object: y is where it's told to be, `thumbY` is
  // where it actually is, and the stretch is read off how fast it's moving.
  const y = useMotionValue(top);
  const thumbY = useSpring(y, THUMB_SPRING);
  const velocity = useVelocity(thumbY);
  const stretchY = useSpring(
    useTransform(velocity, [-FULL_STRETCH_V, 0, FULL_STRETCH_V], [1.16, 1, 1.16]),
    SQUASH_SPRING,
  );
  const squashX = useSpring(
    useTransform(velocity, [-FULL_STRETCH_V, 0, FULL_STRETCH_V], [0.93, 1, 0.93]),
    SQUASH_SPRING,
  );

  useEffect(() => {
    y.set(top);
  }, [top, y]);

  const revealSelf = useCallback(() => {
    ref.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "nearest" });
  }, [reduceMotion]);

  const handleTap = (optionIndex: number, event: React.MouseEvent) => {
    const startX = pointerDownX.current;
    pointerDownX.current = null;
    if (startX !== null && Math.abs(event.clientX - startX) > DRAG_SLOP_PX) return;

    const option = card.options[optionIndex];
    setPlayKey((k) => k + 1);
    if (option.sound && !reduceMotion) {
      setSonarIndex(optionIndex);
      setSonarKey((k) => k + 1);
    }
    onPick(option.id);
    hapticTick();
    revealSelf();
  };

  return (
    <div
      ref={ref}
      className="relative shrink-0 overflow-hidden rounded-16 border border-solid border-[#eaecf0] bg-gradient-to-b from-[#eaecf0] to-[#f9f9fb]"
      style={{
        width: V8_CARD_W,
        height: V8_CARD_H,
        padding: V8_CARD_INSET - 1,
        // WebKit can let transformed children leak past overflow-hidden's
        // rounded corners; clip-path makes the radius a hard boundary.
        clipPath: "inset(0 round 16px)",
      }}
    >
      <div role="radiogroup" aria-label={card.groupLabel} className="relative" style={{ width: V8_OPTION_W, height: V8_OPTION_H * 2 }}>
        {/* Its own AnimatePresence, and not just for the key: the page sits in the
            app's page-transition AnimatePresence (initial={false}), and Motion
            hands that down, so anything mounting later inside the page would
            skip its entrance and appear already finished — an invisible ripple.
            A nearer AnimatePresence resets it. */}
        <AnimatePresence>
          {sonarKey > 0 && <Sonar key={sonarKey} centreY={sonarIndex * V8_OPTION_H + V8_OPTION_H / 2} />}
        </AnimatePresence>

        <motion.span
          aria-hidden="true"
          className="absolute left-0 top-0 rounded-12 border border-white bg-white drop-shadow-[0_1px_3px_rgba(34,34,34,0.1)] pointer-events-none will-change-transform"
          style={{
            width: V8_OPTION_W,
            height: V8_OPTION_H,
            y: reduceMotion ? y : thumbY,
            scaleX: reduceMotion ? 1 : squashX,
            scaleY: reduceMotion ? 1 : stretchY,
          }}
        />

        {card.options.map((option, i) => {
          const on = i === index;
          const lines = option.label.includes("\n") ? "whitespace-pre-line" : "";
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={option.label.replace("\n", " ")}
              onPointerDown={(event) => {
                pointerDownX.current = event.clientX;
              }}
              onClick={(event) => handleTap(i, event)}
              onFocus={revealSelf}
              className={`relative flex w-full items-center gap-2.5 rounded-12 px-3 text-left cursor-pointer ${FOCUS_RING}`}
              style={{ height: V8_OPTION_H }}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                <OptionGlyph
                  glyph={option.glyph}
                  size={option.glyphSize}
                  selected={on}
                  playKey={on ? playKey : 0}
                  reduceMotion={reduceMotion}
                />
              </span>
              {/* Both weights occupy the same cell and crossfade, so the label
                  never reflows as it changes weight. */}
              <span className="grid min-w-0 flex-1 text-[13px] leading-[18px] tracking-[-0.1px]">
                <motion.span
                  aria-hidden="true"
                  className={`[grid-area:1/1] font-semibold ${lines}`}
                  style={{ color: INK_PRIMARY }}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
                >
                  {option.label}
                </motion.span>
                <motion.span
                  aria-hidden="true"
                  className={`[grid-area:1/1] font-normal ${lines}`}
                  style={{ color: INK_TERTIARY }}
                  initial={false}
                  animate={{ opacity: on ? 0 : 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
                >
                  {option.label}
                </motion.span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
 *  Record row — Figma 1065:50186
 * ================================================================ */

const DISC_D = 26;
/** The play/pause artwork box that puts its disc at DISC_D. */
const DISC_ART = (DISC_D * 37) / DISC_IN_BOX;
/** Pulse rings are centred on the disc: row padding 12 + half the grown slot. */
const DISC_CX = 12 + (DISC_D + 2) / 2;

const DISC_SPRING = { type: "spring" as const, stiffness: 560, damping: 28, mass: 0.6 };

const NEXT_ON_TAP: Record<V8NoteState, V8NoteState> = {
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
  state: V8NoteState;
  onChange: (next: V8NoteState) => void;
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
    const id = window.setTimeout(() => onChange("recorded"), V8_NOTE_DURATION_MS);
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
      className="relative flex h-11 w-[327px] items-center gap-2 overflow-hidden rounded-12 px-3"
      style={{ backgroundColor: SURFACE_ROW, clipPath: "inset(0 round 12px)" }}
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
              style={{ width: DISC_D, height: DISC_D, left: DISC_CX - DISC_D / 2, top: 22 - DISC_D / 2, backgroundColor: INK_ACTION }}
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
          aria-label={V8_NOTE_ARIA[state]}
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
                <PlaybackRing box={36} r={16} durationMs={V8_NOTE_DURATION_MS} />
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
          text={V8_NOTE_CAPTION[state]}
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
          aria-label={V8_NOTE_ARIA[state]}
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

export type DeliveryInstructionsWidgetV8Props = {
  value: V8Value;
  onChange: (next: V8Value) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV8({ value, onChange, className = "" }: DeliveryInstructionsWidgetV8Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();

  const pick = (cardId: V8CardId, optionId: string) =>
    onChange({ ...value, choice: { ...value.choice, [cardId]: optionId } });

  // Stable, so RecordRow's playback timer isn't reset by unrelated re-renders.
  const valueRef = useRef(value);
  valueRef.current = value;
  const setNote = useCallback((note: V8NoteState) => onChange({ ...valueRef.current, note }), [onChange]);

  return (
    <section
      role="group"
      aria-labelledby={titleId}
      data-variant="8"
      className={`flex w-[351px] shrink-0 flex-col overflow-hidden rounded-16 bg-white ${className}`}
    >
      <div className="flex shrink-0 items-center px-3.5 py-3">
        <h2 id={titleId} className="text-[16px] leading-5 tracking-[-0.15px] font-bold" style={{ color: INK_PRIMARY }}>
          Give delivery instructions
        </h2>
      </div>

      <div
        className="
          shrink-0
          overflow-x-auto overflow-y-hidden overscroll-x-contain
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          [-webkit-overflow-scrolling:touch]
        "
      >
        {/* w-max, or flex shrinks the track to 351 and squashes the cards. */}
        <div className="flex w-max items-start gap-2.5 px-3 pt-1 pb-3">
          {V8_CARDS.map((card) => (
            <SwitchCard
              key={card.id}
              card={card}
              choice={value.choice[card.id]}
              onPick={(optionId) => pick(card.id, optionId)}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 px-3">
        <RecordRow state={value.note} onChange={setNote} reduceMotion={reduceMotion} />
      </div>

      {/* The box alone isn't a tap target — the whole row is the control. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={value.save}
        onClick={() => {
          onChange({ ...value, save: !value.save });
          hapticTick();
        }}
        className={`flex shrink-0 items-center gap-1.5 px-3.5 pt-3 pb-3.5 text-left cursor-pointer ${FOCUS_RING}`}
      >
        <InstructionCheckbox checked={value.save} knockout="#ffffff" reduceMotion={reduceMotion} />
        <span className="w-[286px] text-[13px] leading-5 tracking-[-0.1px]" style={{ color: INK_SECONDARY }}>
          Save this for future orders on this address
        </span>
      </button>
    </section>
  );
}
