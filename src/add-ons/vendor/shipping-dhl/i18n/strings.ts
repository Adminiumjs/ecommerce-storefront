/*
 * VENDORED from add-ons/packages/shipping-dhl/src/i18n/strings.ts — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The add-on key is `shipping-dhl`; its manifest, tests and README live in the monorepo.
 */
/**
 * The words only DHL Shipping owns, in all eight locales: what the host's own
 * chrome and manifest show about this add-on. The screens' copy lives in the shared kit
 * (`packages/shipping-kit/src/i18n/strings.ts`), with the name as `{carrier}`.
 */

export const strings = {
  "en-US": {
    "addon.shipping-dhl.setting.apiKey": "API key",
    "addon.shipping-dhl.setting.accountNumber": "Account number",
    "addon.shipping-dhl.setting.demo": "Use the demo carrier instead",
    "addon.shipping-dhl.setting.cutoff": "Collection cut-off",
    "addon.shipping-dhl.setting.returnsName": "Returns address — name on the label",
    "addon.shipping-dhl.setting.returnsLines": "Returns address — street",
    "addon.shipping-dhl.setting.returnsCity": "Returns address — town or city",
    "addon.shipping-dhl.setting.returnsPostcode": "Returns address — postcode",
    "addon.shipping-dhl.setting.returnsCountry": "Returns address — country",
    "addon.shipping-dhl.what": "This lets the shop book a parcel collection from an order that is ready, get rates back and print a label, instead of typing tracking numbers into an email.",
    "addon.shipping-dhl.set.demo": "Use the demo carrier",
    "addon.shipping-dhl.set.demoOn": "Rates, labels and tracking come back from a seeded stand-in. Nothing reaches a real carrier.",
    "addon.shipping-dhl.set.demoOff": "Rates, labels and tracking come from the carrier with the account you connected. With no account connected, nothing is quoted or booked.",
    "addon.shipping-dhl.disconnect.goes": "The order loses “Book a collection”, checkout loses the carrier's rates, and a customer's order page goes back to collection from the shop. The account details are deleted.",
    "addon.shipping-dhl.disconnect.stays": "Collections already booked keep their labels and tracking numbers.",
    "addon.shipping-dhl.act.1": "{when} · collection booked · {ref}",
    "addon.shipping-dhl.act.2": "{when} · rates fetched · {ref}",
    "addon.shipping-dhl.act.3": "{when} · label downloaded · {ref}",

    "addon.shipping-dhl.line": "A demo carrier: practise booking a collection, with a sample label and tracking reference. It books no real parcel.",
    "addon.shipping-dhl.notAffiliated": "Adminium is not affiliated with this company.",

    "addon.shipping-dhl.perm.rates": "Fetch rates for a parcel you are sending",
    "addon.shipping-dhl.perm.shipments": "Create shipments for orders you dispatch",
    "addon.shipping-dhl.perm.labels": "Download the labels for those shipments",

    /*
     * ── settings ─────────────────────────────────────────────────────────
     * These four are rendered by the HOST, not by anything in this repo: the
     * connect dialog and the manage panel are host surfaces, and they look a
     * setting's label up as `setting.<name>` and the line under it as
     * `setting.<name>Hint`. The two credential labels are also named directly
     * by `manifest.json`. The hints are not decoration — a switch that changes
     * whether a real carrier is called has to explain itself in the dialog
     * where the shop agrees to it.
     */







  },

  "de-DE": {
    "addon.shipping-dhl.setting.apiKey": "API-Schlüssel",
    "addon.shipping-dhl.setting.accountNumber": "Kundennummer",
    "addon.shipping-dhl.setting.demo": "Stattdessen den Demo-Versender nutzen",
    "addon.shipping-dhl.setting.cutoff": "Annahmeschluss für die Abholung",
    "addon.shipping-dhl.setting.returnsName": "Rücksendeadresse — Name auf dem Etikett",
    "addon.shipping-dhl.setting.returnsLines": "Rücksendeadresse — Straße",
    "addon.shipping-dhl.setting.returnsCity": "Rücksendeadresse — Ort",
    "addon.shipping-dhl.setting.returnsPostcode": "Rücksendeadresse — Postleitzahl",
    "addon.shipping-dhl.setting.returnsCountry": "Rücksendeadresse — Land",
    "addon.shipping-dhl.what": "Damit bucht der Betrieb eine Paketabholung direkt aus einem versandfertigen Auftrag, bekommt Preise zurück und druckt ein Label, statt Sendungsnummern in eine E-Mail zu tippen.",
    "addon.shipping-dhl.set.demo": "Den Demo-Versanddienst nutzen",
    "addon.shipping-dhl.set.demoOn": "Preise, Etiketten und Sendungsverfolgung kommen aus einem hinterlegten Ersatz. Nichts erreicht einen echten Versanddienst.",
    "addon.shipping-dhl.set.demoOff": "Preise, Etiketten und Sendungsverfolgung kommen vom Versender über das verbundene Konto. Ohne verbundenes Konto wird nichts angefragt oder gebucht.",
    "addon.shipping-dhl.disconnect.goes": "Der Auftrag verliert „Abholung buchen“, die Kasse verliert die Preise des Dienstleisters, und die Bestellseite der Kundschaft zeigt wieder Abholung im Betrieb. Die Kontodaten werden gelöscht.",
    "addon.shipping-dhl.disconnect.stays": "Bereits gebuchte Abholungen behalten Etikett und Sendungsnummer.",
    "addon.shipping-dhl.act.1": "{when} · Abholung gebucht · {ref}",
    "addon.shipping-dhl.act.2": "{when} · Preise abgerufen · {ref}",
    "addon.shipping-dhl.act.3": "{when} · Etikett geladen · {ref}",

    "addon.shipping-dhl.line": "Ein Demo-Versanddienstleister: Üben Sie das Buchen einer Abholung mit Musteretikett und Mustersendungsnummer. Es wird kein echtes Paket gebucht.",
    "addon.shipping-dhl.notAffiliated": "Adminium steht in keiner Verbindung zu diesem Unternehmen.",

    "addon.shipping-dhl.perm.rates": "Preise für ein Paket abrufen, das Sie versenden",
    "addon.shipping-dhl.perm.shipments": "Sendungen zu Aufträgen anlegen, die Sie versenden",
    "addon.shipping-dhl.perm.labels": "Die Etiketten zu diesen Sendungen herunterladen",








  },

  "fr-FR": {
    "addon.shipping-dhl.setting.apiKey": "Clé API",
    "addon.shipping-dhl.setting.accountNumber": "Numéro de compte",
    "addon.shipping-dhl.setting.demo": "Utiliser plutôt le transporteur de démonstration",
    "addon.shipping-dhl.setting.cutoff": "Heure limite d'enlèvement",
    "addon.shipping-dhl.setting.returnsName": "Adresse de retour — nom sur l'étiquette",
    "addon.shipping-dhl.setting.returnsLines": "Adresse de retour — rue",
    "addon.shipping-dhl.setting.returnsCity": "Adresse de retour — ville",
    "addon.shipping-dhl.setting.returnsPostcode": "Adresse de retour — code postal",
    "addon.shipping-dhl.setting.returnsCountry": "Adresse de retour — pays",
    "addon.shipping-dhl.what": "L'atelier réserve un enlèvement de colis depuis une commande prête, récupère les tarifs et imprime une étiquette, au lieu de recopier des numéros de suivi dans un e-mail.",
    "addon.shipping-dhl.set.demo": "Utiliser le transporteur de démonstration",
    "addon.shipping-dhl.set.demoOn": "Tarifs, étiquettes et suivi viennent d'un substitut pré-rempli. Rien n'atteint un vrai transporteur.",
    "addon.shipping-dhl.set.demoOff": "Les tarifs, étiquettes et suivis viennent du transporteur avec le compte connecté. Sans compte connecté, rien n'est demandé ni réservé.",
    "addon.shipping-dhl.disconnect.goes": "La commande perd « Réserver un enlèvement », la caisse perd les tarifs du transporteur, et la page de commande du client revient au retrait à l'atelier. Les identifiants sont supprimés.",
    "addon.shipping-dhl.disconnect.stays": "Les enlèvements déjà réservés gardent leur étiquette et leur numéro de suivi.",
    "addon.shipping-dhl.act.1": "{when} · enlèvement réservé · {ref}",
    "addon.shipping-dhl.act.2": "{when} · tarifs demandés · {ref}",
    "addon.shipping-dhl.act.3": "{when} · étiquette téléchargée · {ref}",

    "addon.shipping-dhl.line": "Transporteur de démonstration pour vous entraîner à réserver un enlèvement, avec une étiquette et une référence de suivi d'exemple. Aucun vrai colis n'est réservé.",
    "addon.shipping-dhl.notAffiliated": "Adminium n'est affilié à aucune de ces sociétés.",

    "addon.shipping-dhl.perm.rates": "Obtenir les tarifs d'un colis que vous envoyez",
    "addon.shipping-dhl.perm.shipments": "Créer des envois pour les commandes que vous expédiez",
    "addon.shipping-dhl.perm.labels": "Télécharger les étiquettes de ces envois",








  },

  "cs-CZ": {
    "addon.shipping-dhl.setting.apiKey": "Klíč API",
    "addon.shipping-dhl.setting.accountNumber": "Číslo účtu",
    "addon.shipping-dhl.setting.demo": "Použít místo toho demo dopravce",
    "addon.shipping-dhl.setting.cutoff": "Uzávěrka svozu",
    "addon.shipping-dhl.setting.returnsName": "Adresa vratek — jméno na štítku",
    "addon.shipping-dhl.setting.returnsLines": "Adresa vratek — ulice",
    "addon.shipping-dhl.setting.returnsCity": "Adresa vratek — město",
    "addon.shipping-dhl.setting.returnsPostcode": "Adresa vratek — PSČ",
    "addon.shipping-dhl.setting.returnsCountry": "Adresa vratek — země",
    "addon.shipping-dhl.what": "Dílna si tím objedná svoz balíku přímo z připravené objednávky, dostane zpět ceny a vytiskne štítek, místo přepisování čísel zásilek do e-mailu.",
    "addon.shipping-dhl.set.demo": "Použít ukázkového dopravce",
    "addon.shipping-dhl.set.demoOn": "Ceny, štítky i sledování se vracejí z připravené náhrady. K opravdovému dopravci se nedostane nic.",
    "addon.shipping-dhl.set.demoOff": "Ceny, štítky a sledování přicházejí od dopravce přes připojený účet. Bez připojeného účtu se nic nepoptává ani neobjednává.",
    "addon.shipping-dhl.disconnect.goes": "Objednávka přijde o „Objednat svoz“, pokladna o ceny dopravce a stránka objednávky zákazníka se vrátí k vyzvednutí v dílně. Údaje účtu se smažou.",
    "addon.shipping-dhl.disconnect.stays": "Už objednané svozy si nechají štítek i číslo zásilky.",
    "addon.shipping-dhl.act.1": "{when} · svoz objednán · {ref}",
    "addon.shipping-dhl.act.2": "{when} · ceny načteny · {ref}",
    "addon.shipping-dhl.act.3": "{when} · štítek stažen · {ref}",

    "addon.shipping-dhl.line": "Ukázkový dopravce: vyzkoušejte si objednání svozu s ukázkovým štítkem a sledovacím číslem. Žádný skutečný balík se neobjedná.",
    "addon.shipping-dhl.notAffiliated": "Adminium není nijak spojeno s touto společností.",

    "addon.shipping-dhl.perm.rates": "Zjistit sazby u zásilky, kterou posíláte",
    "addon.shipping-dhl.perm.shipments": "Zakládat zásilky k zakázkám, které expedujete",
    "addon.shipping-dhl.perm.labels": "Stahovat štítky k těmto zásilkám",








  },

  "da-DK": {
    "addon.shipping-dhl.setting.apiKey": "API-nøgle",
    "addon.shipping-dhl.setting.accountNumber": "Kundenummer",
    "addon.shipping-dhl.setting.demo": "Brug demo-fragtfirmaet i stedet",
    "addon.shipping-dhl.setting.cutoff": "Sidste frist for afhentning",
    "addon.shipping-dhl.setting.returnsName": "Returadresse — navn på etiketten",
    "addon.shipping-dhl.setting.returnsLines": "Returadresse — gade",
    "addon.shipping-dhl.setting.returnsCity": "Returadresse — by",
    "addon.shipping-dhl.setting.returnsPostcode": "Returadresse — postnummer",
    "addon.shipping-dhl.setting.returnsCountry": "Returadresse — land",
    "addon.shipping-dhl.what": "Med den kan værkstedet bestille afhentning af en pakke direkte fra en ordre, der er klar, få priser retur og printe en label i stedet for at taste sporingsnumre ind i en mail.",
    "addon.shipping-dhl.set.demo": "Brug demo-fragtfirmaet",
    "addon.shipping-dhl.set.demoOn": "Priser, labels og sporing kommer fra en indlagt stedfortræder. Intet når et rigtigt fragtfirma.",
    "addon.shipping-dhl.set.demoOff": "Priser, etiketter og sporing kommer fra fragtfirmaet med den tilsluttede konto. Uden en tilsluttet konto bliver intet forespurgt eller booket.",
    "addon.shipping-dhl.disconnect.goes": "Ordren mister “Bestil afhentning”, kassen mister transportørens priser, og kundens ordreside går tilbage til afhentning på værkstedet. Kontooplysningerne slettes.",
    "addon.shipping-dhl.disconnect.stays": "Allerede bestilte afhentninger beholder label og sporingsnummer.",
    "addon.shipping-dhl.act.1": "{when} · afhentning bestilt · {ref}",
    "addon.shipping-dhl.act.2": "{when} · priser hentet · {ref}",
    "addon.shipping-dhl.act.3": "{when} · label hentet · {ref}",

    "addon.shipping-dhl.line": "Et demo-fragtfirma: øv dig i at booke en afhentning med en prøveetiket og et prøvesporingsnummer. Der bookes ingen rigtig pakke.",
    "addon.shipping-dhl.notAffiliated": "Adminium er ikke tilknyttet dette selskab.",

    "addon.shipping-dhl.perm.rates": "Hente priser på en pakke, du sender",
    "addon.shipping-dhl.perm.shipments": "Oprette forsendelser til ordrer, I sender af sted",
    "addon.shipping-dhl.perm.labels": "Hente labels til de forsendelser",








  },

  "zh-CN": {
    "addon.shipping-dhl.setting.apiKey": "API 密钥",
    "addon.shipping-dhl.setting.accountNumber": "账号",
    "addon.shipping-dhl.setting.demo": "改用演示承运商",
    "addon.shipping-dhl.setting.cutoff": "取件截止时间",
    "addon.shipping-dhl.setting.returnsName": "退货地址——标签上的名称",
    "addon.shipping-dhl.setting.returnsLines": "退货地址——街道",
    "addon.shipping-dhl.setting.returnsCity": "退货地址——城市",
    "addon.shipping-dhl.setting.returnsPostcode": "退货地址——邮编",
    "addon.shipping-dhl.setting.returnsCountry": "退货地址——国家或地区",
    "addon.shipping-dhl.what": "让店里直接从已备好的订单预约包裹取件，取回运费并打印面单，不必再把单号敲进邮件里。",
    "addon.shipping-dhl.set.demo": "使用演示快递",
    "addon.shipping-dhl.set.demoOn": "运价、面单和轨迹都来自预置的替身。没有任何内容送到真实快递公司。",
    "addon.shipping-dhl.set.demoOff": "运费、面单和跟踪信息通过已连接的账户来自快递公司。未连接账户时，不会询价或预约。",
    "addon.shipping-dhl.disconnect.goes": "订单上不再有“预约取件”，收银台不再显示承运商运费，客户的订单页恢复为到店自取。账号信息会被删除。",
    "addon.shipping-dhl.disconnect.stays": "已预约的取件保留面单与运单号。",
    "addon.shipping-dhl.act.1": "{when} · 已预约取件 · {ref}",
    "addon.shipping-dhl.act.2": "{when} · 已取运价 · {ref}",
    "addon.shipping-dhl.act.3": "{when} · 已下载面单 · {ref}",

    "addon.shipping-dhl.line": "演示承运商：练习预约取件，并获得示例面单和跟踪编号。不会预订真实包裹。",
    "addon.shipping-dhl.notAffiliated": "Adminium 与该公司没有任何关联。",

    "addon.shipping-dhl.perm.rates": "查询你要寄出的包裹运费",
    "addon.shipping-dhl.perm.shipments": "为你发出的订单创建运单",
    "addon.shipping-dhl.perm.labels": "下载这些运单的面单",








  },

  "zh-TW": {
    "addon.shipping-dhl.setting.apiKey": "API 金鑰",
    "addon.shipping-dhl.setting.accountNumber": "帳號",
    "addon.shipping-dhl.setting.demo": "改用示範業者",
    "addon.shipping-dhl.setting.cutoff": "取件截止時間",
    "addon.shipping-dhl.setting.returnsName": "退貨地址——標籤上的名稱",
    "addon.shipping-dhl.setting.returnsLines": "退貨地址——街道",
    "addon.shipping-dhl.setting.returnsCity": "退貨地址——城市",
    "addon.shipping-dhl.setting.returnsPostcode": "退貨地址——郵遞區號",
    "addon.shipping-dhl.setting.returnsCountry": "退貨地址——國家或地區",
    "addon.shipping-dhl.what": "讓店裡直接從已備妥的訂單預約包裹取件，取回運費並列印面單，不必再把單號敲進郵件裡。",
    "addon.shipping-dhl.set.demo": "使用示範快遞",
    "addon.shipping-dhl.set.demoOn": "運價、面單和軌跡都來自預置的替身。沒有任何內容送到真實快遞公司。",
    "addon.shipping-dhl.set.demoOff": "運費、標籤和追蹤資訊透過已連接的帳戶來自快遞業者。未連接帳戶時，不會詢價或預約。",
    "addon.shipping-dhl.disconnect.goes": "訂單上不再有「預約取件」，結帳不再顯示承運商運費，顧客的訂單頁回到到店自取。帳號資訊會被刪除。",
    "addon.shipping-dhl.disconnect.stays": "已預約的取件保留面單與貨運單號。",
    "addon.shipping-dhl.act.1": "{when} · 已預約取件 · {ref}",
    "addon.shipping-dhl.act.2": "{when} · 已取運價 · {ref}",
    "addon.shipping-dhl.act.3": "{when} · 已下載面單 · {ref}",

    "addon.shipping-dhl.line": "示範貨運公司：練習預約取件，並取得範例標籤和追蹤編號。不會預訂真實包裹。",
    "addon.shipping-dhl.notAffiliated": "Adminium 與該公司並無任何關聯。",

    "addon.shipping-dhl.perm.rates": "查詢你要寄出的包裹運費",
    "addon.shipping-dhl.perm.shipments": "為你出貨的訂單建立託運單",
    "addon.shipping-dhl.perm.labels": "下載這些託運單的標籤",








  },

  "ar-EG": {
    "addon.shipping-dhl.setting.apiKey": "مفتاح الـ API",
    "addon.shipping-dhl.setting.accountNumber": "رقم الحساب",
    "addon.shipping-dhl.setting.demo": "استخدم شركة الشحن التجريبية بدلاً منها",
    "addon.shipping-dhl.setting.cutoff": "آخر موعد لطلب الاستلام",
    "addon.shipping-dhl.setting.returnsName": "عنوان الإرجاع — الاسم على الملصق",
    "addon.shipping-dhl.setting.returnsLines": "عنوان الإرجاع — الشارع",
    "addon.shipping-dhl.setting.returnsCity": "عنوان الإرجاع — المدينة",
    "addon.shipping-dhl.setting.returnsPostcode": "عنوان الإرجاع — الرمز البريدي",
    "addon.shipping-dhl.setting.returnsCountry": "عنوان الإرجاع — البلد",
    "addon.shipping-dhl.what": "يتيح للمحل حجز استلام طرد من طلب جاهز، واسترجاع الأسعار وطباعة بطاقة الشحن، بدل كتابة أرقام التتبع في رسالة بريد.",
    "addon.shipping-dhl.set.demo": "استخدم شركة الشحن التجريبية",
    "addon.shipping-dhl.set.demoOn": "الأسعار والملصقات والتتبّع تأتي من بديل مُعدّ سلفًا. لا يصل شيء إلى شركة شحن حقيقية.",
    "addon.shipping-dhl.set.demoOff": "تأتي الأسعار والملصقات والتتبع من شركة الشحن عبر الحساب المتصل. دون حساب متصل لا يُطلب سعر ولا يُحجز شيء.",
    "addon.shipping-dhl.disconnect.goes": "يفقد الطلب زر «احجز استلامًا»، وتفقد صفحة الدفع أسعار شركة الشحن، وتعود صفحة طلب العميل إلى الاستلام من المحل. وتُحذف بيانات الحساب.",
    "addon.shipping-dhl.disconnect.stays": "عمليات الاستلام المحجوزة تحتفظ بملصقاتها وأرقام تتبّعها.",
    "addon.shipping-dhl.act.1": "{when} · حُجز استلام · {ref}",
    "addon.shipping-dhl.act.2": "{when} · جُلبت الأسعار · {ref}",
    "addon.shipping-dhl.act.3": "{when} · نُزّل الملصق · {ref}",

    "addon.shipping-dhl.line": "شركة شحن تجريبية: تدرّب على حجز استلام طرد مع ملصق ورقم تتبع تجريبيين. لا يُحجز أي طرد حقيقي.",
    "addon.shipping-dhl.notAffiliated": "لا توجد أي علاقة بين Adminium وهذه الشركة.",

    "addon.shipping-dhl.perm.rates": "جلب أسعار طرد أنت بصدد إرساله",
    "addon.shipping-dhl.perm.shipments": "إنشاء شحنات للطلبات التي ترسلها",
    "addon.shipping-dhl.perm.labels": "تنزيل ملصقات تلك الشحنات",








  },
} as const;

