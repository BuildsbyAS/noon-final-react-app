/**
 * Fluid Action Center — motion only (web).
 *
 * Drop this file next to your existing action-menu component and spread the
 * returned props onto the nodes you already render. It owns no markup, no
 * styling, no placement, no state — only the physics.
 *
 * Spec: ../README.md
 * Requires framer-motion (or `motion` v11+ — identical API, different import).
 */

export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/* --------------------------------------------------------------- geometry */

export type RevealGeometry = {
  /** Trigger centre in the sheet's own coordinates. */
  originX: number;
  originY: number;
  /** 1 = sheet opens below the trigger, −1 = flipped above it. */
  direction: 1 | -1;
  /** Radius the surface is born with. */
  capsuleRadius: number;
};

/**
 * Static layout — the usual case. Values are your sheet's, not ours.
 *
 *   fluidOrigin({ sheetWidth: 176, sheetHeight: 224, triggerSize: 40, gap: 10 })
 *   → { originX: 156, originY: -30, direction: 1, capsuleRadius: 112 }
 *
 * `align` is which edge of the sheet lines up with the same edge of the
 * trigger — "right" for a trailing header button, "left" for a leading one.
 */
export function fluidOrigin({
  sheetWidth,
  sheetHeight,
  triggerSize,
  gap,
  align = "right",
  flipped = false,
}: {
  sheetWidth: number;
  sheetHeight: number;
  triggerSize: number;
  gap: number;
  align?: "left" | "right";
  flipped?: boolean;
}): RevealGeometry {
  return {
    originX: align === "right" ? sheetWidth - triggerSize / 2 : triggerSize / 2,
    // Negative when opening downward: the origin sits inside the button,
    // above the sheet's top edge. That is what sells the extrusion.
    originY: flipped ? sheetHeight + gap + triggerSize / 2 : -(gap + triggerSize / 2),
    direction: flipped ? -1 : 1,
    capsuleRadius: Math.max(sheetWidth, sheetHeight) / 2,
  };
}

/**
 * Dynamic placement — pass the trigger's viewport rect and the sheet's
 * *untransformed* layout rect (measure it while closed, or derive it from
 * your own placement code).
 */
export function fluidOriginFromRects(
  trigger: { left: number; top: number; width: number; height: number },
  sheet: { left: number; top: number; width: number; height: number },
): RevealGeometry {
  return {
    originX: trigger.left + trigger.width / 2 - sheet.left,
    originY: trigger.top + trigger.height / 2 - sheet.top,
    direction: sheet.top >= trigger.top ? 1 : -1,
    capsuleRadius: Math.max(sheet.width, sheet.height) / 2,
  };
}

/* ---------------------------------------------------------------- springs */

const SPRING_SCALE_Y = { type: "spring", stiffness: 520, damping: 30, mass: 0.68 } as const;
const SPRING_SCALE_X = { type: "spring", stiffness: 390, damping: 26, mass: 0.78 } as const;
const SPRING_SHIFT = { type: "spring", stiffness: 500, damping: 34, mass: 0.7 } as const;
const SPRING_RADIUS = { type: "spring", stiffness: 440, damping: 34, mass: 0.7 } as const;
// bounce: 0 is framer-motion's way of clamping overshoot.
const SPRING_CLOSE = { type: "spring", stiffness: 520, damping: 38, mass: 0.66, bounce: 0 } as const;

/* ------------------------------------------------------------ motion props */

/**
 * Spread onto the animated white surface (your sheet/panel node), inside an
 * <AnimatePresence>. The surface never changes opacity — only its contents do.
 *
 *   <motion.div className="your-sheet" {...fluidSheetMotion(geo, reduceMotion, 16)} />
 */
export function fluidSheetMotion(
  geometry: RevealGeometry,
  reduceMotion: boolean | null,
  restingRadius = 16,
) {
  const { originX, originY, direction, capsuleRadius } = geometry;

  const collapsed = {
    opacity: 1,
    scaleX: 0,
    scaleY: 0,
    y: -4 * direction,
    borderRadius: capsuleRadius,
  };

  const expanded = {
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    y: 0,
    borderRadius: restingRadius,
  };

  if (reduceMotion) {
    return {
      style: { transformOrigin: `${originX}px ${originY}px` },
      initial: { opacity: 0, borderRadius: restingRadius },
      animate: { opacity: 1, borderRadius: restingRadius },
      exit: { opacity: 0 },
      transition: { duration: 0.14, ease: EASE_OUT },
    };
  }

  return {
    // THE value. Anything else and it reads as a popup, not an extrusion.
    style: { transformOrigin: `${originX}px ${originY}px` },
    initial: collapsed,
    animate: expanded,
    exit: {
      ...collapsed,
      y: -3 * direction,
      transition: {
        scaleX: SPRING_CLOSE,
        scaleY: SPRING_CLOSE,
        y: SPRING_CLOSE,
        borderRadius: { duration: 0.14, ease: EASE_OUT },
      },
    },
    transition: {
      // Y leads, X lags. The gap between them is the stretch.
      scaleY: SPRING_SCALE_Y,
      scaleX: SPRING_SCALE_X,
      y: SPRING_SHIFT,
      borderRadius: SPRING_RADIUS,
    },
  };
}

/**
 * Spread onto ONE wrapper around all rows. Never animate rows individually
 * and never stagger them — this is one object, not a list.
 */
export function fluidContentMotion(reduceMotion: boolean | null) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    // Out fast and with no delay: content must be gone before the surface
    // collapses, or you get dark text smeared inside a shrinking blob.
    exit: { opacity: 0, transition: { duration: 0.07, ease: EASE_OUT } },
    transition: {
      duration: reduceMotion ? 0.12 : 0.14,
      delay: reduceMotion ? 0 : 0.08,
      ease: EASE_OUT,
    },
  };
}

/** Spread onto the scrim. Timings, never springs — a sprung opacity pulses. */
export function fluidScrimMotion(reduceMotion: boolean | null) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: reduceMotion ? 0.1 : 0.155, ease: EASE_OUT } },
    transition: { duration: reduceMotion ? 0.12 : 0.19, ease: EASE_OUT },
  };
}

/** Spread onto the trigger (and its clone). Confirms the tap before anything moves. */
export function fluidTriggerMotion(reduceMotion: boolean | null) {
  return {
    whileTap: reduceMotion ? undefined : { scale: 0.92 },
    transition: { type: "spring", stiffness: 620, damping: 34, mass: 0.48 } as const,
  };
}
