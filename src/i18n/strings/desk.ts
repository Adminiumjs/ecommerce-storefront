/**
 * The desk's words, in the eight languages the shop speaks. English is the
 * source; each translation carries every one of its keys, or
 * `messages/index.ts` fails to compile. Catalogue values (a product's name,
 * a colour) are the shop's own and are never here.
 */
import { deskEn } from "./desk/en.ts";
import { deskDe } from "./desk/de-DE.ts";
import { deskFr } from "./desk/fr-FR.ts";
import { deskDa } from "./desk/da-DK.ts";
import { deskCs } from "./desk/cs-CZ.ts";
import { deskAr } from "./desk/ar-EG.ts";
import { deskZhCn } from "./desk/zh-CN.ts";
import { deskZhTw } from "./desk/zh-TW.ts";

export const desk = {
  "en-US": deskEn,
  "de-DE": deskDe,
  "fr-FR": deskFr,
  "da-DK": deskDa,
  "cs-CZ": deskCs,
  "ar-EG": deskAr,
  "zh-CN": deskZhCn,
  "zh-TW": deskZhTw,
};
