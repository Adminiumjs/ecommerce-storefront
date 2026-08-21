// App shell: the state-based view switch (no router), the sticky header, the
// footer, and the global overlays (toast, mobile menu, cart drawer, modals).

import { useEffect } from "react";
import { useStore } from "../state/store.ts";
import { useI18n } from "../i18n";
import { setAmbient } from "../i18n/ambient";
import { CartDrawer } from "../components/CartDrawer.tsx";
import { Footer } from "../components/Footer.tsx";
import { Header } from "../components/Header.tsx";
import { MobileMenu } from "../components/MobileMenu.tsx";
import { ReviewModal } from "../components/ReviewModal.tsx";
import { SizeGuideModal } from "../components/SizeGuideModal.tsx";
import { Toast } from "../components/Toast.tsx";
import { Account } from "../screens/Account.tsx";
import { Cart } from "../screens/Cart.tsx";
import { Checkout } from "../screens/Checkout.tsx";
import { Confirm } from "../screens/Confirm.tsx";
import { Home } from "../screens/Home.tsx";
import { Listing } from "../screens/Listing.tsx";
import { NotFound } from "../screens/NotFound.tsx";
import { Product } from "../screens/Product.tsx";

function Screen() {
  const view = useStore((s) => s.view);
  switch (view) {
    case "home":
      return <Home />;
    case "listing":
      return <Listing />;
    case "product":
      return <Product />;
    case "cart":
      return <Cart />;
    case "checkout":
      return <Checkout />;
    case "confirm":
      return <Confirm />;
    case "account":
      return <Account />;
    default:
      return <NotFound />;
  }
}

export function App() {
  /*
   * Publish the live locale to the module-level bridge before anything below
   * renders. The store's toasts and the `lib/` layer's price / rating / stock
   * labels run outside React and cannot hold a hook; this is the one place that
   * knows both sides. Assigning during render (rather than in an effect)
   * matters: children render after this line, so the first paint after a locale
   * switch is already in the new locale instead of one frame behind.
   */
  const { locale, t, money, number, relative } = useI18n();
  setAmbient(locale, t, money, number, relative);

  const view = useStore((s) => s.view);
  const closeDrawer = useStore((s) => s.closeDrawer);
  const closeMenu = useStore((s) => s.closeMenu);
  const closeReview = useStore((s) => s.closeReview);
  const closeSizeGuide = useStore((s) => s.closeSizeGuide);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer();
        closeMenu();
        closeReview();
        closeSizeGuide();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeDrawer, closeMenu, closeReview, closeSizeGuide]);

  return (
    <>
      <Toast />
      <ReviewModal />
      <SizeGuideModal />
      <MobileMenu />
      <CartDrawer />
      <Header />
      <Screen />
      {view !== "checkout" && <Footer />}
    </>
  );
}
