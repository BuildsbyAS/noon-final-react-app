/**
 * "Give delivery instructions" — v8 (Figma 1065:50139, 351×264)
 *
 * Three cards in a horizontally scrolling row — call (1065:50108), handoff
 * (1065:50120), doorbell (1065:50129) — each a two-option vertical switch that
 * is always answered. The third card overflows the frame, which says "scroll".
 * Below: a record row and the save preference.
 *
 * ON TOGGLE — v4's showcase: the card's short illustration clip plays
 * full-bleed over the whole card (a play() inside the tap, for iOS). The answer
 * changes at once for assistive tech, but the visible selection waits for the
 * clip: when it ends it dissolves and the white thumb springs to the new option,
 * stretching with its own velocity (v2's thumb, copied). Re-tapping replays the
 * clip. Each option has its own clip (see OPTION_CLIP).
 *
 * The record row walks idle → recording → recorded ⇄ playing, plus Remove:
 * pulse rings while it listens, a live level meter in the disc, a progress ring
 * while it plays, and the caption re-reads itself through TextMorph (all v2's,
 * copied — v8 imports nothing from v2 or v4).
 *
 * Reduced motion: no clips, no stretch, no pulses; the thumb jumps and colours
 * and captions swap.
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
import avoidCallingClip from "../assets/order-confirmation/avoid-calling.mp4";
import leaveAtDoorClip from "../assets/order-confirmation/leave-at-door.mp4";
import dontRingTheBellClip from "../assets/order-confirmation/dont-ring-the-bell.mp4";
import callMeClip from "../assets/delivery-instructions-v8/call-me.mp4";
import ringBellClip from "../assets/delivery-instructions-v8/ring-bell.mp4";
import giveItemsClip from "../assets/delivery-instructions-v8/give-items-to-me.mp4";
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

/** Two pulse rings, the second a beat behind — used by the record row. */
const SONAR_DELAYS = [0, 0.09];

/* ================================================================
 *  Clips — v4's showcase illustrations
 * ================================================================ */

/** The clip each option plays when picked. */
const OPTION_CLIP: Record<V8CardId, Record<string, string>> = {
  call: { call: callMeClip, noCall: avoidCallingClip },
  handoff: { hand: giveItemsClip, door: leaveAtDoorClip },
  doorbell: { ring: ringBellClip, silent: dontRingTheBellClip },
};

/** If `ended` never fires (stalled decode), hand off to the selected state anyway. */
const CLIP_FALLBACK_MS = 2400;

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
  // One preloaded video per option, so whichever is tapped starts instantly
  // inside the gesture (iOS won't let a src swap + play() count as one).
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const pointerDownX = useRef<number | null>(null);
  /** Which option's clip is playing, if any. */
  const [playing, setPlaying] = useState<number | null>(null);
  const clipPlaying = playing !== null;
  // The answer changes on tap (aria-checked is honest at once), but the thumb
  // and the label weights wait for the clip — the clip IS the transition.
  const [shownIndex, setShownIndex] = useState(index);
  useEffect(() => {
    if (!clipPlaying) setShownIndex(index);
  }, [clipPlaying, index]);

  useEffect(() => {
    if (!clipPlaying) return;
    const id = window.setTimeout(() => setPlaying(null), CLIP_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [clipPlaying, playing]);

  const top = shownIndex * V8_OPTION_H;

  // The thumb is still a physical object once the clip hands over: it springs
  // to the new option and stretches with its own velocity.
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

    // play() must be called inside the user gesture for iOS. If the clip can't
    // start (not buffered, autoplay policy) we skip straight to the selection
    // rather than leaving the card stuck. Re-tapping replays it.
    const clip = videoRefs.current[optionIndex];
    if (clip && !reduceMotion) {
      videoRefs.current.forEach((other, i) => {
        if (other && i !== optionIndex) other.pause();
      });
      clip.currentTime = 0;
      setPlaying(optionIndex);
      clip.play().catch(() => setPlaying((p) => (p === optionIndex ? null : p)));
    }
    onPick(card.options[optionIndex].id);
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
          const shown = i === shownIndex;
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
                <OptionGlyph glyph={option.glyph} size={option.glyphSize} selected={shown} reduceMotion={reduceMotion} />
              </span>
              {/* Both weights occupy the same cell and crossfade, so the label
                  never reflows as it changes weight. */}
              <span className="grid min-w-0 flex-1 text-[13px] leading-[18px] tracking-[-0.1px]">
                <motion.span
                  aria-hidden="true"
                  className={`[grid-area:1/1] font-semibold ${lines}`}
                  style={{ color: INK_PRIMARY }}
                  initial={false}
                  animate={{ opacity: shown ? 1 : 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
                >
                  {option.label}
                </motion.span>
                <motion.span
                  aria-hidden="true"
                  className={`[grid-area:1/1] font-normal ${lines}`}
                  style={{ color: INK_TERTIARY }}
                  initial={false}
                  animate={{ opacity: shown ? 0 : 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
                >
                  {option.label}
                </motion.span>
              </span>
            </button>
          );
        })}
      </div>

      {/* v4's showcase: while it plays the card IS the illustration, full-bleed
          over both options; when it ends it dissolves as the thumb springs to
          the new answer. Always mounted (hidden) so play() is instant. Taps
          pass through it to the options underneath, so a new pick mid-clip
          simply restarts it. */}
      {card.options.map((option, i) => (
        <motion.video
          key={option.id}
          ref={(el) => {
            videoRefs.current[i] = el;
          }}
          src={OPTION_CLIP[card.id][option.id]}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          initial={false}
          animate={{ opacity: playing === i ? 1 : 0 }}
          transition={playing === i ? { duration: 0.12, ease: "easeOut" } : { duration: 0.28, ease: "easeOut" }}
          onEnded={() => setPlaying((p) => (p === i ? null : p))}
        />
      ))}
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
