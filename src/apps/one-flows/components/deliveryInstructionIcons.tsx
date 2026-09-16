/**
 * Delivery instruction glyphs — Figma "Delivery Instructions Icons" 401:156178
 *
 * Every path below is copied verbatim from the Figma SVG exports. Nothing is
 * redrawn, simplified, or rounded. The only permitted edits are:
 *   1. attribute names → JSX camelCase
 *   2. the two state colours + the knockout colour hoisted to props
 *   3. mask / clipPath ids uniquified via useId()
 *
 * Source files (Instruction=<name>, State=<state>.svg):
 *   Leave at door        → NwQFwN (Default) / eaMB0w (Active)
 *   Leave with security  → x7IG25 (Default) / ZPbazj (Active)
 *   Avoid calling        → 9hgsjb (Default) / rHgifn (Active)
 *   Avoid ringing doorbell → gaKBTD (Default) / 3ZHPlK (Active)
 *   info-circle          → shA3fL
 *
 * Each glyph holds BOTH state variants in one <svg> and crossfades between
 * them, so the per-icon character animation can live on whichever group's path
 * data actually supports it. What each glyph can and cannot do is documented at
 * its definition — the four sets have genuinely different structures.
 *
 * This file is the intended swap point for future motion versions: the page and
 * widget only ever touch <InstructionGlyph kind=… />.
 */
import { useEffect, useId } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { InstructionId } from "./deliveryInstructions.model";

const DEFAULT_INK = "#1D2539";
const ACTIVE_INK = "#0F61FF";

/** docs/INTERACTION_DESIGN.md's page curve, reused for reveals. */
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** Crossfade between the Default and Active artwork, in seconds. */
const FADE_S = 0.14;

export type GlyphProps = {
  active: boolean;
  /** The card background, for areas the artwork knocks out. */
  knockout: string;
  reduceMotion: boolean;
};

const fadeT = (rm: boolean) => ({ duration: rm ? 0 : FADE_S, ease: "easeOut" as const });

/** Play the reveal forward on select. */
const drawIn = (rm: boolean, duration: number, delay = 0) =>
  rm ? { duration: 0 } : { duration, delay, ease: EASE_OUT_EXPO };

/**
 * Rewind the reveal on deselect — but only *after* the crossfade has hidden
 * this group, so nothing visibly un-draws. A retracting slash would read as
 * "calling is allowed again", which is backwards.
 */
const rewindHidden = (rm: boolean) => ({ duration: 0, delay: rm ? 0 : FADE_S });

const revealT = (rm: boolean, active: boolean, duration: number, delay = 0) =>
  active ? drawIn(rm, duration, delay) : rewindHidden(rm);

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="block size-6"
    >
      {children}
    </svg>
  );
}

/* ================================================================
 *  Leave at the door — hinge wipe
 *
 *  Default is an outline door (evenodd) plus a separate solid knob;
 *  Active is a single solid door with the knob knocked out. Nothing is
 *  stroked and the subpath structure differs completely, so there is no
 *  morph and no draw-on available here. What the data does support is a
 *  clip wipe from the hinge at x≈5, which reads as the door swinging to.
 * ================================================================ */

