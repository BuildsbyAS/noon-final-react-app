import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./index.css";
import SubscribedUser from "./components/SubscribedUser";
import ManageMembership, { type PlanState } from "./components/ManageMembership";
import ChangePlan from "./components/ChangePlan";
import PlanSelect from "./components/PlanSelect";
import ShareLanding from "./components/ShareLanding";
import ShareYourPlan from "./components/ShareYourPlan";
import ManageMembers from "./components/ManageMembers";
import AccountsPage from "./components/AccountsPage";
import AddressBookPage from "./components/AddressBookPage";
import SavedCardsPage from "./components/SavedCardsPage";
import MyAccountPage from "./components/MyAccountPage";
import MyOrdersPage from "./components/MyOrdersPage";
import TrackOrderPage from "./components/TrackOrderPage";
import ProcessingOrderDetailsPage, { ProcessingOrderDetailsSkeleton } from "./components/ProcessingOrderDetailsPage";
import OrderConfirmationPage, { OrderConfirmationSkeleton, VariantSwitch, parseWidgetVariant, type WidgetVariant } from "./components/OrderConfirmationPage";
import ReviewsRootFlow from "./reviews/RootFlow";
import CancelMembership from "./components/CancelMembership";
import CancelFeedback from "./components/CancelFeedback";
import CancelConfirmation from "./components/CancelConfirmation";
import PostCancel from "./components/PostCancel";
import PaymentMethod from "./components/PaymentMethod";
import SplashScreen from "./components/SplashScreen";
import SmoothCorners from "@ui/SmoothCorners";
import {
  SkeletonGate,
  HomeSkeleton,
  ManageSkeleton,
  ChangePlanSkeleton,
  CancelSkeleton,
  CancelFeedbackSkeleton,
  PostCancelSkeleton,
  PaymentMethodSkeleton,
} from "./components/Skeleton";
import { Retune } from "retune";
import { PROCESSING_ORDER_ID } from "./data/orders";

type Screen =
  | "home"
  | "accounts"
  | "accountAddresses"
  | "accountCards"
  | "myAccount"
  | "myOrders"
  | "myOrdersReviews"
  | "trackOrder"
  | "manage"
  | "changePlan"
  | "planSelect"
  | "shareLanding"
  | "shareYourPlan"
  | "manageMembers"
  | "cancel"
  | "cancelFeedback"
  | "cancelled"
  | "postCancel"
  | "paymentMethod"
  | "orderConfirmation";

type Direction = "forward" | "back";

// iOS-style page slide. Forward: new page enters from the right while the old
// page slides off to the left. Back: mirrored. The exiting page parallaxes
// only 25% so the incoming page reads as "on top of the stack".
const pageVariants = {
  enter: (dir: Direction) => ({
    x: dir === "forward" ? "100%" : "-25%",
  }),
  center: { x: "0%" },
  exit: (dir: Direction) => ({
    x: dir === "forward" ? "-25%" : "100%",
  }),
};

// When the app is loaded with `?embedded=1` it's running inside the
// supermall iframe — the host provides the bottom nav, so we hide ours.
const isEmbedded =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("embedded") === "1";

// Deep link for screens that have no in-app entry point yet, so a prototype can
// be opened straight onto one: /one-flows?screen=orderConfirmation
const initialScreen: Screen =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("screen") === "orderConfirmation"
    ? "orderConfirmation"
    : "accounts";

// Which motion iteration of the delivery-instructions widget to open on:
// /one-flows?screen=orderConfirmation&v=2 (or v=3, v=4)
const initialWidgetVariant: WidgetVariant =
  typeof window !== "undefined"
    ? parseWidgetVariant(new URLSearchParams(window.location.search).get("v"))
    : 1;

