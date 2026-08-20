# Fluid Action Center — motion handoff

You already have the Order Details page and the "…" action menu built. **This handoff is only about the interaction** — the physics that make the menu look like it is *extruded out of the trigger button* rather than popped up next to it.

Nothing here asks you to change your markup structure, your styling, your icons, or where the menu gets its items. It asks you to change five things about how it animates.

| | |
|---|---|
| [`react/`](./react) | web — `framer-motion` / `motion`, plus a no-library fallback |
| [`react-native/`](./react-native) | iOS + Android — `react-native-reanimated` |

Each folder has one small module you drop next to your existing menu component and a diff-sized integration snippet. The motion values are identical across both — that is the point.

---

## 1. What the interaction is

One white surface grows out of the trigger. It stretches vertically first, catches up horizontally, resolves its corners from round to square, and only then reveals its contents. Closing runs the same physics in reverse, faster and firmer, and the surface collapses back into the button it came from.

```
   frame 0        frame ~3        frame ~7          rest
                                ╭─────────╮     ┌──────────┐
     ●●●            ●●●            ●●●           ●●●
      ·            ╭───╮        ╭─────────╮     ┌──────────┐
                   │   │        │         │     │  row     │
                   │   │        │         │     │  row     │
                   ╰───╯        ╰─────────╯     └──────────┘
   nothing       tall capsule   width catches   corners 16,
   visible       rising from    up, still       content fades
                 the button     rounded         in as one block
```

If at any point in the first third of the animation the surface is a **rectangle**, the effect is wrong — go back to §2 and §3.

---

## 2. Five structural preconditions

These are about the DOM/view tree your menu already has. Four of the five are one-line changes.

**① The surface scales about the trigger's centre, not its own corner.**
This is the single most important value in the whole interaction.

```
originX = triggerCentreX − sheetLeft        // e.g. 156 in a 176-wide sheet aligned right
originY = triggerCentreY − sheetTop         // e.g. −30  — negative, and that is correct
```

`originY` is negative because the origin lives *inside the button*, above the sheet's top edge. A `top right` origin is the classic mistake: it reads as a menu unfolding, not as material being pushed out of a button.

**② The trigger must stay crisp above the scrim.**
While open, render a duplicate of the trigger at the trigger's exact screen position, above the scrim *and* above the sheet, wired to close. If the real trigger sits dimmed under the scrim instead, the sheet reads as an unrelated popup that happens to appear nearby. (Web: a cloned button in the overlay layer. RN: the same, inside the `Modal`.)

**③ All rows live in one content layer that fades as a unit.**
Not six animated children. Not a stagger. The menu is one object, and staggered rows make it look like a list appearing.

**④ The white surface itself never changes opacity.** Ever. Only the content layer fades. Fading the surface turns a material effect into a cross-dissolve.

**⑤ The sheet must not be inside a clipped, scrolled, or transformed ancestor.**
Mount it at the screen root (web: a portal; RN: a `Modal`). A `transform` on an ancestor silently rebases the origin math; `overflow: hidden` eats the shadow.

---

## 3. Motion specification

Everything is spring-driven, and **X and Y are separate springs**. That asymmetry *is* the effect — Y leads, X lags, so for a few frames the surface is a tall narrow capsule.

### Open

| Property | From → To | Spring |
|---|---|---|
| `scaleY` | `0 → 1` | stiffness `520`, damping `30`, mass `0.68` |
| `scaleX` | `0 → 1` | stiffness `390`, damping `26`, mass `0.78` |
| `translateY` | `−4 → 0` | stiffness `500`, damping `34`, mass `0.70` |
| `borderRadius` | `capsule → 16` | stiffness `440`, damping `34`, mass `0.70` |
| content opacity | `0 → 1` | `140ms` ease-out, **delayed `80ms`** |
| scrim opacity | `0 → 1` | `190ms` ease-out — a timing, never a spring |
| trigger press | `1 → 0.92 → 1` | stiffness `620`, damping `34`, mass `0.48` |

