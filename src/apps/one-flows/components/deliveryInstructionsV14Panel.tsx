/**
 * v14's expanded calling panel — the contents the chip grows into, plus the
 * dismissal behaviour it needs while open.
 *
 * The panel is NOT an overlay: it's the same chip, widened, so it has no
 * anchor, no portal and no placement logic (v11's action sheet had all three).
 * What it keeps from v11 is the way you get out of it: Escape, or a tap
 * anywhere outside — a close-only outside tap, taken in the capture phase and
 * followed by swallowing that click, so dismissing never doubles as picking
 * something else.
 *
 * Owned by v14.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { StaticGlyph } from "./deliveryInstructionsV14Glyphs";
import type { V14GlyphId } from "./deliveryInstructionsV14.model";

const INK_PRIMARY = "#1d2539";
const INK_ACTION = "#0f61ff";
const BORDER_DEFAULT = "#eaecf0";

/** Apple-style notation: settle time and overshoot, not stiffness/damping. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const SPRING_SNAPPY = {
  type: "spring",
  duration: 0.36,
  bounce: 0.16,
} as const;
/**
 * The chip's width change. Opening gets a little bounce — it's a box being
 * pushed open against the chips beside it. Closing is quieter and ~25% faster:
 * you've already chosen, so don't make the answer wait behind the animation.
 */
export const SPRING_OPEN = {
  type: "spring",
  duration: 0.5,
  bounce: 0.14,
} as const;
export const SPRING_CLOSE = {
  type: "spring",
  duration: 0.38,
  bounce: 0,
} as const;

/** How long the picked pill is seen holding its answer before the chip closes. */
export const PICK_BEAT_MS = 200;

/** Open state for the one expandable chip, with Escape and outside-tap dismissal. */
export function useExpandable({
  reduceMotion,
  onOpenChange,
}: {
  reduceMotion: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  /** The chip itself — the only region a tap doesn't dismiss from. */
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (rootRef.current?.contains(target)) return;
      close();
      // The tap that dismissed shouldn't also land on whatever was under it.
      const swallowClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        release();
      };
      const release = () =>
        document.removeEventListener("click", swallowClick, true);
      document.addEventListener("click", swallowClick, true);
      window.setTimeout(release, 350);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return {
    rootRef,
    triggerRef,
    open,
    toggle: () => setOpen((o) => !o),
    close,
    reduceMotion,
  };
}

/* ================================================================
 *  Answer pills — Figma 1241:14044 / 1241:14047
 * ================================================================ */

export type PanelOption = { id: string; label: string; glyph: V14GlyphId };

/**
 * v14's calling card is the leftmost item, so its LEFT edge is pinned and
 * opening sweeps the right edge outwards, uncovering the pills left-to-right.
 * The stagger runs the same way, so each pill brightens as the edge passes it
 * rather than against it. (v13's card grew the other way and inverts this.)
 */
const PILL_STAGGER_S = 0.045;

export function AnswerPill({
  option,
  selected,
  index,
  onSelect,
  reduceMotion,
}: {
  option: PanelOption;
  selected: boolean;
  /** Position in the reveal order — the edge uncovers index 0 first. */
  index: number;
  onSelect: () => void;
  reduceMotion: boolean;
}) {
  const delay = 0.08 + index * PILL_STAGGER_S;
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      // Hover tints the surface only — border and ink are animated by Motion,
      // and an inline style would win over a CSS hover anyway.
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-solid bg-white py-2.5 pl-3 pr-2.5 whitespace-nowrap cursor-pointer outline-none transition-[background-color] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f61ff] focus-visible:[outline-offset:2px] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#f4f5f9]"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{
        opacity: 1,
        scale: 1,
        borderColor: selected ? INK_ACTION : BORDER_DEFAULT,
        transition: reduceMotion
          ? { duration: 0.12 }
          : {
              ...SPRING_SNAPPY,
              delay,
              borderColor: { duration: 0.18, ease: EASE_OUT },
            },
      }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.97, transition: { duration: 0.11 } }
      }
      style={{ borderColor: selected ? INK_ACTION : BORDER_DEFAULT }}
    >
      {/* 20px, matching the switch icons beside this card — at 18 the calling
          answers read smaller than everything they sit next to. */}
      <StaticGlyph
        glyph={option.glyph}
        variant="outline"
        size={20}
        ink={selected ? INK_ACTION : INK_PRIMARY}
      />
      <span
        className={`text-[14px] leading-5 tracking-[-0.1px] ${selected ? "font-semibold" : "font-medium"}`}
        style={{ color: selected ? INK_ACTION : INK_PRIMARY }}
      >
        {option.label}
      </span>
    </motion.button>
  );
}
