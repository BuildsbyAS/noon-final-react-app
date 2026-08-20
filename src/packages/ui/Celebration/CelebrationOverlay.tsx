import { useEffect, useRef, useState } from 'react';
import { useBirthdayStore } from '@state/birthdayStore';
import { ConfettiBurst } from './ConfettiBurst';
import { primeAudio, playPop, playJingle, audioDiagnostics } from './sound';
import { celebrationHaptics } from './haptics';
import './Celebration.css';

/**
 * Fire a celebration. MUST be called from a user-gesture handler (tap/click).
 *
 * Sound is started here rather than in the overlay's effect: iOS only permits
 * playback inside the gesture's own call stack, and a React effect runs after
 * the render that follows it — late enough for iOS to refuse.
 */
export function triggerCelebration() {
  primeAudio();
  playPop(0);
  // Let the cork land before the music comes in underneath it.
  playJingle(700);
  celebrationHaptics();
  useBirthdayStore.getState().celebrate();
}

/**
 * Full-viewport, pointer-transparent confetti layer. Mount once in the app
 * shell (RootLayout).
 */
export function CelebrationOverlay() {
  const celebrationId = useBirthdayStore((s) => s.celebrationId);
  const [burstId, setBurstId] = useState(0);
  const seenRef = useRef<number | null>(null);

  // Warm up audio on the very first tap anywhere, so the toggle press itself
  // has decoded buffers and a running context to work with.
  useEffect(() => {
    const onFirstTouch = () => primeAudio();
    document.addEventListener('pointerdown', onFirstTouch, { once: true, capture: true });
    return () =>
      document.removeEventListener('pointerdown', onFirstTouch, { capture: true });
  }, []);

  useEffect(() => {
    // Skip initial mount (including a persisted non-zero id after reload).
    if (seenRef.current === null) {
      seenRef.current = celebrationId;
      return;
    }
    if (celebrationId === seenRef.current) return;
    seenRef.current = celebrationId;
    setBurstId(celebrationId);
  }, [celebrationId]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
      aria-hidden
    >
      <ConfettiBurst burstId={burstId} />
      <AudioDebug celebrationId={celebrationId} />
    </div>
  );
}

/** Live audio readout, shown only with `?debug=1` — for diagnosing devices
 *  we can't attach a console to. */
function AudioDebug({ celebrationId }: { celebrationId: number }) {
  const [, tick] = useState(0);
  const enabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === '1';

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;
  const d = audioDiagnostics();

  return (
    <pre
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        margin: 0,
        padding: '6px 8px',
        borderRadius: 6,
        background: 'rgba(0,0,0,0.78)',
        color: '#0f0',
        font: '10px/1.45 ui-monospace, Menlo, monospace',
        whiteSpace: 'pre',
        zIndex: 10,
      }}
    >
      {`context   ${d.context}
session   ${d.audioSession}
pop       ${d.pop}
jingle    ${d.jingle}
src       ${d.jingleSrc}
vibrate   ${d.vibrate}
bursts    ${celebrationId}`}
    </pre>
  );
}
