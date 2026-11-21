/** The desk's words in ar-EG: PLACEHOLDER until translated. */
import type { deskEn } from "./en.ts";
import { deskEn as source } from "./en.ts";

export const deskAr: Record<keyof typeof deskEn, string> = { ...source };
