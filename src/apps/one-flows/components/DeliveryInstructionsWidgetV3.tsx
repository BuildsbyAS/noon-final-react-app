/**
 * Delivery instructions carousel — v3 (Figma 856:80576, 351×214)
 *
 * Three questions and a voice note, laid out as a horizontally scrolling row of
 * slides that are deliberately different widths: a 103px voice card, a 261px
 * handoff card, and a 318px column holding the two 56px yes/no cards. The row
 * overflows the 351 frame — that's the design telling you it scrolls.
 *
 * Unlike v1 nothing opens and nothing is hidden: every answer is on screen, you
 * just travel to it. So the motion budget goes almost entirely into the switch.
 *
 * MOTION — the white thumb is a single shared element per question
 * (`layoutId`), so picking an option makes one pill *fly* to it on a spring
 * rather than one fading out while another fades in. The inline pills also
 * swap padding as they swap state (Figma draws the selected one at px-16 and
 * the unselected at px-10, which is why the track width works out identical
 * either way) — so the thumb grows into its new label as it travels, and
 * `layout` on the buttons keeps the neighbour's slide honest.
 *
 * The voice note is the only thing here with no designed states beyond idle, so
 * it stays deliberately small: the mic fills with action blue and pulses while
 * it listens, and the caption morphs through blur.
 *
 * Reduced motion: the thumb jumps, the pulse stops, captions swap.
 *
 * No <PageTransition> / <SkeletonGate> — this is a widget; OrderConfirmationPage
 * owns both for the screen.
 */
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { hapticTick } from "@ui";
import { InfoCircle } from "./deliveryInstructionIcons";
import { InstructionCheckbox } from "./MCheckbox";
import { CarouselGlyph, type CarouselGlyphId } from "./deliveryCarouselIcons";
import {
  CAROUSEL_QUESTIONS,
  DEFAULT_CAROUSEL_CHOICES,
  INLINE_QUESTIONS,
  NOTE_DURATION_MS,
  SLIDE_H,
  STACK_QUESTION,
  VOICE_CAPTION,
  VOICE_LABEL,
  VOICE_SLIDE_W,
  type CarouselChoices,
  type CarouselQuestion,
  type VoiceNoteState,
} from "./deliveryCarousel.model";

const SURFACE_CARD = "#f9f9fb";
const SURFACE_TRACK = "#f2f3f7";
const INK_PRIMARY = "#1d2539";
const INK_TERTIARY = "#666d85";
const INK_ACTION = "#0f61ff";

/** Apple-style spring notation — settle time and overshoot. */
const SPRING = { type: "spring", duration: 0.46, bounce: 0.2 } as const;
const SPRING_SNAPPY = { type: "spring", duration: 0.34, bounce: 0.16 } as const;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** A horizontal drag on the scrolling row must not read as a tap. */
const DRAG_SLOP_PX = 8;

const PROMPT_CLASS = "text-[13px] leading-5 tracking-[-0.1px] font-semibold";
const SEGMENT_CLASS = "text-[12px] leading-[18px] tracking-[-0.1px] font-semibold text-center whitespace-nowrap";
const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]";

/** The thumb's plate — white, hairline, and a shadow that lifts it off the track. */
const THUMB_CLASS =
  "absolute inset-0 rounded-full bg-white border border-white drop-shadow-[0_1px_3px_rgba(34,34,34,0.06)]";
/** Figma's M-Switch track: tertiary fill with a shadow pressed into the top edge. */
const TRACK_SHADOW = "inset 0 1px 4px 0 rgba(36,36,36,0.04)";

/** Guards a tap that was really the start of a horizontal scroll. */
function useTapGuard() {
  const downX = useRef<number | null>(null);
  return {
    onPointerDown: (event: React.PointerEvent) => {
      downX.current = event.clientX;
    },
    isTap: (event: React.MouseEvent) => {
      const startX = downX.current;
      downX.current = null;
      return startX === null || Math.abs(event.clientX - startX) <= DRAG_SLOP_PX;
    },
  };
}

