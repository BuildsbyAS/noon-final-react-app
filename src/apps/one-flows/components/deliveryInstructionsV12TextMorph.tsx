/**
 * TextMorph — v12's caption morph. Letters rearrange along their own line;
 * nothing ever moves vertically.
 *
 * Why not v10's word morph: it diffed WORDS across the whole caption, so a
 * word shared by both answers ("my", "items") could sit on line 2 before and
 * line 1 after, and slid diagonally between lines while its neighbours
 * reflowed around it. It read as text falling apart, not changing.
 *
 * Here each `\n`-separated line morphs on its own, in place:
 *  - The diff unit is the CHARACTER, matched with an LCS pass, so
 *    "Call me" → "Don’t call me" keeps "all me" and simply slides it right as
 *    "Don’t c" assembles in front. Matching is case-sensitive on purpose: a
 *    letter that swapped case in place changed width mid-slide and briefly
 *    overlapped its neighbour, so "r" → "R" is a leave + arrive instead.
 *  - Surviving letters keep their key and glide horizontally to their new x
 *    (a position-only layout animation; the line's y never changes).
 *  - Leaving letters drop out of the flow at once (popLayout) and fade through
 *    a blur where they stood; arriving letters resolve out of a blur in place,
 *    staggered a few ms apart so the word assembles rather than pops.
 *
 * Lines are fixed-height rows with `white-space: pre`, so per-letter
 * inline-blocks can never hand the line-breaker a new break.
 *
 * Reduced motion: the whole caption crossfades.
 */
import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Glyph = { key: string; ch: string };

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SLIDE = { type: "spring" as const, duration: 0.42, bounce: 0.08 };
const ENTER_STAGGER_S = 0.012;

/** LCS over characters; matched letters inherit the old key. */
function diffLine(prev: Glyph[], next: string, freshKey: () => string): Glyph[] {
  const a = prev.map((g) => g.ch);
  const b = Array.from(next);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: Glyph[] = [];
  let i = 0;
  let j = 0;
  while (j < m) {
    if (i < n && a[i] === b[j]) {
      out.push({ key: prev[i].key, ch: b[j] });
      i++;
      j++;
    } else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      out.push({ key: freshKey(), ch: b[j] });
      j++;
    }
  }
  return out;
}

export type TextMorphProps = {
  text: string;
  reduceMotion: boolean;
  /** Typography; every line is one `leading` tall. */
  className?: string;
};

export default function TextMorph({ text, reduceMotion, className = "" }: TextMorphProps) {
  // Derived during render (not in an effect) so the new letters and the keys
  // that carry them land in the same commit. Idempotent for a repeated `text`,
  // so StrictMode's double render is harmless.
  const seq = useRef(0);
  const cache = useRef<{ text: string; lines: Glyph[][] } | null>(null);
  if (cache.current?.text !== text) {
    const fresh = () => `g${seq.current++}`;
    const prevLines = cache.current?.lines ?? [];
    const lines = text.split("\n").map((line, li) => diffLine(prevLines[li] ?? [], line, fresh));
    cache.current = { text, lines };
  }
  const lines = cache.current.lines;

  if (reduceMotion) {
    return (
      <span className={`relative block ${className}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            className="block whitespace-pre-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </span>
    );
  }

  return (
    <span className={`relative block ${className}`}>
      <span className="sr-only">{text.replace(/\n/g, " ")}</span>
      <span aria-hidden="true" className="block">
        {lines.map((line, li) => {
          let entering = 0;
          return (
            <span key={li} className="relative flex whitespace-pre">
              {/* A zero-width strut keeps an emptied line at full height. */}
              <span className="inline-block w-0">{"​"}</span>
              <AnimatePresence mode="popLayout" initial={false}>
                {line.map((g) => {
                  const delay = entering++ * ENTER_STAGGER_S;
                  return (
                    <motion.span
                      key={g.key}
                      layout="position"
                      className="relative inline-block will-change-transform"
                      initial={{ opacity: 0, filter: "blur(4px)", scale: 0.7 }}
                      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                      exit={{ opacity: 0, filter: "blur(4px)", scale: 0.7, transition: { duration: 0.16, ease: EASE_OUT } }}
                      transition={{
                        layout: SLIDE,
                        opacity: { duration: 0.22, delay: 0.06 + delay, ease: EASE_OUT },
                        filter: { duration: 0.28, delay: 0.06 + delay, ease: EASE_OUT },
                        scale: { ...SLIDE, delay: 0.06 + delay },
                      }}
                    >
                      {g.ch}
                    </motion.span>
                  );
                })}
              </AnimatePresence>
            </span>
          );
        })}
      </span>
    </span>
  );
}
