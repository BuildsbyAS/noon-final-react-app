/* ================================================================
 *  Orders domain — shared data model
 *
 *  Single source of truth for order shapes, marketplace metadata,
 *  per-marketplace lifecycle stages, status semantics, and the
 *  delivery preferences a customer can set per order. Both
 *  MyOrdersPage and TrackOrderPage consume from here so their UIs
 *  stay in lockstep.
 * ================================================================ */

import productPerfume from "../assets/figma-products/perfume.png";
import productHeadphones from "../assets/figma-products/headphones.png";
import productIphone from "../assets/figma-products/iphone.png";
import wishlistSneaker from "../assets/figma-products/wishlist-sneaker.svg";
import wishlistSuitcase from "../assets/figma-products/wishlist-suitcase.svg";
import wishlistRacket from "../assets/figma-products/wishlist-racket.svg";
import orderFridge from "../assets/order-detail/product-fridge.png";
import orderJaguar from "../assets/order-detail/product-jaguar.png";
import orderBottle from "../assets/order-detail/product-bottle.png";
import orderCase from "../assets/order-detail/product-case.png";
import orderStorage from "../assets/order-detail/product-storage.png";
import orderPerfume from "../assets/order-detail/product-perfume.png";

/* ----------------------------------------------------------------
 *  Marketplaces
 *
 *  Each noon marketplace has its own delivery model with different
 *  ETAs, fulfilment paths, and timeline language. We carry the
 *  marketplace as a first-class field so UIs can adapt copy and
 *  visuals (badge colour, ETA framing, lifecycle stages) instead
 *  of branching on string heuristics in component code.
 * ---------------------------------------------------------------- */

export type Marketplace =
  | "noon_daily"     // Groceries, essentials — 30–90 min
  | "noon_food"      // Restaurants — 30–60 min
  | "noon_express"   // Fulfilled by noon — same/next day
  | "marketplace"    // 3rd-party sellers — 3–7 days
  | "cross_border";  // International — 7–14 days

export type MarketplaceMeta = {
  /** Short brand label used in badges and headers. */
  label: string;
  /** Single-sentence promise used as fallback ETA copy. */
  etaPromise: string;
  /** Soft brand colour used by the marketplace badge. */
  color: { fg: string; bg: string };
};

export const MARKETPLACES: Record<Marketplace, MarketplaceMeta> = {
  noon_daily: {
    label: "noon Daily",
    etaPromise: "Arriving in 30–90 min",
    color: { fg: "#0e6b3f", bg: "#dff5e7" },
  },
  noon_food: {
    label: "noon Food",
    etaPromise: "Arriving in 30–60 min",
    color: { fg: "#9a3412", bg: "#ffedd5" },
  },
  noon_express: {
    label: "Express",
    etaPromise: "Arriving today",
    color: { fg: "#1d4ed8", bg: "#e8efff" },
  },
  marketplace: {
    label: "Marketplace",
    etaPromise: "Arriving in 3–5 days",
    color: { fg: "#5b21b6", bg: "#ede9fe" },
  },
  cross_border: {
    label: "International",
    etaPromise: "Arriving in 7–14 days",
    color: { fg: "#0f766e", bg: "#ccfbf1" },
  },
};

/* ----------------------------------------------------------------
 *  Status (for list-row pills)
 *
 *  This is a coarse status used by the orders list. The detailed
 *  per-stage timeline lives in `Order.lifecycle` below.
 * ---------------------------------------------------------------- */

export type StatusKey =
  | "transit"      // Out for delivery (live)
  | "preparing"    // Pre-shipment in any state
  | "delivered"
  | "cancelled"
  | "returned";

/* ----------------------------------------------------------------
 *  Lifecycle stages
 *
 *  Each marketplace has its own ordered set of stages. The shape
 *  is a flat list rather than a DAG because order tracking is
 *  almost always a linear sequence. State of each stage is one
 *  of done | current | future.
 * ---------------------------------------------------------------- */

