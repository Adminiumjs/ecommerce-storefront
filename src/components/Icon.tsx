// A thin wrapper over lucide-react so the comp's string icon names (e.g. the
// dynamic `product.icon`) map to tree-shaken components. Only the icons listed
// here are bundled.

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Bell,
  Cable,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coffee,
  CreditCard,
  CupSoda,
  Eye,
  Flame,
  Footprints,
  Heart,
  Home,
  Info,
  Keyboard,
  Lamp,
  LaptopMinimal,
  Layers,
  LayoutGrid,
  Lock,
  Mail,
  MapPin,
  Menu,
  Minus,
  Moon,
  Mouse,
  Package,
  PackagePlus,
  PackageSearch,
  PencilLine,
  PlugZap,
  Plus,
  RefreshCcw,
  RotateCcw,
  Ruler,
  Search,
  SearchX,
  Send,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Store,
  Sun,
  Tag,
  TentTree,
  Trash2,
  Truck,
  UserRound,
  Wallet,
  X,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { useI18n } from "../i18n";

const MAP: Record<string, LucideIcon> = {
  "alert-circle": AlertCircle,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up-down": ArrowUpDown,
  "arrow-up-right": ArrowUpRight,
  "badge-check": BadgeCheck,
  ban: Ban,
  bell: Bell,
  cable: Cable,
  check: Check,
  "check-circle-2": CheckCircle2,
  "chevron-down": ChevronDown,
  clock: Clock,
  coffee: Coffee,
  "credit-card": CreditCard,
  "cup-soda": CupSoda,
  eye: Eye,
  flame: Flame,
  footprints: Footprints,
  heart: Heart,
  home: Home,
  info: Info,
  keyboard: Keyboard,
  lamp: Lamp,
  "laptop-minimal": LaptopMinimal,
  layers: Layers,
  "layout-grid": LayoutGrid,
  lock: Lock,
  mail: Mail,
  "map-pin": MapPin,
  menu: Menu,
  minus: Minus,
  moon: Moon,
  mouse: Mouse,
  package: Package,
  "package-plus": PackagePlus,
  "package-search": PackageSearch,
  "pencil-line": PencilLine,
  "plug-zap": PlugZap,
  plus: Plus,
  "refresh-ccw": RefreshCcw,
  "rotate-ccw": RotateCcw,
  ruler: Ruler,
  search: Search,
  "search-x": SearchX,
  send: Send,
  "shield-check": ShieldCheck,
  shirt: Shirt,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  "sliders-horizontal": SlidersHorizontal,
  sparkles: Sparkles,
  square: Square,
  star: Star,
  store: Store,
  sun: Sun,
  tag: Tag,
  "tent-tree": TentTree,
  "trash-2": Trash2,
  truck: Truck,
  "user-round": UserRound,
  wallet: Wallet,
  x: X,
  "x-circle": XCircle,
  zap: Zap,
};

/**
 * Navigational arrows are the one class of glyph that means the opposite thing
 * in the opposite direction: "back" points left in English and right in Arabic.
 * Nothing else in this set is directional — a bag, a lock, a star read the same
 * either way — so the swap is a two-entry table rather than a blanket mirror,
 * and it lives here so every caller inherits it without knowing about `dir`.
 */
const MIRROR: Record<string, string> = {
  "arrow-left": "arrow-right",
  "arrow-right": "arrow-left",
};

export interface IconProps {
  name: string;
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 16, color, className, style }: IconProps) {
  const { dir } = useI18n();
  const resolved = dir === "rtl" ? (MIRROR[name] ?? name) : name;
  const Cmp = MAP[resolved] || Square;
  return (
    <Cmp
      size={size}
      color={color}
      strokeWidth={2}
      className={className}
      style={style}
    />
  );
}