function LeaveAtDoorGlyph({ active, reduceMotion }: GlyphProps) {
  const uid = useId();
  const hingeId = `${uid}-hinge`;

  return (
    <Svg>
      <defs>
        <clipPath id={hingeId}>
          <motion.rect
            x={4}
            y={0}
            height={24}
            initial={false}
            animate={{ width: active ? 20 : 0 }}
            transition={revealT(reduceMotion, active, 0.26)}
          />
        </clipPath>
      </defs>

      <motion.g initial={false} animate={{ opacity: active ? 0 : 1 }} transition={fadeT(reduceMotion)}>
        <path
          d="M13 10.9999C13.5523 10.9999 14 11.4477 14 11.9999C14 12.5522 13.5523 12.9999 13 12.9999C12.4477 12.9999 12 12.5522 12 11.9999C12 11.4477 12.4477 10.9999 13 10.9999Z"
          fill={DEFAULT_INK}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16.2478 2.851L16.5297 2.88994L16.5298 2.89006C18.3781 3.15412 19.75 4.7368 19.75 6.60247V19.2499H22C22.4142 19.2499 22.75 19.5857 22.75 19.9999C22.75 20.4141 22.4142 20.7499 22 20.7499H2C1.58579 20.7499 1.25 20.4141 1.25 19.9999C1.25001 19.5857 1.5858 19.2499 2 19.2499H4.24878V6.60247C4.24878 4.73653 5.62217 3.15411 7.46887 2.89006L7.46912 2.88994C7.69194 2.85815 7.91503 2.82888 8.13831 2.80181C10.8296 2.47507 13.5603 2.49185 16.2478 2.851ZM11.6528 4.07036C10.4351 4.08417 9.21802 4.17066 8.00793 4.33001C7.89931 4.34432 7.79075 4.35932 7.68225 4.37481L7.68237 4.37493C6.5741 4.5334 5.75 5.48343 5.75 6.60247V19.2499H15.25V6.47869C15.25 5.18449 14.2262 4.12324 12.9418 4.08342L12.9415 4.0833C12.512 4.06988 12.0824 4.06558 11.6528 4.07036ZM16.1171 4.34697C16.5178 4.96125 16.75 5.69463 16.75 6.47869V19.2499H18.25V6.60247C18.25 5.48317 17.4269 4.53342 16.3177 4.37493C16.2509 4.36539 16.184 4.35607 16.1171 4.34697Z"
          fill={DEFAULT_INK}
        />
      </motion.g>

      <motion.g initial={false} animate={{ opacity: active ? 1 : 0 }} transition={fadeT(reduceMotion)}>
        <g clipPath={`url(#${hingeId})`}>
          <path
            d="M22 19.1825H19V6.5337C19 5.0412 17.9025 3.77495 16.4237 3.5637C16.0775 3.5137 15.73 3.4712 15.3825 3.4337C16.2212 4.14745 16.7487 5.2137 16.7487 6.4112V19.1825H15.9987V6.40995C16 4.7162 14.6588 3.31745 12.965 3.26495C11.165 3.2087 9.3625 3.3087 7.57625 3.5637C6.09875 3.77495 5 5.0412 5 6.5337V19.1812H2C1.58625 19.1812 1.25 19.5175 1.25 19.9312C1.25 20.3449 1.58625 20.6812 2 20.6812H22C22.4137 20.6812 22.75 20.3449 22.75 19.9312C22.75 19.5175 22.4137 19.1812 22 19.1812V19.1825ZM13.375 12.8075C12.8912 12.8075 12.5 12.4162 12.5 11.9325C12.5 11.4487 12.8912 11.0575 13.375 11.0575C13.8588 11.0575 14.25 11.4487 14.25 11.9325C14.25 12.4162 13.8588 12.8075 13.375 12.8075Z"
            fill={ACTIVE_INK}
          />
        </g>
      </motion.g>
    </Svg>
  );
}

/* ================================================================
 *  Leave with security — the guard tips his cap
 *
 *  The Active variant gives us two real primitives: the brim is an open
 *  stroked path (so it can draw on) and the cap top is a genuine <ellipse>
 *  (so its `cy` can animate — the cap drops onto the head).
 *
 *  Note the brim's stroke in the export is #EBF4FF: that is the selected
 *  card background, knocked out. It has to be the `knockout` prop or any
 *  change to the card background silently breaks this glyph.
 *
 *  No cross-state morph: Default's brim is a filled path + stroked ellipse
 *  while Active's is the reverse. Crossfade only.
 * ================================================================ */

