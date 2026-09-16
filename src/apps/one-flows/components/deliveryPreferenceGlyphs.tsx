/**
 * Glyphs for the delivery-preferences widget (v2), and the motion each one
 * plays when its segment is picked.
 *
 * The seven instruction glyphs already exist, drawn verbatim from the Figma
 * exports, in `riderMessageIcons` — they're reused here rather than redrawn.
 * This module adds the two the v2 card needs that don't exist yet (the mic and
 * the recorded waveform) and, more importantly, gives every glyph a
 * SIGNATURE: a short character animation that plays on tap.
 *
 * Why per-glyph motion rather than one shared pop: the segmented control is a
 * set of *verbs*, and a verb that animates like itself is legible before you've
 * read the caption. A phone rings by shaking about its earpiece. A bell swings
 * about its crown. A door opens by rotating about its hinge — in 3D, because a
 * door that scales isn't opening. A hand receiving something lifts. A guard
 * steps in. Each signature is one transform with its own transform-origin, and
 * the origins are the point of the whole exercise.
 *
 * Every glyph is rendered TWICE and crossfaded — once in muted ink on the
 * track, once in primary ink on the white thumb — because `RiderGlyph` paints
 * plain `fill` attributes that can't tween, and because two of the glyphs
 * (call-off's slash gap, security's cap line) knock a stroke out of whatever
 * surface sits behind them. The two copies carry different knockout colours,
 * so the slash reads correctly on the track AND on the thumb.
 *
 * Reduced motion: no signature plays and the crossfade shortens to 0 — the
 * icon simply changes colour.
 */
import { useEffect } from "react";
import { motion, useAnimationControls, type TargetAndTransition } from "framer-motion";
import { RiderGlyph } from "./riderMessageIcons";
import type { RiderGlyphId } from "./riderMessage.model";

export const INK_PRIMARY = "#1d2539";
/** Unselected segments: blue-gray-500, so they read as available, not disabled. */
export const INK_MUTED = "#a6abb8";
export const SURFACE_CARD = "#f9f9fb";
export const SURFACE_TRACK = "#f2f3f7";
export const SURFACE_THUMB = "#ffffff";
export const INK_ACTION = "#0f61ff";

/** Colour crossfade, timed to land as the thumb arrives. */
const FADE = { duration: 0.16, ease: "easeOut" as const };

type Signature = {
  /** Where the transform pivots — the hinge, the crown, the wrist. */
  origin: string;
  from: TargetAndTransition;
  to: TargetAndTransition;
};

const SIGNATURE: Record<RiderGlyphId, Signature> = {
  // Ringing: a decaying shake about the earpiece.
  call: {
    origin: "50% 72%",
    from: { rotate: 0, scale: 1, y: 0, rotateY: 0 },
    to: {
      rotate: [0, -13, 11, -7, 4, 0],
      transition: { duration: 0.52, ease: "easeOut", times: [0, 0.14, 0.32, 0.5, 0.72, 1] },
    },
  },
  // Silenced: one dip, cut short. The opposite of a ring.
  callOff: {
    origin: "50% 72%",
    from: { rotate: 0, scale: 1, y: 0, rotateY: 0 },
    to: {
      rotate: [0, -7, 0],
      scale: [1, 0.84, 1],
      transition: { duration: 0.3, ease: "easeOut" },
    },
  },
  // Rung: swings from its crown, longer decay than the phone — it's heavier.
  bell: {
    origin: "50% 16%",
    from: { rotate: 0, scale: 1, y: 0, rotateY: 0 },
    to: {
      rotate: [0, -17, 14, -9, 5, 0],
      transition: { duration: 0.56, ease: "easeOut", times: [0, 0.13, 0.31, 0.5, 0.72, 1] },
    },
  },
  // Muted: one clank that damps to nothing immediately.
  bellOff: {
    origin: "50% 16%",
    from: { rotate: 0, scale: 1, y: 0, rotateY: 0 },
    to: {
      rotate: [0, -9, 4, 0],
      scale: [1, 0.86, 1],
      transition: { duration: 0.32, ease: "easeOut" },
    },
  },
  // Receiving: the palm rises to meet the parcel and settles.
  hand: {
    origin: "50% 100%",
    from: { rotate: 0, scale: 1, y: 0, rotateY: 0 },
    to: {
      y: [4, -2.5, 0],
      scale: [0.94, 1.04, 1],
      transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
    },
  },
  // Opening: a real 3D swing about the hinge on the left edge.
  door: {
    origin: "16% 50%",
    from: { rotate: 0, scale: 1, y: 0, rotateY: 0 },
    to: {
      rotateY: [0, -52, 0],
      transition: { duration: 0.58, ease: [0.34, 1.2, 0.36, 1] },
    },
  },
  // Stepping in: arrives from underneath with a small overshoot.
  security: {
    origin: "50% 100%",
    from: { rotate: 0, scale: 1, y: 0, rotateY: 0 },
    to: {
      scale: [0.8, 1.08, 1],
      y: [3, -1, 0],
      transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
    },
  },
};

