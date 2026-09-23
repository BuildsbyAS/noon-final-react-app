/**
 * Glyphs for v8 "Give delivery instructions".
 *
 * Geometry is verbatim from v8's Figma exports (../assets/delivery-instructions-v8),
 * each in its own viewBox. The voice-note glyphs are copied from v2
 * (deliveryPreferenceGlyphs) and owned here — v8 imports nothing from v2.
 *
 * Every option glyph is rendered twice and crossfaded — muted ink on the card,
 * primary ink on the white thumb — because plain `fill` attributes can't tween,
 * and call-off knocks a stroke out of whatever surface sits behind it.
 */
import { motion } from "framer-motion";
import type { V8GlyphId } from "./deliveryInstructionsV8.model";

export const INK_PRIMARY = "#1d2539";
/** Figma's unselected glyph ink. */
export const INK_MUTED = "#989fb3";
export const INK_ACTION = "#0f61ff";
export const SURFACE_THUMB = "#ffffff";
/** What sits behind an unselected glyph — the card's gradient, near its middle. */
export const SURFACE_CARD = "#f2f3f7";

const FADE = { duration: 0.16, ease: "easeOut" as const };

/* ================================================================
 *  Option glyphs
 * ================================================================ */

type Parts = { ink: string; knockout: string };
type GlyphDef = { viewBox: string; draw: (p: Parts) => React.ReactElement };