function LeaveWithSecurityGlyph({ active, knockout, reduceMotion }: GlyphProps) {
  const uid = useId();
  const maskId = `${uid}-security-mask`;

  return (
    <Svg>
      <motion.g initial={false} animate={{ opacity: active ? 0 : 1 }} transition={fadeT(reduceMotion)}>
        <mask id={maskId} fill="white">
          <path d="M15.9623 7.33954C15.9623 9.52662 14.1893 11.2996 12.0022 11.2996C9.81511 11.2996 8.04211 9.52662 8.04211 7.33954C8.04211 5.15245 9.81511 4.81055 12.0022 4.81055C14.1893 4.81055 15.9623 5.15245 15.9623 7.33954Z" />
          <path d="M16.2263 21.6486H7.7781C6.1769 21.6486 4.87402 20.3457 4.87402 18.7445C4.87402 14.8135 8.07115 12.3872 12.0022 12.3872C15.9333 12.3872 19.1304 14.8135 19.1304 18.7445C19.1304 20.3457 17.8275 21.6486 16.2263 21.6486Z" />
        </mask>
        <path
          d="M15.9623 7.33954H14.4416C14.4416 8.68676 13.3495 9.77893 12.0022 9.77893V11.2996V12.8203C15.0292 12.8203 17.483 10.3665 17.483 7.33954H15.9623ZM12.0022 11.2996V9.77893C10.6549 9.77893 9.56279 8.68676 9.56279 7.33954H8.04211H6.52143C6.52143 10.3665 8.97527 12.8203 12.0022 12.8203V11.2996ZM8.04211 7.33954H9.56279C9.56279 6.99852 9.63084 6.84899 9.66299 6.7945C9.69076 6.74743 9.74084 6.68574 9.88289 6.61461C10.2489 6.43131 10.9128 6.33123 12.0022 6.33123V4.81055V3.28987C10.9045 3.28987 9.58833 3.36074 8.5211 3.89516C7.94651 4.18289 7.41664 4.61676 7.04363 5.24891C6.675 5.87365 6.52143 6.58701 6.52143 7.33954H8.04211ZM12.0022 4.81055V6.33123C13.0916 6.33123 13.7555 6.43131 14.1215 6.61461C14.2636 6.68574 14.3137 6.74743 14.3414 6.7945C14.3736 6.84899 14.4416 6.99852 14.4416 7.33954H15.9623H17.483C17.483 6.58701 17.3294 5.87365 16.9608 5.24891C16.5878 4.61676 16.0579 4.18289 15.4833 3.89516C14.4161 3.36074 13.0999 3.28987 12.0022 3.28987V4.81055ZM16.2263 21.6486V20.1279H7.7781V21.6486V23.1693H16.2263V21.6486ZM7.7781 21.6486V20.1279C7.01673 20.1279 6.3947 19.5059 6.3947 18.7445H4.87402H3.35334C3.35334 21.1856 5.33706 23.1693 7.7781 23.1693V21.6486ZM4.87402 18.7445H6.3947C6.3947 17.2261 6.99735 16.0598 7.9493 15.25C8.9241 14.4208 10.3402 13.9079 12.0022 13.9079V12.3872V10.8665C9.73316 10.8665 7.58517 11.5668 5.97864 12.9335C4.34926 14.3196 3.35334 16.3319 3.35334 18.7445H4.87402ZM12.0022 12.3872V13.9079C13.6642 13.9079 15.0803 14.4208 16.0551 15.25C17.0071 16.0598 17.6097 17.2261 17.6097 18.7445H19.1304H20.6511C20.6511 16.3319 19.6552 14.3196 18.0258 12.9335C16.4193 11.5668 14.2713 10.8665 12.0022 10.8665V12.3872ZM19.1304 18.7445H17.6097C17.6097 19.5059 16.9877 20.1279 16.2263 20.1279V21.6486V23.1693C18.6674 23.1693 20.6511 21.1856 20.6511 18.7445H19.1304Z"
          fill={DEFAULT_INK}
          mask={`url(#${maskId})`}
        />
        <ellipse cx="11.9995" cy="4.42859" rx="4.97117" ry="0.857301" stroke={DEFAULT_INK} strokeWidth="1.01379" />
        <path
          d="M15.8823 5.00684C12.4097 9.85811 9.24106 7.0282 8.09082 5.00684L12.0595 5.43116L15.8823 5.00684Z"
          fill={DEFAULT_INK}
          stroke={DEFAULT_INK}
          strokeWidth="1.01379"
        />
      </motion.g>

      <motion.g initial={false} animate={{ opacity: active ? 1 : 0 }} transition={fadeT(reduceMotion)}>
        <path
          d="M15.9623 7.33954C15.9623 9.52662 14.1893 11.2996 12.0022 11.2996C9.81511 11.2996 8.04211 9.52662 8.04211 7.33954C8.04211 5.15245 9.81511 4.81055 12.0022 4.81055C14.1893 4.81055 15.9623 5.15245 15.9623 7.33954Z"
          fill={ACTIVE_INK}
        />
        <path
          d="M16.2263 21.6486H7.7781C6.1769 21.6486 4.87402 20.3457 4.87402 18.7445C4.87402 14.8135 8.07115 12.3872 12.0022 12.3872C15.9333 12.3872 19.1304 14.8135 19.1304 18.7445C19.1304 20.3457 17.8275 21.6486 16.2263 21.6486Z"
          fill={ACTIVE_INK}
        />
        {/* brim — open stroked path, so it can draw itself on */}
        <motion.path
          d="M8.09082 5.00684C9.24106 7.0282 12.4097 9.85811 15.8823 5.00684"
          stroke={knockout}
          strokeWidth="1.01379"
          fill="none"
          initial={false}
          animate={{ pathLength: active ? 1 : 0 }}
          transition={revealT(reduceMotion, active, 0.22, 0.04)}
        />
        {/* cap top — a real <ellipse>, so `cy` drops it onto the head */}
        <motion.ellipse
          cx="11.9995"
          rx="4.97117"
          ry="0.857301"
          fill={ACTIVE_INK}
          stroke={ACTIVE_INK}
          strokeWidth="1.01379"
          initial={false}
          animate={{ cy: active ? 4.42859 : 3.1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : active
                ? { type: "spring", stiffness: 600, damping: 22, mass: 0.5 }
                : { duration: 0, delay: FADE_S }
          }
        />
      </motion.g>
    </Svg>
  );
}

/* ================================================================
 *  Avoid calling — the slash re-strikes
 *
 *  The only genuinely stroke-animatable glyph in the set: both states end
 *  with two open stroked lines (the accent slash at width 2.2 and a trim
 *  stroke at 1.6 that keeps it clear of the handset).
 *
 *  Two deliberate departures from the raw export, both colour-only:
 *   - the trim stroke ships as `white`, which is Figma's artboard. Over the
 *     card it would show as a near-white sliver, so it becomes `knockout`.
 *     Figma itself does exactly this in the security glyph (#EBF4FF).
 *   - the slash exists in BOTH states, so drawing it is a flourish on
 *     select, not a state difference. It never visibly retracts.
 * ================================================================ */

function AvoidCallingGlyph({ active, knockout, reduceMotion }: GlyphProps) {
  const slashT = revealT(reduceMotion, active, 0.24);

  return (
    <Svg>
      <motion.g initial={false} animate={{ opacity: active ? 0 : 1 }} transition={fadeT(reduceMotion)}>
        <path
          d="M17.7292 17.2984C17.7292 17.2001 17.6662 17.1133 17.5743 17.0818L17.5555 17.0762L15.0863 16.4586C15.0077 16.4393 14.9247 16.4622 14.867 16.5196L12.4236 18.963C13.5868 19.351 14.8313 19.5614 16.125 19.5614H17.5C17.6268 19.5614 17.7292 19.459 17.7292 19.3323V17.2984ZM19.1042 19.3323C19.1042 20.2184 18.3862 20.9364 17.5 20.9364H16.125C14.2813 20.9364 12.527 20.5543 10.9366 19.8653C10.923 19.86 10.9095 19.8543 10.8962 19.848C7.88567 18.5316 5.46717 16.1132 4.15082 13.1026C4.14457 13.0893 4.13882 13.0758 4.13347 13.0622C3.44451 11.4718 3.0625 9.71754 3.0625 7.87394V6.49894C3.0625 5.61278 3.78051 4.89477 4.66667 4.89477H6.70052C7.43668 4.89477 8.07823 5.39608 8.25668 6.10987L8.8738 8.57744C9.01246 9.12606 8.85129 9.70449 8.45284 10.1029L5.59799 12.9576C6.74516 15.3289 8.66994 17.2536 11.0413 18.4008L13.8961 15.5461L13.8972 15.5449C14.283 15.1611 14.8363 14.9986 15.3678 15.1126L15.4191 15.1246L15.4198 15.1247L17.8891 15.7423L17.9553 15.7604C18.6337 15.9609 19.1042 16.5853 19.1042 17.2984V19.3323ZM4.4375 7.87394C4.4375 9.16757 4.64782 10.412 5.03582 11.5752L7.48056 9.13066C7.53815 9.07307 7.56022 8.99136 7.54076 8.91436C7.54062 8.91382 7.54045 8.91323 7.54031 8.91268L6.92275 6.44343C6.89724 6.3414 6.80539 6.26977 6.70052 6.26977H4.66667C4.5399 6.26977 4.4375 6.37217 4.4375 6.49894V7.87394Z"
          fill={DEFAULT_INK}
        />
        <path
          d="M18.6458 12.0001C18.6458 8.32926 15.6708 5.35425 12 5.35425C11.6203 5.35425 11.3125 5.04644 11.3125 4.66675C11.3125 4.28705 11.6203 3.97925 12 3.97925C16.4302 3.97925 20.0208 7.56986 20.0208 12.0001C20.0208 12.3798 19.713 12.6876 19.3333 12.6876C18.9536 12.6876 18.6458 12.3798 18.6458 12.0001Z"
          fill={DEFAULT_INK}
        />
        <path
          d="M15.4375 12.0001C15.4375 10.1019 13.8982 8.56258 12 8.56258C11.6203 8.56258 11.3125 8.25478 11.3125 7.87508C11.3125 7.49539 11.6203 7.18758 12 7.18758C14.6576 7.18758 16.8125 9.34247 16.8125 12.0001C16.8125 12.3798 16.5047 12.6876 16.125 12.6876C15.7453 12.6876 15.4375 12.3798 15.4375 12.0001Z"
          fill={DEFAULT_INK}
        />
        <path d="M3.62598 20.562L21.2161 2.97192" stroke={DEFAULT_INK} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M3.94238 22.2017L23.1904 2.95361" stroke={knockout} strokeWidth="1.6" strokeLinecap="round" />
      </motion.g>

      <motion.g initial={false} animate={{ opacity: active ? 1 : 0 }} transition={fadeT(reduceMotion)}>
        <path
          d="M18.371 15.3298L15.9018 14.7122C15.3586 14.5758 14.7754 14.7385 14.3789 15.1338L11.7424 17.7704C11.4479 17.6295 11.1637 17.4759 10.8945 17.3098C8.87207 16.0665 7.27822 14.302 6.33634 12.2864L8.93509 9.68769C9.33155 9.29123 9.49311 8.708 9.35676 8.16488L8.73915 5.69561C8.5604 4.98061 7.91988 4.48103 7.18311 4.48103H5.14811C4.26353 4.48332 3.54395 5.2029 3.54395 6.08748V7.46248C3.54395 9.2878 3.92092 11.0272 4.6004 12.6073C4.61415 12.6508 4.63363 12.6944 4.65655 12.7356C5.97197 15.7056 8.36332 18.097 11.3333 19.4135C11.3746 19.4364 11.4181 19.4559 11.4617 19.4697C13.0418 20.1492 14.78 20.525 16.6064 20.525H17.9814C18.866 20.525 19.5856 19.8054 19.5856 18.9208V16.887C19.5856 16.149 19.086 15.5097 18.371 15.3309V15.3298Z"
          fill={ACTIVE_INK}
        />
        {/* the two ring arcs dim as the slash lands — the phone stops ringing */}
        <motion.g
          initial={false}
          animate={{ opacity: active ? 0.35 : 1 }}
          transition={revealT(reduceMotion, active, 0.24)}
        >
          <path
            d="M12.4814 3.56665C12.1022 3.56665 11.7939 3.87488 11.7939 4.25415C11.7939 4.63342 12.1022 4.94165 12.4814 4.94165C16.1458 4.94165 19.1273 7.92311 19.1273 11.5875C19.1273 11.9668 19.4355 12.275 19.8148 12.275C20.194 12.275 20.5023 11.9668 20.5023 11.5875C20.5023 7.16457 16.9044 3.56665 12.4814 3.56665Z"
            fill={ACTIVE_INK}
          />
          <path
            d="M15.9189 11.5875C15.9189 11.9668 16.2272 12.275 16.6064 12.275C16.9857 12.275 17.2939 11.9668 17.2939 11.5875C17.2939 8.93373 15.1352 6.77498 12.4814 6.77498C12.1022 6.77498 11.7939 7.08321 11.7939 7.46248C11.7939 7.84175 12.1022 8.14998 12.4814 8.14998C14.3767 8.14998 15.9189 9.69228 15.9189 11.5875Z"
            fill={ACTIVE_INK}
          />
        </motion.g>
        {/* the accent slash and its trim stroke draw together — if the trim
            lags even a frame you get a moment of untrimmed slash */}
        <motion.path
          d="M3.62598 20.562L21.2161 2.97192"
          stroke={ACTIVE_INK}
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: active ? 1 : 0 }}
          transition={slashT}
        />
        <motion.path
          d="M3.94238 22.2017L23.1904 2.95361"
          stroke={knockout}
          strokeWidth="1.6"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: active ? 1 : 0 }}
          transition={slashT}
        />
      </motion.g>
    </Svg>
  );
}

