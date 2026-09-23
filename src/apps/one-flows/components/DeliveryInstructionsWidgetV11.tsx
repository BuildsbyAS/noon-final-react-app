/**
 * "Instructions your rider" — v11 (Figma 1196:61474, 351×205)
 *
 * A modification of v4 with "Leave with security" gone. Three chips:
 *  - Leave items at the door, Don't ring my doorbell — TOGGLES (checkbox).
 *  - Call me at delivery — opens an ACTION SHEET ("At delivery, the rider
 *    should": Call me / No calls), anchored below the chip while the page
 *    recedes.
 *
 * v4's showcase motion: every change plays a short illustration clip
 * full-bleed inside the chip, and only when it ends does the chip settle into
 * its new state (checkbox fills / icon and label change). The answer itself
 * changes on tap, so assistive tech is never behind. Each direction has its own
 * clip — checking "Leave items" plays leave-at-door, unchecking plays the
 * hand-over; "Don't ring" plays the silent doorbell, un-setting it the ring;
 * the sheet's Call me / No calls play call-me / avoid-calling.
 *
 * When a toggle's clip ends it settles exactly like v4: the selected blue
 * blooms from the tap point, the ring latches, the checkbox pops last; turning
 * it off dims the blue from the whole surface. (Copied from v5's engine.)
 *
 * Calling starts on "Call me at delivery". While its sheet is open everything
 * else recedes (Figma 1205:3513: 10% + 2px blur), the chip's icon fades, and
 * its chevron turns action blue.
 *
 * Reduced motion: no clips; states swap.
 *
 * No <PageTransition> / <SkeletonGate> — this is a widget; OrderConfirmationPage
 * owns both for the screen.
 */
import "motion-icons-react/style.css";
import { useEffect, useId, useRef, useState } from "react";
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
  InfoCircle16,
  V11Glyph,
  type V11GlyphId,
} from "./deliveryInstructionsV11Icons";
import {
  ActionSheet,
  SPRING_SNAPPY,
  EASE_OUT,
  useAnchoredOptions,
} from "./deliveryInstructionsV11Sheet";
import {
  DEFAULT_V11_VALUE,
  V11_LABEL,
  V11_SHEET_TITLE,
  type V11CallChoice,
  type V11Value,
} from "./deliveryInstructionsV11.model";
import leaveAtDoorClip from "../assets/order-confirmation/leave-at-door.mp4";
import dontRingClip from "../assets/order-confirmation/dont-ring-the-bell.mp4";
import avoidCallingClip from "../assets/order-confirmation/avoid-calling.mp4";
import giveItemsClip from "../assets/delivery-instructions-v11/give-items-to-me.mp4";
import ringBellClip from "../assets/delivery-instructions-v11/ring-bell.mp4";
import callMeClip from "../assets/delivery-instructions-v11/call-me.mp4";

const INK_PRIMARY = "#1d2539";
const INK_TERTIARY = "#666d85";
const SURFACE_CHIP = "#f9f9fb";
const SURFACE_TERTIARY = "#f2f3f7";
const SURFACE_ACTION_BOLD = "#0f7eff";
/** The hairline ring around the chevron at rest. */
const BORDER_CHEVRON = "#d0d4dd";

const CARD_W = 351;
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
  opts: { settle?: Transition } = {},
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
          ? { duration: 0.12, ease: "easeOut" }
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

const CHIP_CLASS = `relative flex h-[100px] min-w-px flex-1 flex-col items-start gap-4 overflow-hidden rounded-12 p-2.5 text-left cursor-pointer ${FOCUS_RING}`;
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

/** Covers the 102×100 chip from any tap point. */
const INK_DIAMETER = 320;
/** Keyboard toggles bloom from the checkbox (24px, 10px in from the corner). */
const CHECKBOX_CENTRE: Point = { x: 102 - 10 - 12, y: 10 + 12 };
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
  glyph: V11GlyphId;
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
        <V11Glyph glyph={glyph} ink={INK_PRIMARY} knockout={knockout} />
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

const CALL_GLYPH: Record<V11CallChoice, V11GlyphId> = {
  call: "callRinging",
  noCall: "callOff",
};
const CALL_LABEL: Record<V11CallChoice, string> = {
  call: V11_LABEL.call,
  noCall: V11_LABEL.noCall,
};

/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV11Props = {
  value: V11Value;
  onChange: (next: V11Value) => void;
  /** Fires as the action sheet opens and closes, so the page can recede. */
  onSheetOpenChange?: (open: boolean) => void;
  className?: string;
};

