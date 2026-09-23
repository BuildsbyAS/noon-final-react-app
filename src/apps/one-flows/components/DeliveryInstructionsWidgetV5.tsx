/**
 * Delivery instructions widget — v5 (accent motion iteration)
 *
 * The four-chip card, and the shared engine behind v4, which is a thin wrapper
 * passing `palette` / `showcase` down to it. Geometry, contract and
 * accessibility match the original Figma chips (699:40691); the motion is what
 * this iteration changes:
 *
 *  - Icons are Lucide "scenes" that tell a story on select and a different
 *    one on deselect (see deliveryInstructionScenes).
 *  - The chip doesn't fade to blue — a glow warms under your fingertip on
 *    pointerdown, and on release it FILLS with ink from that exact point, in
 *    the instruction's own colour, then settles into the design system's
 *    selected blue. Deselect is lights-out: the ring unlatches first, then
 *    the fill dims from the whole surface — a different feeling, not a rewind.
 *  - Six sparks leave the tap point on select only, so deselect stays quiet.
 *  - The checkbox is the CONSEQUENCE: it confirms last (~260ms, once the icon's
 *    story has landed) and withdraws first on deselect. It pops with
 *    motion-icons-react's `motion-success` keyframe and dips with
 *    `motion-press`. (The library's <MotionIcon> itself is too coarse for this
 *    choreography — a one-shot replay needs a remount and its default duration
 *    is 1000ms — so we use its stylesheet directly and Lucide's glyphs.)
 *
 * Reduced motion: ink and sparks collapse to a 100ms colour change; the
 * library's classes degrade to fades on their own; scenes crossfade.
 */
import "motion-icons-react/style.css";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { hapticTick } from "@ui";
import { InfoCircle } from "./deliveryInstructionIcons";
import { InstructionCheckbox } from "./MCheckbox";
import { InstructionScene } from "./deliveryInstructionScenes";
import {
  INSTRUCTION_ARIA_LABEL,
  INSTRUCTION_LABEL,
  INSTRUCTION_ORDER,
  toggleInstruction,
  type InstructionId,
} from "./deliveryInstructions.model";

const SURFACE_DEFAULT = "#f9f9fb";
const SURFACE_SELECTED = "#ebf4ff";
const BORDER_ACTION = "214,233,255"; // #d6e9ff as rgb parts so the ring's alpha can animate
const INK_PRIMARY = "#1d2539";
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;
const DRAG_SLOP_PX = 8;

/** The checkbox confirms once the icon's story has landed. */
const CONFIRM_DELAY_MS = 260;

/** Chip geometry — the checkbox centre is where keyboard selections originate. */
const CARD_W = 96;
const CHECKBOX_CENTRE = { x: CARD_W - 10 - 10, y: 10 + 10 };

/**
 * Each instruction spreads in its own colour ("wash") before settling on the
 * system's selected blue, so the chip briefly *is* the thing you chose. All
 * from repo tokens: brand-blue / purple / orange / noon-yellow ramps.
 */
const ACCENT: Record<InstructionId, { wash: string; spark: string }> = {
  door: { wash: "#bddbff", spark: "#0f61ff" },
  security: { wash: "#efcafc", spark: "#ad24db" },
  call: { wash: "#fedbb4", spark: "#e5641a" },
  bell: { wash: "#fff77a", spark: "#f5c400" },
};

/** v4: the same two-beat bloom, but every instruction blooms in blue (brand-blue-300 → selected blue). */
const BLUE_ONLY = { wash: "#bddbff", spark: "#0f61ff" };

export type InkPalette = "accent" | "blue";

type Point = { x: number; y: number };

/* ================================================================
 *  Ink — warms under the finger, floods from it, dims from everywhere
 * ================================================================ */

/** Diameter that covers the 96×100 chip from any tap point (farthest corner ≈139px). */
const INK_DIAMETER = 320;