/* ================================================================
 *  Don't ring the bell — it rings, then it's silenced
 *
 *  The diagonal cut here is fused into the same <path> as the bell outline
 *  (one subpath traces the slash's top edge, then the bell, then back down
 *  the other edge), and the bell is pre-cut in BOTH variants. So there is
 *  no slash to draw on, and pretending otherwise would mean redrawing the
 *  artwork. What the data does support is a group transform — so the bell
 *  rings from its hanger and then settles into the crossed-out state.
 * ================================================================ */

function AvoidBellGlyph({ active, reduceMotion }: GlyphProps) {
  const ring = useAnimationControls();

  useEffect(() => {
    if (!active || reduceMotion) return;
    ring.start({
      rotate: [0, -9, 7, -4, 0],
      transition: { duration: 0.42, ease: "easeOut", times: [0, 0.22, 0.5, 0.75, 1] },
    });
  }, [active, reduceMotion, ring]);

  return (
    <Svg>
      {/* transformBox:"fill-box" is required — without it the percentage
          transform-origin resolves against the SVG viewport and the bell
          spins about the icon centre instead of swinging from its hanger. */}
      <motion.g animate={ring} style={{ transformBox: "fill-box", transformOrigin: "50% 12%" }}>
        <motion.g initial={false} animate={{ opacity: active ? 0 : 1 }} transition={fadeT(reduceMotion)}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M19.9994 3.99964C20.6314 3.36761 20.6315 3.36757 19.9994 3.99964V3.99964Z"
            fill={DEFAULT_INK}
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M18.9394 2.93964L16.4815 5.39754C15.4275 4.08797 13.8114 3.24991 11.9997 3.24991C8.8242 3.24991 6.24967 5.82445 6.24967 8.99991V9.85868C6.24967 11.7581 5.68726 13.6158 4.63321 15.1963L4.63224 15.1978C4.3839 15.5721 4.24967 16.0124 4.24967 16.4637C4.24967 16.8051 4.32462 17.1291 4.45895 17.4201L2.9394 18.9396C2.6465 19.2325 2.6465 19.7073 2.9394 20.0002C3.23229 20.2931 3.70705 20.2931 3.99994 20.0002L19.9994 3.99964C20.2923 3.70675 20.2928 3.23253 19.9999 2.93964C19.7071 2.64675 19.2323 2.64675 18.9394 2.93964ZM5.94071 15.9383L15.4124 6.46665C14.6378 5.42489 13.3975 4.74991 11.9997 4.74991C9.65263 4.74991 7.74967 6.65288 7.74967 8.99991V9.85868C7.74967 12.0182 7.12077 14.131 5.94071 15.9383Z"
            fill={DEFAULT_INK}
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7.37144 18.7487L8.87144 17.2487H17.4646C17.8979 17.2487 18.2497 16.8969 18.2497 16.4637C18.2497 16.309 18.2033 16.1563 18.1181 16.0285C16.9019 14.2048 16.252 12.0618 16.2497 9.87045L17.7189 8.40125C17.7392 8.59803 17.7497 8.79776 17.7497 8.99991V9.85868C17.7497 11.6987 18.2775 13.4996 19.2687 15.0473L19.3661 15.1963C19.6159 15.571 19.7497 16.0134 19.7497 16.4637C19.7497 17.7254 18.7263 18.7487 17.4646 18.7487L14.2497 18.7499C14.2497 19.9924 13.2422 20.9999 11.9997 20.9999C10.7572 20.9999 9.74967 19.9924 9.74967 18.7499L7.37144 18.7487Z"
            fill={DEFAULT_INK}
          />
        </motion.g>

        <motion.g initial={false} animate={{ opacity: active ? 1 : 0 }} transition={fadeT(reduceMotion)}>
          <path
            d="M12.0004 21.7501C13.2429 21.7501 14.2504 20.7426 14.2504 19.5001H9.75035C9.75035 20.7426 10.7579 21.7501 12.0004 21.7501Z"
            fill={ACTIVE_INK}
          />
          <path
            d="M20.0004 2.94008C19.7079 2.64758 19.2329 2.64758 18.9391 2.94008L16.4791 5.40008C15.4241 4.09008 13.8091 3.25008 12.0004 3.25008C8.83035 3.25008 6.25035 5.83008 6.25035 9.00008V9.85883C6.25035 11.7651 5.6916 13.6113 4.6341 15.1963C4.38285 15.5726 4.25035 16.0113 4.25035 16.4638C4.25035 16.8038 4.32785 17.1263 4.4616 17.4163L2.9391 18.9388C2.6466 19.2313 2.6466 19.7063 2.9391 20.0001C3.08535 20.1463 3.27785 20.2201 3.4691 20.2201C3.66035 20.2201 3.85285 20.1463 3.9991 20.0001L20.0004 4.00008C20.2929 3.70758 20.2929 3.23258 20.0004 2.93883V2.94008Z"
            fill={ACTIVE_INK}
          />
          <path
            d="M17.7504 9.00008C17.7504 8.79883 17.7366 8.60133 17.7166 8.40508L7.3716 18.7501H17.4654C18.7254 18.7501 19.7504 17.7251 19.7504 16.4651C19.7504 16.0126 19.6178 15.5738 19.3666 15.1976C18.3091 13.6113 17.7504 11.7663 17.7504 9.86008V9.00008Z"
            fill={ACTIVE_INK}
          />
        </motion.g>
      </motion.g>
    </Svg>
  );
}