export default function DeliveryInstructionsWidgetV11({
  value = DEFAULT_V11_VALUE,
  onChange,
  onSheetOpenChange,
  className = "",
}: DeliveryInstructionsWidgetV11Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();
  const { rootRef, triggerRef, open, anchor, toggle, close } =
    useAnchoredOptions<"call">({
      reduceMotion,
      onOpenChange: onSheetOpenChange,
    });

  const callClips = useClips<"call" | "noCall">(reduceMotion);
  const [shownCall, setShownCall] = useState<V11CallChoice>(value.call);
  useEffect(() => {
    if (callClips.playing === null) setShownCall(value.call);
  }, [callClips.playing, value.call]);

  const sheetOpen = open === "call";
  const recede = (dimmed: boolean) => ({
    initial: false as const,
    animate: {
      opacity: dimmed ? 0.1 : 1,
      filter: dimmed && !reduceMotion ? "blur(2px)" : "blur(0px)",
    },
    transition: { duration: reduceMotion ? 0 : 0.24, ease: EASE_OUT },
  });

  return (
    <div ref={rootRef} className={`relative w-[351px] shrink-0 ${className}`}>
      <section
        role="group"
        aria-labelledby={titleId}
        data-variant="11"
        className="flex w-full flex-col overflow-hidden rounded-16 bg-white"
      >
        <motion.div
          {...recede(sheetOpen)}
          className="flex h-11 shrink-0 items-center gap-1 px-4"
        >
          <h2
            id={titleId}
            className="text-[16px] leading-5 tracking-[-0.15px] font-bold"
            style={{ color: INK_PRIMARY }}
          >
            Instructions your rider
          </h2>
          {/* Figma defines no behaviour for this glyph, so it stays decorative. */}
          <InfoCircle16 />
        </motion.div>

        <div className="flex shrink-0 items-start gap-2.5 px-3 pt-1 pb-3">
          <motion.div {...recede(sheetOpen)} className="flex min-w-px flex-1">
            <ToggleChip
              glyph="door"
              label={V11_LABEL.leaveAtDoor}
              checked={value.leaveAtDoor}
              clipOn={leaveAtDoorClip}
              clipOff={giveItemsClip}
              onToggle={() =>
                onChange({ ...value, leaveAtDoor: !value.leaveAtDoor })
              }
              reduceMotion={reduceMotion}
            />
          </motion.div>
          <motion.div {...recede(sheetOpen)} className="flex min-w-px flex-1">
            <ToggleChip
              glyph="bellOff"
              label={V11_LABEL.noRing}
              checked={value.noRing}
              clipOn={dontRingClip}
              clipOff={ringBellClip}
              onToggle={() => onChange({ ...value, noRing: !value.noRing })}
              reduceMotion={reduceMotion}
            />
          </motion.div>

          {/* Same wrapper as the toggles: a padded <button> as the flex item
              itself starts 20px wider (flex can't shrink below padding). */}
          <div className="flex min-w-px flex-1">
            <motion.button
              ref={triggerRef("call")}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-label={`${CALL_LABEL[value.call].replace("\n", " ")}. Change.`}
              onClick={() => toggle("call")}
              whileTap={reduceMotion ? undefined : { scale: 0.965 }}
              transition={{
                type: "spring",
                stiffness: 700,
                damping: 34,
                mass: 0.5,
              }}
              className={CHIP_CLASS}
              style={{
                backgroundColor: SURFACE_CHIP,
                clipPath: "inset(0 round 12px)",
              }}
            >
              <span className="flex w-full items-start justify-between">
                {/* Figma 1205:3513: the icon fades out of focus while the sheet is open. */}
                <motion.span
                  className="relative block size-6 shrink-0"
                  initial={false}
                  animate={{
                    opacity: sheetOpen ? 0.2 : 1,
                    filter:
                      sheetOpen && !reduceMotion ? "blur(2px)" : "blur(0px)",
                  }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.24,
                    ease: EASE_OUT,
                  }}
                >
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
                      <V11Glyph
                        glyph={CALL_GLYPH[shownCall]}
                        ink={INK_PRIMARY}
                        knockout={SURFACE_CHIP}
                      />
                    </motion.span>
                  </AnimatePresence>
                </motion.span>
                {/* White with a hairline ring at rest; action blue with a white
                    chevron while open. */}
                <motion.span
                  aria-hidden="true"
                  className="relative flex size-6 shrink-0 items-center justify-center rounded-full border border-solid border-[#d0d4dd] bg-white"
                  initial={false}
                  animate={{
                    backgroundColor: sheetOpen ? SURFACE_ACTION_BOLD : "#ffffff",
                    borderColor: sheetOpen ? SURFACE_ACTION_BOLD : BORDER_CHEVRON,
                  }}
                  transition={reduceMotion ? { duration: 0 } : SPRING_SNAPPY}
                >
                  <ChevronDown16 ink={sheetOpen ? "#ffffff" : INK_PRIMARY} />
                </motion.span>
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
              {callClips.video("call", callMeClip)}
              {callClips.video("noCall", avoidCallingClip)}
            </motion.button>
          </div>
        </div>

        <motion.div
          {...recede(sheetOpen)}
          aria-hidden="true"
          className="h-px w-full shrink-0"
          style={{ backgroundColor: SURFACE_TERTIARY }}
        />

        {/* Figma 1205:3513 blurs this row but fades only its text (to 20%). */}
        <motion.button
          initial={false}
          animate={{
            filter: sheetOpen && !reduceMotion ? "blur(2px)" : "blur(0px)",
          }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: EASE_OUT }}
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
          <motion.span
            className="w-[286px] text-[13px] leading-5 tracking-[-0.1px] font-medium"
            style={{ color: INK_TERTIARY }}
            initial={false}
            animate={{ opacity: sheetOpen ? 0.2 : 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: EASE_OUT }}
          >
            Save this for future orders on this address
          </motion.span>
        </motion.button>
      </section>

      <AnimatePresence>
        {sheetOpen && anchor && (
          <ActionSheet
            key="call"
            title={V11_SHEET_TITLE}
            options={[
              { id: "call", label: "Call me", glyph: "callRinging" },
              { id: "noCall", label: "No calls", glyph: "callOff" },
            ]}
            anchor={anchor}
            containerWidth={CARD_W}
            selectedId={value.call}
            reduceMotion={reduceMotion}
            onSelect={(optionId) => {
              const next = optionId as "call" | "noCall";
              // Close at once, then play the answer's clip in the chip — start()
              // runs inside this tap, which iOS needs to allow play().
              close();
              callClips.start(next);
              onChange({ ...value, call: next });
              hapticTick();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