function IconCircle({
  glyph,
  ink = INK_PRIMARY,
  surface = "#ffffff",
}: {
  glyph: CarouselGlyphId;
  ink?: string;
  surface?: string;
}) {
  return (
    <motion.span
      className="flex items-center justify-center rounded-full shrink-0 p-[6.75px]"
      initial={false}
      animate={{ backgroundColor: surface }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
    >
      <CarouselGlyph glyph={glyph} size={22.5} ink={ink} knockout={surface} />
    </motion.span>
  );
}

/* ================================================================
 *  Switch — one shared thumb per question
 * ================================================================ */

function Segment({
  option,
  on,
  stacked,
  thumbId,
  reduceMotion,
  onPick,
}: {
  option: CarouselQuestion["options"][number];
  on: boolean;
  stacked: boolean;
  thumbId: string;
  reduceMotion: boolean;
  onPick: () => void;
}) {
  const guard = useTapGuard();
  const surface = on ? "#ffffff" : SURFACE_TRACK;

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={on}
      layout={reduceMotion ? false : true}
      transition={{ layout: SPRING }}
      onPointerDown={guard.onPointerDown}
      onClick={(event) => {
        if (!guard.isTap(event)) return;
        onPick();
      }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      className={`
        relative flex h-8 shrink-0 items-center gap-1.5 rounded-full cursor-pointer
        ${
          // Stacked rows are a left-aligned list — Figma puts every icon at x=16
          // and every label at x=40, so centring makes the icons wander row to
          // row. The inline pills genuinely are centred (symmetric padding).
          stacked ? "w-full justify-start px-4" : `justify-center ${on ? "px-4" : "px-2.5"}`
        }
        ${FOCUS_RING}
      `}
    >
      {on && !reduceMotion && (
        <motion.span
          aria-hidden="true"
          layoutId={thumbId}
          className={THUMB_CLASS}
          transition={SPRING}
        />
      )}
      {on && reduceMotion && <span aria-hidden="true" className={THUMB_CLASS} />}

      {option.glyph && (
        <span className="relative z-10">
          <CarouselGlyph
            glyph={option.glyph}
            size={18}
            ink={on ? INK_PRIMARY : INK_TERTIARY}
            knockout={surface}
          />
        </span>
      )}
      <motion.span
        className={`relative z-10 ${SEGMENT_CLASS}`}
        initial={false}
        animate={{ color: on ? INK_PRIMARY : INK_TERTIARY }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: EASE_OUT }}
      >
        {option.label}
      </motion.span>
    </motion.button>
  );
}

