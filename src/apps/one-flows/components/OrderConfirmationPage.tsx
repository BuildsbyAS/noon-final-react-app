/**
 * Order confirmation — Figma 699:40366 (375×812)
 *
 * A prototype scaffold: the header, order-placed card, delivery-info card and
 * footer ship as flat PNG exports because they're non-interactive here. Only
 * the Delivery instructions widget (699:40691) is real, tappable code.
 *
 * Where a tap on flat artwork has to do something, a transparent button is
 * overlaid on it — sized to 44×44 minimum rather than to the visual box.
 *
 * Layout is a plain flex column; it lands on the Figma pixels exactly:
 *   header 375×101 → content px-3 pt-4 gap-4 → footer 375×90
 *   widget tops at y 117 / 293 / 471; footer button at y 736
 * Content ends at y=631 and the footer starts at 722, so nothing scrolls
 * vertically — the only scroll on this page is the instruction row.
 *
 * No <PageTransition>: one-flows' App.tsx owns the page slide via its own
 * AnimatePresence + pageVariants. Wrapping again would double-animate.
 */
import { useState } from "react";
import { Skel } from "./Skeleton";
import DeliveryInstructionsWidgetV1 from "./DeliveryInstructionsWidgetV1";
import DeliveryInstructionsWidgetV2 from "./DeliveryInstructionsWidgetV2";
import DeliveryInstructionsWidgetV3 from "./DeliveryInstructionsWidgetV3";
import DeliveryInstructionsWidgetV4 from "./DeliveryInstructionsWidgetV4";
import DeliveryInstructionsWidgetV5 from "./DeliveryInstructionsWidgetV5";
import DeliveryInstructionsWidgetV6 from "./DeliveryInstructionsWidgetV6";
import DeliveryInstructionsWidgetV7 from "./DeliveryInstructionsWidgetV7";
import DeliveryInstructionsWidgetV8 from "./DeliveryInstructionsWidgetV8";
import type { InstructionId } from "./deliveryInstructions.model";
import {
  DEFAULT_DELIVERY_PREFERENCES,
  type DeliveryPreferences,
} from "./deliveryPreferences.model";
import { DEFAULT_RIDER_CHOICES, type RiderChoices } from "./riderMessage.model";
import { DEFAULT_CAROUSEL_CHOICES, type CarouselChoices } from "./deliveryCarousel.model";
import { DEFAULT_PARTNER_CHOICES, type PartnerChoices } from "./deliveryPartner.model";
import {
  DEFAULT_PARTNER_CHOICES as DEFAULT_PARTNER_V7_CHOICES,
  type PartnerChoices as PartnerV7Choices,
} from "./deliveryPartnerV7.model";
import { DEFAULT_V8_VALUE, type V8Value } from "./deliveryInstructionsV8.model";
import headerImg from "../assets/order-confirmation/header.png";
import orderPlacedImg from "../assets/order-confirmation/order-placed.png";
import deliveryInfoImg from "../assets/order-confirmation/delivery-info.png";
import footerImg from "../assets/order-confirmation/footer.png";

/** Figma page background — colour/border/subtle #f2f3f7, uniform behind everything. */
const PAGE_BG = "#f2f3f7";

/**
 * Iterations of the delivery-instructions widget, switched live by the pill
 * below the frame (`?v=2` picks one for a demo link).
 *
 * Three of them are their own design and own their own piece of state: v1 (the
 * rider's message as an editable sentence), v2 (segmented controls with a
 * per-choice caption) and v3 (the carousel of different-width slides).
 *
 * v4 and v5 are motion studies over the same four-chip card and share one
 * selection Set, which is why flipping between those two keeps the picks. v5 is
 * the engine; v4 is a thin wrapper over it.
 *
 * v3 and v5 were swapped on request — the carousel took the v3 pill and the
 * chip card moved to v5, so a `?v=3` link now opens the carousel.
 */
