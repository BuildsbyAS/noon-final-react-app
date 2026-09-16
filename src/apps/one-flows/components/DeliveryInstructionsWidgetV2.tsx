/**
 * Delivery preferences widget — v2
 *
 * Figma: Frame 2147242428 (859:81436) in "Post Order Updates", with the four
 * cards at 873:6517 (voice note), 873:6528 (call), 873:6555 (doorbell) and
 * 873:6579 (handoff). Geometry is the Figma geometry: 351 wide, 232 tall, cards
 * hugged to 103 / 106 / 110 / 140 so the fourth clips at the widget edge and
 * says "scroll me".
 *
 * A different decision shape from v3/v4. Those are four independent on/off
 * chips. This is three segmented controls, each always answered, and the
 * caption under each control IS the answer — so the caption has to change every
 * time the control does. Four things happen on a tap, in this order:
 *
 *  1. The thumb flies to the new segment on a spring, and STRETCHES along the
 *     way. The stretch isn't keyframed — it's derived from the thumb's own
 *     velocity (`useVelocity` → `useTransform` → a second spring to smooth it),
 *     so a jump across three segments stretches more than a jump across one.
 *     That's the difference between an animation and a physical object.
 *  2. The glyph plays its signature: the phone shakes about its earpiece, the
 *     bell swings about its crown, the door swings in 3D about its hinge. See
 *     `deliveryPreferenceGlyphs`.
 *  3. If the chosen segment stands for a SOUND (ring, call), two sonar rings
 *     leave the thumb and expand behind it, clipped to the track.
 *  4. The caption re-reads itself — words that survive the change slide to
 *     their new position, words that don't disassemble upward while the new
 *     ones assemble from below, letter by letter. See `TextMorph`.
 *
 * Tapping the segment that's already on replays 2 and 3 without changing
 * anything. It costs nothing and the control never feels dead.
 *
 * The voice-note card walks four states — idle → recording → recorded ⇄ playing
 * — plus Remove, which returns it to idle (Figma draws the two ends: 873:6517
 * and 877:6922). Pulse rings while it listens, a live level meter in the disc
 * while it records, and a progress ring sweeping the disc while it plays. Its
 * caption runs through the same morph as the segmented ones, which is where you
 * can watch that mechanic work at close range.
 *
 * Reduced motion: no travel, no stretch, no sonar, no pulse; the thumb jumps,
 * glyph colours change instantly and captions swap. Every state is still
 * reachable and still legible.
 *
 * No <PageTransition> / <SkeletonGate> here — this is a widget, and
 * OrderConfirmationPage owns both for the screen.
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
import { InfoCircle } from "./deliveryInstructionIcons";
import { InstructionCheckbox } from "./MCheckbox";
import TextMorph from "./TextMorph";
import {
  CrossGlyph,
  INK_ACTION,
  INK_PRIMARY,
  MicGlyph,
  NOTE_DISC_D,
  PauseGlyph,
  PlayGlyph,
  PlaybackRing,
  SURFACE_CARD,
  SURFACE_TRACK,
  SegmentGlyph,
  WaveformGlyph,
  glyphMakesSound,
} from "./deliveryPreferenceGlyphs";
import {
  CAPTION_H,
  CARD_H,
  NOTE_CARD,
  NOTE_DURATION_MS,
  PREFERENCE_CARDS,
  THUMB_H,
  TRACK_GAP,
  TRACK_H,
  TRACK_PAD,
  noteExists,
  segmentIndex,
  trackWidth,
  type DeliveryPreferences,
  type NoteState,
  type PreferenceCard,
  type PreferenceCardId,
} from "./deliveryPreferences.model";

const INK_SECONDARY = "#475067";
const INK_TERTIARY = "#666d85";

/** docs/INTERACTION_DESIGN.md's page curve, reused for reveals. */
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** A horizontal drag on the scrolling row must not read as a tap. */
const DRAG_SLOP_PX = 8;