"Capsule" = `max(sheetWidth, sheetHeight) / 2` — `112` for the reference `176 × 224` sheet. This is what keeps the early frames organic instead of boxy. Overshoot is **not** clamped on open; one restrained settle is the point.

### Close

| Property | To | Spring |
|---|---|---|
| `scaleX`, `scaleY`, `translateY` | `0`, `0`, `−3` | stiffness `520`, damping `38`, mass `0.66`, **overshoot clamped** |
| `borderRadius` | `capsule` | `140ms` ease-out |
| content opacity | `0` | `70ms`, **no delay** |
| scrim opacity | `0` | `155ms` |

Close is firmer and faster than open. It gets out of the way; it does not perform.

### Sequencing rules that are easy to get wrong

- Content fades **in** late (`80ms` delay) and fades **out** immediately (`70ms`, no delay). Content still visible while the surface collapses = dark text smeared inside a shrinking white blob.
- Never spring an opacity. Overshoot on opacity reads as a brightness pulse on the scrim.
- Never clamp overshoot on open. Always clamp it on close.
- Springs must be **interruptible and velocity-preserving**. A tap during the open animation reverses from the current position — no jump, no queue. This is the reason it's springs and not a `@keyframes` timeline. If you reimplement it with keyframes, a fast double-tap will visibly restart.

### Reduced motion

OS "Reduce Motion" on → no scale, no translate, no stretch. Cross-fade the sheet at full size (`~140ms`), scrim `~120ms`. Dismissal, focus, and layout behaviour are unchanged.

---

## 4. Reference geometry

Only listed because the origin math and the capsule radius depend on it. If your built version differs, use your own numbers in the formulas — don't retrofit these.

| | |
|---|---|
| Trigger | `40 × 40`, radius `20` |
| Gap trigger→sheet | `10` |
| Sheet | `176 × 224` (6 rows × `37`), radius `16` |
| Capsule radius at birth | `112` |
| Scrim | `#000` @ `0.8`, full frame including the status bar |
| Sheet shadow | `0 18 42 rgba(0,0,0,.34)` + `0 3 10 rgba(0,0,0,.16)` (RN: `elevation 18`) |

---

## 5. Behaviour while animating

| Case | Expected |
|---|---|
| Rapid double tap | Reverses from the current position, preserving velocity. |
| Row press | Row highlights, action fires, sheet closes with the standard close animation. Fire the action *and* the close together — don't wait for one to finish. |
| Screen scroll behind | Locked while open; exact same offset on dismiss. |
| Bottom nav | Hidden/covered while open, like a bottom sheet. The scrim covers the full frame. |
| Trigger near the bottom of the screen | Sheet flips above it; `originY` becomes positive (`sheetHeight + gap + triggerHeight/2`) and `translateY` inverts. |
| Rotation while open | Close it. Re-anchoring a running spring isn't worth it. |
| Back gesture / Android back | Closes the sheet, does not pop the screen. |
| Reduce Motion | Cross-fade only. |

---

## 6. QA acceptance checklist

- [ ] The surface visibly grows **out of the button**, not from its own corner.
- [ ] For 2–3 frames mid-open it is a **tall capsule**, not a rectangle.
- [ ] The trigger stays white and crisp above the scrim for the whole animation.
- [ ] Rows are invisible until the surface is ~half formed, and gone before it collapses.
- [ ] Rapid repeated taps reverse smoothly — no snap, no restart, no queued animation.
- [ ] Close is noticeably quicker than open.
- [ ] Page behind doesn't move; scroll offset preserved.
- [ ] Reduce Motion → plain cross-fade.
- [ ] 60Hz **and** 120Hz on a physical device, while the page is still loading data. The animation runs off the main/JS thread, so a busy thread must not stall it.

**The slow-motion test:** temporarily halve every `stiffness`. You should see, in order — capsule rises out of the button → stretches down → width catches up → corners resolve to `16` → rows fade in together. Any other order means a value is on the wrong axis.