export type WidgetVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
const VARIANTS: { id: WidgetVariant; label: string }[] = [
  { id: 1, label: "v1" },
  { id: 2, label: "v2" },
  { id: 3, label: "v3" },
  { id: 4, label: "v4" },
  { id: 5, label: "v5" },
  { id: 6, label: "v6" },
  { id: 7, label: "v7" },
  { id: 8, label: "v8" },
];

export function parseWidgetVariant(raw: string | null): WidgetVariant {
  const n = Number(raw);
  return VARIANTS.some((v) => v.id === n) ? (n as WidgetVariant) : 1;
}

const CHIP_WIDGET: Record<4 | 5, typeof DeliveryInstructionsWidgetV5> = {
  4: DeliveryInstructionsWidgetV4,
  5: DeliveryInstructionsWidgetV5,
};

export function VariantSwitch({ value, onChange }: { value: WidgetVariant; onChange: (v: WidgetVariant) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Widget motion version"
      className="flex items-center gap-0.5 p-0.5 rounded-full bg-white shadow-xs"
    >
      {VARIANTS.map((v) => {
        const on = v.id === value;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v.id)}
            className="h-7 px-3 rounded-full text-b12 font-semibold cursor-pointer transition-colors duration-150"
            style={on ? { backgroundColor: "#1d2539", color: "#ffffff" } : { color: "#475067" }}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

export default function OrderConfirmationPage({
  onBack,
  onContinueShopping,
  variant,
}: {
  onBack: () => void;
  onContinueShopping: () => void;
  variant: WidgetVariant;
}) {
  const [instructions, setInstructions] = useState<ReadonlySet<InstructionId>>(new Set());
  const [riderChoices, setRiderChoices] = useState<RiderChoices>(DEFAULT_RIDER_CHOICES);
  const [preferences, setPreferences] = useState<DeliveryPreferences>(DEFAULT_DELIVERY_PREFERENCES);
  const [carouselChoices, setCarouselChoices] = useState<CarouselChoices>(DEFAULT_CAROUSEL_CHOICES);
  // v6 is based on v1 but owns its own model and answers.
  const [partnerChoices, setPartnerChoices] = useState<PartnerChoices>(DEFAULT_PARTNER_CHOICES);
  const [partnerV7Choices, setPartnerV7Choices] = useState<PartnerV7Choices>(DEFAULT_PARTNER_V7_CHOICES);
  const [v8Value, setV8Value] = useState<V8Value>(DEFAULT_V8_VALUE);
  const [sheetOpen, setSheetOpen] = useState(false);

  const ChipWidget = variant === 4 || variant === 5 ? CHIP_WIDGET[variant] : null;

  // v1's options popover floats over the page, so everything that isn't the
  // widget defocuses while it's open — fading *and* blurring, the way iOS pulls
  // a background behind a sheet, so the panel reads as the only live layer.
  //
  // Opacity on the artwork rather than a scrim overlay: the popover escapes the
  // widget's card, so a scrim would have to sit above the content it dims but
  // below the popover inside it.
  const recede = `transition-[opacity,filter] duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity ${
    sheetOpen ? "opacity-30 blur-[3px] motion-reduce:blur-none" : "opacity-100 blur-0"
  }`;

  return (
    <div
      className="relative w-[375px] h-[812px] overflow-hidden"
      style={{ backgroundColor: PAGE_BG }}
    >
      {/* Header PNG already contains the iOS status bar — don't also render
          <StatusBar />. It's transparent apart from its glyphs, so the page
          colour shows through; there is no white header plate. */}
      <img
        src={headerImg}
        alt=""
        aria-hidden="true"
        width={375}
        height={101}
        draggable={false}
        className={`absolute left-0 top-0 block w-[375px] h-[101px] ${recede}`}
      />
      {/* Live hit targets over the flat header. Visual boxes are 36×36 at
          (12,57) and (259,57); these are grown to 44 tall and centred on them. */}
      <button
        type="button"
        aria-label="Back"
        onClick={onBack}
        className="absolute left-2 top-[53px] size-11 rounded-full cursor-pointer"
      />
      <button
        type="button"
        aria-label="Need help?"
        className="absolute left-[255px] top-[53px] w-28 h-11 rounded-full cursor-pointer"
      />

      <div className="absolute left-0 top-[101px] w-[375px] flex flex-col gap-4 px-3 pt-4">
        {/* These two carry real information as flat pixels, so they get
            descriptive alt text rather than being marked decorative. */}
        <img
          src={orderPlacedImg}
          alt="Order placed. Arriving May 19 to 24. Shipment 1, 2 items, express delivery."
          width={351}
          height={160}
          draggable={false}
          className={`block w-[351px] h-[160px] ${recede}`}
        />
        <img
          src={deliveryInfoImg}
          alt="Delivering to Home — 3207, 32nd floor, Sama towers, Dubai. Anurag, +971 (0) 412 3456. The rider will contact this number if needed."
          width={351}
          height={162}
          draggable={false}
          className={`block w-[351px] h-[162px] ${recede}`}
        />

        {ChipWidget ? (
          <ChipWidget value={instructions} onChange={setInstructions} />
        ) : variant === 2 ? (
          <DeliveryInstructionsWidgetV2 value={preferences} onChange={setPreferences} />
        ) : variant === 3 ? (
          <DeliveryInstructionsWidgetV3 value={carouselChoices} onChange={setCarouselChoices} />
        ) : variant === 6 ? (
          <DeliveryInstructionsWidgetV6
            value={partnerChoices}
            onChange={setPartnerChoices}
            onSheetOpenChange={setSheetOpen}
          />
        ) : variant === 7 ? (
          <DeliveryInstructionsWidgetV7
            value={partnerV7Choices}
            onChange={setPartnerV7Choices}
            onSheetOpenChange={setSheetOpen}
          />
        ) : variant === 8 ? (
          <DeliveryInstructionsWidgetV8 value={v8Value} onChange={setV8Value} />
        ) : (
          <DeliveryInstructionsWidgetV1
            value={riderChoices}
            onChange={setRiderChoices}
            onSheetOpenChange={setSheetOpen}
          />
        )}
      </div>

      {/* Decorative once its button below is labelled. */}
      <img
        src={footerImg}
        alt=""
        aria-hidden="true"
        width={375}
        height={90}
        draggable={false}
        className={`absolute left-0 bottom-0 block w-[375px] h-[90px] ${recede}`}
      />
      <button
        type="button"
        aria-label="Continue shopping"
        onClick={onContinueShopping}
        className="absolute left-3 bottom-6 w-[351px] h-[52px] rounded-12 cursor-pointer"
      />
    </div>
  );
}

/**
 * Silhouette of this screen. Offsets are the real ones: 105 + 12 = 117,
 * 105 + 188 = 293, 105 + 366 = 471; card row at widget-y 44 + 4 = 48.
 *
 * The fourth chip block clips at the widget edge on purpose — the skeleton
 * previews the overflow, so the real row's clipping doesn't read as a bug.
 *
 * It takes the variant because the iterations aren't the same height: the chip
 * card is 160, v2 stands 232 (140-tall segmented cards plus a "save this
 * address" row) and v3's carousel 214. A skeleton that guessed one height for
 * all of them would hand the screen a pop on first paint, which is the one
 * thing a skeleton exists to prevent.
 *
 * Every Skel sits inside a positioned wrapper rather than carrying `absolute`
 * itself: Skel prepends its own `relative`, and Tailwind emits `.relative`
 * after `.absolute`, so `<Skel className="absolute …">` silently stays in flow.
 * Same wrapper pattern as PaymentMethodSkeleton in ./Skeleton.tsx.
 */
export function OrderConfirmationSkeleton({ variant = 1 }: { variant?: WidgetVariant }) {
  // The two variants whose widget is not the 160-tall chip card: v2 is 232
  // (segmented cards + save row), v3 is the 214-tall carousel.
  const v2 = variant === 2;
  const carousel = variant === 3;
  // v7 is v6's layout with an interactive partner, so they share a silhouette.
  const partner = variant === 6 || variant === 7;
  const v8 = variant === 8;
  return (
    <div
      className="relative w-[375px] h-[812px] overflow-hidden"
      style={{ backgroundColor: PAGE_BG }}
      aria-hidden="true"
    >
      <div className="absolute left-3 top-[57px]">
        <Skel className="size-9 rounded-full" />
      </div>
      <div className="absolute left-[259px] top-[57px]">
        <Skel className="w-[104px] h-9 rounded-full" />
      </div>

      <div className="absolute left-3 top-[117px]">
        <Skel className="w-[351px] h-[160px] rounded-16" />
      </div>
      <div className="absolute left-3 top-[293px]">
        <Skel className="w-[351px] h-[162px] rounded-16" />
      </div>

      <div
        className="absolute left-3 top-[471px] w-[351px] rounded-16 bg-white overflow-hidden"
        style={{ height: v2 ? 232 : carousel ? 214 : partner ? 263 : v8 ? 264 : 160 }}
      >
        <div className="absolute left-4 top-[15px]">
          <Skel className="h-4 w-[132px] rounded-4" />
        </div>
        {v2 ? (
          <>
            {/* The real card widths: 103 / 106 / 110 / 140 at x 12 / 125 / 241 /
                361, so the fourth clips exactly where it clips for real. */}
            {[
              [12, 103],
              [125, 106],
              [241, 110],
              [361, 140],
            ].map(([left, width]) => (
              <div key={left} className="absolute top-12" style={{ left }}>
                <Skel className="h-[140px] rounded-12" style={{ width }} />
              </div>
            ))}
            <div className="absolute left-[14px] top-[200px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[200px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : carousel ? (
          <>
            {/* Slide widths 103 / 261 / 318 at x 12 / 125 / 396, so the third
                clips exactly where it clips for real. */}
            {[
              [12, 103],
              [125, 261],
              [396, 318],
            ].map(([left, width]) => (
              <div key={left} className="absolute top-12" style={{ left }}>
                <Skel className="h-[122px] rounded-12" style={{ width }} />
              </div>
            ))}
            <div className="absolute left-[14px] top-[182px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[182px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : v8 ? (
          <>
            {/* v8: three 136×114 switch cards at x 12 / 158 / 304 (the third clips),
                the record row at y 174, the save row at 230. */}
            {[12, 158, 304].map((left) => (
              <div key={left} className="absolute top-12" style={{ left }}>
                <Skel className="w-[136px] h-[114px] rounded-16" />
              </div>
            ))}
            <div className="absolute left-3 top-[174px]">
              <Skel className="w-[327px] h-11 rounded-12" />
            </div>
            <div className="absolute left-[14px] top-[230px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[230px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : partner ? (
          <>
            {/* v6: three chips at y 48 / 88 / 128 (widths 100 / 106 / 195), the
                rider at (237, 20), the record row at y 174, the save row at 231. */}
            {[
              [48, 100],
              [88, 106],
              [128, 195],
            ].map(([top, width]) => (
              <div key={top} className="absolute left-3" style={{ top }}>
                <Skel className="h-8 rounded-full" style={{ width }} />
              </div>
            ))}
            <div className="absolute left-[237px] top-5">
              <Skel className="w-[114px] h-[150px] rounded-16" />
            </div>
            <div className="absolute left-3 top-[174px]">
              <Skel className="w-[327px] h-10 rounded-12" />
            </div>
            <div className="absolute left-[14px] top-[231px]">
              <Skel className="size-5 rounded-4" />
            </div>
            <div className="absolute left-10 top-[231px]">
              <Skel className="h-5 w-[240px] rounded-4" />
            </div>
          </>
        ) : (
          [12, 118, 224, 330].map((left) => (
            <div key={left} className="absolute top-12" style={{ left }}>
              <Skel className="w-24 h-[100px] rounded-12" />
            </div>
          ))
        )}
      </div>

      <div className="absolute left-3 bottom-6">
        <Skel className="w-[351px] h-[52px] rounded-12" />
      </div>
    </div>
  );
}
