/**
 * A stand-in for the after-order door, for the screens' tests. Tests only.
 */
import type { AfterPort } from "./after-port.ts";

export type FakeAfter = AfterPort;

export function fakeAfter(): FakeAfter {
  return {};
}