/* ================================================================
 *  Public surface
 * ================================================================ */

const GLYPH: Record<InstructionId, (props: GlyphProps) => React.ReactElement> = {
  door: LeaveAtDoorGlyph,
  security: LeaveWithSecurityGlyph,
  call: AvoidCallingGlyph,
  bell: AvoidBellGlyph,
};

export function InstructionGlyph({ kind, ...rest }: GlyphProps & { kind: InstructionId }) {
  const Glyph = GLYPH[kind];
  return <Glyph {...rest} />;
}

/** Figma M-Icon/System-Icon/info-circle (14:5288), 16×16. */
export function InfoCircle({ className = "" }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`block size-4 ${className}`}
    >
      <path
        d="M7.5 10.6667V7.33333C7.5 7.05719 7.72386 6.83333 8 6.83333C8.27614 6.83333 8.5 7.05719 8.5 7.33333V10.6667C8.5 10.9428 8.27614 11.1667 8 11.1667C7.72386 11.1667 7.5 10.9428 7.5 10.6667Z"
        fill="#666D85"
      />
      <path
        d="M8 6.08333C8.41421 6.08333 8.75 5.74755 8.75 5.33333C8.75 4.91912 8.41421 4.58333 8 4.58333C7.58579 4.58333 7.25 4.91912 7.25 5.33333C7.25 5.74755 7.58579 6.08333 8 6.08333Z"
        fill="#666D85"
      />
      <path
        d="M13.5 8C13.5 4.96243 11.0376 2.5 8 2.5C4.96243 2.5 2.5 4.96243 2.5 8C2.5 11.0376 4.96243 13.5 8 13.5C11.0376 13.5 13.5 11.0376 13.5 8ZM14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8C1.5 4.41015 4.41015 1.5 8 1.5C11.5899 1.5 14.5 4.41015 14.5 8Z"
        fill="#666D85"
      />
    </svg>
  );
}