export type LifecycleStage =
  | "placed"
  | "confirmed"
  | "preparing"             // food
  | "picker_assigned"       // daily
  | "picking"               // daily
  | "packed"                // express
  | "shipped"               // express
  | "seller_processing"     // marketplace
  | "seller_shipped"        // marketplace
  | "in_transit_to_hub"     // marketplace
  | "at_local_hub"          // marketplace
  | "shipped_origin"        // cross-border
  | "customs_clearance"     // cross-border
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const STAGE_LABEL: Record<LifecycleStage, string> = {
  placed: "Order placed",
  confirmed: "Order confirmed",
  preparing: "Preparing your food",
  picker_assigned: "Picker assigned",
  picking: "Items being picked",
  packed: "Packed at noon warehouse",
  shipped: "Shipped from warehouse",
  seller_processing: "Seller is processing",
  seller_shipped: "Shipped by seller",
  in_transit_to_hub: "In transit to noon hub",
  at_local_hub: "At local delivery hub",
  shipped_origin: "Shipped from origin country",
  customs_clearance: "Cleared customs",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type LifecycleStep = {
  stage: LifecycleStage;
  /** Pre-formatted display time. Mock data freezes these so the
   *  screenshots are reproducible. */
  time: string;
  state: "done" | "current" | "future";
};

/** Default ordered stage list for a marketplace, used when no
 *  per-order lifecycle is supplied. */
export const STAGES_FOR: Record<Marketplace, LifecycleStage[]> = {
  noon_daily: [
    "placed",
    "picker_assigned",
    "picking",
    "out_for_delivery",
    "delivered",
  ],
  noon_food: ["placed", "preparing", "out_for_delivery", "delivered"],
  noon_express: [
    "placed",
    "confirmed",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
  ],
  marketplace: [
    "placed",
    "confirmed",
    "seller_processing",
    "seller_shipped",
    "in_transit_to_hub",
    "at_local_hub",
    "out_for_delivery",
    "delivered",
  ],
  cross_border: [
    "placed",
    "confirmed",
    "shipped_origin",
    "customs_clearance",
    "in_transit_to_hub",
    "at_local_hub",
    "out_for_delivery",
    "delivered",
  ],
};

/* ----------------------------------------------------------------
 *  Delivery preferences
 * ---------------------------------------------------------------- */

export type HandoffPreference =
  | "hand_to_me"
  | "leave_at_door"
  | "meet_at_lobby";

export const HANDOFF_LABEL: Record<HandoffPreference, string> = {
  hand_to_me: "Hand to me",
  leave_at_door: "Leave at door",
  meet_at_lobby: "Meet at lobby",
};

export const HANDOFF_DESC: Record<HandoffPreference, string> = {
  hand_to_me: "Courier waits for you at the door",
  leave_at_door: "Contactless — left at the door, photo proof",
  meet_at_lobby: "You'll meet the courier in the building lobby",
};

export type ContactPreference = "call" | "message" | "both";

export const CONTACT_LABEL: Record<ContactPreference, string> = {
  call: "Call only",
  message: "Message only",
  both: "Call or message",
};

export type DeliveryPreferences = {
  handoff: HandoffPreference;
  instructions: string;
  contact: ContactPreference;
};

export const DEFAULT_PREFS: DeliveryPreferences = {
  handoff: "hand_to_me",
  instructions: "",
  contact: "both",
};

/* ----------------------------------------------------------------
 *  Order shape + mock data
 * ---------------------------------------------------------------- */

export type OrderItem = { name: string; image: string; qty?: number };

export type Order = {
  id: string;
  marketplace: Marketplace;
  items: OrderItem[];
  status: StatusKey;
  /** ISO date used for date-band grouping. */
  date: string;
  totalAed: string;
  /** Display ETA — only set when the order is in flight. */
  eta?: string;
  /** Full per-stage lifecycle. Generated for in-flight orders;
   *  delivered orders show a compressed view. */
  lifecycle: LifecycleStep[];
  /** Address text displayed on track screen. */
  address: { label: string; line: string };
  /** Courier (only set when out_for_delivery). */
  courier?: { name: string; initials: string; vehicle: string };
  /** Per-order delivery preferences. */
  prefs: DeliveryPreferences;
};

/* Helper to build a lifecycle from STAGES_FOR with the current
 * stage flagged. Past stages get sequential timestamps from
 * `placedAt`. Future stages get an ETA hint. */
function buildLifecycle(
  marketplace: Marketplace,
  currentStage: LifecycleStage,
  baseTimes: Partial<Record<LifecycleStage, string>>
): LifecycleStep[] {
  const stages = STAGES_FOR[marketplace];
  const idx = stages.indexOf(currentStage);
  return stages.map((stage, i) => ({
    stage,
    time: baseTimes[stage] ?? "",
    state: i < idx ? "done" : i === idx ? "current" : "future",
  }));
}

/* ================================================================
 *  Mock orders — varied across marketplaces and lifecycle states
 *
 *  Today is fixed at 2026-04-27 so dates and bucket labels stay
 *  reproducible across screenshots.
 * ================================================================ */

export const ORDERS: Order[] = [
  /* ---------- Reference processing order — Figma 7932:61550 ---------- */
  {
    id: "032983823 - 1",
    marketplace: "noon_express",
    items: [
      { name: "Gross 60L/Net 45L Single Door Refrigerator", image: orderFridge },
      { name: "Classic Black EDT For Men 100ml", image: orderJaguar },
      { name: "Milton 1.2 Litre Stainless Steel Water Bottle", image: orderBottle },
      { name: "Spigen Rugged Armor Cover Case", image: orderCase },
      { name: "Household Clothes Storage Bag", image: orderStorage },
      { name: "Household Clothes Storage Bag", image: orderStorage },
      { name: "Household Clothes Storage Bag", image: orderStorage },
      { name: "Perfume", image: orderPerfume },
    ],
    status: "preparing",
    date: "2026-04-27",
    totalAed: "550.60",
    eta: "Apr 29 - May 4",
    lifecycle: buildLifecycle("noon_express", "confirmed", {
      placed: "Apr 26",
      confirmed: "Processing",
      packed: "",
      shipped: "",
      out_for_delivery: "",
      delivered: "Apr 29 - May 4",
    }),
    address: {
      label: "Home",
      line: "676D, Downtown, Dubai",
    },
    prefs: { handoff: "leave_at_door", instructions: "Get items together", contact: "call" },
  },

  /* ---------- noon Express — Out for delivery (live) ---------- */
  {
    id: "NMC10293847",
    marketplace: "noon_express",
    items: [{ name: "Apple iPhone 15 Pro Max 256GB · Titanium Black", image: productIphone }],
    status: "transit",
    date: "2026-04-27",
    totalAed: "4,899.00",
    eta: "Today by 6:00 PM",
    lifecycle: buildLifecycle("noon_express", "out_for_delivery", {
      placed: "Today · 11:42 AM",
      confirmed: "Today · 11:48 AM",
      packed: "Today · 12:14 PM",
      shipped: "Today · 12:38 PM",
      out_for_delivery: "Today · 1:02 PM",
      delivered: "Arriving today by 6:00 PM",
    }),
    address: {
      label: "Home · Downtown Dubai",
      line: "Apt 1204, Burj Vista Tower 2, 1 Mohammed Bin Rashid Blvd",
    },
    courier: { name: "Mohammed Ali", initials: "MA", vehicle: "Bike A23 · NMC" },
    prefs: { handoff: "hand_to_me", instructions: "Please call when at lobby", contact: "both" },
  },

  /* ---------- noon Daily — Picker assigned (very live) ---------- */
  {
    id: "NDL94012",
    marketplace: "noon_daily",
    items: [
      { name: "Avocado · 4 pcs", image: wishlistRacket },
      { name: "Greek yoghurt 500g", image: productPerfume },
      { name: "Sourdough loaf", image: productHeadphones },
    ],
    status: "preparing",
    date: "2026-04-27",
    totalAed: "62.00",
    eta: "Arriving in 35 mins",
    lifecycle: buildLifecycle("noon_daily", "picking", {
      placed: "Today · 12:32 PM",
      picker_assigned: "Today · 12:34 PM",
      picking: "Right now",
      out_for_delivery: "Approx 12:48 PM",
      delivered: "Approx 1:05 PM",
    }),
    address: {
      label: "Home · Downtown Dubai",
      line: "Apt 1204, Burj Vista Tower 2, 1 Mohammed Bin Rashid Blvd",
    },
    prefs: { handoff: "leave_at_door", instructions: "", contact: "message" },
  },

  /* ---------- noon Express — Delivered ---------- */
  {
    id: "NMC10293821",
    marketplace: "noon_express",
    items: [{ name: "Bose QuietComfort Ultra Headphones", image: productHeadphones }],
    status: "delivered",
    date: "2026-04-27",
    totalAed: "1,799.00",
    lifecycle: buildLifecycle("noon_express", "delivered", {
      placed: "Yesterday · 09:14 AM",
      confirmed: "Yesterday · 09:18 AM",
      packed: "Yesterday · 10:42 AM",
      shipped: "Yesterday · 11:30 AM",
      out_for_delivery: "Today · 09:00 AM",
      delivered: "Today · 11:24 AM",
    }),
    address: { label: "Home · Downtown Dubai", line: "Apt 1204, Burj Vista Tower 2" },
    prefs: DEFAULT_PREFS,
  },

  /* ---------- Marketplace — Multi-item, delivered ---------- */
  {
    id: "NMK77182",
    marketplace: "marketplace",
    items: [
      { name: "Tom Ford Lost Cherry EDP", image: productPerfume },
      { name: "Bose AirPods", image: productHeadphones },
      { name: "iPhone case", image: productIphone },
    ],
    status: "delivered",
    date: "2026-04-26",
    totalAed: "2,340.50",
    lifecycle: buildLifecycle("marketplace", "delivered", {
      placed: "22 Apr · 18:22",
      confirmed: "22 Apr · 18:25",
      seller_processing: "23 Apr · 09:00",
      seller_shipped: "23 Apr · 16:45",
      in_transit_to_hub: "24 Apr · 22:10",
      at_local_hub: "26 Apr · 06:30",
      out_for_delivery: "26 Apr · 09:00",
      delivered: "26 Apr · 14:18",
    }),
    address: { label: "Home · Downtown Dubai", line: "Apt 1204, Burj Vista Tower 2" },
    prefs: DEFAULT_PREFS,
  },

  /* ---------- Marketplace — Seller processing (early stage) ---------- */
  {
    id: "NMK77205",
    marketplace: "marketplace",
    items: [{ name: "Wilson Pro Padel Racket", image: wishlistRacket }],
    status: "preparing",
    date: "2026-04-26",
    totalAed: "649.00",
    eta: "Arriving Wed, 1 May",
    lifecycle: buildLifecycle("marketplace", "seller_processing", {
      placed: "26 Apr · 11:08",
      confirmed: "26 Apr · 11:12",
      seller_processing: "Today · 09:30",
      seller_shipped: "Approx 28 Apr",
      in_transit_to_hub: "Approx 29 Apr",
      at_local_hub: "Approx 30 Apr",
      out_for_delivery: "Approx 1 May",
      delivered: "Arriving Wed, 1 May",
    }),
    address: { label: "Home · Downtown Dubai", line: "Apt 1204, Burj Vista Tower 2" },
    prefs: { handoff: "meet_at_lobby", instructions: "", contact: "call" },
  },

  /* ---------- noon Express — Delivered last week ---------- */
  {
    id: "NMC10293601",
    marketplace: "noon_express",
    items: [{ name: "Samsonite Cabin Suitcase 55cm", image: wishlistSneaker }],
    status: "delivered",
    date: "2026-04-22",
    totalAed: "899.00",
    lifecycle: buildLifecycle("noon_express", "delivered", {
      placed: "21 Apr · 19:40",
      confirmed: "21 Apr · 19:44",
      packed: "22 Apr · 08:12",
      shipped: "22 Apr · 09:45",
      out_for_delivery: "22 Apr · 14:00",
      delivered: "22 Apr · 17:35",
    }),
    address: { label: "Home · Downtown Dubai", line: "Apt 1204, Burj Vista Tower 2" },
    prefs: DEFAULT_PREFS,
  },

  /* ---------- noon Express — Cancelled ---------- */
  {
    id: "NMC10293500",
    marketplace: "noon_express",
    items: [{ name: "iPhone 15 Pro Leather Case", image: productIphone }],
    status: "cancelled",
    date: "2026-04-19",
    totalAed: "249.00",
    lifecycle: [
      { stage: "placed", time: "19 Apr · 14:22", state: "done" },
      { stage: "cancelled", time: "19 Apr · 15:08", state: "current" },
    ],
    address: { label: "Home · Downtown Dubai", line: "Apt 1204, Burj Vista Tower 2" },
    prefs: DEFAULT_PREFS,
  },

  /* ---------- Marketplace — Returned ---------- */
  {
    id: "NMK76001",
    marketplace: "marketplace",
    items: [{ name: "Nike Pegasus 41", image: wishlistSuitcase }],
    status: "returned",
    date: "2026-04-12",
    totalAed: "489.00",
    lifecycle: buildLifecycle("marketplace", "delivered", {
      placed: "8 Apr · 10:00",
      confirmed: "8 Apr · 10:02",
      seller_processing: "8 Apr · 14:30",
      seller_shipped: "9 Apr · 09:15",
      in_transit_to_hub: "10 Apr",
      at_local_hub: "11 Apr · 22:00",
      out_for_delivery: "12 Apr · 09:00",
      delivered: "12 Apr · 13:45",
    }),
    address: { label: "Home · Downtown Dubai", line: "Apt 1204, Burj Vista Tower 2" },
    prefs: DEFAULT_PREFS,
  },
];

/* Lookup helper used by TrackOrderPage when navigating from the
 * orders list. Falls back to the first transit order. */
export function findOrder(id: string | null): Order {
  return ORDERS.find((o) => o.id === id) || ORDERS.find((o) => o.status === "transit") || ORDERS[0];
}

export const PROCESSING_ORDER_ID = "032983823 - 1";