/** The two glyphs that stand for sound — they get sonar rings on select. */
export function glyphMakesSound(glyph: RiderGlyphId): boolean {
  return glyph === "call" || glyph === "bell";
}

export function SegmentGlyph({
  glyph,
  size,
  selected,
  /** Bumped on every tap, including a tap on the already-selected segment. */
  playKey,
  reduceMotion,
}: {
  glyph: RiderGlyphId;
  size: number;
  selected: boolean;
  playKey: number;
  reduceMotion: boolean;
}) {
  const controls = useAnimationControls();
  const sig = SIGNATURE[glyph];

  useEffect(() => {
    if (playKey === 0 || reduceMotion) return;
    // set-then-start, not a declarative target: a keyframe array has to be
    // replayable from a known starting pose, and the same tap can come twice.
    controls.set(sig.from);
    void controls.start(sig.to);
  }, [playKey, reduceMotion, controls, sig]);

  return (
    <motion.span
      aria-hidden="true"
      className="relative block shrink-0"
      style={{
        width: size,
        height: size,
        transformOrigin: sig.origin,
        // only the door uses it, but a perspective on a non-rotating element
        // costs nothing and keeps this branch-free
        transformPerspective: 150,
      }}
      animate={controls}
    >
      <motion.span
        className="absolute inset-0 block"
        initial={false}
        animate={{ opacity: selected ? 0 : 1 }}
        transition={reduceMotion ? { duration: 0 } : FADE}
      >
        <RiderGlyph glyph={glyph} size={size} ink={INK_MUTED} knockout={SURFACE_TRACK} />
      </motion.span>
      <motion.span
        className="absolute inset-0 block"
        initial={false}
        animate={{ opacity: selected ? 1 : 0 }}
        transition={reduceMotion ? { duration: 0 } : FADE}
      >
        <RiderGlyph glyph={glyph} size={size} ink={INK_PRIMARY} knockout={SURFACE_THUMB} />
      </motion.span>
    </motion.span>
  );
}

/**
 * M-Icon/System-Icon/mic-filled (857:81104), 22.5×22.5 verbatim from the Figma
 * export. Its own viewBox rather than a normalised 20×20 one, so no coordinate
 * is touched.
 */
