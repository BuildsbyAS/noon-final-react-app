# Fluid Action Center — React Native motion

Read [`../README.md`](../README.md) first — it's the interaction spec. This file is how to get it into the menu you already built.

You keep your component, your styles, your items, your placement. You add one file and change how four views animate.

```sh
npm i react-native-reanimated
npm i react-native-worklets          # Reanimated 4 / New Architecture only
```

- **Expo:** `npx expo prebuild` after installing.
- **RN CLI:** add `react-native-worklets/plugin` last in `babel.config.js`, then rebuild both apps.
- **Old architecture:** stay on Reanimated 3 — every API used here is identical.

Copy in **`useFluidReveal.ts`**. It exports geometry math and a hook returning animated styles. No markup, no styling, no items.

> If your menu is currently `ActionSheetIOS`, a native context menu, or a `LayoutAnimation`, none of them can produce this — they own their own motion and Android has no equivalent. It has to be a `Modal` overlay you animate yourself.

---

## The retrofit

Your menu probably looks something like this today:

```tsx
<Modal visible={open} transparent onRequestClose={close}>
  <Pressable style={styles.scrim} onPress={close} />
  <View style={styles.sheet}>
    {items.map(item => <Pressable key={item.key} …><Text>{item.label}</Text></Pressable>)}
  </View>
</Modal>
```

Four changes:

```tsx
import Animated from "react-native-reanimated";
import { useFluidReveal, fluidOrigin, AnimatedPressable } from "./useFluidReveal";

// Your sheet's real numbers, computed once outside render.
const GEO = fluidOrigin({ sheetWidth: 176, sheetHeight: 224, triggerSize: 40, gap: 10 });

function OrderActionsMenu({ open, onClose, items, anchor }) {
  const {
    mounted, sheetStyle, contentStyle, scrimStyle, triggerStyle, triggerPressHandlers,
  } = useFluidReveal({ open, geometry: GEO });

  return (
    // ① mounted, not open — the sheet must outlive `open` to animate out
    <Modal visible={mounted} transparent animationType="none"
           presentationStyle="overFullScreen" statusBarTranslucent
           onRequestClose={onClose}>
      <View style={{ flex: 1 }} accessibilityViewIsModal>
        <AnimatedPressable
          style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
          accessibilityRole="button" accessibilityLabel="Close order actions"
          onPress={onClose}
        />

        {/* ② the only view that scales */}
        <Animated.View style={[styles.sheet, sheetStyle]} accessibilityRole="menu">
          {/* ③ ONE wrapper around all rows */}
          <Animated.View style={[{ flex: 1 }, contentStyle]}>
            {items.map(item => (
              <Pressable key={item.key} accessibilityRole="menuitem"
                         onPress={() => { item.onPress(); onClose(); }}>
                <Text>{item.label}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </Animated.View>

        {/* ④ crisp clone of your header trigger, above the scrim, closes on press */}
        <AnimatedPressable
          style={[styles.headerTrigger,
                  { position: "absolute", left: anchor.x, top: anchor.y }, triggerStyle]}
          accessibilityRole="button" accessibilityLabel="Close order actions"
          onPress={onClose} {...triggerPressHandlers}
        >
          <YourDotsGlyph />
        </AnimatedPressable>
      </View>
    </Modal>
  );
}
```

① **`visible={mounted}`**, not `visible={open}`. Bind the `Modal` to `open` and the close animation never plays — the sheet vanishes instantly.
② `styles.sheet` keeps `position: absolute`, its own `left`/`top`/`width`/`height`, background, and shadow. Remove any `borderRadius` from it — the hook animates that.
③ **One wrapper around all rows.** If your rows animate individually today, delete that.
④ The clone. Section 2 of the spec explains why this isn't optional.

Also add `overflow: "hidden"` to the sheet style so rows can't spill out of the capsule during the morph.

---

## Placement & origin

Static layout → `fluidOrigin({…})` with your four numbers, once, outside render.

Dynamic → measure the real trigger with `measureInWindow` (screen coordinates, which is what the `Modal` overlay uses) and pass both rects:

```tsx
const ref = useRef<View>(null);
// collapsable={false} on the trigger, or Android flattens the view and this lies
ref.current?.measureInWindow((x, y, width, height) => {
  setGeo(fluidOriginFromRects({ x, y, width, height }, yourSheetRect));
});
```

`measureInWindow` is async — measure in the trigger's `onPress`, *then* set `open`. Flipping above the trigger: pass `flipped: true` to `fluidOrigin`; `originY` goes positive and the travel inverts automatically.

---

## Platform gotchas

- **`transformOrigin`** — the hook compensates manually (`translate` before `scale`), so it works on every RN version. On RN ≥ 0.76 you may instead set `transformOrigin: [originX, originY, 0]` and drop the compensation. Never both.
- **`collapsable={false}`** on the real trigger, or Android's view flattening breaks `measureInWindow`.
- **`statusBarTranslucent`** so the scrim covers the status bar; on Android 15+ confirm edge-to-edge is enabled or the scrim stops short.
- **Android shadow is `elevation`** and ignores `shadowRadius`. `elevation: 18` matches the reference sheet. If the sheet edge disappears on a dark background, add a hairline border rather than raising elevation — elevation also affects z-order against the trigger clone.
- **`Modal` gives you the scroll lock for free.** The page underneath can't move and resumes at the same offset. Don't swap it for an in-screen absolute overlay: Android elevation, the status-bar area, and hardware back all regress.
- **Bottom tab bar** sits outside the `Modal`, so it's already under the scrim. Nothing to hide manually.
- **Hardware back** → `onRequestClose`. It closes the sheet, it does not pop the screen.

---

## Verify

- Slow-motion test in the spec (§6) — halve every `stiffness` and watch the order of events.
- **Physical 120Hz device**, while the page is still fetching. The springs run on the UI thread via worklets, so a busy JS thread must not stall them — the Simulator hides exactly this class of bug.
- Tap the trigger 5× fast. Springs reverse from where they are; nothing snaps, queues, or unmounts mid-flight.
- Enable Reduce Motion (iOS: Settings → Accessibility → Motion; Android: Remove animations) → plain cross-fade, everything else identical.
