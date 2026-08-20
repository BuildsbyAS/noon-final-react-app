import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { PageTransition } from '../../components/layout/PageTransition';
import { ProductCard, CameraIcon, SearchIcon, StatusBar, triggerCelebration, stopJingle } from '@ui';
import { BdayModeToggle } from '../../components/birthday/BdayModeToggle';
import { BirthdayCountdown } from '../../components/birthday/BirthdayCountdown';
import { useBirthdayStore } from '@state/birthdayStore';
import type { Variants } from 'framer-motion';
import { CategoryCard } from '../../components/ui/CategoryCard';
import { homeCategories as categories } from '../../data/categories';
import type { Product } from '../../types/product';
import { useWishlistStore } from '@state/wishlistStore';
import { useAddressSheetStore } from '@state/addressSheetStore';
import './Home.css';

/* ─── Product / chip image assets ──────────────────────────────────────── */
const IMG_ELEC       = 'https://www.figma.com/api/mcp/asset/094c04ac-f79c-4c06-8ade-22181db0946e';
const IMG_BEAUTY     = 'https://www.figma.com/api/mcp/asset/0610acfc-1bd3-4c9c-90f2-86e19fa48666';
const IMG_PHONECASE  = 'https://www.figma.com/api/mcp/asset/a42626b0-83fb-4d93-b5e9-2b32fa20f110';
const IMG_APPLIANCES = 'https://www.figma.com/api/mcp/asset/96562933-022c-469f-9000-6852b861e163';
const IMG_HAIR       = 'https://www.figma.com/api/mcp/asset/052d52c1-41b4-40a3-b7d4-1887d45502da';
const IMG_AIRPODS    = 'https://www.figma.com/api/mcp/asset/094c04ac-f79c-4c06-8ade-22181db0946e';
const IMG_WASHER     = 'https://www.figma.com/api/mcp/asset/05966a58-1b4c-4271-b032-1e826704f394';

/* ─── Static data ──────────────────────────────────────────────────────── */

const recommendedChips = [
  { label: 'For you',     icon: '/icon-chip-foryou.svg' },
  { label: 'Electronics', icon: '/icon-chip-electronics.svg' },
  { label: 'Beauty',      icon: '/icon-chip-beauty.svg' },
  { label: 'Fashion',     icon: '/icon-chip-fashion.svg' },
  { label: 'Home',        icon: '/icon-chip-home.svg' },
] as const;
type ChipLabel = typeof recommendedChips[number]['label'];

const DIRHAM = 'د.إ';

// Each home widget runs its own per-tile stagger triggered as the section
// scrolls into view. Subtle rise + fade so it reads as content settling in
// rather than performing a transition.
const tileItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const tilesContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.04 },
  },
};

