/**
 * Delivery instruction glyphs — v1 "scenes"
 *
 * v4 crossfades the Figma design-system glyphs with small flourishes. v1 trades
 * that fidelity for STORY: each icon is built from Lucide's stroke glyphs, whose
 * semantic pairs share geometry (bell → bell-ring → bell-off, door-closed →
 * door-open, phone → phone-call → phone-off, shield → shield-user). Every
 * stroke is its own <path>, so a scene can draw one on, swing another and
 * crossfade a third — and deselect can differ in FEELING from select instead of
 * being a rewind. The grammar everywhere: select = the character does the
 * thing you're worried about, then the instruction lands; deselect = the
 * constraint lifts off the way it came, and the character takes one breath.
 *
 *   door      select: the closed leaf swings away edge-on, then the open leaf
 *             swings toward you on a spring and bumps its stop; the knob rides
 *             deselect: pulled shut (no spring), the leaf reseats, a 1px latch
 *   security  select: the person rises up INTO the shield from behind its lower
 *             edge while the shield inhales; a small nod once planted
 *             deselect: they step back inside; the shield exhales — off duty
 *   call      select: the handset buzzes with sound arcs, the slash swipes
 *             down and cuts it, the two pieces recoil
 *             deselect: the slash lifts off like tape, the handset heals and is
 *             rocked once into its cradle
 *   bell      select: the bell swings from its hanger, the clapper lagging with
 *             bigger amplitude (that lag is what makes a bell look rung), sound
 *             arcs flick and decay, then the slash hushes it
 *             deselect: the slash lifts, the body heals, only the clapper
 *             stirs — a bell that was touched, not rung
 *
 * Path data is copied verbatim from lucide-react 1.43.0 (ISC — Copyright (c)
 * 2026 Lucide Icons and Contributors; permission to use, copy, modify and/or
 * distribute is granted provided this notice appears). Copied rather than
 * deep-imported because lucide-react ships no `exports` map for per-icon files.
 *
 * Reduced motion: every scene collapses to a ≤120ms crossfade with drawn paths
 * at their final length; no swings, buzzes, rises, pops or thuds.
 */
import { useEffect, useId, useRef } from "react";
import { motion, useAnimationControls, type Transition } from "framer-motion";
import type { InstructionId } from "./deliveryInstructions.model";

const DEFAULT_INK = "#1d2539";
const ACTIVE_INK = "#0f61ff";
const STROKE = 1.75; // between Lucide's 2 and the design system's lighter weight
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;
const EASE_IN_SWING = [0.55, 0, 1, 0.45] as const; // accelerating, like gravity
const EASE_PULL = [0.4, 0, 0.2, 1] as const; // a hand pulling, not a slam

export type SceneProps = {
  active: boolean;
  reduceMotion: boolean;
};

/* ---------------- Lucide path data (see licence note above) ---------------- */

const L = {
  bell: {
    clapper: "M10.268 21a2 2 0 0 0 3.464 0",
    body: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
    arcRight: "M22 8c0-2.3-.8-4.3-2-6",
    arcLeft: "M4 2C2.8 3.7 2 5.7 2 8",
    cutA: "M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742",
    cutB: "M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05",
    slash: "m2 2 20 20",
  },
  phone: {
    handset:
      "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
    cutA: "M10.1 13.9a14 14 0 0 0 3.732 2.668 1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2 18 18 0 0 1-12.728-5.272",
    cutB: "M4.76 13.582A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 .244.473",
    arcOuter: "M13 2a9 9 0 0 1 9 9",
    arcInner: "M13 6a5 5 0 0 1 5 5",
    slash: "M22 2 2 22",
  },
  door: {
    closed: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16",
    floor: "M2 21h20",
    knob: "M9 12h.01", // translated +5 on x it is exactly door-open's "M14 12h.01"
    frame: "M10.268 3H7a2 2 0 00-2 2v16",
    openLeaf: "M10 4a2 2 0 012.36-1.968l5.41.992A1.5 1.5 0 0119 4.5V21l-7.876.992A1 1 0 0110 21z",
    floorLeft: "M10 21H2",
    floorRight: "M22 21h-3",
  },
  security: {
    shield:
      "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
    shouldersInside: "M6.376 18.91a6 6 0 0 1 11.249.003",
  },
} as const;

