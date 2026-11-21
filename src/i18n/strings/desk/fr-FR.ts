/** The desk's words in fr-FR: PLACEHOLDER until translated. */
import type { deskEn } from "./en.ts";
import { deskEn as source } from "./en.ts";

export const deskFr: Record<keyof typeof deskEn, string> = { ...source };