export default function App() {
  // Splash no longer plays on initial load. The user lands on AccountsPage
  // first (the entry point from supermall's Account tab). Tapping the
  // "Join One" banner triggers the splash, which then reveals the
  // subscribed Home screen — i.e. the splash is the "joining noon One"
  // moment, not an app-startup animation.
  const [showSplash, setShowSplash] = useState(false);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [widgetVariant, setWidgetVariant] = useState<WidgetVariant>(initialWidgetVariant);
  const [shareTier, setShareTier] = useState<"duo" | "family">("family");
  const [direction, setDirection] = useState<Direction>("forward");
  // The user's current plan. Starts as "monthly"; bumps when they confirm an
  // upgrade in the ChangePlan flow. We also track whether the active plan was
  // upgraded *during this session* so the Manage Membership tag can read
  // "Upgraded plan" instead of "Current plan" right after the change.
  const [planId, setPlanId] = useState<PlanState>("monthly");
  const [isUpgraded, setIsUpgraded] = useState(false);
  // Selected order id for the Track Order screen. Set when the user
  // taps an order on the My Orders page; read by TrackOrderPage to
  // resolve which order's lifecycle to render.
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  // Where the user entered ShareYourPlan from. Drives whether Skip/back
  // returns to the home discovery context or the post-purchase Manage flow.
  const [shareEntry, setShareEntry] = useState<"home" | "postPurchase">("home");

  const navigate = (next: Screen, dir: Direction) => {
    setDirection(dir);
    setScreen(next);
  };

  // Hard cut-off: advance to the home screen at SPLASH_MS regardless of the
  // Lottie's own `complete` event. The animation runs ~3.5s but visually
  // settles earlier, and the post-complete handoff has perceptible lag — so
  // we cut it short. Tweak this single number to taste.
  const SPLASH_MS = 3200;
  useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => setShowSplash(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, [showSplash]);

  // When embedded inside the supermall shell, tell the host whether to
  // show its bottom nav. The host shows its nav only on the AccountsPage
  // landing — the splash and every screen beyond it are the immersive
  // noon One flow, where the host nav should hide.
  useEffect(() => {
    if (!isEmbedded || typeof window === "undefined") return;
    const onAccountsLanding = !showSplash && screen === "accounts";
    window.parent.postMessage(
      { source: "noon-one", showHostNav: onAccountsLanding },
      "*"
    );
  }, [showSplash, screen]);

  const renderScreen = () => {
    switch (screen) {
      case "changePlan":
        return (
          <SkeletonGate skeleton={<ChangePlanSkeleton />}>
            <ChangePlan
              onBack={() => navigate("manage", "back")}
              onConfirmPlan={(newPlanId) => {
                setPlanId(newPlanId);
                setIsUpgraded(true);
                navigate("manage", "back");
              }}
            />
          </SkeletonGate>
        );
      case "cancel":
        return (
          <SkeletonGate skeleton={<CancelSkeleton />}>
            <CancelMembership
              onBack={() => navigate("manage", "back")}
              onKeepMembership={() => navigate("manage", "back")}
              onContinueCancellation={() => navigate("cancelFeedback", "forward")}
            />
          </SkeletonGate>
        );
      case "cancelFeedback":
        return (
          <SkeletonGate skeleton={<CancelFeedbackSkeleton />}>
            <CancelFeedback
              onBack={() => navigate("cancel", "back")}
              onKeepMembership={() => navigate("manage", "back")}
              onContinueCancellation={() => navigate("cancelled", "forward")}
            />
          </SkeletonGate>
        );
      case "cancelled":
        // No skeleton: this screen has no loaded content — its first phase
        // is itself a held-icon moment. A pre-roll skeleton would just push
        // the phase 1 → phase 2 reveal back behind a meaningless shimmer.
        return (
          <CancelConfirmation
            onDismiss={() => navigate("postCancel", "forward")}
          />
        );
      case "postCancel":
        return (
          <SkeletonGate skeleton={<PostCancelSkeleton />}>
            <PostCancel
              onManageMembership={() => navigate("manage", "forward")}
              onContinueOffer={() => navigate("home", "back")}
            />
          </SkeletonGate>
        );
      case "manage":
        return (
          <SkeletonGate skeleton={<ManageSkeleton />}>
            <ManageMembership
              onBack={() => navigate("home", "back")}
              onChangePlan={() => navigate("planSelect", "forward")}
              onCancelMembership={() => navigate("cancel", "forward")}
              onChangePaymentMethod={() => navigate("paymentMethod", "forward")}
              planId={planId}
              isUpgraded={isUpgraded}
            />
          </SkeletonGate>
        );
      case "paymentMethod":
        return (
          <SkeletonGate skeleton={<PaymentMethodSkeleton />}>
            <PaymentMethod
              onBack={() => navigate("manage", "back")}
              onPay={() => navigate("manage", "back")}
            />
          </SkeletonGate>
        );
      case "planSelect":
        return (
          <PlanSelect
            onBack={() => navigate("manage", "back")}
            onContinue={() => {
              // PRD §5.1.1: Checkout upsell pattern — after the user picks a
              // personal plan, surface the share-with-others option as a
              // sub-flow before confirming.
              setIsUpgraded(true);
              setShareEntry("postPurchase");
              navigate("shareYourPlan", "forward");
            }}
          />
        );
      case "accounts":
        return (
          <AccountsPage
            embedded={isEmbedded}
            onNoonOne={() => {
              // Queue Home as the next screen behind the splash, then play
              // the Lottie. When SPLASH_MS elapses, splash hides and Home
              // is what's underneath.
              setScreen("home");
              setDirection("forward");
              setShowSplash(true);
            }}
            onAddresses={() => navigate("accountAddresses", "forward")}
            onSavedCards={() => navigate("accountCards", "forward")}
            onMyAccount={() => navigate("myAccount", "forward")}
            onMyOrders={() => navigate("myOrders", "forward")}
            onSignedOut={() => navigate("home", "back")}
          />
        );
      case "myOrders":
        return (
          <MyOrdersPage
            onBack={() => navigate("accounts", "back")}
            onOpenOrder={(orderId) => {
              setActiveOrderId(orderId);
              navigate("trackOrder", "forward");
            }}
          />
        );
      case "myOrdersReviews":
        // Cloned reviews flow from theawryone/noon-reviews-2-prototype.
        // Wired to the AccountsPage "My Orders" tile — back button on the
        // OrdersScreen header pops back to AccountsPage.
        return (
          <ReviewsRootFlow onExit={() => navigate("accounts", "back")} />
        );
      case "trackOrder":
        if (activeOrderId === PROCESSING_ORDER_ID) {
          return (
            <SkeletonGate skeleton={<ProcessingOrderDetailsSkeleton />}>
              <ProcessingOrderDetailsPage onBack={() => navigate("myOrders", "back")} />
            </SkeletonGate>
          );
        }
        return (
          <TrackOrderPage
            orderId={activeOrderId}
            onBack={() => navigate("myOrders", "back")}
          />
        );
      case "orderConfirmation":
        return (
          <SkeletonGate skeleton={<OrderConfirmationSkeleton variant={widgetVariant} />}>
            <OrderConfirmationPage
              onBack={() => navigate("accounts", "back")}
              onContinueShopping={() => navigate("accounts", "back")}
              variant={widgetVariant}
            />
          </SkeletonGate>
        );
      case "accountAddresses":
        return <AddressBookPage onBack={() => navigate("accounts", "back")} />;
      case "accountCards":
        return <SavedCardsPage onBack={() => navigate("accounts", "back")} />;
      case "myAccount":
        return <MyAccountPage onBack={() => navigate("accounts", "back")} />;
      case "shareLanding":
        return (
          <ShareLanding
            onBack={() => navigate(shareEntry === "home" ? "accounts" : "home", "back")}
            onCheckPlans={() => navigate("shareYourPlan", "forward")}
          />
        );
      case "shareYourPlan":
        return (
          <ShareYourPlan
            onBack={() =>
              navigate(
                shareEntry === "postPurchase" ? "planSelect" : "shareLanding",
                "back"
              )
            }
            onSkip={() =>
              navigate(shareEntry === "postPurchase" ? "manage" : "home", "back")
            }
            entry={shareEntry}
            currentPrice="24.99"
            onContinue={(tier) => {
              setShareTier(tier);
              navigate("manageMembers", "forward");
            }}
          />
        );
      case "manageMembers":
        return (
          <ManageMembers
            tier={shareTier}
            onBack={() => navigate("shareYourPlan", "back")}
            onSwitchPlan={() => navigate("shareYourPlan", "back")}
            onCancelled={() => {
              setPlanId("monthly");
              setIsUpgraded(false);
              navigate("home", "back");
            }}
          />
        );
      case "home":
      default:
        return (
          <SkeletonGate skeleton={<HomeSkeleton />}>
            <SubscribedUser
              onManageMembership={() => navigate("manage", "forward")}
              onSharePlan={() => {
                setShareEntry("home");
                navigate("shareLanding", "forward");
              }}
            />
          </SkeletonGate>
        );
    }
  };

  // Frame is exactly 375×812 — no surrounding gray padding. The
  // SmoothCorners squircle clip stays so the inner content respects the
  // rounded edges, but the outer wrapper just centres it edge-to-edge.
  return (
    <div className="w-full flex flex-col items-center gap-4">
      <SmoothCorners radius={20}>
        {showSplash ? (
          <SplashScreen onDone={() => setShowSplash(false)} />
        ) : (
          <div className="relative w-[375px] h-[812px] overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="sync">
              <motion.div
                key={screen}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0"
              >
                {renderScreen()}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </SmoothCorners>
      {screen === "orderConfirmation" && !showSplash && (
        <VariantSwitch
          value={widgetVariant}
          onChange={(next) => {
            setWidgetVariant(next);
            const url = new URL(window.location.href);
            if (next === 1) url.searchParams.delete("v");
            else url.searchParams.set("v", String(next));
            window.history.replaceState(window.history.state, "", url);
          }}
        />
      )}
      {import.meta.env.DEV && <Retune port={9225} />}
    </div>
  );
}