const GLYPH: Record<V8GlyphId, GlyphDef> = {
  call: {
    viewBox: "0 0 18 18",
    draw: ({ ink }) => (
      <>
        <path
          d="M14.2124 11.7244L12.1921 11.2191C11.7477 11.1075 11.2706 11.2407 10.9462 11.5641L8.78899 13.7213C8.54805 13.606 8.31555 13.4803 8.09524 13.3444C6.44055 12.3272 5.13649 10.8835 4.36586 9.23441L6.49211 7.10816C6.81649 6.78379 6.94868 6.3066 6.83711 5.86222L6.3318 3.84191C6.18555 3.25691 5.66149 2.84816 5.05868 2.84816H3.39368C2.66993 2.85004 2.08118 3.43879 2.08118 4.16254V5.28754C2.08118 6.78097 2.38961 8.2041 2.94555 9.49691C2.9568 9.53254 2.97274 9.56816 2.99149 9.60191C4.06774 12.0319 6.0243 13.9885 8.4543 15.0657C8.48805 15.0844 8.52368 15.1003 8.5593 15.1116C9.85211 15.6675 11.2743 15.975 12.7687 15.975H13.8937C14.6174 15.975 15.2062 15.3863 15.2062 14.6625V12.9985C15.2062 12.3947 14.7974 11.8716 14.2124 11.7253V11.7244Z"
          fill={ink}
        />
        <path
          d="M9.39368 2.10004C9.08336 2.10004 8.83118 2.35222 8.83118 2.66254C8.83118 2.97285 9.08336 3.22504 9.39368 3.22504C12.3918 3.22504 14.8312 5.66441 14.8312 8.66254C14.8312 8.97285 15.0834 9.22504 15.3937 9.22504C15.704 9.22504 15.9562 8.97285 15.9562 8.66254C15.9562 5.04379 13.0124 2.10004 9.39368 2.10004Z"
          fill={ink}
        />
        <path
          d="M12.2062 8.66254C12.2062 8.97285 12.4584 9.22504 12.7687 9.22504C13.079 9.22504 13.3312 8.97285 13.3312 8.66254C13.3312 6.49129 11.5649 4.72504 9.39368 4.72504C9.08336 4.72504 8.83118 4.97722 8.83118 5.28754C8.83118 5.59785 9.08336 5.85004 9.39368 5.85004C10.9443 5.85004 12.2062 7.11191 12.2062 8.66254Z"
          fill={ink}
        />
      </>
    ),
  },

  callOff: {
    viewBox: "0 0 20 20",
    draw: ({ ink, knockout }) => (
      <>
        <path
          d="M15.1181 14.9118C15.1181 14.8299 15.0656 14.7575 14.989 14.7313L14.9733 14.7266L12.9156 14.212C12.8502 14.1959 12.781 14.215 12.733 14.2628L10.6968 16.299C11.6661 16.6223 12.7032 16.7977 13.7813 16.7977H14.9271C15.0327 16.7977 15.1181 16.7123 15.1181 16.6067V14.9118ZM16.2639 16.6067C16.2639 17.3451 15.6655 17.9435 14.9271 17.9435H13.7813C12.2449 17.9435 10.7829 17.6251 9.45761 17.0509C9.44628 17.0465 9.43504 17.0417 9.42395 17.0365C6.91514 15.9395 4.89973 13.9241 3.80276 11.4153C3.79756 11.4042 3.79277 11.393 3.78831 11.3816C3.21418 10.0563 2.89583 8.59441 2.89583 7.05807V5.91224C2.89583 5.17378 3.49418 4.57543 4.23264 4.57543H5.92752C6.54098 4.57543 7.0756 4.9932 7.22432 5.58802L7.73858 7.64432C7.85414 8.10151 7.71983 8.58353 7.38778 8.91558L5.00874 11.2944C5.96472 13.2705 7.5687 14.8745 9.5448 15.8305L11.9238 13.4515L11.9248 13.4505C12.2462 13.1307 12.7074 12.9953 13.1502 13.0903L13.193 13.1003L13.1936 13.1004L15.2513 13.615L15.3065 13.6301C15.8718 13.7972 16.2639 14.3175 16.2639 14.9118V16.6067ZM4.04167 7.05807C4.04167 8.1361 4.21693 9.17316 4.54026 10.1424L6.57755 8.10534C6.62554 8.05735 6.64394 7.98926 6.62772 7.92509C6.6276 7.92464 6.62746 7.92415 6.62734 7.9237L6.11271 5.86599C6.09145 5.78096 6.01491 5.72127 5.92752 5.72127H4.23264C4.127 5.72127 4.04167 5.8066 4.04167 5.91224V7.05807Z"
          fill={ink}
        />
        <path
          d="M15.8819 10.4965C15.8819 7.43751 13.4028 4.95833 10.3437 4.95833C10.0273 4.95833 9.77083 4.70183 9.77083 4.38542C9.77083 4.069 10.0273 3.8125 10.3437 3.8125C14.0356 3.8125 17.0278 6.80468 17.0278 10.4965C17.0278 10.8129 16.7713 11.0694 16.4549 11.0694C16.1384 11.0694 15.8819 10.8129 15.8819 10.4965Z"
          fill={ink}
        />
        <path
          d="M13.2083 10.4965C13.2083 8.91468 11.9256 7.63194 10.3437 7.63194C10.0273 7.63194 9.77083 7.37544 9.77083 7.05903C9.77083 6.74261 10.0273 6.48611 10.3437 6.48611C12.5584 6.48611 14.3542 8.28185 14.3542 10.4965C14.3542 10.8129 14.0977 11.0694 13.7813 11.0694C13.4648 11.0694 13.2083 10.8129 13.2083 10.4965Z"
          fill={ink}
        />
        <path d="M3.02165 17.135L17.6801 2.4766" stroke={ink} strokeWidth="1.83333" strokeLinecap="round" />
        <path d="M3.28532 18.5014L19.3254 2.46134" stroke={knockout} strokeWidth="1.33333" strokeLinecap="round" />
      </>
    ),
  },

  user: {
    viewBox: "0 0 20 20",
    draw: ({ ink }) => (
      <>
        <path
          d="M9.97412 4.76558C8.48037 4.76558 7.26579 5.98017 7.26579 7.47392C7.26579 8.96767 8.48037 10.1823 9.97412 10.1823C11.4679 10.1823 12.6825 8.96767 12.6825 7.47392C12.6825 5.98017 11.4679 4.76558 9.97412 4.76558Z"
          fill={ink}
        />
        <path
          d="M17.5012 5.15829C17.3231 3.7385 16.2075 2.62288 14.7877 2.44475C11.5939 2.04579 8.35329 2.04579 5.1585 2.44579C3.7387 2.62288 2.62308 3.7385 2.446 5.15829C2.04704 8.35308 2.04704 11.5927 2.446 14.7875C2.62308 16.2073 3.73975 17.3229 5.15954 17.501C6.75641 17.701 8.36579 17.801 9.97412 17.801C11.5825 17.801 13.1918 17.701 14.7887 17.501C16.2085 17.3239 17.3241 16.2083 17.5022 14.7875C17.9012 11.5927 17.9012 8.35308 17.5022 5.15829H17.5012ZM16.2616 14.6333C16.1606 15.4406 15.5543 16.0833 14.7658 16.2395V15.8104C14.7658 13.1687 12.6158 11.0187 9.97412 11.0187C7.33245 11.0187 5.18245 13.1687 5.18245 15.8104V16.2395C4.39391 16.0833 3.78766 15.4416 3.68662 14.6333C3.30016 11.5416 3.30016 8.40621 3.68662 5.3135C3.79287 4.46142 4.46266 3.79163 5.31475 3.68538C8.40641 3.29892 11.5418 3.29892 14.6345 3.68538C15.4866 3.79163 16.1564 4.46142 16.2627 5.3135C16.6491 8.40517 16.6491 11.5406 16.2627 14.6333H16.2616Z"
          fill={ink}
        />
      </>
    ),
  },

  door: {
    viewBox: "0 0 20 20",
    draw: ({ ink }) => (
      <>
        <path
          d="M10.8333 9.16666C11.2936 9.16666 11.6667 9.53976 11.6667 9.99999C11.6667 10.4602 11.2936 10.8333 10.8333 10.8333C10.3731 10.8333 10 10.4602 10 9.99999C10 9.53976 10.3731 9.16666 10.8333 9.16666Z"
          fill={ink}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M13.5398 2.37589L13.7747 2.40834L13.7748 2.40844C15.315 2.62849 16.4583 3.94739 16.4583 5.50211V16.0417H18.3333C18.6785 16.0417 18.9583 16.3215 18.9583 16.6667C18.9583 17.0118 18.6785 17.2917 18.3333 17.2917H1.66667C1.32149 17.2917 1.04167 17.0118 1.04167 16.6667C1.04168 16.3215 1.3215 16.0417 1.66667 16.0417H3.54065V5.50211C3.54065 3.94716 4.68514 2.62847 6.22406 2.40844L6.22426 2.40834C6.40995 2.38185 6.59586 2.35746 6.78192 2.33489C9.02471 2.06261 11.3002 2.0766 13.5398 2.37589ZM9.71069 3.39202C8.69593 3.40352 7.68168 3.47561 6.67328 3.60839C6.58276 3.62032 6.4923 3.63282 6.40188 3.64572L6.40198 3.64583C5.47842 3.77789 4.79167 4.56958 4.79167 5.50211V16.0417H12.7083V5.39896C12.7083 4.32046 11.8551 3.43609 10.7848 3.40291L10.7846 3.4028C10.4267 3.39162 10.0686 3.38803 9.71069 3.39202ZM13.4309 3.62253C13.7648 4.13443 13.9583 4.74558 13.9583 5.39896V16.0417H15.2083V5.50211C15.2083 4.56936 14.5224 3.7779 13.5981 3.64583C13.5424 3.63788 13.4866 3.63011 13.4309 3.62253Z"
          fill={ink}
        />
      </>
    ),
  },

  bell: {
    viewBox: "0 0 18 18",
    draw: ({ ink }) => (
      <>
        <path d="M9 16.3125C9.93187 16.3125 10.6875 15.5569 10.6875 14.625H7.3125C7.3125 15.5569 8.06813 16.3125 9 16.3125Z" fill={ink} />
        <path
          d="M14.5247 11.3981C13.7316 10.2084 13.3125 8.82469 13.3125 7.395V6.75094C13.3125 4.37344 11.3775 2.43844 9 2.43844C6.6225 2.43844 4.6875 4.37344 4.6875 6.75094V7.395C4.6875 8.82469 4.26844 10.2094 3.47531 11.3981C3.28687 11.6803 3.1875 12.0094 3.1875 12.3488C3.1875 13.2938 3.95625 14.0625 4.90125 14.0625H13.0988C14.0438 14.0625 14.8125 13.2938 14.8125 12.3488C14.8125 12.0094 14.7131 11.6803 14.5247 11.3981Z"
          fill={ink}
        />
      </>
    ),
  },

  bellOff: {
    viewBox: "0 0 18 18",
    draw: ({ ink }) => (
      <>
        <path d="M9 16.3125C9.93187 16.3125 10.6875 15.5569 10.6875 14.625H7.3125C7.3125 15.5569 8.06813 16.3125 9 16.3125Z" fill={ink} />
        <path
          d="M15 2.20499C14.7806 1.98561 14.4244 1.98561 14.2041 2.20499L12.3591 4.04999C11.5678 3.06749 10.3566 2.43749 9 2.43749C6.6225 2.43749 4.6875 4.37249 4.6875 6.74999V7.39405C4.6875 8.82374 4.26844 10.2084 3.47531 11.3972C3.28688 11.6794 3.1875 12.0084 3.1875 12.3478C3.1875 12.6028 3.24563 12.8447 3.34594 13.0622L2.20406 14.2041C1.98469 14.4234 1.98469 14.7797 2.20406 15C2.31375 15.1097 2.45813 15.165 2.60156 15.165C2.745 15.165 2.88938 15.1097 2.99906 15L15 2.99999C15.2194 2.78061 15.2194 2.42436 15 2.20405V2.20499Z"
          fill={ink}
        />
        <path
          d="M13.3125 6.74999C13.3125 6.59905 13.3022 6.45093 13.2872 6.30374L5.52844 14.0625H13.0988C14.0438 14.0625 14.8125 13.2937 14.8125 12.3487C14.8125 12.0094 14.7131 11.6803 14.5247 11.3981C13.7316 10.2084 13.3125 8.82468 13.3125 7.39499V6.74999Z"
          fill={ink}
        />
      </>
    ),
  },
};

