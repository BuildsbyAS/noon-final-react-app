import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './birthday.css';

/** Demo birthday: far enough out to read like the design (05d 22h 22m 22s). */
const DEFAULT_TARGET = new Date(
  Date.now() + ((5 * 24 + 22) * 60 + 22) * 60_000 + 22_000,
);

function partsUntil(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const total = Math.floor(ms / 1000);
  return [
    { value: Math.floor(total / 86400), label: 'days' },
    { value: Math.floor(total / 3600) % 24, label: 'hrs' },
    { value: Math.floor(total / 60) % 60, label: 'mins' },
    { value: total % 60, label: 'sec' },
  ];
}

interface BirthdayCountdownProps {
  target?: Date;
}

export function BirthdayCountdown({ target = DEFAULT_TARGET }: BirthdayCountdownProps) {
  const [parts, setParts] = useState(() => partsUntil(target));

  useEffect(() => {
    const id = window.setInterval(() => setParts(partsUntil(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return (
    <div className="bday-countdown" role="timer" aria-label="Time until your birthday">
      {parts.map((p) => (
        <div key={p.label} className="bday-countdown__cell">
          <span className="bday-countdown__value">
            {/* Re-keying on the value ticks each digit group over as it changes. */}
            <motion.span
              key={p.value}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
            >
              {String(p.value).padStart(2, '0')}
            </motion.span>
          </span>
          <span className="bday-countdown__label">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
