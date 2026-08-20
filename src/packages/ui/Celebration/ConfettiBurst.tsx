import { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

/** Roughly the Lottie's own runtime; the layer unmounts itself after this. */
const CONFETTI_MS = 4000;

interface ConfettiBurstProps {
  /** Fire a burst every time this increments past 0. */
  burstId: number;
}

export function ConfettiBurst({ burstId }: ConfettiBurstProps) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (burstId === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setPlaying(true);
    const id = window.setTimeout(() => setPlaying(false), CONFETTI_MS);
    return () => window.clearTimeout(id);
  }, [burstId]);

  if (!playing) return null;

  return (
    <DotLottieReact
      // Remounting on each burst restarts the animation from frame 0.
      key={burstId}
      src="/confetti.lottie"
      autoplay
      loop={false}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
