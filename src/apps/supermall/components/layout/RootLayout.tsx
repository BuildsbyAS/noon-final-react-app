import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Retune } from 'retune';
import { WishlistOverlay } from './WishlistOverlay';
import { CelebrationOverlay } from '@ui';
import { BottomNav } from '@ui/BottomNav';
import type { Tab } from '@ui/BottomNav/BottomNav';
import { backState } from '@ui';
import { useCartStore } from '@state/cartStore';
import { useUIStore } from '@state/uiStore';
import { useWishlistStore } from '@state/wishlistStore';
import { useAddressSheetStore } from '@state/addressSheetStore';
import { AddressBottomSheet } from '@/apps/share-address/screens/AddressBottomSheet';

const TAB_ROUTES: Record<Tab, string> = {
  home: '/supermall',
  categories: '/supermall/categories',
  deals: '/supermall',
  profile: '/supermall/account',
  cart: '/supermall/cart',
};

// Tab order matches BottomNav's left-to-right rendering. A tap that moves
// to a tab on the left animates as a back-step; to the right, a forward-step.
const TAB_ORDER: Tab[] = ['home', 'categories', 'deals', 'profile', 'cart'];

function tabForPath(p: string): Tab | undefined {
  if (p === '/supermall' || p === '/supermall/') return 'home';
  if (p.startsWith('/supermall/categories')) return 'categories';
  if (p === '/supermall/account') return 'profile';
  if (p === '/supermall/cart') return 'cart';
  return undefined;
}

function shouldHideNav(pathname: string): boolean {
  if (pathname.startsWith('/supermall/product/')) return true;
  if (pathname.startsWith('/supermall/checkout')) return true;
  return false;
}

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = useCartStore((s) => s.itemCount());
  const sheetOpen = useUIStore((s) => s.sheetCount > 0);
  const openFullWishlist = useWishlistStore((s) => s.openFullWishlist);
  const [noonOneHidesNav, setNoonOneHidesNav] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || data.source !== 'noon-one') return;
      if (typeof data.showHostNav === 'boolean') {
        setNoonOneHidesNav(!data.showHostNav);
      }
      if (data.action === 'open-wishlist') {
        openFullWishlist();
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [openFullWishlist]);

  // Reset noon-one's nav-hide request when navigating away from /account.
  useEffect(() => {
    if (location.pathname !== '/supermall/account') setNoonOneHidesNav(false);
  }, [location.pathname]);

  const activeTab = tabForPath(location.pathname);
  const hideNav = shouldHideNav(location.pathname) || sheetOpen || noonOneHidesNav;
  const addressSheetOpen = useAddressSheetStore((s) => s.open);
  const closeAddressSheet = useAddressSheetStore((s) => s.closeSheet);

  return (
    <div className="root-layout">
      <main style={{ position: 'relative', overflow: 'hidden' }}>
        {/* mode="sync" so the outgoing page parallaxes while the incoming
            page slides in (rule 1 of docs/INTERACTION_DESIGN.md). The
            shared @ui/PageTransition reads useNavigationType() itself and
            picks the right direction on each side. */}
        <AnimatePresence mode="sync" initial={false}>
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
      <WishlistOverlay />
      <AddressBottomSheet open={addressSheetOpen} onClose={closeAddressSheet} />
      <CelebrationOverlay />
      <Retune />
      {!hideNav && (
        <BottomNav
          activeTab={activeTab}
          cartCount={cartCount}
          onTabChange={(tab) => {
            const current = tabForPath(location.pathname);
            const goingLeft =
              current !== undefined &&
              TAB_ORDER.indexOf(tab) < TAB_ORDER.indexOf(current);
            navigate(
              TAB_ROUTES[tab],
              goingLeft ? { state: backState() } : undefined,
            );
          }}
        />
      )}
    </div>
  );
}