/** English defines the keys; the other seven must carry every one of them. */
export type StringKey = keyof (typeof strings)["en-US"];

export type LocaleTag = keyof typeof strings;

export const LOCALE_TAGS = Object.keys(strings) as LocaleTag[];

/**
 * Parity, enforced at COMPILE time rather than by a test that might not run.
 *
 * The annotation is the assertion: if a locale is missing a key or has grown
 * one English does not have, this line stops compiling. It is the same guard
 * the host's `messages/index.ts` puts around its own areas, restated here
 * because this repo builds on its own.
 */
const _parity: { [L in LocaleTag]: Record<StringKey, string> } = strings;
void _parity;

/**
 * ── THE LATIN DIGITS IN THESE STRINGS THAT ARE NOT QUANTITIES ───────────────
 *
 * A host renders this bundle inside its own pages, and every host in this wave
 * runs the same rule over an Arabic page: a run of Latin digits that is not
 * inside an identifier is an unformatted number, and a defect. Some of an
 * add-on's own strings legitimately carry one anyway, and when they do THE
 * ADD-ON IS THE ONLY THING THAT KNOWS WHY.
 *
 * ── WHY THIS TRAVELS WITH THE STRINGS INSTEAD OF WITH THE HOST ──────────────
 *
 * It used to live in the host. Print Shop's `numerals.arabic.test.tsx` carried
 * Design Studio's specimen telephone number in ITS exemption list, and Maker
 * Shop did not — so wiring Design Studio into the second host, registration
 * only, zero bytes changed in any add-on, turned that host's suite red. The
 * fix was to edit a list in the host, which is exactly what must never be
 * necessary: an add-on is portable when moving it needs no edit in the app
 * that receives it.
 *
 * The same shape had already been fixed twice this wave (HOSTED_SLOTS, the
 * Czech "pro" carve-out). This is the third and it is fixed the same way: the
 * fact is declared beside the strings it is about, in the module the hosts
 * vendor, and each host's guard reads whatever is vendored into it. A host that
 * takes this add-on takes its allowances; a host that does not, does not.
 *
 * EVERY ADD-ON EXPORTS THIS, even when it is empty. A host asserts the export
 * exists on every bundle it has vendored, so a missing declaration is a red
 * suite rather than an allowance nobody notices is gone.
 */
export const NOT_A_QUANTITY: readonly { phrase: string; why: string }[] = [];

