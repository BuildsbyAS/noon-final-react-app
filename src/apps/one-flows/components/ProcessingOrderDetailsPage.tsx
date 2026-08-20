import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, HomeIcon, PersonIcon } from "@ui";
import heroCollage from "../assets/order-detail/hero-collage.png";
import progressRail from "../assets/order-detail/progress-rail.png";
import productFridge from "../assets/order-detail/product-fridge.png";
import productJaguar from "../assets/order-detail/product-jaguar.png";
import productBottle from "../assets/order-detail/product-bottle.png";
import productCase from "../assets/order-detail/product-case.png";
import productStorage from "../assets/order-detail/product-storage.png";
import productPerfume from "../assets/order-detail/product-perfume.png";
import applePayBadge from "../assets/apple-pay-badge.png";
import noonOneBadge from "../../supermall/assets/cart/noon-one-badge.png";
import cellularIcon from "../assets/cellular.svg";
import wifiIcon from "../assets/wifi.svg";
import "./ProcessingOrderDetailsPage.css";

const AED_GLYPH = "\uE001";

type ProductPolicy = "returnable" | "final-sale";

type OrderDetailProduct = {
  image: string;
  name: string;
  price: string;
  policy: ProductPolicy;
  warranty?: string;
};

const PRODUCTS: OrderDetailProduct[] = [
  {
    image: productFridge,
    name: "Gross 60L/Net 45L Single Door Refrigerator Minibar Fridge RR60D4ASU, Adjustable Therm...",
    price: "328.00",
    policy: "returnable",
    warranty: "1-year warranty",
  },
  {
    image: productJaguar,
    name: "Classic Black EDT For Men 100ml",
    price: "328.00",
    policy: "final-sale",
  },
  {
    image: productBottle,
    name: "Milton 1.2 Litre (1180 ml) Stainless Steel Water Bottle with Straw Lid - 2 lids Included, Vacuum...",
    price: "28.00",
    policy: "returnable",
  },
  {
    image: productCase,
    name: "Spigen Rugged Armor Cover Case for Apple Airpods Pro Charcoal Gray",
    price: "28.00",
    policy: "returnable",
  },
  {
    image: productStorage,
    name: "Generic Household Clothes Storage Bag Quilt Storage Box Moving Bedroom Storage Bag Org...",
    price: "28.00",
    policy: "returnable",
  },
  {
    image: productPerfume,
    name: "Spigen Rugged Armor Cover Case for Apple Airpods Pro Charcoal Gray",
    price: "28.00",
    policy: "returnable",
  },
];

function Aed({ className = "" }: { className?: string }) {
  return (
    <span className={`processing-aed ${className}`} aria-label="AED">
      {AED_GLYPH}
    </span>
  );
}

function CopyGlyph() {
  return <span className="processing-copy" aria-hidden="true" />;
}