export function MicGlyph({ size = 22.5, ink = INK_PRIMARY }: { size?: number; ink?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22.5 22.5"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="block shrink-0"
    >
      <path
        d="M11.2209 14.7656C13.1908 14.7656 14.8759 13.3594 15.2287 11.4211C15.5322 9.75234 15.5322 8.06016 15.2287 6.39141C14.8759 4.45312 13.1908 3.04688 11.2209 3.04688C9.25094 3.04688 7.56579 4.45312 7.21422 6.39141C6.91071 8.06016 6.91071 9.75234 7.21422 11.4211C7.56696 13.3594 9.25211 14.7656 11.222 14.7656H11.2209Z"
        fill={ink}
      />
      <path
        d="M17.6545 8.67188C17.2666 8.66484 16.9443 8.9707 16.9349 9.35859C16.9209 9.97383 16.8775 10.5949 16.8048 11.2066C16.472 14.0379 14.0709 16.1719 11.2209 16.1719C8.37086 16.1719 5.97086 14.0367 5.63805 11.2066C5.56657 10.5961 5.52204 9.97383 5.50797 9.35859C5.4986 8.9707 5.1775 8.66602 4.78844 8.67188C4.40055 8.68125 4.09352 9.00352 4.10172 9.39141C4.11696 10.05 4.16383 10.7168 4.24118 11.3707C4.63024 14.6742 7.27047 17.2184 10.5189 17.5418V19.6875C10.5189 20.0754 10.8341 20.3906 11.222 20.3906C11.6099 20.3906 11.9252 20.0754 11.9252 19.6875V17.5418C15.1736 17.2172 17.8138 14.673 18.2029 11.3695C18.2802 10.7145 18.3271 10.0488 18.3423 9.39023C18.3517 9.00234 18.0435 8.68008 17.6556 8.6707L17.6545 8.67188Z"
        fill={ink}
      />
    </svg>
  );
}

/**
 * Geometry taken from M-Icon/System-Icon/play-circle-filled (877:6712), a 37×37
 * export whose single path is a blue disc with the triangle KNOCKED OUT of it.
 *
 * The knockout is why the glyph can't be used as exported here. The card owns
 * one blue disc that persists across recording / recorded / playing, and a hole
 * punched through the export would reveal that disc instead of the white behind
 * it — a blue triangle on blue, i.e. nothing. So the disc is drawn once by the
 * card and these two glyphs are only what goes ON it, painted white.
 *
 * `PLAY_TRIANGLE_D` is the export's second subpath, byte for byte, so the
 * triangle's shape and position are still Figma's; only its role flips from
 * hole to fill. The disc radius is the export's too — 15.03 inside a 37 box,
 * which is what leaves the ~3px white ring visible in the design.
 */
export const NOTE_DISC_BOX = 37;
export const NOTE_DISC_R = 15.03125;
export const NOTE_DISC_D = NOTE_DISC_R * 2;

const PLAY_TRIANGLE_D =
  "M24.4547 19.6158L24.4123 19.6562C22.1653 21.8011 19.4289 23.364 16.4419 24.2119L16.3609 24.235C15.5246 24.472 14.6555 23.9691 14.4454 23.125C13.6861 20.0898 13.6861 16.914 14.4454 13.8769C14.6555 13.0329 15.5246 12.5299 16.3609 12.7669L16.4419 12.7901C19.4308 13.636 22.1672 15.2008 24.4123 17.3457L24.4547 17.3861C25.0906 17.9932 25.0906 19.0087 24.4547 19.6158Z";

function DiscGlyph({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 37 37"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="block shrink-0"
    >
      {children}
    </svg>
  );
}

export function PlayGlyph({ size = NOTE_DISC_BOX }: { size?: number }) {
  return (
    <DiscGlyph size={size}>
      <path d={PLAY_TRIANGLE_D} fill={SURFACE_THUMB} />
    </DiscGlyph>
  );
}

/**
 * Pause, authored to the triangle's own box (x 13.6–25.1, y 12.75–24.25), so
 * the two glyphs carry the same optical weight and the disc doesn't appear to
 * change size when one replaces the other.
 */
export function PauseGlyph({ size = NOTE_DISC_BOX }: { size?: number }) {
  return (
    <DiscGlyph size={size}>
      <rect x={13.6} y={12.75} width={3.6} height={11.5} rx={1.4} fill={SURFACE_THUMB} />
      <rect x={19.8} y={12.75} width={3.6} height={11.5} rx={1.4} fill={SURFACE_THUMB} />
    </DiscGlyph>
  );
}

/**
 * M-Icon/System-Icon/cross (21:11523), 16×16 verbatim — the Remove button's
 * left icon.
 */
