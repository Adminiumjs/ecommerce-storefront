/** The desk's words in zh-TW: PLACEHOLDER until translated. */
import type { deskEn } from "./en.ts";
import { deskEn as source } from "./en.ts";

export const deskZhTw: Record<keyof typeof deskEn, string> = { ...source };
