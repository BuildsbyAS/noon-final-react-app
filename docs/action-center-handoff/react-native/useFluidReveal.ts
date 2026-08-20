/**
 * Fluid Action Center — motion only (React Native).
 *
 * Drop this file next to your existing action-menu component and spread the
 * returned animated styles onto the views you already render. It owns no
 * markup, no styling, no placement, no items — only the physics.
 *
 * Spec: ../README.md
 *
 *   npm i react-native-reanimated       # + react-native-worklets for Reanimated 4
 *
 * Reanimated 4 requires the New Architecture (Fabric). On the old architecture
 * stay on Reanimated 3 — every API used here is identical on both.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/* ---------------------------------------------------------------- springs */

// Y leads, X lags. The gap between them is the stretch.
const SPRING_Y = {
  stiffness: 520,
  damping: 30,
  mass: 0.68,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
} as const;

const SPRING_X = {
  stiffness: 390,
  damping: 26,
  mass: 0.78,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
} as const;

// Firmer and clamped: close gets out of the way, it does not perform.
const SPRING_CLOSE = {
  stiffness: 520,
  damping: 38,
  mass: 0.66,
  overshootClamping: true,
} as const;

const PRESS_SPRING = { stiffness: 620, damping: 34, mass: 0.48 } as const;

/* --------------------------------------------------------------- geometry */

export type RevealGeometry = {
  /** Trigger centre in the sheet's own coordinates. */
  originX: number;
  originY: number;
  /** 1 = sheet opens below the trigger, −1 = flipped above it. */
  direction: 1 | -1;
  /** Radius the surface is born with. */
  capsuleRadius: number;
  sheetWidth: number;
  sheetHeight: number;
};

/**
 * Static layout — the usual case. Values are your sheet's, not ours.
 *
 *   fluidOrigin({ sheetWidth: 176, sheetHeight: 224, triggerSize: 40, gap: 10 })
 *   → { originX: 156, originY: -30, direction: 1, capsuleRadius: 112, … }
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
    sheetWidth,
    sheetHeight,
  };
}

/** Dynamic placement: trigger rect from measureInWindow, sheet rect from your placement code. */
export function fluidOriginFromRects(
  trigger: { x: number; y: number; width: number; height: number },
  sheet: { x: number; y: number; width: number; height: number },
): RevealGeometry {
  return {
    originX: trigger.x + trigger.width / 2 - sheet.x,
    originY: trigger.y + trigger.height / 2 - sheet.y,
    direction: sheet.y >= trigger.y ? 1 : -1,
    capsuleRadius: Math.max(sheet.width, sheet.height) / 2,
    sheetWidth: sheet.width,
    sheetHeight: sheet.height,
  };
}

/* ------------------------------------------------------------------- hook */

export type FluidRevealOptions = {
  /** Your existing open state. */
  open: boolean;
  geometry: RevealGeometry;
  /** Resting corner radius of your sheet. */
  restingRadius?: number;
};

export function useFluidReveal({ open, geometry, restingRadius = 16 }: FluidRevealOptions) {
  const reduceMotion = useReducedMotion();

  // Keep the sheet mounted until the close animation finishes. 'opening' means
  // "open, or animating toward open" — an interrupted close must be able to
  // reverse, so this is a phase, not a boolean.
  const phase = useRef<"closed" | "opening" | "closing">("closed");
  const [mounted, setMounted] = useState(false);

  const progressX = useSharedValue(0);
  const progressY = useSharedValue(0);
  const scrim = useSharedValue(0);
  const press = useSharedValue(1);

  const unmount = useCallback(() => {
    phase.current = "closed";
    setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      if (phase.current === "opening") return;
      phase.current = "opening";
      setMounted(true);
      scrim.value = withTiming(1, { duration: reduceMotion ? 120 : 190 });
      progressY.value = reduceMotion ? withTiming(1, { duration: 140 }) : withSpring(1, SPRING_Y);
      progressX.value = reduceMotion ? withTiming(1, { duration: 140 }) : withSpring(1, SPRING_X);
      return;
    }

    if (phase.current !== "opening") return;
    phase.current = "closing";
    scrim.value = withTiming(0, { duration: reduceMotion ? 100 : 155 });
    progressX.value = reduceMotion
      ? withTiming(0, { duration: 120 })
      : withSpring(0, SPRING_CLOSE);
    progressY.value = reduceMotion
      ? withTiming(0, { duration: 120 }, (finished) => {
          if (finished) runOnJS(unmount)();
        })
      : withSpring(0, SPRING_CLOSE, (finished) => {
          // An interrupted close reports finished=false, so a fast re-open
          // never unmounts the sheet mid-flight.
          if (finished) runOnJS(unmount)();
        });
  }, [open, reduceMotion, scrim, progressX, progressY, unmount]);

  /** Spread onto the animated white surface. It is the only view that scales. */
  const sheetStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        opacity: Math.max(0, Math.min(1, progressY.value)),
        borderRadius: restingRadius,
        transform: [],
      };
    }

    const sx = Math.max(0, progressX.value);
    const sy = Math.max(0, progressY.value);
    const settle = Math.max(0, Math.min(1, progressY.value));
    const { originX, originY, direction, capsuleRadius, sheetWidth, sheetHeight } = geometry;

    // Scale about the trigger centre. RN's default origin is the view centre,
    // so compensate: a transform listed BEFORE the scale applies in unscaled
    // parent space (same semantics as CSS). Equivalent to
    // `transformOrigin: [originX, originY, 0]` on RN >= 0.76 — do one or the
    // other, never both.
    const compX = (originX - sheetWidth / 2) * (1 - sx);
    const compY = (originY - sheetHeight / 2) * (1 - sy);
    const travel = -4 * direction * (1 - settle);

    return {
      opacity: 1, // the surface never fades — only its content layer does
      borderRadius: restingRadius + (capsuleRadius - restingRadius) * (1 - settle),
      transform: [
        { translateX: compX },
        { translateY: compY + travel },
        { scaleX: sx },
        { scaleY: sy },
      ],
    };
  });

  /**
   * Spread onto ONE wrapper around all rows. Rows appear only once the surface
   * is ~half formed and clear out before it collapses — otherwise dark text
   * smears inside a shrinking white blob. Never stagger the rows.
   */
  const contentStyle = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, progressY.value));
    if (reduceMotion) return { opacity: p };
    return { opacity: Math.max(0, Math.min(1, (p - 0.48) / 0.42)) };
  });

  /** Spread onto the scrim. Timing, never a spring — a sprung opacity pulses. */
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, scrim.value)),
  }));

  /** Spread onto the trigger clone, with the press handlers below. */
  const triggerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : press.value }],
  }));

  const triggerPressHandlers = {
    onPressIn: () => {
      press.value = withSpring(0.92, PRESS_SPRING);
    },
    onPressOut: () => {
      press.value = withSpring(1, PRESS_SPRING);
    },
  };

  return {
    /** Keep the overlay/Modal rendered while this is true, not while `open` is. */
    mounted,
    sheetStyle,
    contentStyle,
    scrimStyle,
    triggerStyle,
    triggerPressHandlers,
    reduceMotion,
  };
}

/** Convenience: the trigger clone needs to be both pressable and animated. */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
