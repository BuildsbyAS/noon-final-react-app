/**
 * M-Checkbox — Figma 1:29043 / 519:234868 / 21:8063, 20×20
 *
 * The exported Selected artwork is a single filled path with the tick knocked
 * out, so the tick can't be pathLength-drawn. It doesn't need to be: the path
 * splits byte-for-byte at its `ZM` boundary into the squircle and the tick, and
 * because the tick runs down-right then up-right, a plain left-to-right clip
 * wipe reveals it in its natural drawing order.
 *
 * So: blue floods out from the centre, then the tick wipes on behind it. Zero
 * redraw — every coordinate below is from the export.
 *
 * `knockout` is the surface the tick is punched out of, so callers pass
 * whatever colour sits behind the box (the chip's fill, the sheet's row).
 */
import { useId } from "react";
import { motion } from "framer-motion";

const INK_ACTION = "#0f61ff";
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

const CHECKBOX_PLATE_D =
  "M4.45754 3.09959L2.828 4.95043L2.74753 15.1904L4.45754 16.9004H15.4016L17.2525 15.0496V4.95043L15.4016 3.09959H4.45754Z";

const CHECKBOX_RING_D =
  "M10 17.8271C8.39167 17.8271 6.78229 17.7271 5.18542 17.5271C3.76562 17.35 2.65 16.2333 2.47187 14.8135C2.07292 11.6187 2.07292 8.37916 2.47187 5.18437C2.64896 3.76458 3.76562 2.64896 5.18542 2.47083C8.38021 2.07187 11.6198 2.07187 14.8146 2.47083C16.2344 2.64791 17.35 3.76354 17.5281 5.18437C17.9271 8.37916 17.9271 11.6187 17.5281 14.8135C17.351 16.2333 16.2344 17.349 14.8146 17.5271C13.2167 17.7271 11.6083 17.8271 10 17.8271ZM10 3.42291C8.44271 3.42291 6.88646 3.51979 5.34063 3.7125C4.48854 3.81875 3.81875 4.48854 3.7125 5.34062C3.32604 8.43229 3.32604 11.5677 3.7125 14.6604C3.81875 15.5125 4.48854 16.1823 5.34063 16.2885C8.43229 16.675 11.5677 16.675 14.6604 16.2885C15.5125 16.1823 16.1823 15.5125 16.2885 14.6604C16.675 11.5687 16.675 8.43333 16.2885 5.34062C16.1823 4.48854 15.5125 3.81875 14.6604 3.7125C13.1146 3.51875 11.5573 3.42291 10.001 3.42291H10Z";

/** Selected path, first subpath — the filled squircle. */
const CHECKBOX_SQUIRCLE_D =
  "M17.5281 5.18521C17.351 3.76542 16.2344 2.64979 14.8146 2.47167C11.6198 2.07271 8.3802 2.07271 5.18541 2.47167C3.76562 2.64875 2.64999 3.76542 2.47187 5.18521C2.07291 8.38 2.07291 11.6196 2.47187 14.8144C2.64895 16.2342 3.76562 17.3498 5.18541 17.5279C6.78228 17.7279 8.39166 17.8279 9.99999 17.8279C11.6083 17.8279 13.2177 17.7279 14.8146 17.5279C16.2344 17.3508 17.35 16.2342 17.5281 14.8144C17.9271 11.6196 17.9271 8.38 17.5281 5.18521Z";

/** Selected path, second subpath — the tick, as a knocked-out outline. */
const CHECKBOX_TICK_D =
  "M13.3583 8.35813L9.19166 12.5248C9.07499 12.6415 8.91562 12.7081 8.74999 12.7081C8.58437 12.7081 8.42499 12.6425 8.30833 12.5248L6.64166 10.8581C6.39791 10.6144 6.39791 10.2185 6.64166 9.97375C6.88541 9.73 7.28124 9.73 7.52499 9.97375L8.74999 11.1988L12.475 7.47375C12.7187 7.23 13.1146 7.23 13.3594 7.47375C13.6031 7.7175 13.6031 8.11334 13.3594 8.35813H13.3583Z";

export function InstructionCheckbox({
  checked,
  knockout,
  reduceMotion,
}: {
  checked: boolean;
  knockout: string;
  reduceMotion: boolean;
}) {
  const uid = useId();
  const floodId = `${uid}-flood`;
  const wipeId = `${uid}-wipe`;

  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="block size-5 shrink-0"
    >
      <defs>
        {/* r=11.5 clears the squircle's farthest corner (≈10.6 from centre) */}
        <clipPath id={floodId}>
          <motion.circle
            cx={10}
            cy={10}
            initial={false}
            animate={{ r: checked ? 11.5 : 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : checked
                  ? { type: "spring", stiffness: 560, damping: 30, mass: 0.6 }
                  : { duration: 0.14, ease: "easeIn" }
            }
          />
        </clipPath>
        {/* bounds the tick (x 6.40–13.60, y 7.23–12.71) with a little margin */}
        <clipPath id={wipeId}>
          <motion.rect
            x={6.2}
            y={6.9}
            height={6.2}
            initial={false}
            animate={{ width: checked ? 7.6 : 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : checked
                  ? { duration: 0.2, delay: 0.07, ease: EASE_OUT_EXPO }
                  : { duration: 0.1, ease: "easeIn" }
            }
          />
        </clipPath>
      </defs>

      <motion.g
        initial={false}
        animate={{ opacity: checked ? 0 : 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.12 }}
      >
        <path d={CHECKBOX_PLATE_D} fill="white" />
        <path d={CHECKBOX_RING_D} fill="#666D85" />
      </motion.g>

      <g clipPath={`url(#${floodId})`}>
        <path d={CHECKBOX_SQUIRCLE_D} fill={INK_ACTION} />
        <g clipPath={`url(#${wipeId})`}>
          <path d={CHECKBOX_TICK_D} fill={knockout} />
        </g>
      </g>
    </svg>
  );
}