function RawGlyph({ glyph, size, ink, knockout }: { glyph: V8GlyphId; size: number } & Parts) {
  const def = GLYPH[glyph];
  return (
    <svg width={size} height={size} viewBox={def.viewBox} fill="none" aria-hidden="true" focusable="false" className="block shrink-0">
      {def.draw({ ink, knockout })}
    </svg>
  );
}

/* ================================================================
 *  Option glyph
 * ================================================================ */

/** Crossfades between muted and primary ink as its option is (de)selected. */
export function OptionGlyph({
  glyph,
  size,
  selected,
  reduceMotion,
}: {
  glyph: V8GlyphId;
  size: number;
  selected: boolean;
  reduceMotion: boolean;
}) {
  return (
    <span aria-hidden="true" className="relative block shrink-0" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inset-0 block"
        initial={false}
        animate={{ opacity: selected ? 0 : 1 }}
        transition={reduceMotion ? { duration: 0 } : FADE}
      >
        <RawGlyph glyph={glyph} size={size} ink={INK_MUTED} knockout={SURFACE_CARD} />
      </motion.span>
      <motion.span
        className="absolute inset-0 block"
        initial={false}
        animate={{ opacity: selected ? 1 : 0 }}
        transition={reduceMotion ? { duration: 0 } : FADE}
      >
        <RawGlyph glyph={glyph} size={size} ink={INK_PRIMARY} knockout={SURFACE_THUMB} />
      </motion.span>
    </span>
  );
}

