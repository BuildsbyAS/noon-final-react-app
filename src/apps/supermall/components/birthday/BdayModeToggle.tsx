import { motion } from 'framer-motion';
import { hapticTick } from '@ui';
import './birthday.css';

interface BdayModeToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

/**
 * The BDAY mode switch. The handle sits on the left when off and slides right
 * — picking up a gift glyph — when on, while the pill warms into the birthday
 * gradient.
 *
 * The control is a real `<input type="checkbox" switch>` rather than a button:
 * iOS has no vibration API, and a user's own tap on a native switch is the
 * only interaction that produces a system haptic on the platform. It's kept
 * transparent and stretched over the pill so the styled chrome shows through.
 */
export function BdayModeToggle({ on, onChange }: BdayModeToggleProps) {
  return (
    <label className={`bday-toggle${on ? ' is-on' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        className="bday-toggle__input"
        aria-label="BDAY mode"
        checked={on}
        onChange={(e) => {
          hapticTick();
          onChange(e.target.checked);
        }}
        // Non-standard WebKit attribute that renders a native switch — this is
        // what carries the haptic on iOS 17.4+.
        {...({ switch: '' } as Record<string, string>)}
      />
      <motion.span layout className="bday-toggle__handle" transition={HANDLE_SPRING}>
        <motion.img
          src="/icon-bday-gift.svg"
          alt=""
          className="bday-toggle__gift"
          initial={false}
          animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.4 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.45 }}
        />
      </motion.span>
      <motion.span layout className="bday-toggle__label" transition={HANDLE_SPRING}>
        BDAY
        <br />
        mode
      </motion.span>
    </label>
  );
}

const HANDLE_SPRING = { type: 'spring' as const, duration: 0.45, bounce: 0.32 };
