# Fluid Action Center — React (web) motion

Read [`../README.md`](../README.md) first — it's the interaction spec. This file is how to get it into the menu you already built.

You keep your component, your markup, your CSS, your items, your placement logic. You add one file and change how four nodes animate.

```sh
npm i framer-motion     # already on `motion` v11+? same API — import from "motion/react"
```

Copy in **`fluidReveal.ts`**. It exports pure functions: geometry math and motion-prop objects. No markup, no styles, no state.

---

## The retrofit

Your menu probably looks something like this today — a conditional overlay with a scrim, a panel, and rows:

```tsx
{open && (
  <div className="overlay">
    <div className="scrim" onClick={close} />
    <div className="menu">
      {items.map(item => <button key={item.key} …>{item.label}</button>)}
    </div>
  </div>
)}
```

Four changes:

```tsx
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  fluidOrigin,
  fluidSheetMotion,
  fluidContentMotion,
  fluidScrimMotion,
  fluidTriggerMotion,
} from "./fluidReveal";

const reduceMotion = useReducedMotion();

// Your sheet's real numbers. Right-aligned trailing header button, 10px below it.
const geo = fluidOrigin({ sheetWidth: 176, sheetHeight: 224, triggerSize: 40, gap: 10 });

<AnimatePresence>                                  {/* ① exit animations need this */}
  {open && (
    <div className="overlay">
      <motion.div className="scrim" onClick={close} {...fluidScrimMotion(reduceMotion)} />

      <motion.div className="menu" {...fluidSheetMotion(geo, reduceMotion)}>   {/* ② */}
        <motion.div className="menu-items" {...fluidContentMotion(reduceMotion)}>  {/* ③ */}
          {items.map(item => <button key={item.key} …>{item.label}</button>)}
        </motion.div>
      </motion.div>

      {/* ④ crisp clone of your header trigger, above the scrim, closes on press */}
      <motion.button
        className="your-header-trigger-class"
        style={{ position: "absolute", top: TRIGGER_TOP, right: TRIGGER_RIGHT }}
        onClick={close}
        aria-label="Close order actions"
        {...fluidTriggerMotion(reduceMotion)}
      >
        <YourDotsGlyph />
      </motion.button>
    </div>
  )}
</AnimatePresence>
```

① **`AnimatePresence`** — without it the close animation never plays; the menu just unmounts.
② The sheet is the only node that scales. `fluidSheetMotion` also returns `style.transformOrigin`, so don't set `transform-origin` in your CSS.
③ **One wrapper around all rows.** If your rows animate individually today, delete that.
④ The clone. Section 2 of the spec explains why this isn't optional.

Also add to your existing CSS, if not already there:

```css
.menu   { overflow: hidden; will-change: transform, border-radius; }
.overlay{ position: fixed; inset: 0; z-index: 1000; }   /* portal to <body> */
```

And **remove any `transition:` on the sheet class** — a CSS transition on `transform`/`border-radius` fights the springs and yields a soft, laggy version of the effect.

---

## Placement & origin

If your sheet is statically positioned (fixed offsets in CSS), `fluidOrigin({…})` with your four numbers is all you need — call it once, outside render.

If you place it dynamically by measuring the trigger, use the rect version instead:

```tsx
const geo = fluidOriginFromRects(triggerRect, sheetLayoutRect);
```

Two rules for the sheet rect you pass: it must be the **untransformed layout box** (measure while closed — `getBoundingClientRect()` on a scaled element returns the scaled box), and both rects must be in the same coordinate space (both viewport, or both relative to the same non-scrolling overlay root).

Flipping above the trigger (not enough room below): pass `flipped: true`. `originY` becomes positive and the `translateY` inverts automatically.

---

## If you can't add framer-motion

You can approximate it with CSS, and you should know what you're giving up: **interruptibility**. A CSS animation restarts rather than reversing from its current position, so a fast double-tap will visibly snap. If the menu is tapped often — and it is — that's a real downgrade. Prefer the library.

```css
.menu {
  transform-origin: calc(100% - 20px) -30px;   /* trigger centre — see spec §2 */
  overflow: hidden;
}

/* Two axes, two durations. The Y/X offset is the stretch. */
@keyframes fac-in-y { from { transform: scaleY(0) translateY(-4px); border-radius: 112px; }
                      to   { transform: scaleY(1) translateY(0);    border-radius: 16px;  } }
@keyframes fac-in-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.menu[data-state="open"] {
  animation:
    fac-in-y 340ms cubic-bezier(.16, 1.02, .3, 1) both,
    fac-in-x 420ms cubic-bezier(.2, .9, .25, 1.06) both;   /* slight overshoot on X */
}
.menu[data-state="closed"] {
  animation: fac-out 190ms cubic-bezier(.32, 0, .67, 0) both;   /* firmer, clamped */
}
.menu-items { animation: fac-fade 140ms 80ms ease-out both; }

@media (prefers-reduced-motion: reduce) {
  .menu, .menu-items { animation: fac-fade 140ms ease-out both; }
}
```

Nested transforms on one element can't have separate timing, so run the X scale on an inner wrapper (and counter-scale nothing — the content layer fades in after both axes are past the visibly distorted phase). Keep the delay/duration relationships from the spec; those matter more than the exact curves.

---

## Verify

- Slow-motion test in the spec (§6) — halve every `stiffness` and watch the order of events.
- DevTools → Rendering → **Emulate `prefers-reduced-motion`** to check the cross-fade path.
- Tap the trigger 5× fast. Springs reverse; nothing snaps or queues.
- Performance panel: only `transform`, `opacity`, and `border-radius` should be changing. If `width`/`height`/`top` show up in the recording, the wrong property is being animated.