function Switch({
  question,
  choice,
  onPick,
  reduceMotion,
  labelledBy,
}: {
  question: CarouselQuestion;
  choice: string;
  onPick: (optionId: string) => void;
  reduceMotion: boolean;
  labelledBy: string;
}) {
  const stacked = question.layout === "stack";
  const thumbId = `${question.id}-thumb`;

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={`
        relative shrink-0 p-1 flex
        ${stacked ? "h-full flex-col items-center justify-between rounded-[18px]" : "h-10 items-center justify-center rounded-full"}
      `}
      style={{
        width: question.trackWidth,
        backgroundColor: SURFACE_TRACK,
        boxShadow: TRACK_SHADOW,
      }}
    >
      {question.options.map((option) => (
        <Segment
          key={option.id}
          option={option}
          on={option.id === choice}
          stacked={stacked}
          thumbId={thumbId}
          reduceMotion={reduceMotion}
          onPick={() => {
            if (option.id === choice) return;
            onPick(option.id);
            hapticTick();
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================
 *  Cards
 * ================================================================ */

function StackCard({
  question,
  choice,
  onPick,
  reduceMotion,
}: {
  question: CarouselQuestion;
  choice: string;
  onPick: (optionId: string) => void;
  reduceMotion: boolean;
}) {
  const promptId = useId();
  return (
    // Asymmetric radii are the design's: 12 on the left where the card is square,
    // 24 on the right so the corner follows the switch's pill.
    <div
      className="shrink-0 snap-start flex items-center gap-2 overflow-hidden pl-3 pr-1.5 py-1.5 rounded-l-12 rounded-r-[24px]"
      style={{ width: 261, height: SLIDE_H, backgroundColor: SURFACE_CARD }}
    >
      {/* items-start, or the icon circle stretches to the prompt's 79px measure
          — a flex column stretches its children by default. */}
      <div className="flex shrink-0 flex-col items-start gap-3">
        <IconCircle glyph={question.glyph} />
        <p id={promptId} className={PROMPT_CLASS} style={{ width: question.promptWidth, color: INK_PRIMARY }}>
          {question.prompt}
        </p>
      </div>
      <Switch
        question={question}
        choice={choice}
        onPick={onPick}
        reduceMotion={reduceMotion}
        labelledBy={promptId}
      />
    </div>
  );
}

function InlineCard({
  question,
  choice,
  onPick,
  reduceMotion,
}: {
  question: CarouselQuestion;
  choice: string;
  onPick: (optionId: string) => void;
  reduceMotion: boolean;
}) {
  const promptId = useId();
  return (
    <div
      className="flex h-14 w-full items-center gap-2 overflow-hidden rounded-12 p-2"
      style={{ backgroundColor: SURFACE_CARD }}
    >
      <div className="flex min-w-px flex-1 items-center gap-2">
        <IconCircle glyph={question.glyph} />
        <p id={promptId} className={PROMPT_CLASS} style={{ width: question.promptWidth, color: INK_PRIMARY }}>
          {question.prompt}
        </p>
      </div>
      <Switch
        question={question}
        choice={choice}
        onPick={onPick}
        reduceMotion={reduceMotion}
        labelledBy={promptId}
      />
    </div>
  );
}

/* ================================================================
 *  Voice note
 * ================================================================ */

const PULSE_DELAYS = [0, 0.5];

/** Sweeps once around the play button for the length of the note. */
function ProgressRing() {
  const r = 19;
  const circumference = 2 * Math.PI * r;
  return (
    <svg
      aria-hidden="true"
      className="absolute pointer-events-none"
      width={42}
      height={42}
      viewBox="0 0 42 42"
      fill="none"
    >
      <motion.circle
        cx={21}
        cy={21}
        r={r}
        stroke={INK_ACTION}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={circumference}
        transform="rotate(-90 21 21)"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: NOTE_DURATION_MS / 1000, ease: "linear" }}
      />
    </svg>
  );
}

function VoiceCard({ reduceMotion }: { reduceMotion: boolean }) {
  const guard = useTapGuard();
  const [state, setState] = useState<VoiceNoteState>("idle");
  const timer = useRef<number | null>(null);

  const recording = state === "recording";
  const playing = state === "playing";
  /** Both post-record states draw the play button and Remove. */
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
    timer.current = window.setTimeout(() => setState("recorded"), NOTE_DURATION_MS);
  };

  const remove = () => {
    clearTimer();
    setState("idle");
    hapticTick();
  };

  return (
    <div
      className="relative shrink-0 snap-start flex flex-col items-center justify-center gap-[14px] overflow-hidden rounded-12 px-3 py-1.5"
      style={{ width: VOICE_SLIDE_W, height: SLIDE_H, backgroundColor: SURFACE_CARD }}
    >
      {/* Before there's a note the whole card is the target; once there is one
          it holds two real controls, so the overlay has to get out of the way. */}
      {!answered && (
        <button
          type="button"
          aria-label={VOICE_LABEL[state]}
          aria-pressed={recording}
          onPointerDown={guard.onPointerDown}
          onClick={(event) => {
            if (!guard.isTap(event)) return;
            toggleRecord();
          }}
          className={`absolute inset-0 z-20 rounded-12 cursor-pointer ${FOCUS_RING}`}
        />
      )}

      <motion.div layout="position" className="relative z-10 flex flex-col items-center gap-3">
        <span className="relative flex items-center justify-center">
          {recording &&
            !reduceMotion &&
            PULSE_DELAYS.map((delay) => (
              <motion.span
                key={delay}
                aria-hidden="true"
                className="absolute rounded-full"
                style={{ width: 36, height: 36, border: `2px solid ${INK_ACTION}` }}
                initial={{ scale: 1, opacity: 0.45 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 1.4, delay, repeat: Infinity, ease: EASE_OUT }}
              />
            ))}
          {playing && !reduceMotion && <ProgressRing key={state} />}

          {answered ? (
            <motion.button
              type="button"
              aria-label={playing ? "Stop playing your note" : "Play your note"}
              onPointerDown={guard.onPointerDown}
              onClick={(event) => {
                if (!guard.isTap(event)) return;
                togglePlay();
              }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={SPRING_SNAPPY}
              className={`relative flex size-9 items-center justify-center rounded-full bg-white cursor-pointer ${FOCUS_RING}`}
            >
              <CarouselGlyph glyph="playCircle" size={36} ink={INK_ACTION} knockout="#ffffff" />
            </motion.button>
          ) : (
            <IconCircle
              glyph="mic"
              ink={recording ? "#ffffff" : INK_PRIMARY}
              surface={recording ? INK_ACTION : "#ffffff"}
            />
          )}
        </span>

        {/* Caption morphs rather than swaps — the card is small enough that a
            hard cut reads as a glitch. */}
        <span className="relative flex w-[79px] justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={state}
              className={`${VOICE_CAPTION[state]} tracking-[-0.1px] font-semibold text-center`}
              style={{ color: INK_PRIMARY }}
              initial={reduceMotion ? false : { opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: reduceMotion ? 0.1 : 0.24, ease: EASE_OUT }}
            >
              {VOICE_LABEL[state]}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.div>

      <AnimatePresence initial={false}>
        {answered && (
          <motion.button
            type="button"
            onPointerDown={guard.onPointerDown}
            onClick={(event) => {
              if (!guard.isTap(event)) return;
              remove();
            }}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: EASE_OUT }}
            className={`relative z-10 flex h-6 shrink-0 items-center justify-center gap-1 rounded-4 px-1.5 py-1 cursor-pointer active:bg-black/5 ${FOCUS_RING}`}
          >
            <CarouselGlyph glyph="cross" size={16} ink={INK_PRIMARY} knockout={SURFACE_CARD} />
            <span
              className="text-[12px] leading-4 font-semibold whitespace-nowrap"
              style={{ color: INK_PRIMARY }}
            >
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

export type DeliveryInstructionsWidgetV3Props = {
  value: CarouselChoices;
  onChange: (next: CarouselChoices, question: CarouselQuestion["id"], optionId: string) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV3({
  value = DEFAULT_CAROUSEL_CHOICES,
  onChange,
  className = "",
}: DeliveryInstructionsWidgetV3Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();
  const [save, setSave] = useState(true);

  const pick = (question: CarouselQuestion, optionId: string) =>
    onChange({ ...value, [question.id]: optionId }, question.id, optionId);

  return (
    <section
      role="group"
      aria-labelledby={titleId}
      data-variant="3"
      className={`w-[351px] bg-white rounded-16 overflow-hidden flex flex-col shrink-0 ${className}`}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 px-4">
        <h2 id={titleId} className="text-h16 font-bold" style={{ color: INK_PRIMARY }}>
          Delivery instructions
        </h2>
        {/* Figma defines no behaviour for this glyph, so it stays decorative. */}
        <InfoCircle className="shrink-0 pointer-events-none" />
      </div>

      {/*
        - snap-x keeps a slide's left edge against the 12px inset instead of
          leaving a card half-committed
        - overscroll-x-contain stops an over-drag triggering iOS's back-swipe
        - overflow-y-hidden (not visible) avoids the spec coercing it to `auto`
          and adding a phantom vertical scrollbar
      */}
      <div
        className="
          h-[138px] shrink-0
          overflow-x-auto overflow-y-hidden overscroll-x-contain
          snap-x snap-mandatory scroll-pl-3
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          [-webkit-overflow-scrolling:touch]
        "
      >
        {/* w-max, or flex shrinks the track to 351 and squashes every slide. */}
        <div className="flex w-max items-start gap-2.5 px-3 pt-1">
          <VoiceCard reduceMotion={reduceMotion} />

          <StackCard
            question={STACK_QUESTION}
            choice={value[STACK_QUESTION.id]}
            onPick={(optionId) => pick(STACK_QUESTION, optionId)}
            reduceMotion={reduceMotion}
          />

          {/* The two yes/no cards share one slide so the column snaps as a unit. */}
          <div className="shrink-0 snap-start flex w-[318px] flex-col gap-2.5" style={{ height: SLIDE_H }}>
            {INLINE_QUESTIONS.map((question) => (
              <InlineCard
                key={question.id}
                question={question}
                choice={value[question.id]}
                onPick={(optionId) => pick(question, optionId)}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        role="checkbox"
        aria-checked={save}
        onClick={() => {
          setSave((s) => !s);
          hapticTick();
        }}
        className={`flex h-8 shrink-0 items-start gap-1.5 px-3.5 text-left cursor-pointer ${FOCUS_RING}`}
      >
        <InstructionCheckbox checked={save} knockout="#ffffff" reduceMotion={reduceMotion} />
        <span className="text-[13px] leading-5 tracking-[-0.1px]" style={{ color: INK_TERTIARY }}>
          Save this for future orders on this address
        </span>
      </button>
    </section>
  );
}
