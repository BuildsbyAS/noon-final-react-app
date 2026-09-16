/**
 * Delivery instructions widget — v4 (video showcase iteration)
 *
 * v5's mechanics with every instruction blooming blue, plus a showcase for every
 * card: tapping an instruction plays its matching short, full-bleed
 * illustration inside the chip. Only then does the selected state land, with
 * blue blooming from the original tap point over the last frame.
 *
 * The clips are 960×960 H.264, no alpha, ~1.4s and video-only (2.5–3.1 MB
 * each — fine for a prototype, worth transcoding smaller before shipping).
 */
import DeliveryInstructionsWidgetV5, { type DeliveryInstructionsWidgetV5Props } from "./DeliveryInstructionsWidgetV5";
import leaveAtDoorClip from "../assets/order-confirmation/leave-at-door.mp4";
import leaveWithSecurityClip from "../assets/order-confirmation/leave-with-security.mp4";
import avoidCallingClip from "../assets/order-confirmation/avoid-calling.mp4";
import dontRingTheBellClip from "../assets/order-confirmation/dont-ring-the-bell.mp4";

export type DeliveryInstructionsWidgetV4Props = Omit<
  DeliveryInstructionsWidgetV5Props,
  "palette" | "variantId" | "showcase"
>;

const SHOWCASE = {
  door: leaveAtDoorClip,
  security: leaveWithSecurityClip,
  call: avoidCallingClip,
  bell: dontRingTheBellClip,
} as const;

export default function DeliveryInstructionsWidgetV4(props: DeliveryInstructionsWidgetV4Props) {
  return <DeliveryInstructionsWidgetV5 {...props} palette="blue" variantId="4" showcase={SHOWCASE} />;
}