/**
 * door-closed's outline is one path: right post → top → LEFT post. Drawn at
 * this fraction of its length it stops exactly at (10.268, 3), where
 * door-open's frame path begins — so the frame stays put and only the leaf
 * (right post + top) swings. 16 + π/2·2 + 6.732 = 25.87 of 48.28 total.
 */
const CLOSED_LEAF_FRACTION = 0.536;

/* ---------------- shared bits ---------------- */

const fade = (rm: boolean, delay = 0): Transition =>
  rm ? { duration: 0.1 } : { duration: 0.12, delay, ease: "easeOut" };

const draw = (ms: number, delayMs = 0): Transition => ({
  duration: ms / 1000,
  delay: delayMs / 1000,
  ease: EASE_OUT_EXPO,
});

/** Runs `fn` whenever `active` flips — never on mount, so the row doesn't perform on first paint. */
function useOnToggle(active: boolean, fn: (nowActive: boolean) => void | (() => void)) {
  const prev = useRef(active);
  useEffect(() => {
    if (prev.current === active) return;
    prev.current = active;
    return fn(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/** Schedule beats; every timer is cleared if the state flips again mid-story. */
function beats(...steps: [number, () => void][]) {
  const ids = steps.map(([at, fn]) => window.setTimeout(fn, at));
  return () => ids.forEach((id) => window.clearTimeout(id));
}

function Svg({ active, reduceMotion, children }: SceneProps & { children: React.ReactNode }) {
  return (
    <motion.svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="block size-6 overflow-visible"
      initial={false}
      animate={{ stroke: active ? ACTIVE_INK : DEFAULT_INK }}
      transition={{ duration: reduceMotion ? 0.1 : 0.2, delay: reduceMotion ? 0 : active ? 0.12 : 0.14, ease: "easeOut" }}
    >
      {children}
    </motion.svg>
  );
}

/** transform-origin in viewBox units, so a pivot can sit outside the element's own bbox (a clapper hung from the bell's crown). */
const pivot = (x: number, y: number): React.CSSProperties => ({ transformBox: "view-box", transformOrigin: `${x}px ${y}px` });
/** transform-origin relative to the element's own bbox. */
const fillBox = (origin: string): React.CSSProperties => ({ transformBox: "fill-box", transformOrigin: origin });

/**
 * A slash that draws on to select and LIFTS OFF to deselect — slides 2px along
 * its own line and fades, like a strip of tape being peeled — then quietly
 * resets so the next select draws it fresh. A pathLength of 0 with round caps
 * still paints a dot, so it also holds opacity 0 at rest.
 */
function useSlash(active: boolean, rm: boolean, drawDelayMs: number, lift: { x: number; y: number }) {
  const slash = useAnimationControls();
  useOnToggle(active, (on) => {
    if (rm) {
      slash.set({ pathLength: on ? 1 : 0, opacity: on ? 1 : 0, x: 0, y: 0 });
      return;
    }
    if (on) {
      slash.set({ pathLength: 0, opacity: 1, x: 0, y: 0 });
      slash.start({ pathLength: 1, transition: draw(200, drawDelayMs) });
      return;
    }
    slash.start({ x: lift.x, y: lift.y, opacity: 0, transition: { duration: 0.16, ease: "easeIn" } });
    return beats([200, () => slash.set({ pathLength: 0, x: 0, y: 0 })]);
  });
  return { animate: slash, initial: { pathLength: active ? 1 : 0, opacity: active ? 1 : 0, x: 0, y: 0 } };
}

/* ================================================================
 *  Leave at the door — the door opens for the courier
 * ================================================================ */

function DoorScene({ active, reduceMotion: rm }: SceneProps) {
  const closedLeaf = useAnimationControls(); // right post + top, hinged at x=19
  const openLeaf = useAnimationControls(); // perspective leaf, hinged at x=19
  const knob = useAnimationControls(); // one knob, slides x 9 → 14 with the leaf
  const latch = useAnimationControls(); // 1px click when it seats

  useOnToggle(active, (on) => {
    if (rm) {
      closedLeaf.set({ scaleX: 1, opacity: on ? 0 : 1 });
      openLeaf.set({ scaleX: 1, opacity: on ? 1 : 0 });
      knob.set({ x: on ? 5 : 0, opacity: 1 });
      return;
    }
    if (on) {
      // beat 1: the closed leaf swings away from you, going edge-on
      closedLeaf.start({
        scaleX: 0.08,
        opacity: [1, 1, 0],
        transition: { scaleX: { duration: 0.2, ease: EASE_IN_SWING }, opacity: { duration: 0.2, times: [0, 0.8, 1] } },
      });
      knob.start({
        x: 5,
        opacity: [1, 1, 0, 0, 1],
        transition: { x: { duration: 0.2, ease: EASE_IN_SWING }, opacity: { duration: 0.3, times: [0, 0.6, 0.8, 0.85, 1] } },
      });
      // beat 2: the open leaf swings toward you and bumps its stop
      return beats([
        200,
        () => {
          openLeaf.set({ scaleX: 0.08, opacity: 0 });
          openLeaf.start({
            scaleX: 1,
            opacity: 1,
            transition: { scaleX: { type: "spring", stiffness: 380, damping: 22, mass: 0.8 }, opacity: { duration: 0.06 } },
          });
        },
      ]);
    }
    // pulled shut — no spring — then the flat leaf reseats and the latch clicks
    openLeaf.start({
      scaleX: 0.08,
      opacity: [1, 1, 0],
      transition: { scaleX: { duration: 0.22, ease: EASE_PULL }, opacity: { duration: 0.22, times: [0, 0.85, 1] } },
    });
    knob.start({
      x: 0,
      opacity: [1, 1, 0, 0, 1],
      transition: { x: { duration: 0.22, ease: EASE_PULL }, opacity: { duration: 0.3, times: [0, 0.6, 0.8, 0.85, 1] } },
    });
    return beats(
      [
        220,
        () => {
          closedLeaf.set({ scaleX: 0.08, opacity: 0 });
          closedLeaf.start({ scaleX: 1, opacity: 1, transition: { scaleX: { duration: 0.18, ease: EASE_OUT_EXPO }, opacity: { duration: 0.05 } } });
        },
      ],
      [400, () => latch.start({ x: [0, 0.75, 0], transition: { duration: 0.08, times: [0, 0.4, 1] } })],
    );
  });

  // the floor splits as the leaf crosses it, rejoins as it reseats
  const floorT = fade(rm, rm ? 0 : active ? 0.18 : 0.2);

  return (
    <Svg active={active} reduceMotion={rm}>
      <motion.g animate={latch}>
        <path d={L.door.frame} />

        <motion.path
          d={L.door.closed}
          initial={{ pathLength: CLOSED_LEAF_FRACTION, scaleX: 1, opacity: active ? 0 : 1 }}
          animate={closedLeaf}
          style={fillBox("100% 50%")}
        />
        <motion.path
          d={L.door.openLeaf}
          initial={{ scaleX: 1, opacity: active ? 1 : 0 }}
          animate={openLeaf}
          style={fillBox("100% 50%")}
        />
        <motion.path d={L.door.knob} initial={{ x: active ? 5 : 0, opacity: 1 }} animate={knob} />

        <motion.path d={L.door.floor} initial={false} animate={{ opacity: active ? 0 : 1 }} transition={floorT} />
        <motion.path d={L.door.floorLeft} initial={false} animate={{ opacity: active ? 1 : 0 }} transition={floorT} />
        <motion.path d={L.door.floorRight} initial={false} animate={{ opacity: active ? 1 : 0 }} transition={floorT} />
      </motion.g>
    </Svg>
  );
}

/* ================================================================
 *  Leave with security — someone steps up and takes it
 * ================================================================ */

function SecurityScene({ active, reduceMotion: rm }: SceneProps) {
  const uid = useId();
  const windowId = `${uid}-shield-window`;
  const shield = useAnimationControls(); // inhales as they arrive, exhales as they leave
  const person = useAnimationControls(); // rises from behind the shield's lower edge

  useOnToggle(active, (on) => {
    if (rm) {
      person.set({ y: 0, scale: 1, opacity: on ? 1 : 0 });
      return;
    }
    if (on) {
      person.set({ y: 9, scale: 1, opacity: 0 });
      person.start({
        y: 0,
        opacity: 1,
        transition: { y: { type: "spring", stiffness: 420, damping: 24, mass: 0.8 }, opacity: { duration: 0.12 } },
      });
      shield.start({ scale: [1, 1.04, 1], transition: { duration: 0.36, times: [0, 0.35, 1], ease: "easeOut" } });
      // planted — a small nod
      return beats([400, () => person.start({ y: [0, -1.2, 0.4, 0], transition: { duration: 0.22, times: [0, 0.4, 0.75, 1] } })]);
    }
    // off duty: they step back inside, the shield lets its breath go
    person.start({ y: -1.5, scale: 0.9, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } });
    shield.start({ scale: [1, 0.965, 1], transition: { duration: 0.3, delay: 0.06, ease: "easeInOut" } });
    return beats([260, () => person.set({ y: 9, scale: 1 })]);
  });

  return (
    <Svg active={active} reduceMotion={rm}>
      <defs>
        <clipPath id={windowId}>
          <path d={L.security.shield} />
        </clipPath>
      </defs>
      <motion.g animate={shield} style={fillBox("50% 50%")}>
        <path d={L.security.shield} />
        {/* clipped by the shield outline so they emerge from behind its lower edge, not out of thin air */}
        <g clipPath={`url(#${windowId})`}>
          <motion.g initial={{ y: active ? 0 : 9, scale: 1, opacity: active ? 1 : 0 }} animate={person} style={fillBox("50% 50%")}>
            <circle cx={12} cy={11} r={4} />
            <path d={L.security.shouldersInside} />
          </motion.g>
        </g>
      </motion.g>
    </Svg>
  );
}

/* ================================================================
 *  Avoid calling — it rings, you decline
 * ================================================================ */

function CallScene({ active, reduceMotion: rm }: SceneProps) {
  const whole = useAnimationControls(); // "hung up" settle / off-duty exhale
  const handset = useAnimationControls(); // buzz, later rocked into the cradle
  const pieceA = useAnimationControls(); // the two cut halves recoil from the blade
  const pieceB = useAnimationControls();
  const arcs = useAnimationControls(); // sound arcs flicker during the buzz
  const slash = useSlash(active, rm, 200, { x: 1.5, y: -1.5 }); // lifts back toward where it came from

  useOnToggle(active, (on) => {
    if (rm) {
      arcs.set({ opacity: 0, pathLength: 0 });
      return;
    }
    if (on) {
      handset.start({ rotate: [0, -12, 10, -8, 6, 0], transition: { duration: 0.28, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeInOut" } });
      arcs.start({
        pathLength: 1,
        opacity: [0, 1, 0.55, 1, 0],
        transition: { pathLength: { duration: 0.1 }, opacity: { duration: 0.42, times: [0, 0.25, 0.5, 0.75, 1] } },
      });
      return beats(
        [
          280,
          () => {
            // the cut has weight: both halves kick away from the blade and spring back
            pieceA.start({ x: [0, 0.4, 0], y: [0, 0.4, 0], transition: { duration: 0.18, ease: "easeOut" } });
            pieceB.start({ x: [0, -0.4, 0], y: [0, -0.4, 0], transition: { duration: 0.18, ease: "easeOut" } });
          },
        ],
        [440, () => whole.start({ scale: [1, 0.95, 1], transition: { duration: 0.18, ease: "easeOut" } })],
      );
    }
    arcs.set({ opacity: 0, pathLength: 0 });
    whole.start({ scale: [1, 0.965, 1], transition: { duration: 0.3, delay: 0.06, ease: "easeInOut" } });
    // set back on the hook — one slow rock, no shake
    return beats([240, () => handset.start({ rotate: [0, 3, 0], transition: { duration: 0.26, ease: "easeInOut" } })]);
  });

  // the handset splits as the blade lands; heals once the tape has lifted
  const wholeT = fade(rm, rm ? 0 : active ? 0.24 : 0.08);

  return (
    <Svg active={active} reduceMotion={rm}>
      <motion.g animate={whole} style={fillBox("50% 50%")}>
        <motion.g animate={handset} style={fillBox("50% 50%")}>
          <motion.path d={L.phone.handset} initial={false} animate={{ opacity: active ? 0 : 1 }} transition={wholeT} />
          <motion.g animate={pieceA}>
            <motion.path d={L.phone.cutA} initial={false} animate={{ opacity: active ? 1 : 0 }} transition={wholeT} />
          </motion.g>
          <motion.g animate={pieceB}>
            <motion.path d={L.phone.cutB} initial={false} animate={{ opacity: active ? 1 : 0 }} transition={wholeT} />
          </motion.g>
        </motion.g>
        <motion.path d={L.phone.arcInner} initial={{ opacity: 0, pathLength: 0 }} animate={arcs} />
        <motion.path d={L.phone.arcOuter} initial={{ opacity: 0, pathLength: 0 }} animate={arcs} />
        <motion.path d={L.phone.slash} initial={slash.initial} animate={slash.animate} />
      </motion.g>
    </Svg>
  );
}

/* ================================================================
 *  Don't ring the bell — it rings, then hush
 * ================================================================ */

const HANGER = pivot(12, 2); // both body and clapper swing from the crown

function BellScene({ active, reduceMotion: rm }: SceneProps) {
  const whole = useAnimationControls();
  const body = useAnimationControls();
  const clapper = useAnimationControls();
  const arcs = useAnimationControls();
  const slash = useSlash(active, rm, 220, { x: -1.5, y: -1.5 });

  useOnToggle(active, (on) => {
    if (rm) {
      arcs.set({ opacity: 0, pathLength: 0 });
      return;
    }
    if (on) {
      // a damped pendulum; the clapper lags ~35ms with 1.5× the amplitude —
      // that lag is the difference between a bell that rings and a coin that wobbles
      body.start({ rotate: [0, -15, 7, -3.5, 1.5, 0], transition: { duration: 0.48, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeInOut" } });
      clapper.start({ rotate: [0, -22, 11, -5, 2, 0], transition: { duration: 0.48, delay: 0.035, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeInOut" } });
      arcs.start({
        pathLength: 1,
        opacity: [0, 1, 1, 0],
        transition: { pathLength: { duration: 0.1 }, opacity: { duration: 0.3, times: [0, 0.3, 0.5, 1] } },
      });
      return;
    }
    arcs.set({ opacity: 0, pathLength: 0 });
    whole.start({ scale: [1, 0.965, 1], transition: { duration: 0.3, delay: 0.06, ease: "easeInOut" } });
    // touched, not rung: only the clapper stirs
    return beats([120, () => clapper.start({ rotate: [0, 4, -1.5, 0], transition: { duration: 0.26, ease: "easeInOut" } })]);
  });

  const wholeT = fade(rm, rm ? 0 : active ? 0.26 : 0.08);

  return (
    <Svg active={active} reduceMotion={rm}>
      <motion.g animate={whole} style={fillBox("50% 50%")}>
        <motion.g animate={body} style={HANGER}>
          <motion.path d={L.bell.body} initial={false} animate={{ opacity: active ? 0 : 1 }} transition={wholeT} />
          <motion.path d={L.bell.cutA} initial={false} animate={{ opacity: active ? 1 : 0 }} transition={wholeT} />
          <motion.path d={L.bell.cutB} initial={false} animate={{ opacity: active ? 1 : 0 }} transition={wholeT} />
        </motion.g>
        <motion.g animate={clapper} style={HANGER}>
          <path d={L.bell.clapper} />
        </motion.g>
        <motion.path d={L.bell.arcLeft} initial={{ opacity: 0, pathLength: 0 }} animate={arcs} />
        <motion.path d={L.bell.arcRight} initial={{ opacity: 0, pathLength: 0 }} animate={arcs} />
        <motion.path d={L.bell.slash} initial={slash.initial} animate={slash.animate} />
      </motion.g>
    </Svg>
  );
}

/* ================================================================
 *  Public surface
 * ================================================================ */

const SCENE: Record<InstructionId, (props: SceneProps) => React.ReactElement> = {
  door: DoorScene,
  security: SecurityScene,
  call: CallScene,
  bell: BellScene,
};

export function InstructionScene({ kind, ...rest }: SceneProps & { kind: InstructionId }) {
  const Scene = SCENE[kind];
  return <Scene {...rest} />;
}