/** Thumb travel. Quick, with just enough settle to feel like mass. */
const THUMB_SPRING = { stiffness: 420, damping: 30, mass: 0.9 };
/** Smooths the velocity-derived stretch so it can't jitter frame to frame. */
const SQUASH_SPRING = { stiffness: 480, damping: 26, mass: 0.6 };
/**
 * Velocity at which the thumb is fully stretched, px/s. A one-segment hop peaks
 * near 360, a three-segment jump near 660 — so one hop is a hint of stretch and
 * a long jump is the whole effect.
 */
const FULL_STRETCH_V = 600;

/**
 * 13px, not Figma's 12 — a Retune pass on the live screen called it, and at
 * this size the captions are the thing you actually read on the card. The
 * 18px leading stays: two lines still have to fit CAPTION_H exactly, so the
 * caption box can't reflow when a longer answer replaces a shorter one.
 */
const CAPTION_CLASS = "text-[13px] leading-[18px] tracking-[-0.1px] font-semibold text-center";
const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]";

/* ================================================================
 *  Sonar — sound leaving the thumb, clipped to the track
 * ================================================================ */

/** Two rings, the second a beat behind, so it reads as a pulse not a blip. */
const SONAR_DELAYS = [0, 0.09];
const SONAR_D = 26;

function Sonar({ playKey, centreX }: { playKey: number; centreX: number }) {
  if (playKey === 0) return null;
  const box = {
    width: SONAR_D,
    height: SONAR_D,
    left: centreX - SONAR_D / 2,
    top: (TRACK_H - SONAR_D) / 2,
  };
  return (
    // Its own clip layer rather than `overflow-hidden` on the track, so the
    // thumb's drop shadow isn't clipped along with the rings. The thumb is
    // opaque and sits above this, so what you actually see is the wave leaving
    // the pill and washing across the rest of the track.
    <span
      key={playKey}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
    >
      {/* Pressure: a filled wave that gives the rings something to be the edge
          of. Without it two hairlines read as decoration, not as sound. */}
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
 *  Segmented card
 * ================================================================ */

function SegmentedCard({
  card,
  choice,
  onPick,
  reduceMotion,
}: {
  card: PreferenceCard;
  choice: string;
  onPick: (segmentId: string) => void;
  reduceMotion: boolean;
}) {
  const index = segmentIndex(card, choice);
  const width = trackWidth(card);
  const ref = useRef<HTMLDivElement>(null);
  const pointerDownX = useRef<number | null>(null);
  /** Bumped by every tap — including one that doesn't change the choice. */
  const [playKey, setPlayKey] = useState(0);
  const [sonarKey, setSonarKey] = useState(0);

  const left = TRACK_PAD + index * (card.segWidth + TRACK_GAP);

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

  const revealSelf = useCallback(() => {
    ref.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [reduceMotion]);

  const handleTap = (segmentId: string, glyphSounds: boolean, event: React.MouseEvent) => {
    const startX = pointerDownX.current;
    pointerDownX.current = null;
    if (startX !== null && Math.abs(event.clientX - startX) > DRAG_SLOP_PX) return;

    setPlayKey((k) => k + 1);
    if (glyphSounds && !reduceMotion) setSonarKey((k) => k + 1);
    onPick(segmentId);
    hapticTick();
    revealSelf();
  };

  return (
    <div
      ref={ref}
      className="relative shrink-0 flex flex-col overflow-hidden rounded-12"
      style={{
        width: card.width,
        height: CARD_H,
        backgroundColor: SURFACE_CARD,
        // WebKit can let transformed children leak past overflow-hidden's
        // rounded corners; clip-path makes the radius a hard boundary.
        clipPath: "inset(0 round 12px)",
      }}
    >
      <div
        className="shrink-0 w-full flex items-center justify-center px-3 py-2.5"
        style={{ backgroundColor: SURFACE_TRACK }}
      >
        <span
          className="text-[10px] leading-[14px] font-bold tracking-[2px] text-center whitespace-nowrap"
          style={{ color: INK_TERTIARY }}
        >
          {card.kicker}
        </span>
      </div>

      <div
        className="flex-1 min-h-0 w-full flex flex-col items-center gap-1.5"
        style={{ padding: `${card.padY}px ${card.padX}px` }}
      >
        <div
          role="radiogroup"
          aria-label={card.groupLabel}
          className="relative shrink-0 rounded-full"
          style={{ width, height: TRACK_H, backgroundColor: SURFACE_TRACK }}
        >
          <Sonar playKey={sonarKey} centreX={left + card.segWidth / 2} />

          <motion.span
            aria-hidden="true"
            className="absolute rounded-full border border-white bg-white shadow-xs pointer-events-none will-change-transform"
            style={{
              left: 0,
              top: TRACK_PAD,
              width: card.segWidth,
              height: THUMB_H,
              x: reduceMotion ? x : thumbX,
              scaleX: reduceMotion ? 1 : stretchX,
              scaleY: reduceMotion ? 1 : stretchY,
            }}
          />

          <div className="relative flex items-center" style={{ gap: TRACK_GAP, padding: TRACK_PAD }}>
            {card.segments.map((segment) => {
              const on = segment.id === choice;
              return (
                <button
                  key={segment.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={segment.caption}
                  onPointerDown={(event) => {
                    pointerDownX.current = event.clientX;
                  }}
                  onClick={(event) => handleTap(segment.id, glyphMakesSound(segment.glyph), event)}
                  onFocus={revealSelf}
                  className={`flex items-center justify-center rounded-full cursor-pointer ${FOCUS_RING}`}
                  style={{ width: card.segWidth, height: THUMB_H }}
                >
                  <SegmentGlyph
                    glyph={segment.glyph}
                    size={card.glyphSize}
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

        <div className="w-full shrink-0" style={{ height: CAPTION_H }}>
          <TextMorph
            text={card.segments[index].caption}
            reduceMotion={reduceMotion}
            className={`w-full ${CAPTION_CLASS} text-[#1d2539]`}
          />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
 *  Voice-note card
 * ================================================================ */

const NOTE_CIRCLE = 36;
/**
 * The pulse rings are absolutely placed on the disc, so they need its centre.
 * Only `recording` draws them, and `recording` never shows Remove, so the
 * idle-arrangement maths (36 + 12 + 36, centred in 140) is the only case.
 */
const NOTE_CIRCLE_CY = (CARD_H - (NOTE_CIRCLE + 12 + CAPTION_H)) / 2 + NOTE_CIRCLE / 2;

/** Disc pop, shared by the blue coming in and the glyph swapping inside it. */
const DISC_SPRING = { type: "spring" as const, stiffness: 560, damping: 28, mass: 0.6 };

/**
 * The disc: one white 36px circle for every state, with the blue growing inside
 * it the moment a note starts existing and never resizing again. Four glyphs
 * are mounted and crossfaded over it — mic, level meter, play, pause — because
 * a glyph that pops out as the next pops in reads as two icons, not one control
 * changing its mind.
 */
function NoteDisc({ state, reduceMotion }: { state: NoteState; reduceMotion: boolean }) {
  const idle = state === "idle";
  const recording = state === "recording";
  const t = { duration: reduceMotion ? 0 : 0.18, ease: "easeOut" as const };

  const layer = (on: boolean) => ({
    initial: false as const,
    animate: { opacity: on ? 1 : 0, scale: on ? 1 : 0.72 },
    transition: t,
    className: "absolute flex items-center justify-center pointer-events-none",
  });

  return (
    <span
      aria-hidden="true"
      className="relative flex items-center justify-center rounded-full bg-white shrink-0"
      style={{ width: NOTE_CIRCLE, height: NOTE_CIRCLE }}
    >
      {/* The blue disc, for the three states that have a note (or are making
          one). Same radius as the Figma play glyph's, so play and pause simply
          draw on top of the same circle. */}
      <motion.span
        className="absolute rounded-full pointer-events-none"
        style={{ width: NOTE_DISC_D, height: NOTE_DISC_D, backgroundColor: INK_ACTION }}
        initial={false}
        animate={{ scale: idle ? 0.55 : 1, opacity: idle ? 0 : 1 }}
        transition={reduceMotion ? { duration: 0 } : DISC_SPRING}
      />

      <motion.span {...layer(idle)} style={{ color: INK_PRIMARY }}>
        <MicGlyph size={22.5} ink="currentColor" />
      </motion.span>
      <motion.span {...layer(recording)}>
        <WaveformGlyph size={20} ink="#ffffff" live={recording} reduceMotion={reduceMotion} />
      </motion.span>
      <motion.span {...layer(state === "recorded")}>
        <PlayGlyph />
      </motion.span>
      <motion.span {...layer(state === "playing")}>
        <PauseGlyph />
      </motion.span>
    </span>
  );
}

/** What a tap on the disc does, per state. */
const DISC_TAP: Record<NoteState, NoteState> = {
  idle: "recording",
  recording: "recorded",
  recorded: "playing",
  playing: "recorded",
};

function NoteCard({
  state,
  onChange,
  reduceMotion,
}: {
  state: NoteState;
  onChange: (next: NoteState) => void;
  reduceMotion: boolean;
}) {
  const recording = state === "recording";
  const playing = state === "playing";
  const hasNote = noteExists(state);
  const [pressed, setPressed] = useState(false);

  // Playback ends by itself. Re-keyed on `playing`, so pausing and playing
  // again restarts the clock rather than inheriting the old one's remainder.
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => onChange("recorded"), NOTE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [playing, onChange]);

  const advance = () => {
    onChange(DISC_TAP[state]);
    hapticTick();
  };

  // Before a note exists the whole card is the target — there's only one thing
  // to do with it, and a 103×140 target beats a 36×36 one. Once a note exists
  // there are two things to do (play, remove), so the card stops being a
  // control and the disc becomes the button. Buttons can't nest, so it's one or
  // the other, never both.
  const cardIsButton = !hasNote;

  return (
    <motion.div
      className="relative shrink-0 flex flex-col items-center justify-center gap-[14px] overflow-hidden rounded-12"
      style={{
        width: NOTE_CARD.width,
        height: CARD_H,
        paddingLeft: NOTE_CARD.padX,
        paddingRight: NOTE_CARD.padX,
        paddingTop: 6,
        paddingBottom: 6,
        backgroundColor: SURFACE_CARD,
        clipPath: "inset(0 round 12px)",
      }}
      initial={false}
      animate={{ scale: pressed && !reduceMotion ? 0.97 : 1 }}
      transition={{ type: "spring", stiffness: 700, damping: 34, mass: 0.5 }}
    >
      {/* Listening: two discs leave the circle on a slow loop. Clipped by the
          card, which is what makes them read as filling it rather than
          floating over the row. */}
      {recording &&
        !reduceMotion &&
        SONAR_DELAYS.map((_, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="absolute rounded-full pointer-events-none will-change-transform"
            style={{
              width: NOTE_CIRCLE,
              height: NOTE_CIRCLE,
              left: NOTE_CARD.width / 2 - NOTE_CIRCLE / 2,
              top: NOTE_CIRCLE_CY - NOTE_CIRCLE / 2,
              backgroundColor: INK_ACTION,
            }}
            initial={{ scale: 1, opacity: 0.22 }}
            animate={{ scale: 3.1, opacity: 0 }}
            transition={{ duration: 1.6, delay: i * 0.8, repeat: Infinity, ease: "easeOut" }}
          />
        ))}

      {/* `layout` because Remove appearing recentres this stack 19px upward —
          it should slide there, not teleport. */}
      <motion.div
        layout={!reduceMotion}
        transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.8 }}
        className="relative flex flex-col items-center gap-3"
      >
        {cardIsButton ? (
          <NoteDisc state={state} reduceMotion={reduceMotion} />
        ) : (
          <motion.button
            type="button"
            aria-label={NOTE_CARD.ariaLabel[state]}
            onClick={advance}
            whileTap={reduceMotion ? undefined : { scale: 0.93 }}
            transition={{ type: "spring", stiffness: 700, damping: 34, mass: 0.5 }}
            className={`relative flex items-center justify-center rounded-full cursor-pointer shrink-0 ${FOCUS_RING}`}
            style={{ width: NOTE_CIRCLE, height: NOTE_CIRCLE }}
          >
            {/* The ring lives outside the 36px disc, so it can't be in flow —
                keyed on the state so each play restarts the sweep from 12
                o'clock rather than resuming a stale one. */}
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
                  <PlaybackRing durationMs={NOTE_DURATION_MS} />
                </motion.span>
              )}
            </AnimatePresence>
            <NoteDisc state={state} reduceMotion={reduceMotion} />
          </motion.button>
        )}

        <span className="block shrink-0" style={{ width: NOTE_CARD.captionWidth, height: CAPTION_H }}>
          <TextMorph
            text={NOTE_CARD.caption[state]}
            reduceMotion={reduceMotion}
            className={`w-full ${CAPTION_CLASS} text-[#1d2539]`}
          />
        </span>
      </motion.div>

      {/* M-TextButtonNeutral, A12 (877:6933). Only exists once a note does. */}
      <AnimatePresence initial={false}>
        {hasNote && (
          <motion.button
            key="remove"
            type="button"
            aria-label={NOTE_CARD.removeLabel}
            onClick={() => {
              onChange("idle");
              hapticTick();
            }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            className={`relative flex items-center justify-center gap-1 h-6 px-1.5 py-1 rounded-4 shrink-0 cursor-pointer ${FOCUS_RING}`}
            initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 4, filter: "blur(3px)" }}
            transition={{ duration: reduceMotion ? 0 : 0.22, delay: hasNote ? 0.06 : 0, ease: "easeOut" }}
          >
            <CrossGlyph size={16} />
            <span className="text-a12 font-semibold whitespace-nowrap" style={{ color: INK_PRIMARY }}>
              Remove
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {cardIsButton && (
        <button
          type="button"
          aria-label={NOTE_CARD.ariaLabel[state]}
          onClick={advance}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerCancel={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          className={`absolute inset-0 z-10 cursor-pointer rounded-12 ${FOCUS_RING}`}
        />
      )}
    </motion.div>
  );
}

/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV2Props = {
  value: DeliveryPreferences;
  onChange: (next: DeliveryPreferences) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV2({
  value,
  onChange,
  className = "",
}: DeliveryInstructionsWidgetV2Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();

  const pick = (cardId: PreferenceCardId, segmentId: string) =>
    onChange({ ...value, choice: { ...value.choice, [cardId]: segmentId } });

  return (
    <section
      role="group"
      aria-labelledby={titleId}
      data-variant="2"
      className={`w-[351px] bg-white rounded-16 overflow-hidden flex flex-col ${className}`}
    >
      <div className="flex items-center gap-1 px-4 py-3 shrink-0">
        <h2 id={titleId} className="text-h16 font-bold" style={{ color: INK_PRIMARY }}>
          Delivery instructions
        </h2>
        <InfoCircle className="shrink-0 pointer-events-none" />
      </div>

      <div
        className="
          shrink-0
          overflow-x-auto overflow-y-hidden overscroll-x-contain
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          [-webkit-overflow-scrolling:touch]
        "
      >
        <div className="flex w-max items-start gap-2.5 px-3 pt-1 pb-3">
          <NoteCard
            state={value.note}
            onChange={(note) => onChange({ ...value, note })}
            reduceMotion={reduceMotion}
          />
          {PREFERENCE_CARDS.map((card) => (
            <SegmentedCard
              key={card.id}
              card={card}
              choice={value.choice[card.id]}
              onPick={(segmentId) => pick(card.id, segmentId)}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>

      {/* The box alone is not a tap target — the whole row is the control. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={value.save}
        onClick={() => {
          onChange({ ...value, save: !value.save });
          hapticTick();
        }}
        className={`flex items-center gap-1.5 shrink-0 px-[14px] pb-3 text-left cursor-pointer rounded-4 ${FOCUS_RING}`}
      >
        <InstructionCheckbox checked={value.save} knockout="#ffffff" reduceMotion={reduceMotion} />
        <span className="text-[13px] leading-5 tracking-[-0.1px]" style={{ color: INK_SECONDARY }}>
          Save this for future orders on this address
        </span>
      </button>
    </section>
  );
}