const recProducts: Record<ChipLabel, Product[]> = {
  'For you': [
    { id: 'a1', name: 'Apple Airpods Pro 2 Wireless Earbuds',    variant: '',  images: [IMG_AIRPODS],   sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128, tag: { label: 'Best Seller', variant: 'bestseller' }, isSponsored: true },
    { id: 'a2', name: 'Whirlpool 7 kg Magic Clean',              variant: '',  images: [IMG_WASHER],    sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128, isSponsored: true },
    { id: 'a3', name: 'MAYNOS Suction Phone Case Mount',         variant: '',  images: [IMG_PHONECASE], sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128 },
  ],
  Electronics: [
    { id: 'e1', name: 'Apple Airpods Pro 2 Wireless Earbuds',    variant: '',  images: [IMG_AIRPODS],   sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128, tag: { label: 'Best Seller', variant: 'bestseller' } },
    { id: 'e2', name: 'Whirlpool 7 kg Magic Clean',              variant: '',  images: [IMG_WASHER],    sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128 },
    { id: 'e3', name: 'MAYNOS Suction Phone Case Mount',         variant: '',  images: [IMG_PHONECASE], sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128 },
  ],
  Beauty: [
    { id: 'b1', name: 'Maybelline Foundation Matte & Poreless',  variant: '',  images: [IMG_BEAUTY],    sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128, tag: { label: 'Best Seller', variant: 'bestseller' } },
    { id: 'b2', name: 'L\'Oreal Hair Care Shampoo',               variant: '',  images: [IMG_HAIR],      sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128 },
    { id: 'b3', name: 'Apple Airpods Pro 2 Wireless Earbuds',    variant: '',  images: [IMG_AIRPODS],   sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128 },
  ],
  Fashion: [
    { id: 'f1', name: 'MAYNOS Suction Phone Case Mount',         variant: '',  images: [IMG_PHONECASE], sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128, tag: { label: 'Best Seller', variant: 'bestseller' } },
    { id: 'f2', name: 'Apple Airpods Pro 2 Wireless Earbuds',    variant: '',  images: [IMG_AIRPODS],   sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128 },
    { id: 'f3', name: 'Whirlpool 7 kg Magic Clean',              variant: '',  images: [IMG_WASHER],    sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128 },
  ],
  Home: [
    { id: 'h1', name: 'Whirlpool 7 kg Magic Clean',              variant: '',  images: [IMG_WASHER],    sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128, tag: { label: 'Best Seller', variant: 'bestseller' } },
    { id: 'h2', name: 'Apple Airpods Pro 2 Wireless Earbuds',    variant: '',  images: [IMG_AIRPODS],   sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128 },
    { id: 'h3', name: 'MAYNOS Suction Phone Case Mount',         variant: '',  images: [IMG_PHONECASE], sellingPrice: 899, originalPrice: 1399, currency: DIRHAM, rating: 4.3, reviewCount: 128 },
  ],
};


/* ─── Icons ────────────────────────────────────────────────────────────── */
/* ─── Service tiles — built from Figma vectors ────────────────────────── */

/* ─── Header ───────────────────────────────────────────────────────────── */
type TileSpec = {
  bg: string;
  aria: string;
  full: React.ReactNode;
  compact: React.ReactNode;
};

const SERVICE_TILES: TileSpec[] = [
  {
    bg: '#FEEE00',
    aria: 'noon',
    full: (
      <>
        <img src="/logo-noon-mark.svg" alt="" className="home-tile__watermark" />
        <img src="/logo-noon-word.svg" alt="noon" className="home-tile__center-logo" style={{ width: 50, height: 13 }} />
      </>
    ),
    compact: <img src="/logo-noon-compact.svg" alt="noon" style={{ width: 58, height: 15 }} />,
  },
  {
    bg: 'rgba(255,255,255,0.95)',
    aria: 'super mall',
    full: <img src="/logo-supermall.svg" alt="super mall" className="home-tile__center-logo" style={{ width: 54, height: 34 }} />,
    compact: <img src="/logo-supermall-compact.svg" alt="super mall" style={{ width: 63, height: 15 }} />,
  },
  {
    bg: '#FFFFFF',
    aria: 'noon FOOD',
    full: <img src="/tile-food.png" alt="noon FOOD" className="home-tile__fill" />,
    compact: <img src="/logo-food-compact.svg" alt="noon FOOD" style={{ width: 51, height: 13 }} />,
  },
  {
    bg: '#FFFFFF',
    aria: '15 MINUTES',
    full: <img src="/logo-15min.gif" alt="15 min" className="home-tile__center-logo" style={{ width: 50, height: 50 }} />,
    compact: <img src="/logo-15min-compact.gif" alt="15 min" style={{ width: 64, height: 14, objectFit: 'contain' }} />,
  },
  {
    bg: '#FFFFFF',
    aria: 'now now',
    full: <img src="/logo-nownow.svg" alt="now now" className="home-tile__center-logo" style={{ width: 33, height: 45 }} />,
    compact: <img src="/logo-nownow-compact.svg" alt="now now" style={{ width: 23, height: 31 }} />,
  },
  {
    bg: 'rgba(255,255,255,0.95)',
    aria: 'Namshi',
    full: (
      <div className="home-tile__stack">
        <img src="/logo-namshi.png" alt="" style={{ width: 41, height: 27, objectFit: 'cover' }} />
        <span className="home-tile__label">Namshi</span>
      </div>
    ),
    compact: <img src="/logo-namshi-compact.svg" alt="Namshi" style={{ width: 23, height: 31 }} />,
  },
  {
    bg: 'rgba(255,255,255,0.95)',
    aria: 'Pay',
    full: (
      <div className="home-tile__stack">
        <span className="home-tile__pay-icon" />
        <span className="home-tile__label">Pay</span>
      </div>
    ),
    compact: <span className="home-tile__pay-icon" />,
  },
];