export function CrossGlyph({ size = 16, ink = INK_PRIMARY }: { size?: number; ink?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="block shrink-0"
    >
      <path
        d="M10.9798 4.31315C11.1751 4.11789 11.4916 4.11789 11.6868 4.31315C11.8821 4.50841 11.8821 4.82491 11.6868 5.02018L8.70703 7.99999L11.6868 10.9798C11.8821 11.1751 11.8821 11.4916 11.6868 11.6868C11.4916 11.8821 11.1751 11.8821 10.9798 11.6868L7.99999 8.70703L5.02018 11.6868C4.82491 11.8821 4.50841 11.8821 4.31315 11.6868C4.11789 11.4916 4.11789 11.1751 4.31315 10.9798L7.29296 7.99999L4.31315 5.02018C4.11789 4.82491 4.11789 4.50841 4.31315 4.31315C4.50841 4.11789 4.82491 4.11789 5.02018 4.31315L7.99999 7.29296L10.9798 4.31315Z"
        fill={ink}
      />
    </svg>
  );
}

/**
 * Playback progress, as a ring just outside the disc. Reads as a clock hand
 * rather than a bar, which is the only honest shape for "this is 37% through a
 * three-second thing" on a 36px control.
 *
 * `strokeDashoffset` and not a rotating sector: the arc has to grow from 12
 * o'clock, and a dash offset on a round-capped stroke is the one way to do that
 * without either a mask or a second element.
 */
const RING_BOX = 46;
const RING_R = 21;
const RING_C = 2 * Math.PI * RING_R;

export function PlaybackRing({ durationMs }: { durationMs: number }) {
  return (
    <svg
      width={RING_BOX}
      height={RING_BOX}
      viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      // -90° so the sweep starts at the top; the dash runs clockwise from there
      className="block -rotate-90"
    >
      <circle
        cx={RING_BOX / 2}
        cy={RING_BOX / 2}
        r={RING_R}
        stroke={INK_ACTION}
        strokeOpacity={0.14}
        strokeWidth={2}
      />
      <motion.circle
        cx={RING_BOX / 2}
        cy={RING_BOX / 2}
        r={RING_R}
        stroke={INK_ACTION}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={RING_C}
        initial={{ strokeDashoffset: RING_C }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: durationMs / 1000, ease: "linear" }}
      />
    </svg>
  );
}

/**
 * The recorded note, as five bars. Not a Figma export — Figma only draws the
 * idle state of this card — so it's authored to the same 20px grid the system
 * glyphs use: 5 bars of 2px on a 2px rhythm, centred on the baseline.
 *
 * `live` makes them dance. The bars breathe on independent loops rather than in
 * a wave, because a wave reads as a progress indicator and this is a level
 * meter: it should look like it's listening to something.
 */
const BAR_X = [1, 5, 9, 13, 17];
const BAR_REST = [6, 11, 16, 11, 6];
const BAR_LIVE = [
  [5, 13, 7],
  [9, 17, 11],
  [14, 6, 18],
  [10, 16, 8],
  [6, 12, 5],
];

export function WaveformGlyph({
  size = 20,
  ink = INK_ACTION,
  live = false,
  reduceMotion = false,
}: {
  size?: number;
  ink?: string;
  live?: boolean;
  reduceMotion?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="block shrink-0"
    >
      {BAR_X.map((x, i) => {
        const rest = BAR_REST[i];
        const heights = live && !reduceMotion ? [rest, ...BAR_LIVE[i], rest] : [rest];
        return (
          <motion.rect
            key={x}
            x={x}
            width={2}
            rx={1}
            initial={false}
            animate={{ height: heights, y: heights.map((h) => 10 - h / 2) }}
            transition={
              heights.length === 1
                ? { duration: 0.2, ease: "easeOut" }
                : {
                    duration: 0.95 + i * 0.07,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.05,
                  }
            }
            fill={ink}
          />
        );
      })}
    </svg>
  );
}