function MoreGlyph() {
  return (
    <span className="processing-more" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

type ActionKind = "calendar" | "location" | "receiver" | "invoice" | "timeline" | "cancel";

const ACTIONS: { kind: ActionKind; label: string; destructive?: boolean }[] = [
  { kind: "calendar", label: "Reschedule order" },
  { kind: "location", label: "Change address" },
  { kind: "receiver", label: "Change receiver" },
  { kind: "invoice", label: "View invoice" },
  { kind: "timeline", label: "View delivery timeline" },
  { kind: "cancel", label: "Cancel order", destructive: true },
];

function ActionGlyph({ kind }: { kind: ActionKind }) {
  if (kind === "calendar") {
    return <svg viewBox="0 0 24 24"><path d="M7 3v3m10-3v3M4.5 9h15M6.4 5h11.2A2.4 2.4 0 0 1 20 7.4v10.2a2.4 2.4 0 0 1-2.4 2.4H6.4A2.4 2.4 0 0 1 4 17.6V7.4A2.4 2.4 0 0 1 6.4 5Z" /></svg>;
  }
  if (kind === "location") {
    return <svg viewBox="0 0 24 24"><path d="M12 21c4.3 0 7.8-1.3 7.8-3 0-1.2-1.8-2.2-4.4-2.7M8.6 15.4C6 15.8 4.2 16.8 4.2 18c0 1.7 3.5 3 7.8 3" /><path d="M17.5 8.4c0 4-5.5 8.4-5.5 8.4S6.5 12.4 6.5 8.4a5.5 5.5 0 1 1 11 0Z" /><circle cx="12" cy="8.2" r="1.6" fill="currentColor" stroke="none" /></svg>;
  }
  if (kind === "receiver") {
    return <svg viewBox="0 0 24 24"><path d="M4.2 10.4A8 8 0 1 1 5.5 17M4.2 10.4 1.8 8m2.4 2.4L7 8.1" /><circle cx="12" cy="9.1" r="2.5" /><path d="M7.7 18a4.5 4.5 0 0 1 8.6 0" /></svg>;
  }
  if (kind === "invoice") {
    return <svg viewBox="0 0 24 24"><path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v16l-2.5-2-2.5 2-2.5-2-2.5 2-2.5-2-2.5 2V5A1.5 1.5 0 0 1 6 3.5Z" /><path d="M8 9h8M8 13h5" /></svg>;
  }
  if (kind === "timeline") {
    return <svg viewBox="0 0 24 24"><path d="M5.4 7.4A8 8 0 1 1 4 14.7M5.4 7.4 8.3 5M5.4 7.4 3.1 4.6" /><path d="M8.6 13.1 11 15.3l4.5-5" /></svg>;
  }
  return <svg viewBox="0 0 24 24"><rect x="4" y="3.5" width="16" height="17" rx="3" /><path d="m9 9 6 6m0-6-6 6" /></svg>;
}

function ActionCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="processing-action-layer">
          <motion.button
            type="button"
            className="processing-action-scrim"
            aria-label="Close order actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={onClose}
          />
          <motion.div
            id="processing-order-actions"
            className="processing-action-sheet"
            role="menu"
            aria-label="Order actions"
            initial={reduceMotion
              ? { opacity: 1, borderRadius: 16 }
              : { opacity: 1, y: -4, scaleX: 0, scaleY: 0, borderRadius: 112 }}
            animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1, borderRadius: 16 }}
            exit={reduceMotion
              ? { opacity: 1, borderRadius: 16 }
              : {
                  opacity: 1,
                  y: -3,
                  scaleX: 0,
                  scaleY: 0,
                  borderRadius: 112,
                  transition: {
                    scaleX: { type: "spring", stiffness: 520, damping: 38, mass: 0.66, bounce: 0 },
                    scaleY: { type: "spring", stiffness: 520, damping: 38, mass: 0.66, bounce: 0 },
                    y: { type: "spring", stiffness: 520, damping: 38, mass: 0.66, bounce: 0 },
                    borderRadius: { duration: 0.14, ease: [0.23, 1, 0.32, 1] },
                  },
                }}
            transition={reduceMotion
              ? { duration: 0.14, ease: [0.23, 1, 0.32, 1] }
              : {
                  scaleX: { type: "spring", stiffness: 390, damping: 26, mass: 0.78 },
                  scaleY: { type: "spring", stiffness: 520, damping: 30, mass: 0.68 },
                  y: { type: "spring", stiffness: 500, damping: 34, mass: 0.7 },
                  borderRadius: { type: "spring", stiffness: 440, damping: 34, mass: 0.7 },
                }}
          >
            <motion.div
              className="processing-action-items"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.07, delay: 0, ease: [0.23, 1, 0.32, 1] } }}
              transition={{ duration: reduceMotion ? 0.12 : 0.14, delay: reduceMotion ? 0 : 0.08, ease: [0.23, 1, 0.32, 1] }}
            >
              {ACTIONS.map((action) => (
                <button
                  key={action.kind}
                  type="button"
                  className={`processing-action-item${action.destructive ? " processing-action-item--destructive" : ""}`}
                  role="menuitem"
                >
                  <span><ActionGlyph kind={action.kind} /></span>
                  <strong>{action.label}</strong>
                </button>
              ))}
            </motion.div>
          </motion.div>
          <motion.button
            type="button"
            className="processing-nav-button processing-nav-button--more processing-action-trigger"
            aria-label="Close order actions"
            aria-expanded="true"
            aria-controls="processing-order-actions"
            onClick={onClose}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={{ type: "spring", stiffness: 620, damping: 34, mass: 0.48 }}
          >
            <MoreGlyph />
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}

function PencilGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M13.7 2.8a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L7.1 16.4 2.7 17.3l.9-4.4L13.7 2.8Z" fill="currentColor" />
      <path d="m12.5 4 3.5 3.5" stroke="white" strokeWidth="1.3" />
    </svg>
  );
}

function LeafGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11.8 19.7c-1.4-6.5-5.2-10.5-9.6-12.1.1 6.2 3 10.5 9.6 12.1Zm.6.1c.6-7.5 3.8-12.3 9.4-14.5.4 7-2.7 12.2-9.4 14.5Z" fill="currentColor" />
      <path d="M12 20.5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DoorGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 21V4.5c0-.8.5-1.4 1.3-1.6l9-1.8c1-.2 1.9.5 1.9 1.6V21H5Z" fill="currentColor" opacity=".9" />
      <circle cx="14.1" cy="11.3" r="1" fill="white" />
      <path d="M2.5 21h19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PolicyGlyph({ kind }: { kind: ProductPolicy }) {
  return (
    <span className={`processing-policy-glyph processing-policy-glyph--${kind}`} aria-hidden="true">
      <svg viewBox="0 0 20 20">
        <path d="M5.6 5.2H14a4.2 4.2 0 1 1-3.6 6.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="m7.4 2.9-2.6 2.5 2.6 2.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {kind === "returnable" ? (
          <path d="m7.7 11.8 1.5 1.6 3.3-3.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="m8.2 10.4 3.5 3.5m0-3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}

function WarrantyGlyph() {
  return (
    <span className="processing-warranty-glyph" aria-hidden="true">
      <svg viewBox="0 0 20 20">
        <path d="M10 1.7 16 4v5.1c0 4-2.5 6.8-6 9.1-3.5-2.3-6-5.1-6-9.1V4l6-2.3Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="m10 6 .9 1.8 2 .3-1.5 1.4.4 2-1.8-.9-1.8.9.4-2-1.5-1.4 2-.3L10 6Z" fill="currentColor" />
      </svg>
    </span>
  );
}

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 15.5v2.8A2.7 2.7 0 0 0 7.7 21h8.6a2.7 2.7 0 0 0 2.7-2.7v-2.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <span className="processing-chat-glyph" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function ReferenceStatusBar() {
  return (
    <div className="processing-system-status" aria-hidden="true">
      <span>9:41</span>
      <div className="processing-system-icons">
        <img src={cellularIcon} alt="" />
        <img src={wifiIcon} alt="" />
        <i className="processing-battery"><b /></i>
      </div>
    </div>
  );
}

function DeliveryCard() {
  return (
    <section className="processing-card processing-delivery-card" aria-label="Delivery details">
      <h2>Delivering to</h2>

      <div className="processing-delivery-row processing-delivery-row--home">
        <span className="processing-round-glyph"><HomeIcon size={19} color="currentColor" /></span>
        <div>
          <strong>Home</strong>
          <p>676D, Downtown, Dubai</p>
        </div>
        <span className="processing-edit"><PencilGlyph /></span>
      </div>

      <div className="processing-delivery-row processing-delivery-row--person">
        <span className="processing-round-glyph"><PersonIcon size={19} color="currentColor" /></span>
        <div>
          <strong>Anurag <b /> +971 (0) 412 3456</strong>
          <p>Rider will contact on this number if needed</p>
        </div>
        <span className="processing-edit"><PencilGlyph /></span>
      </div>

      <div className="processing-delivery-divider" />
      <div className="processing-choice processing-choice--together">
        <LeafGlyph />
        <span>Get items<br />together</span>
        <i className="processing-checkbox" />
      </div>
      <div className="processing-choice processing-choice--door">
        <DoorGlyph />
        <span>Leave at<br />the door</span>
        <i className="processing-checkbox processing-checkbox--checked" />
      </div>
    </section>
  );
}

function ProductRow({ product, index }: { product: OrderDetailProduct; index: number }) {
  return (
    <div className={`processing-product processing-product--${index + 1}`}>
      <img className="processing-product-image" src={product.image} alt="" draggable={false} />
      <div className="processing-product-copy">
        <p className="processing-product-name">{product.name}</p>
        <p className="processing-product-price"><Aed /> {product.price}</p>
        <p className={`processing-product-policy processing-product-policy--${product.policy}`}>
          <PolicyGlyph kind={product.policy} />
          {product.policy === "returnable" ? "Return & exchange available" : "Cannot be exchanged or returned"}
        </p>
        {product.warranty && (
          <p className="processing-product-warranty"><WarrantyGlyph />{product.warranty}</p>
        )}
      </div>
    </div>
  );
}

function OrderSummaryCard() {
  return (
    <section className="processing-card processing-order-card" aria-label="Order summary">
      <h2>Order summary</h2>
      <span className="processing-cancel">Cancel order</span>
      {PRODUCTS.map((product, index) => (
        <ProductRow key={`${product.name}-${index}`} product={product} index={index} />
      ))}
    </section>
  );
}

function BillSummaryCard() {
  return (
    <section className="processing-card processing-bill-card" aria-label="Bill summary">
      <h2>Bill summary</h2>
      <p className="processing-paid-with">
        Paid with <img src={applePayBadge} alt="Apple Pay" /> <strong>Apple Pay</strong>
      </p>

      <div className="processing-bill-box">
        <div className="processing-bill-line processing-bill-line--subtotal">
          <span>Subtotal</span>
          <strong><del><Aed />80.60</del> <Aed /> 545.60</strong>
        </div>
        <div className="processing-bill-line processing-bill-line--delivery">
          <span>Delivery Fee</span>
          <strong><Aed /> 7.00</strong>
        </div>

        <div className="processing-one-promo">
          <strong>Get unlimited Free Delivery with</strong>
          <img src={noonOneBadge} alt="noon one" />
          <span><ChevronRight size={15} color="currentColor" /></span>
        </div>

        <div className="processing-bill-separator" />
        <div className="processing-bill-line processing-bill-line--coupon">
          <span>Coupon Discount <i>%</i></span>
          <strong>−&nbsp; <Aed /> 2.00</strong>
        </div>
        <div className="processing-bill-separator processing-bill-separator--total" />
        <div className="processing-bill-line processing-bill-line--total">
          <span>Total paid</span>
          <strong><Aed /> 550.60</strong>
        </div>

        <div className="processing-savings">
          <strong><Aed /> 2 saved + <Aed /> 2.53 cashback</strong>
          <span>Cashback credits to the primary cardholder</span>
        </div>
      </div>

      <div className="processing-invoice" aria-hidden="true">
        <DownloadGlyph />
        <strong>Download invoice</strong>
      </div>
    </section>
  );
}

export function ProcessingOrderDetailsSkeleton() {
  return (
    <div className="processing-order-screen processing-order-skeleton" aria-hidden="true">
      <ReferenceStatusBar />
      <div className="processing-skeleton-nav processing-skeleton-nav--back" />
      <div className="processing-skeleton-nav processing-skeleton-nav--more" />
      <div className="processing-skeleton-line processing-skeleton-line--id" />
      <div className="processing-skeleton-hero" />
      <div className="processing-skeleton-line processing-skeleton-line--status" />
      <div className="processing-skeleton-line processing-skeleton-line--date" />
      <div className="processing-skeleton-card processing-skeleton-card--timeline" />
      <div className="processing-skeleton-card processing-skeleton-card--delivery" />
    </div>
  );
}

export default function ProcessingOrderDetailsPage({ onBack }: { onBack: () => void }) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <div className={`processing-order-screen${actionsOpen ? " processing-order-screen--actions-open" : ""}`}>
      <div className="processing-order-scroll" data-order-detail-scroll>
        <main className="processing-order-canvas" data-order-detail-canvas>
          <ReferenceStatusBar />

          <button type="button" className="processing-nav-button processing-nav-button--back" onClick={onBack} aria-label="Back to My Orders">
            <ChevronLeft size={21} color="currentColor" />
          </button>
          <button
            type="button"
            className="processing-nav-button processing-nav-button--more"
            aria-label="More order actions"
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
            aria-controls="processing-order-actions"
            onClick={() => setActionsOpen(true)}
          >
            <MoreGlyph />
          </button>

          <div className="processing-order-id">
            <strong>032983823 - 1 <CopyGlyph /></strong>
            <span>8 items</span>
          </div>

          <img className="processing-hero" src={heroCollage} alt="Order items" draggable={false} />
          <div className="processing-status-line">
            <strong>PROCESSING</strong><i /> <b>ON TIME</b>
          </div>
          <h1>Apr 29 - May 4</h1>

          <section className="processing-card processing-progress-card" aria-label="Order progress">
            <img src={progressRail} className="processing-progress-rail" alt="Placed, packed, dispatched, delivered" draggable={false} />
            <div className="processing-progress-labels">
              <span><strong>Placed</strong><small>Apr 26</small></span>
              <span><strong>Packed</strong></span>
              <span><strong>Dispatched</strong></span>
              <span><strong>Delivered</strong></span>
            </div>
            <p>Your order is currently being processed. We’ll let you know<br />once your order is confirmed!</p>
            <div className="processing-progress-actions" aria-hidden="true">
              <span>Reschedule</span>
              <span>See all updates</span>
            </div>
          </section>

          <DeliveryCard />
          <OrderSummaryCard />
          <BillSummaryCard />

          <div className="processing-chat" aria-hidden="true"><ChatGlyph /></div>
        </main>
      </div>
      <ActionCenter open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </div>
  );
}