type HomeHeaderProps = {
  progress: MotionValue<number>;
  scrolled: boolean;
  onAddressTap: () => void;
  onTileTap: (aria: string) => void;
};

function HomeHeader({ progress, scrolled, onAddressTap, onTileTap }: HomeHeaderProps) {
  const navigate = useNavigate();
  const openFullWishlist = useWishlistStore((s) => s.openFullWishlist);

  const birthdayMode = useBirthdayStore((s) => s.birthdayMode);
  const setBirthdayMode = useBirthdayStore((s) => s.setBirthdayMode);

  // Switching BDAY mode on is the celebration trigger; switching off is quiet.
  function handleBirthdayToggle(on: boolean) {
    setBirthdayMode(on);
    if (on) triggerCelebration();
    else stopJingle();
  }

  // Continuous, scroll-driven morph values. Bound directly to scroll progress
  // (no spring) so geometry tracks the user's input 1:1 — no perceived lag on
  // mouse-wheel or trackpad. The morph range is set wide enough at the page
  // level (see MORPH_END) that each wheel tick produces a fraction of the
  // morph rather than a full snap.
  const tileHeight = useTransform(progress, [0, 1], [76, 40]);
  const tileRadius = useTransform(progress, [0, 1], [20, 12]);
  const addressHeight = useTransform(progress, [0, 1], [49, 0]);
  // Per-child margin-tops are animated alongside height so the flex column's
  // spacing collapses with the morph. Compact end-state lands at 6px between
  // children; the address row collapses entirely to 0.
  const tilesMarginTop = useTransform(progress, [0, 1], [12, 6]);
  const addressMarginTop = useTransform(progress, [0, 1], [12, 0]);
  const searchMarginTop = useTransform(progress, [0, 1], [12, 6]);
  const addressOpacity = useTransform(progress, [0, 0.55], [1, 0]);
  const fullOpacity = useTransform(progress, [0, 0.45], [1, 0]);
  const fullScale = useTransform(progress, [0, 0.45], [1, 0.92]);
  const compactOpacity = useTransform(progress, [0.55, 1], [0, 1]);
  const compactScale = useTransform(progress, [0.55, 1], [0.92, 1]);

  // The birthday band grows the header and fades away with the scroll morph,
  // the same way the address row does.
  const bdayHeight = useTransform(progress, [0, 1], [BDAY_BAND_HEIGHT, 0]);
  const bdayOpacity = useTransform(progress, [0, 0.55], [1, 0]);

  return (
    <section
      className={`home-header${scrolled ? ' is-scrolled' : ''}${birthdayMode ? ' is-birthday' : ''}`}
      aria-label="noon home"
    >
      <StatusBar tone="dark" />

      <motion.div className="home-header__tiles" style={{ marginTop: tilesMarginTop }}>
        {SERVICE_TILES.map((t) => (
          <motion.button
            key={t.aria}
            type="button"
            className="home-tile"
            style={{ background: t.bg, height: tileHeight, borderRadius: tileRadius }}
            aria-label={t.aria}
            onClick={() => onTileTap(t.aria)}
          >
            <motion.span
              className="home-tile__inner-fill"
              style={{ opacity: fullOpacity, scale: fullScale }}
              aria-hidden={scrolled}
            >
              {t.full}
            </motion.span>
            <motion.span
              className="home-tile__inner-fill"
              style={{ opacity: compactOpacity, scale: compactScale }}
              aria-hidden={!scrolled}
            >
              {t.compact}
            </motion.span>
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        className="home-header__address"
        style={{
          height: addressHeight,
          marginTop: addressMarginTop,
          opacity: addressOpacity,
          overflow: 'hidden',
        }}
      >
        <div
          className="home-header__address-info"
          role="button"
          tabIndex={0}
          onClick={onAddressTap}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAddressTap(); } }}
        >
          <div className="home-header__address-row1">
            <img src="/icon-home.svg" alt="" className="home-header__home-icon" />
            <span className="home-header__address-label">Home -&nbsp;</span>
          </div>
          <div className="home-header__address-row2">
            <span className="home-header__address-line">BDA Complex, 100 Feet Rd 3rd Block, Kora...</span>
            <img src="/icon-chevron-down.svg" alt="" className="home-header__chevron" />
          </div>
        </div>
        <button
          type="button"
          className="home-header__heart"
          aria-label="Wishlist"
          onClick={openFullWishlist}
        >
          <img src="/icon-heart-blue.svg" alt="" width={36} height={36} />
        </button>
      </motion.div>

      <motion.div
        className="home-header__search"
        role="button"
        tabIndex={0}
        style={{ marginTop: searchMarginTop }}
        onClick={() => navigate('/supermall/search')}
        onKeyDown={(e) => { if (e.key === 'Enter') navigate('/supermall/search'); }}
      >
        <SearchIcon size={20} color="var(--color-text-tertiary)" />
        <span className="home-header__search-text">Search for &ldquo;Maybelline 1014&rdquo;</span>
        <span className="home-header__search-divider" aria-hidden="true" />
        <button
          type="button"
          className="home-header__search-cam"
          aria-label="Visual search"
          onClick={(e) => { e.stopPropagation(); navigate('/supermall/search'); }}
        >
          <CameraIcon size={20} color="var(--color-text-tertiary)" />
        </button>
      </motion.div>

      {/* The birthday lead-up shows all month; BDAY mode only changes the skin. */}
      <motion.div
        className="home-header__bday"
        style={{ height: bdayHeight, opacity: bdayOpacity, marginTop: 12 }}
      >
        <div className="home-header__bday-left">
          <p className="home-header__bday-title">Your birthday is in</p>
          <BirthdayCountdown />
        </div>
        <img src="/birthday-gifts.png" alt="" className="home-header__bday-art" />
        <div className="home-header__bday-toggle">
          <BdayModeToggle on={birthdayMode} onChange={handleBirthdayToggle} />
        </div>
      </motion.div>
    </section>
  );
}

