/** The desk's words in zh-CN: PLACEHOLDER until translated. */
import type { deskEn } from "./en.ts";
import { deskEn as source } from "./en.ts";

export const deskZhCn: Record<keyof typeof deskEn, string> = { ...source };
