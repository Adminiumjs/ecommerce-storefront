/**
 * Mount the whole desk (sidebar, top bar, screen, sheets, toasts) on a
 * stand-in door in jsdom, in one state, for a render test or axe.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { I18nProvider } from "../../i18n/index.tsx";
import { DeskApp } from "../DeskApp.tsx";
import { DeskProvider } from "../env.tsx";
import { useDesk, type DeskState } from "../store.ts";
import type { FakeDoor } from "./fakeDoor.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const INITIAL = useDesk.getState();
let root: Root | null = null;
let host: HTMLElement | null = null;

export async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

export async function mount(door: FakeDoor, more: Partial<DeskState> = {}, locale = "en-US"): Promise<HTMLElement> {
  try {
    localStorage.setItem("northline-locale", locale);
  } catch {
    // jsdom always has it
  }
  useDesk.setState({ ...INITIAL, data: await door.load(), ...more }, true);
  host = document.createElement("div");
  document.body.append(host);
  await act(async () => {
    root = createRoot(host!);
    root.render(
      <I18nProvider>
        <DeskProvider env={{ door }}>
          <DeskApp />
        </DeskProvider>
      </I18nProvider>,
    );
  });
  await settle();
  return host;
}

export async function unmount(): Promise<void> {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  useDesk.setState({ ...INITIAL }, true);
}

export const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
export const $$ = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];
export const main = () => $("main")!.textContent ?? "";
export const all = () => document.body.textContent ?? "";

/** The button whose words are `label` (exactly, trimmed), or undefined. */
export const button = (label: string): HTMLButtonElement | undefined => $$("button").find((b) => (b.textContent ?? "").trim() === label || b.getAttribute("aria-label") === label) as HTMLButtonElement | undefined;

export async function press(label: string): Promise<void> {
  const b = button(label);
  if (b === undefined) throw new Error(`no button "${label}" among: ${$$("button").map((x) => (x.textContent ?? "").trim() || x.getAttribute("aria-label")).join(" | ")}`);
  await act(async () => b.click());
  await settle();
}

/** Press a button inside the open sheet. */
export async function confirm(label: string): Promise<void> {
  const sheet = document.querySelector<HTMLElement>("[role=dialog], [role=alertdialog]");
  const b = [...(sheet?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((x) => (x.textContent ?? "").trim() === label);
  if (b === undefined) throw new Error(`no button "${label}" in the sheet`);
  await act(async () => b.click());
  await settle();
}

export async function clickEl(el: HTMLElement): Promise<void> {
  await act(async () => el.click());
  await settle();
}

/** Type into a field as a person does (React reads the native setter). */
export async function type(el: HTMLElement, value: string): Promise<void> {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
  await settle();
}

export async function key(el: HTMLElement, name: string): Promise<void> {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
  });
  await settle();
}