function Ink({
  selected,
  pressed,
  origin,
  wash,
  reduceMotion,
}: {
  selected: boolean;
  pressed: boolean;
  origin: Point;
  wash: string;
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

  // Two beats from the same point under the finger, as two stacked discs:
  //   1. the WASH (the instruction's colour) blooms out on release
  //   2. the BLUE (system selected colour) blooms out on top ~220ms later and
  //      overtakes it — the story lands, the world calms down
  // It's a moving edge between two colours, never a blend: orange→blue or
  // yellow→blue mixed in RGB passes through mud, and alpha compositing is the
  // same arithmetic. The wash simply stays opaque underneath.
  //
  // pre-glow: a small wash disc under the fingertip before release;
  // pre-dim: a selected chip sags to 88% under the finger, so release is implied;
  // lights-out: the wash drops instantly under the still-opaque blue, then the
  // blue dims from the whole surface — a different feeling from the bloom.
  const disc = {
    width: INK_DIAMETER,
    height: INK_DIAMETER,
    left: origin.x - INK_DIAMETER / 2,
    top: origin.y - INK_DIAMETER / 2,
  };

  return (
    <>
      <WashDisc selected={selected} pressed={pressed} style={{ ...disc, backgroundColor: wash }} />
      <motion.span
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none will-change-transform"
        style={{ ...disc, backgroundColor: SURFACE_SELECTED }}
        initial={false}
        animate={{ scale: selected ? 1 : 0, opacity: selected ? (pressed ? 0.88 : 1) : 0 }}
        transition={
          selected
            ? { scale: { ...SPREAD, delay: BLUE_DELAY_S }, opacity: { duration: 0.05, delay: BLUE_DELAY_S } }
            : { opacity: { duration: 0.22, delay: 0.04, ease: "easeOut" }, scale: { duration: 0, delay: 0.3 } }
        }
      />
    </>
  );
}

const SPREAD = { type: "spring" as const, stiffness: 260, damping: 26, mass: 0.9 };
const GLOW = { type: "spring" as const, stiffness: 500, damping: 30, mass: 0.6 };
/** The blue follows once the icon's first beat has played. */
const BLUE_DELAY_S = 0.22;

/**
 * Driven imperatively so a select can FORCE the wash to full before the blue
 * overtakes it — a declarative target can't: a tap quick enough to release
 * before the 100ms pre-glow has faded in would otherwise get almost no colour.
 */
function WashDisc({ selected, pressed, style }: { selected: boolean; pressed: boolean; style: React.CSSProperties }) {
  const wash = useAnimationControls();
  const wasSelected = useRef(selected);

  useEffect(() => {
    const justSelected = selected && !wasSelected.current;
    wasSelected.current = selected;
    if (selected) {
      if (justSelected) wash.set({ opacity: 1 });
      wash.start({ scale: 1, opacity: 1, transition: { scale: SPREAD, opacity: { duration: 0 } } });
    } else if (pressed) {
      wash.start({ scale: 0.12, opacity: 1, transition: { scale: GLOW, opacity: { duration: 0.1 } } });
    } else {
      // hidden under the opaque blue at rest, so it can vanish without a trace
      wash.start({ opacity: 0, scale: 0, transition: { opacity: { duration: 0.08 }, scale: { duration: 0, delay: 0.3 } } });
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

/* ================================================================
 *  Sparks — the sticker slap; select only
 * ================================================================ */

const SPARKS = [0, 55, 120, 190, 250, 305].map((angle, i) => {
  const dist = 22 + (i % 3) * 5;
  return {
    size: i % 2 === 0 ? 4 : 3,
    delay: (i % 3) * 0.015,
    dx: Math.cos((angle * Math.PI) / 180) * dist,
    dy: Math.sin((angle * Math.PI) / 180) * dist,
  };
});

function Sparks({ playKey, origin, color }: { playKey: number; origin: Point; color: string }) {
  if (playKey === 0) return null;
  return (
    <span key={playKey} aria-hidden="true" className="absolute inset-0 pointer-events-none">
      {SPARKS.map((s, i) => (
        <motion.i
          key={i}
          className="absolute block rounded-full"
          style={{
            width: s.size,
            height: s.size,
            left: origin.x - s.size / 2,
            top: origin.y - s.size / 2,
            backgroundColor: i % 3 === 2 ? "#ffffff" : color,
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
 *  Card
 * ================================================================ */

/** If `ended` never fires (stalled decode), hand off to the selected state anyway. */
const SHOWCASE_FALLBACK_MS = 2400;

function InstructionCardV5({
  id,
  selected,
  onToggle,
  reduceMotion,
  palette,
  video,
}: {
  id: InstructionId;
  selected: boolean;
  onToggle: () => void;
  reduceMotion: boolean;
  palette: InkPalette;
  /** v4 showcase: a short clip that plays full-bleed in the chip on select, before the selected state lands. */
  video?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointerDownX = useRef<number | null>(null);
  const [origin, setOrigin] = useState<Point>(CHECKBOX_CENTRE);
  const [pressed, setPressed] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  // The choice is made the instant you tap (aria-checked, exclusivity), but
  // while a showcase clip plays the *visual* select choreography waits for it.
  const visualSelected = selected && !videoPlaying;
  // the checkbox lags the story on select and leads it on deselect
  const [confirmed, setConfirmed] = useState(visualSelected);
  const [confirmToggles, setConfirmToggles] = useState(0);
  const wasSelected = useRef(visualSelected);
  const wasConfirmed = useRef(confirmed);

  useEffect(() => {
    if (wasSelected.current === visualSelected) return;
    wasSelected.current = visualSelected;
    if (!visualSelected || reduceMotion) {
      setConfirmed(visualSelected);
      return;
    }
    setBurstKey((k) => k + 1);
    const id = window.setTimeout(() => setConfirmed(true), CONFIRM_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [visualSelected, reduceMotion]);

  // Deselected mid-clip — by a second tap or by the handoff exclusivity rule —
  // the clip stops and the chip returns to rest.
  useEffect(() => {
    if (selected || !videoPlaying) return;
    videoRef.current?.pause();
    setVideoPlaying(false);
  }, [selected, videoPlaying]);

  useEffect(() => {
    if (!videoPlaying) return;
    const id = window.setTimeout(() => setVideoPlaying(false), SHOWCASE_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [videoPlaying]);

  useEffect(() => {
    if (wasConfirmed.current === confirmed) return;
    wasConfirmed.current = confirmed;
    setConfirmToggles((n) => n + 1);
  }, [confirmed]);

  const revealSelf = useCallback(() => {
    ref.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [reduceMotion]);

  const handleClick = (event: React.MouseEvent) => {
    const startX = pointerDownX.current;
    pointerDownX.current = null;
    if (startX !== null && Math.abs(event.clientX - startX) > DRAG_SLOP_PX) return;

    // play() must be called inside the user gesture for iOS; if the clip can't
    // start (not yet buffered, autoplay policy) we simply skip straight to the
    // selected state rather than leaving the chip stuck.
    const clip = videoRef.current;
    if (!selected && video && !reduceMotion && clip) {
      clip.currentTime = 0;
      setVideoPlaying(true);
      clip.play().catch(() => setVideoPlaying(false));
    }

    onToggle();
    hapticTick();
    revealSelf();
  };

  const accent = palette === "blue" ? BLUE_ONLY : ACCENT[id];
  const knockout = visualSelected ? SURFACE_SELECTED : SURFACE_DEFAULT;
  // motion-icons-react keyframes on the checkbox: pop when it confirms, dip when
  // it withdraws. Keyed so each flip replays; nothing plays on first paint.
  const checkboxClass = confirmToggles === 0 ? "" : confirmed ? "motion-success" : "motion-press";

  return (
    <motion.button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={INSTRUCTION_ARIA_LABEL[id]}
      onPointerDown={(event) => {
        pointerDownX.current = event.clientX;
        const rect = event.currentTarget.getBoundingClientRect();
        setOrigin({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        setPressed(true);
      }}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={handleClick}
      onFocus={revealSelf}
      data-playing={videoPlaying || undefined}
      whileTap={reduceMotion ? undefined : { scale: 0.965 }}
      initial={false}
      animate={{
        boxShadow: visualSelected
          ? `inset 0 0 0 1px rgba(${BORDER_ACTION},1)`
          : `inset 0 0 0 1px rgba(${BORDER_ACTION},0)`,
      }}
      transition={{
        // the ring latches after the ink has spread, and unlatches first on deselect
        boxShadow: reduceMotion
          ? { duration: 0 }
          : visualSelected
            ? { duration: 0.2, delay: 0.14, ease: EASE_OUT_EXPO }
            : { duration: 0.08, ease: "easeOut" },
        scale: { type: "spring", stiffness: 700, damping: 34, mass: 0.5 },
      }}
      style={{
        backgroundColor: SURFACE_DEFAULT,
        // WebKit can let transformed children leak past overflow-hidden's rounded
        // corners; clip-path makes the radius a hard boundary for the ink
        clipPath: "inset(0 round 12px)",
      }}
      className="
        relative overflow-hidden isolate
        shrink-0 w-24 h-[100px] p-2.5 rounded-12
        flex flex-col gap-4 items-start text-left cursor-pointer
        outline-none
        focus-visible:outline focus-visible:outline-2
        focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:-2px]
      "
    >
      <Ink selected={visualSelected} pressed={pressed} origin={origin} wash={accent.wash} reduceMotion={reduceMotion} />

      {/* Showcase clip sits above the ink and below the sparks/content: while it
          plays the chip *is* the illustration; when it ends the blue blooms from
          the original tap point over its last frame and the selected state
          emerges from that. Always mounted (hidden) so play() is instant. */}
      {video && (
        <motion.video
          ref={videoRef}
          src={video}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          initial={false}
          animate={{ opacity: videoPlaying ? 1 : 0 }}
          transition={
            videoPlaying
              ? { duration: 0.12, ease: "easeOut" }
              : selected
                ? { duration: 0.28, delay: 0.2, ease: "easeOut" } // ended: let the bloom cover it first
                : { duration: 0.16, ease: "easeOut" } // interrupted: drop it with the deselect
          }
          onEnded={() => setVideoPlaying(false)}
        />
      )}

      <Sparks playKey={burstKey} origin={origin} color={accent.spark} />

      <motion.span
        className="relative flex flex-col gap-4 items-start w-full"
        initial={false}
        animate={{ opacity: videoPlaying ? 0 : 1 }}
        transition={{ duration: videoPlaying ? 0.1 : 0.2, delay: videoPlaying ? 0 : 0.12, ease: "easeOut" }}
      >
        <span className="flex items-start justify-between w-full">
          <InstructionScene kind={id} active={visualSelected} reduceMotion={reduceMotion} />
          <span className={`block ${checkboxClass}`}>
            <InstructionCheckbox checked={confirmed} knockout={knockout} reduceMotion={reduceMotion} />
          </span>
        </span>
        <span
          className="pl-0.5 text-[13px] leading-5 tracking-[-0.1px] font-medium whitespace-pre-line"
          style={{ color: INK_PRIMARY }}
        >
          {INSTRUCTION_LABEL[id]}
        </span>
      </motion.span>
    </motion.button>
  );
}

/* ================================================================
 *  Widget
 * ================================================================ */

export type DeliveryInstructionsWidgetV5Props = {
  value: ReadonlySet<InstructionId>;
  onChange: (next: Set<InstructionId>, changed: InstructionId, nowSelected: boolean) => void;
  className?: string;
  /** "accent" = each instruction blooms in its own colour (v5); "blue" = all four bloom blue (v4). */
  palette?: InkPalette;
  /** Marks which iteration this is rendering as, for tooling and tests. */
  variantId?: string;
  /** v4: per-instruction showcase clips (asset URLs) that play in the chip on select. */
  showcase?: Partial<Record<InstructionId, string>>;
};

export default function DeliveryInstructionsWidgetV5({
  value,
  onChange,
  className = "",
  palette = "accent",
  variantId = "5",
  showcase,
}: DeliveryInstructionsWidgetV5Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();

  return (
    <section
      role="group"
      aria-labelledby={titleId}
      data-variant={variantId}
      className={`w-[351px] h-40 bg-white rounded-16 overflow-hidden flex flex-col ${className}`}
    >
      <div className="flex items-center gap-1 px-4 py-3 shrink-0">
        <h2 id={titleId} className="text-h16 font-bold" style={{ color: INK_PRIMARY }}>
          Delivery instructions
        </h2>
        <InfoCircle className="shrink-0 pointer-events-none" />
      </div>

      <div
        className="
          flex-1 min-h-0
          overflow-x-auto overflow-y-hidden overscroll-x-contain
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          [-webkit-overflow-scrolling:touch]
        "
      >
        <div className="flex w-max items-start gap-2.5 px-3 pt-1 pb-3">
          {INSTRUCTION_ORDER.map((id) => (
            <InstructionCardV5
              key={id}
              id={id}
              selected={value.has(id)}
              reduceMotion={reduceMotion}
              palette={palette}
              video={showcase?.[id]}
              onToggle={() => {
                const next = toggleInstruction(value, id);
                onChange(next, id, next.has(id));
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
