import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n";
import { setDataSource } from "./data/source.ts";
import { clientFromEnv, loadSnapshot, snapshotSource } from "./data/adminiumSource.ts";
import "./styles/tokens.css";
import "./styles/base.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root — check index.html");

/*
 * ONE condition decides demo vs connected: whether the API base URL and key are
 * present at build time. `createPublicClient` returns null when either is
 * missing, so the fallback is structural rather than a catch, and there is no
 * second flag to drift. The marketplace demo builds set neither and behave
 * byte-identically to before this file changed.
 *
 * BOTH imports below are dynamic, and the second one is the subtle half. `App`
 * pulls `state/store.ts`, which reads the seam at MODULE SCOPE — the catalog,
 * the categories and the merchant's whole commerce policy. But so did THIS
 * file: `applyTheme(useStore.getState().theme)` ran before first paint and
 * evaluated the store during main.tsx's own imports, before any fetch could
 * resolve. The app would then have rendered the demo catalog whatever the
 * server said, and looked entirely correct doing it. The `await` has to sit
 * between the swap and every module that reads the seam, so both are imported
 * after it, and the seam's `setDataSource` throws if that is ever undone.
 */
async function boot(): Promise<void> {
  const client = clientFromEnv();
  if (client !== null) {
    const snap = await loadSnapshot(client);
    if (snap !== null) {
      setDataSource(snapshotSource(snap));
      console.info(
        `[adminium] connected: ${String(snap.products.length)} products, ` +
          `${String(snap.categories.length)} categories`,
      );
    }
  }

  const [{ App }, { applyTheme, useStore }, { demoAddOns }] = await Promise.all([
    import("./app/App.tsx"),
    import("./state/store.ts"),
    import("./add-ons/registry.ts"),
  ]);

  // Apply the persisted / OS-preferred theme before first paint.
  applyTheme(useStore.getState().theme);

  /*
   * REGISTER THE ADD-ONS BEFORE FIRST PAINT, and note what registering is not.
   *
   * It is not switching one on. The store's `enabled` set starts EMPTY and
   * stays empty until somebody presses Connect in the manage drawer, so a shop
   * that has never touched it renders exactly as it did before this seam
   * existed — three delivery bands the shop sets itself, and a promise of a
   * tracking e-mail on the order. That is 24 D6 stated as behaviour rather than
   * as an intention, and `add-ons/slotRender.test.tsx` is what holds it.
   *
   * It IS where an add-on's eight-locale strings arrive: importing
   * `registry.ts` runs `registerAddOnMessages` at module load, which throws
   * naming the add-on, the locale and the key on a bundle that is not complete.
   * That happens on this line, on every boot, before the first render reads a
   * message bundle.
   *
   * In CONNECTED MODE (Phase B) this list comes from `GET /api/v1/add-ons` and
   * the bundles are `import()`ed with their hashes. Only the source of the list
   * changes; `registerAddOns` and every surface below it stay exactly as they
   * are — the same seam rule `setDataSource` above follows.
   */
  useStore.getState().registerAddOns(demoAddOns());

  createRoot(container as HTMLElement).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
}

void boot();