/* ================================================================
 *  Voice note — copied from v2
 * ================================================================ */

/** mic-filled (857:81104), v8's 24×24 export. */
export function MicGlyph({ size = 20, ink = INK_PRIMARY }: { size?: number; ink?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className="block shrink-0">
      <path
        d="M11.9689 15.75C14.0702 15.75 15.8677 14.25 16.2439 12.1825C16.5677 10.4025 16.5677 8.5975 16.2439 6.8175C15.8677 4.75 14.0702 3.25 11.9689 3.25C9.86767 3.25 8.07017 4.75 7.69517 6.8175C7.37142 8.5975 7.37142 10.4025 7.69517 12.1825C8.07142 14.25 9.86892 15.75 11.9702 15.75H11.9689Z"
        fill={ink}
      />
      <path
        d="M18.8314 9.25C18.4177 9.2425 18.0739 9.56875 18.0639 9.9825C18.0489 10.6388 18.0027 11.3012 17.9252 11.9537C17.5702 14.9737 15.0089 17.25 11.9689 17.25C8.92892 17.25 6.36892 14.9725 6.01392 11.9537C5.93767 11.3025 5.89017 10.6388 5.87517 9.9825C5.86517 9.56875 5.52267 9.24375 5.10767 9.25C4.69392 9.26 4.36642 9.60375 4.37517 10.0175C4.39142 10.72 4.44142 11.4312 4.52392 12.1287C4.93892 15.6525 7.75517 18.3663 11.2202 18.7113V21C11.2202 21.4137 11.5564 21.75 11.9702 21.75C12.3839 21.75 12.7202 21.4137 12.7202 21V18.7113C16.1852 18.365 19.0014 15.6512 19.4164 12.1275C19.4989 11.4287 19.5489 10.7188 19.5652 10.0163C19.5752 9.6025 19.2464 9.25875 18.8327 9.24875L18.8314 9.25Z"
        fill={ink}
      />
    </svg>
  );
}

