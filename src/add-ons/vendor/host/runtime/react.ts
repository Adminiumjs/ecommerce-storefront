/**
 * The `react` shim an add-on's build aliases to (see `./index.ts`).
 *
 * Every export is read from the host's runtime at module initialisation, so a
 * built bundle carries these few lines instead of a bare `import … from "react"`
 * — which is what makes it loadable by a browser from a URL, while still using
 * exactly one React.
 *
 * ─── Why the surface is React's, not the add-on's ──────────────────────────
 *
 * The first version exported only the nine values the six add-ons import by
 * hand, and the build failed on `forwardRef` — because `lucide-react`, now
 * BUNDLED rather than external, imports React too. A shim narrowed to today's
 * source is a shim that breaks the next time a dependency reaches for something
 * ordinary, so this exports React's public surface and lets tree-shaking drop
 * what nobody used.
 *
 * TYPE EXPORTS ARE NOT RE-EXPORTED, and do not need to be: `CSSProperties`,
 * `ReactNode`, `ComponentType` and `Dispatch` are imported as TYPES, so
 * TypeScript erases them and nothing reaches the bundle. The alias is
 * build-only; `tsc` still resolves those against the real `react` types.
 */

import { requireAddOnRuntime } from './index.ts';

const react = requireAddOnRuntime().react as Record<string, unknown>;

export const createElement = react['createElement'] as never;
export const cloneElement = react['cloneElement'] as never;
export const isValidElement = react['isValidElement'] as never;
export const createContext = react['createContext'] as never;
export const forwardRef = react['forwardRef'] as never;
export const memo = react['memo'] as never;
export const lazy = react['lazy'] as never;
export const Fragment = react['Fragment'] as never;
export const StrictMode = react['StrictMode'] as never;
export const Suspense = react['Suspense'] as never;
export const Children = react['Children'] as never;
export const Component = react['Component'] as never;
export const PureComponent = react['PureComponent'] as never;
export const startTransition = react['startTransition'] as never;
export const useState = react['useState'] as never;
export const useEffect = react['useEffect'] as never;
export const useLayoutEffect = react['useLayoutEffect'] as never;
export const useMemo = react['useMemo'] as never;
export const useCallback = react['useCallback'] as never;
export const useRef = react['useRef'] as never;
export const useReducer = react['useReducer'] as never;
export const useContext = react['useContext'] as never;
export const useSyncExternalStore = react['useSyncExternalStore'] as never;
export const useId = react['useId'] as never;
export const useTransition = react['useTransition'] as never;
export const useDeferredValue = react['useDeferredValue'] as never;
export const useImperativeHandle = react['useImperativeHandle'] as never;
export const useDebugValue = react['useDebugValue'] as never;
export const version = react['version'] as never;

/**
 * A default export too: the classic JSX transform emits `React.createElement`,
 * and an add-on that ever switched would otherwise fail on a missing default
 * rather than on anything meaningful.
 */
export default react;
