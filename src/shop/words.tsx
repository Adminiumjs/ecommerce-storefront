/**
 * Words the shop's screens share: a sentence with a figure set in mono inside
 * it, and the figure itself.
 */
import { Fragment, type ReactNode } from "react";

import type { MessageKey, TFunction } from "../i18n/index.tsx";

/**
 * A sentence with parts that are not plain words: the template is the
 * message itself, and each `{name}` in it is replaced by the node given, so
 * a translation may put the figure anywhere in its own sentence.
 */
export function rich(t: TFunction, key: MessageKey, nodes: Record<string, ReactNode>, count?: number): ReactNode {
  const template = t(key, Object.fromEntries(Object.keys(nodes).map((k) => [k, `{${k}}`])), count);
  const parts = template.split(/(\{\w+\})/g);
  return parts.map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{name !== undefined && name in nodes ? nodes[name] : part}</Fragment>;
  });
}

/** A figure inside a sentence or a button: JetBrains Mono, kept left to right inside Arabic. */
export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`nl-mono ${className}`}>{children}</span>;
}
