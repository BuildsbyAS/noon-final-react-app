/**
 * TextMorph — a line of copy that re-reads itself instead of being replaced.
 *
 * Built for the delivery-preferences card (DeliveryInstructionsWidgetV2), where
 * the caption under each segmented control *is* the readout of the control:
 * flip a segment and the sentence has to become a different sentence without
 * ever looking like two sentences crossfading on top of each other.
 *
 * The unit of the diff is the WORD, and that choice is the whole design:
 *
 *  - Words are matched with an LCS pass, so a word that survives the change
 *    keeps its React key and therefore its identity. "Ring the doorbell" →
 *    "Don’t ring the bell" physically slides `the` to its new position instead
 *    of fading one `the` out and another in. The sentence reorganises itself.
 *  - Words that leave and words that arrive animate per CHARACTER, so old words
 *    disassemble upward and new ones assemble from below, letter by letter.
 *    That's where the texture is.
 *  - Characters can't be the diff unit: each would have to be an inline-block,
 *    which hands the line-breaker a break opportunity between every letter and
 *    shreds a two-line caption mid-word. Words stay `whitespace-nowrap`, so
 *    wrapping is still real text wrapping.
 *
 * Blur is doing quiet work here. Without it you see two legible glyphs
 * overlapping mid-transition and the eye reads "two things"; with 5px of blur
 * at both ends of the travel the eye reads "one thing changing".
 *
 * Spaces are margin, not glyphs — so an exiting word leaves no gap behind
 * (`popLayout` takes it out of flow). The last word carries no trailing margin,
 * which is what keeps a centred caption exactly centred rather than 1.5px off.
 *
 * Reduced motion: no travel, no blur, no stagger — the whole line crossfades in
 * 120ms and the layout jumps. Still legible, never a moving target.
 */
import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Word gap, in em, so it tracks font-size. ~3px at 12px — a Noontree space. */
const SPACE_EM = 0.26;

/** Letters assemble in reading order; the spring is what gives them weight. */
const CHAR_IN = { type: "spring" as const, stiffness: 620, damping: 34, mass: 0.7 };

/** Exit is faster than entry — the system responding, not the user deciding. */
const CHAR_OUT = { duration: 0.16, ease: [0.4, 0, 1, 1] as const };

/** Surviving words slide; a hair of bounce keeps it from feeling mechanical. */
const WORD_SETTLE = { type: "spring" as const, stiffness: 520, damping: 30, mass: 0.8 };

const STAGGER_IN = 0.018;
const STAGGER_OUT = 0.012;
/** Later words lag slightly, so the line resolves left to right. */
const WORD_LAG = 0.026;

type CharCustom = { i: number; n: number; w: number };

/**
 * Dynamic variants, so the delay can depend on the character's position.
 * They propagate down from each word's `animate` / `exit`, which is also what
 * makes AnimatePresence wait for the characters before unmounting the word.
 */
const CHAR_VARIANTS = {
  out: { opacity: 0, y: 9, scale: 0.68, filter: "blur(5px)" },
  in: ({ i, w }: CharCustom) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { ...CHAR_IN, delay: w * WORD_LAG + i * STAGGER_IN },
  }),
  // Leaving letters peel off from the tail, which reads as the word retracting
  // rather than dissolving.
  leave: ({ i, n }: CharCustom) => ({
    opacity: 0,
    y: -9,
    scale: 0.68,
    filter: "blur(5px)",
    transition: { ...CHAR_OUT, delay: (n - 1 - i) * STAGGER_OUT },
  }),
};

/** The word box itself never changes shape — it only moves. */
const WORD_VARIANTS = { out: {}, in: {}, leave: {} };

type Word = { key: string; text: string };

/**
 * For each word in `next`, the index of the word in `prev` it continues, or
 * null if it's new. Standard LCS backtrack; captions are a handful of words, so
 * the O(n·m) table is free.
 */
function alignWords(prev: string[], next: string[]): (number | null)[] {
  const n = prev.length;
  const m = next.length;
  const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = prev[i] === next[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: (number | null)[] = new Array(m).fill(null);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (prev[i] === next[j]) {
      out[j] = i;
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return out;
}

export type TextMorphProps = {
  /** The line to read. Changing it morphs; an identical string is a no-op. */
  text: string;
  reduceMotion: boolean;
  /** Typography + box. The component contributes nothing but the morph. */
  className?: string;
};

export default function TextMorph({ text, reduceMotion, className = "" }: TextMorphProps) {
  // Word identity is derived during render, not in an effect: the new text and
  // the keys that carry it have to land in the SAME commit, or the caption
  // flashes the new string unanimated for a frame. The refs are a cache and the
  // derivation is idempotent — a second render with the same `text` takes the
  // early exit, so React's double-invoke under StrictMode is harmless.
  const wordsRef = useRef<Word[]>([]);
  const textRef = useRef<string | null>(null);
  const seqRef = useRef(0);

  if (textRef.current !== text) {
    const prev = wordsRef.current;
    const nextTexts = text.split(/\s+/).filter(Boolean);
    const match = alignWords(
      prev.map((w) => w.text),
      nextTexts,
    );
    wordsRef.current = nextTexts.map((word, idx) => {
      const carried = match[idx];
      return carried === null ? { key: `w${(seqRef.current += 1)}`, text: word } : prev[carried];
    });
    textRef.current = text;
  }

  if (reduceMotion) {
    return (
      <span className={`block ${className}`} aria-hidden="true">
        {text}
      </span>
    );
  }

  const words = wordsRef.current;

  return (
    // `relative` + `block` give popLayout's out-of-flow exiting words a proper
    // containing block, and let the caller's `text-center` do real centring.
    <span className={`relative block ${className}`} aria-hidden="true">
      <AnimatePresence initial={false} mode="popLayout">
        {words.map((word, w) => {
          const chars = [...word.text];
          return (
            <motion.span
              key={word.key}
              layout="position"
              variants={WORD_VARIANTS}
              initial="out"
              animate="in"
              exit="leave"
              transition={WORD_SETTLE}
              className="inline-block whitespace-nowrap align-baseline"
              style={{ marginRight: w === words.length - 1 ? 0 : `${SPACE_EM}em` }}
            >
              {chars.map((char, i) => (
                <motion.span
                  key={i}
                  variants={CHAR_VARIANTS}
                  custom={{ i, n: chars.length, w } satisfies CharCustom}
                  className="inline-block whitespace-pre will-change-transform"
                >
                  {char}
                </motion.span>
              ))}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}