/** Height of the birthday band (headline + countdown) when expanded. */
const BDAY_BAND_HEIGHT = 102;

/* ─── Shop by category — 2-row horizontal scroll grid ──────────────── */
function ShopByCategory({
  scrollRoot,
  className = '',
}: {
  scrollRoot: React.RefObject<HTMLElement | null>;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <section className={`home-section ${className}`.trim()} aria-label="Shop by category">
      <h2 className="home-section__title">Shop by category</h2>
      <div className="home-cat__scroll">
        <motion.div
          className="home-cat__grid"
          variants={tilesContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, root: scrollRoot, margin: '0px 0px -10% 0px' }}
        >
          {categories.map((c, i) => (
            <motion.div key={`${c.label}-${i}`} variants={tileItem}>
              <CategoryCard
                image={c.image}
                label={c.label}
                onClick={() => navigate('/supermall/shop')}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Recommended for you — uses existing ProductCard component ────────── */
function RecommendedForYou({ scrollRoot }: { scrollRoot: React.RefObject<HTMLElement | null> }) {
  const [active, setActive] = useState<ChipLabel>('For you');
  const products = recProducts[active];

  return (
    <section className="home-section" aria-label="Recommended for you">
      <h2 className="home-section__title">Recommended for you</h2>

      <div className="home-rec__chips" role="tablist">
        {recommendedChips.map((c) => {
          const isActive = c.label === active;
          return (
            <button
              key={c.label}
              role="tab"
              aria-selected={isActive}
              className={`home-rec__chip${isActive ? ' home-rec__chip--active' : ''}`}
              onClick={() => setActive(c.label)}
            >
              <img src={c.icon} alt="" className="home-rec__chip-icon" />
              <span className="home-rec__chip-label">{c.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          className="home-rec__rail"
          variants={tilesContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, root: scrollRoot, margin: '0px 0px -10% 0px' }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
        >
          {products.map((p) => (
            <motion.div className="home-rec__card-wrap" key={p.id} variants={tileItem}>
              <ProductCard product={p} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/* ─── Offers for you — SVG carousel ────────────────────────────────────── */
const offerCards = ['/offer-1.svg', '/offer-2.svg', '/offer-3.svg'];

function OffersForYou({ scrollRoot }: { scrollRoot: React.RefObject<HTMLElement | null> }) {
  return (
    <section className="home-section" aria-label="Offers for you">
      <h2 className="home-section__title">Offers for you</h2>
      <motion.div
        className="home-offers__rail"
        variants={tilesContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, root: scrollRoot, margin: '0px 0px -10% 0px' }}
      >
        {offerCards.map((src, i) => (
          <motion.img
            key={i}
            src={src}
            alt=""
            className="home-offers__card-img"
            draggable={false}
            variants={tileItem}
          />
        ))}
      </motion.div>
    </section>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
// The header's morph runs over the scroll distance between scrollTop=0 (header
// fully expanded) and scrollTop=offsetTop(first content section) (header fully
// compact + first section snapped to top). Because the second value depends on
// the rendered header height, we measure it on mount instead of hard-coding.
const MORPH_START = 8;
const MORPH_END_FALLBACK = 240;

export default function HomePage() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstSectionRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const openAddressSheet = useAddressSheetStore((s) => s.openSheet);
  const [morphEnd, setMorphEnd] = useState(MORPH_END_FALLBACK);

  const { scrollY } = useScroll({ container: scrollRef });
  const progress = useTransform(
    scrollY,
    [MORPH_START, morphEnd],
    [0, 1],
    { clamp: true },
  );

  useLayoutEffect(() => {
    const section = firstSectionRef.current;
    const container = scrollRef.current;
    if (!section || !container) return;
    // Reset scroll to top on every mount. Without this, returning to Home
    // from another bottom-nav tab preserves the DOM scrollTop while
    // useScroll's MotionValue initialises at 0, so the morph progress and
    // the actual scroll position end up out of sync — the header renders
    // at progress 0 (full size + sticky) while the page is already scrolled
    // past it, producing a half-morphed double-paint.
    container.scrollTop = 0;
    const measure = () => {
      // Distance from container top → section top, in scroll coordinates.
      // This is the scrollTop value at which the section will snap to the
      // top of the viewport, and where we want the morph to complete.
      const distance =
        section.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      setMorphEnd(Math.max(distance, 120));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // `scrolled` is only used for ARIA + an optional CSS class. The morph
    // itself is driven entirely by `progress`.
    const unsub = progress.on('change', (v) => {
      setScrolled((prev) => (v > 0.5 ? true : prev && v > 0.4 ? true : false));
    });
    return unsub;
  }, [progress]);

  const handleTileTap = (aria: string) => {
    if (aria === 'super mall') {
      // Navigate immediately. The destination owns its own loading skeleton
      // per docs/INTERACTION_DESIGN.md §2 ("one skeleton per screen load").
      navigate('/supermall/mall');
    }
  };

  return (
    <PageTransition>
      <div className="home-page" ref={scrollRef}>
        <HomeHeader
          progress={progress}
          scrolled={scrolled}
          onAddressTap={openAddressSheet}
          onTileTap={handleTileTap}
        />
        <div ref={firstSectionRef}>
          <ShopByCategory scrollRoot={scrollRef} className="home-section--snap-start" />
        </div>
        <RecommendedForYou scrollRoot={scrollRef} />
        <OffersForYou scrollRoot={scrollRef} />
        <div className="home-page__spacer" />
      </div>
    </PageTransition>
  );
}
