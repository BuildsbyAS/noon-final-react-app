/**
 * Best-effort haptics for the celebration.
 *
 * - Android Chrome: navigator.vibrate works.
 * - iOS (Safari/Chrome, both WebKit): no vibrate API. Recent WebKit fires a
 *   system haptic when a <input switch> toggles inside a label click — we
 *   simulate that as a fallback. Harmless no-op elsewhere.
 */

let switchInput: HTMLInputElement | null = null;
let switchLabel: HTMLLabelElement | null = null;

function getSwitchHack(): HTMLLabelElement | null {
  if (typeof document === 'undefined') return null;
  if (!switchLabel) {
    switchInput = document.createElement('input');
    switchInput.type = 'checkbox';
    // Non-standard WebKit attribute that opts the checkbox into the native
    // switch control (and its toggle haptic on iOS).
    switchInput.setAttribute('switch', '');
    switchLabel = document.createElement('label');
    switchLabel.style.cssText =
      'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
    switchLabel.appendChild(switchInput);
    document.body.appendChild(switchLabel);
  }
  return switchLabel;
}

function iosHapticTick() {
  const label = getSwitchHack();
  label?.click();
}

/** One firm tick — for discrete interactions (toggle flips, stepper taps). */
export function hapticTick() {
  if (navigator.vibrate) {
    navigator.vibrate(35);
  } else {
    iosHapticTick();
  }
}

/**
 * A strong celebratory pattern: a heavy cork thud, then an accelerating
 * drumroll that resolves on a long buzz.
 */
export function celebrationHaptics() {
  if (navigator.vibrate) {
    navigator.vibrate([
      120, 50, // cork thud
      60, 40, 60, 40, 60, 30, // drumroll
      80, 25, 80, 25, // tightening
      260, // finish
    ]);
    return;
  }
  // iOS has no vibrate API, so stack switch-toggle ticks densely — many
  // closely-spaced taps read as one sustained buzz rather than single blips.
  const ticks: number[] = [];
  for (let t = 0; t < 900; t += 45) ticks.push(t);
  ticks.forEach((ms) => window.setTimeout(iosHapticTick, ms));
}