/**
 * The play triangle from play-circle-filled (877:6712), drawn as a fill on the
 * blue disc rather than a hole in it — the disc persists across states, so a
 * hole would show blue through blue.
 */
const PLAY_TRIANGLE_D =
  "M24.4547 19.6158L24.4123 19.6562C22.1653 21.8011 19.4289 23.364 16.4419 24.2119L16.3609 24.235C15.5246 24.472 14.6555 23.9691 14.4454 23.125C13.6861 20.0898 13.6861 16.914 14.4454 13.8769C14.6555 13.0329 15.5246 12.5299 16.3609 12.7669L16.4419 12.7901C19.4308 13.636 22.1672 15.2008 24.4123 17.3457L24.4547 17.3861C25.0906 17.9932 25.0906 19.0087 24.4547 19.6158Z";
/** Disc diameter inside the export's 37 box. */
export const DISC_IN_BOX = 30.0625;

export function PlayGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 37 37" fill="none" aria-hidden="true" focusable="false" className="block shrink-0">
      <path d={PLAY_TRIANGLE_D} fill={SURFACE_THUMB} />
    </svg>
  );
}

export function PauseGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 37 37" fill="none" aria-hidden="true" focusable="false" className="block shrink-0">
      <rect x={13.6} y={12.75} width={3.6} height={11.5} rx={1.4} fill={SURFACE_THUMB} />
      <rect x={19.8} y={12.75} width={3.6} height={11.5} rx={1.4} fill={SURFACE_THUMB} />
    </svg>
  );
}

/** cross (21:11523), 16×16. */
export function CrossGlyph({ size = 16, ink = INK_PRIMARY }: { size?: number; ink?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" className="block shrink-0">
      <path
        d="M10.9798 4.31315C11.1751 4.11789 11.4916 4.11789 11.6868 4.31315C11.8821 4.50841 11.8821 4.82491 11.6868 5.02018L8.70703 7.99999L11.6868 10.9798C11.8821 11.1751 11.8821 11.4916 11.6868 11.6868C11.4916 11.8821 11.1751 11.8821 10.9798 11.6868L7.99999 8.70703L5.02018 11.6868C4.82491 11.8821 4.50841 11.8821 4.31315 11.6868C4.11789 11.4916 4.11789 11.1751 4.31315 10.9798L7.29296 7.99999L4.31315 5.02018C4.11789 4.82491 4.11789 4.50841 4.31315 4.31315C4.50841 4.11789 4.82491 4.11789 5.02018 4.31315L7.99999 7.29296L10.9798 4.31315Z"
        fill={ink}
      />
    </svg>
  );
}

/** Playback progress as a ring just outside the disc, sweeping from 12 o'clock. */
export function PlaybackRing({ box, r, durationMs }: { box: number; r: number; durationMs: number }) {
  const c = 2 * Math.PI * r;
  return (
    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} fill="none" aria-hidden="true" focusable="false" className="block -rotate-90">
      <circle cx={box / 2} cy={box / 2} r={r} stroke={INK_ACTION} strokeOpacity={0.14} strokeWidth={2} />
      <motion.circle
        cx={box / 2}
        cy={box / 2}
        r={r}
        stroke={INK_ACTION}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: durationMs / 1000, ease: "linear" }}
      />
    </svg>
  );
}

/**
 * Five bars on a 20px grid. `live` makes them breathe on independent loops — a
 * level meter listening, not a progress bar.
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
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false" className="block shrink-0">
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
                : { duration: 0.95 + i * 0.07, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }
            }
            fill={ink}
          />
        );
      })}
    </svg>
  );
}
