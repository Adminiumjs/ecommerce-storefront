/**
 * The HOST's own words about add-ons — and not one add-on's words.
 *
 * ── WHY THIS IS A SEPARATE AREA AND NOT A CORNER OF `chrome` ───────────────
 *
 * Every key here belongs to a surface this app draws AROUND something an
 * add-on drew: the sentence a delivery step shows when no carrier is
 * connected, the heading a settings form sits under, the promise the order
 * page keeps when nothing is tracking the parcel. They are the host's half of
 * the seam, they are all `addon.host.*`, and keeping them in one file means the
 * whole of what this app says on the subject can be read in one sitting.
 *
 * ── AND NOT ONE OF THEM NAMES AN ADD-ON, WHICH IS THE RULE ─────────────────
 *
 * Acceptance criterion 5: no shipped file outside the vendored tree and the
 * registration lines names a company. That includes this file, and it is the
 * file where breaking it would be easiest and most tempting — "Live rates from
 * DHL" is a better sentence than "Live rates from a delivery company" right up
 * until a second carrier is connected, or a first one is swapped, and then it
 * is a lie in eight languages that nobody grepped for.
 *
 * An ADD-ON's own strings do not live here. They ride on the add-on object and
 * are merged into the runtime bundle at registration by `registerAddOnMessages`
 * (`../messages/index.ts`), which throws — naming the add-on, the locale and
 * the key — on a bundle that is not complete in all eight. That check exists
 * because add-on keys are no longer members of `MessageKey`, so the compiler
 * stopped doing it.
 *
 * ── THE CUSTOMER-ONLY SCOPE IS COPY, NOT A COMMENT ─────────────────────────
 *
 * `addon.host.manage.scope*` is the sentence that says this app is the
 * SHOPPER's half of the shop. A delivery add-on offers three surfaces and this
 * storefront can honestly host two of them; the third — book the collection,
 * print the label — is somebody standing in a warehouse, and that person works
 * in Adminium's generated dashboard, not here. A reader who connects a carrier
 * and finds no Book button is owed that sentence ON THE SCREEN, which is why it
 * is a message key and not a paragraph in `slots.ts`.
 *
 * `satisfies` and not a type annotation, for the reason `chrome.ts` gives:
 * annotating widens the key type to `string` and takes `MessageKey` with it.
 */
import type { LocaleTag } from '../locales';

export const addOns = {
  'en-US': {
    // --- the checkout's delivery step ------------------------------------
    'addon.host.checkout.slotTitle': 'Other ways to get it',
    'addon.host.checkout.slotEmpty':
      'This shop posts everything itself, at the prices above. Connect a delivery company and its live rates appear here beside them.',

    // --- the order confirmation ------------------------------------------
    'addon.host.order.panelTitle': 'Tracking',

    // --- the manage drawer -------------------------------------------------
    'addon.host.manage.open': 'Add-ons',
    'addon.host.manage.title': 'Add-ons',
    'addon.host.manage.sub':
      'Extra things this shop can connect. Switch one on and its own screens appear where they belong.',
    'addon.host.manage.close': 'Close',
    'addon.host.manage.connect': 'Connect',
    'addon.host.manage.disconnect': 'Disconnect',
    'addon.host.manage.connected': 'Connected',
    'addon.host.manage.notConnected': 'Not connected',
    'addon.host.manage.permissions': 'What it can do',
    'addon.host.manage.settings': 'Settings',
    'addon.host.manage.noSettings': 'This one has nothing to set.',
    'addon.host.manage.goes': 'Disconnecting removes',
    'addon.host.manage.stays': 'Disconnecting keeps',
    'addon.host.manage.empty': 'This build has nothing to connect.',
    'addon.host.manage.scopeTitle': 'This is the shopper’s half of the shop',
    'addon.host.manage.scope':
      'You are looking at the storefront, so an add-on only appears where a customer would meet it: rates at the checkout, tracking on an order. Booking a collection and printing a label belong to whoever packs the parcel, and that screen is in the admin dashboard rather than in here.',
    'addon.host.notAffiliated':
      'Adminium is not affiliated with the companies these add-ons connect to. Every name and mark belongs to its owner.',
  },

  'de-DE': {
    'addon.host.checkout.slotTitle': 'Weitere Versandwege',
    'addon.host.checkout.slotEmpty':
      'Dieser Shop versendet alles selbst, zu den Preisen oben. Verbinden Sie ein Versandunternehmen, und dessen Live-Preise erscheinen hier daneben.',

    'addon.host.order.panelTitle': 'Sendungsverfolgung',

    'addon.host.manage.open': 'Add-ons',
    'addon.host.manage.title': 'Add-ons',
    'addon.host.manage.sub':
      'Zusätzliche Dienste, die dieser Shop verbinden kann. Einmal eingeschaltet, erscheinen die eigenen Ansichten dort, wo sie hingehören.',
    'addon.host.manage.close': 'Schließen',
    'addon.host.manage.connect': 'Verbinden',
    'addon.host.manage.disconnect': 'Trennen',
    'addon.host.manage.connected': 'Verbunden',
    'addon.host.manage.notConnected': 'Nicht verbunden',
    'addon.host.manage.permissions': 'Was es darf',
    'addon.host.manage.settings': 'Einstellungen',
    'addon.host.manage.noSettings': 'Hier gibt es nichts einzustellen.',
    'addon.host.manage.goes': 'Beim Trennen entfällt',
    'addon.host.manage.stays': 'Beim Trennen bleibt',
    'addon.host.manage.empty': 'In dieser Version gibt es nichts zu verbinden.',
    'addon.host.manage.scopeTitle': 'Dies ist die Kundenseite des Shops',
    'addon.host.manage.scope':
      'Sie sehen den Shop aus Kundensicht, deshalb erscheint ein Add-on nur dort, wo Kundschaft ihm begegnet: Preise an der Kasse, Sendungsverfolgung zur Bestellung. Abholung beauftragen und Etikett drucken gehört zu den Personen, die das Paket packen — diese Ansicht liegt im Admin-Dashboard, nicht hier.',
    'addon.host.notAffiliated':
      'Adminium steht in keiner Verbindung zu den Unternehmen, mit denen diese Add-ons arbeiten. Alle Namen und Marken gehören ihren Inhabern.',
  },

  'fr-FR': {
    'addon.host.checkout.slotTitle': 'Autres façons de le recevoir',
    'addon.host.checkout.slotEmpty':
      'Cette boutique expédie tout elle-même, aux tarifs ci-dessus. Connectez un transporteur et ses tarifs en direct apparaîtront ici, à côté.',

    'addon.host.order.panelTitle': 'Suivi',

    'addon.host.manage.open': 'Modules',
    'addon.host.manage.title': 'Modules',
    'addon.host.manage.sub':
      'Ce que cette boutique peut connecter en plus. Activez un module et ses écrans apparaissent là où ils ont leur place.',
    'addon.host.manage.close': 'Fermer',
    'addon.host.manage.connect': 'Connecter',
    'addon.host.manage.disconnect': 'Déconnecter',
    'addon.host.manage.connected': 'Connecté',
    'addon.host.manage.notConnected': 'Non connecté',
    'addon.host.manage.permissions': 'Ce qu’il peut faire',
    'addon.host.manage.settings': 'Réglages',
    'addon.host.manage.noSettings': 'Celui-ci n’a rien à régler.',
    'addon.host.manage.goes': 'La déconnexion retire',
    'addon.host.manage.stays': 'La déconnexion conserve',
    'addon.host.manage.empty': 'Cette version n’a rien à connecter.',
    'addon.host.manage.scopeTitle': 'Vous êtes du côté client de la boutique',
    'addon.host.manage.scope':
      'Vous regardez la boutique côté client : un module n’apparaît donc que là où un client le rencontre — les tarifs au paiement, le suivi sur une commande. Commander l’enlèvement et imprimer l’étiquette reviennent à qui emballe le colis, et cet écran se trouve dans le tableau de bord d’administration, pas ici.',
    'addon.host.notAffiliated':
      'Adminium n’est affilié à aucune des sociétés auxquelles ces modules se connectent. Chaque nom et chaque marque appartient à son propriétaire.',
  },

  'cs-CZ': {
    'addon.host.checkout.slotTitle': 'Další způsoby doručení',
    'addon.host.checkout.slotEmpty':
      'Tento obchod odesílá vše sám, za ceny uvedené výše. Připojte dopravce a jeho živé sazby se objeví zde vedle nich.',

    'addon.host.order.panelTitle': 'Sledování zásilky',

    'addon.host.manage.open': 'Doplňky',
    'addon.host.manage.title': 'Doplňky',
    'addon.host.manage.sub':
      'Co dalšího lze k tomuto obchodu připojit. Zapněte doplněk a jeho vlastní obrazovky se objeví tam, kam patří.',
    'addon.host.manage.close': 'Zavřít',
    'addon.host.manage.connect': 'Připojit',
    'addon.host.manage.disconnect': 'Odpojit',
    'addon.host.manage.connected': 'Připojeno',
    'addon.host.manage.notConnected': 'Nepřipojeno',
    'addon.host.manage.permissions': 'Co smí dělat',
    'addon.host.manage.settings': 'Nastavení',
    'addon.host.manage.noSettings': 'Tady není co nastavovat.',
    'addon.host.manage.goes': 'Odpojením zmizí',
    'addon.host.manage.stays': 'Odpojením zůstane',
    'addon.host.manage.empty': 'V této verzi není co připojit.',
    'addon.host.manage.scopeTitle': 'Toto je zákaznická část obchodu',
    'addon.host.manage.scope':
      'Díváte se na obchod očima zákazníka, a proto se doplněk objeví jen tam, kde na něj zákazník narazí: sazby u pokladny, sledování u objednávky. Objednat svoz a vytisknout štítek patří tomu, kdo balí zásilku, a tato obrazovka je v administraci, ne tady.',
    'addon.host.notAffiliated':
      'Adminium není nijak spojeno se společnostmi, k nimž se tyto doplňky připojují. Každý název i ochranná známka patří svému vlastníkovi.',
  },

  'da-DK': {
    'addon.host.checkout.slotTitle': 'Andre måder at få den på',
    'addon.host.checkout.slotEmpty':
      'Denne butik sender alt selv, til priserne ovenfor. Tilslut et fragtfirma, så vises dets aktuelle priser her ved siden af.',

    'addon.host.order.panelTitle': 'Sporing',

    'addon.host.manage.open': 'Tilføjelser',
    'addon.host.manage.title': 'Tilføjelser',
    'addon.host.manage.sub':
      'Det, denne butik kan tilslutte derudover. Slå én til, og dens egne skærme dukker op, hvor de hører hjemme.',
    'addon.host.manage.close': 'Luk',
    'addon.host.manage.connect': 'Tilslut',
    'addon.host.manage.disconnect': 'Afbryd',
    'addon.host.manage.connected': 'Tilsluttet',
    'addon.host.manage.notConnected': 'Ikke tilsluttet',
    'addon.host.manage.permissions': 'Hvad den må',
    'addon.host.manage.settings': 'Indstillinger',
    'addon.host.manage.noSettings': 'Der er intet at indstille her.',
    'addon.host.manage.goes': 'Ved afbrydelse forsvinder',
    'addon.host.manage.stays': 'Ved afbrydelse bevares',
    'addon.host.manage.empty': 'Der er intet at tilslutte i denne udgave.',
    'addon.host.manage.scopeTitle': 'Det her er kundens halvdel af butikken',
    'addon.host.manage.scope':
      'Du ser butikken fra kundens side, så en tilføjelse dukker kun op, hvor en kunde møder den: priser ved kassen, sporing på en ordre. At bestille afhentning og printe en label hører til den, der pakker pakken, og den skærm ligger i administrationen — ikke her.',
    'addon.host.notAffiliated':
      'Adminium er ikke tilknyttet de virksomheder, disse tilføjelser forbinder til. Alle navne og mærker tilhører deres ejere.',
  },

  'zh-CN': {
    'addon.host.checkout.slotTitle': '其他收货方式',
    'addon.host.checkout.slotEmpty':
      '本店自行寄送全部商品，价格如上。接入快递公司后，其实时运费会显示在这里。',

    'addon.host.order.panelTitle': '物流跟踪',

    'addon.host.manage.open': '插件',
    'addon.host.manage.title': '插件',
    'addon.host.manage.sub': '本店还可以接入的服务。开启后，它自己的界面会出现在该出现的位置。',
    'addon.host.manage.close': '关闭',
    'addon.host.manage.connect': '接入',
    'addon.host.manage.disconnect': '断开',
    'addon.host.manage.connected': '已接入',
    'addon.host.manage.notConnected': '未接入',
    'addon.host.manage.permissions': '它能做什么',
    'addon.host.manage.settings': '设置',
    'addon.host.manage.noSettings': '这个插件没有可设置的项目。',
    'addon.host.manage.goes': '断开后将移除',
    'addon.host.manage.stays': '断开后仍保留',
    'addon.host.manage.empty': '此版本没有可接入的插件。',
    'addon.host.manage.scopeTitle': '这里是店铺面向顾客的一半',
    'addon.host.manage.scope':
      '您看到的是顾客端，因此插件只出现在顾客会遇到它的地方：结账时的运费、订单上的物流跟踪。预约上门取件和打印面单属于打包发货的人，那个界面在管理后台，不在这里。',
    'addon.host.notAffiliated': 'Adminium 与这些插件所连接的公司没有从属关系。所有名称与标识均归其所有者所有。',
  },

  'zh-TW': {
    'addon.host.checkout.slotTitle': '其他取貨方式',
    'addon.host.checkout.slotEmpty':
      '本店自行寄送所有商品，價格如上。接上物流公司後，其即時運費會顯示在這裡。',

    'addon.host.order.panelTitle': '物流追蹤',

    'addon.host.manage.open': '外掛',
    'addon.host.manage.title': '外掛',
    'addon.host.manage.sub': '本店還可以接上的服務。開啟後，它自己的畫面會出現在該出現的位置。',
    'addon.host.manage.close': '關閉',
    'addon.host.manage.connect': '接上',
    'addon.host.manage.disconnect': '中斷',
    'addon.host.manage.connected': '已接上',
    'addon.host.manage.notConnected': '未接上',
    'addon.host.manage.permissions': '它能做什麼',
    'addon.host.manage.settings': '設定',
    'addon.host.manage.noSettings': '這個外掛沒有可設定的項目。',
    'addon.host.manage.goes': '中斷後將移除',
    'addon.host.manage.stays': '中斷後仍保留',
    'addon.host.manage.empty': '此版本沒有可接上的外掛。',
    'addon.host.manage.scopeTitle': '這裡是店鋪面向顧客的一半',
    'addon.host.manage.scope':
      '您看到的是顧客端，因此外掛只會出現在顧客會遇到它的地方：結帳時的運費、訂單上的物流追蹤。預約收件與列印託運單屬於打包出貨的人，那個畫面在管理後台，不在這裡。',
    'addon.host.notAffiliated': 'Adminium 與這些外掛所連接的公司並無隸屬關係。所有名稱與標誌均歸其所有者所有。',
  },

  'ar-EG': {
    'addon.host.checkout.slotTitle': 'طرق أخرى لاستلامه',
    'addon.host.checkout.slotEmpty':
      'يشحن هذا المتجر كل شيء بنفسه، بالأسعار الموضّحة أعلاه. اربط شركة شحن لتظهر أسعارها الحيّة هنا بجوارها.',

    'addon.host.order.panelTitle': 'تتبّع الشحنة',

    'addon.host.manage.open': 'الإضافات',
    'addon.host.manage.title': 'الإضافات',
    'addon.host.manage.sub':
      'خدمات إضافية يمكن لهذا المتجر ربطها. شغّل واحدة لتظهر شاشاتها الخاصة في مكانها الصحيح.',
    'addon.host.manage.close': 'إغلاق',
    'addon.host.manage.connect': 'ربط',
    'addon.host.manage.disconnect': 'فصل',
    'addon.host.manage.connected': 'مربوطة',
    'addon.host.manage.notConnected': 'غير مربوطة',
    'addon.host.manage.permissions': 'ما تستطيع فعله',
    'addon.host.manage.settings': 'الإعدادات',
    'addon.host.manage.noSettings': 'لا توجد إعدادات لهذه الإضافة.',
    'addon.host.manage.goes': 'يزيل الفصل',
    'addon.host.manage.stays': 'يبقي الفصل',
    'addon.host.manage.empty': 'لا يوجد ما يمكن ربطه في هذه النسخة.',
    'addon.host.manage.scopeTitle': 'هذا هو نصف المتجر الخاص بالعميل',
    'addon.host.manage.scope':
      'أنت تنظر إلى واجهة العميل، لذلك لا تظهر الإضافة إلا حيث يلتقي بها العميل: الأسعار عند الدفع، وتتبّع الشحنة على الطلب. أما طلب مرور المندوب وطباعة البطاقة فهما لمن يعبّئ الطرد، وتلك الشاشة في لوحة الإدارة وليست هنا.',
    'addon.host.notAffiliated':
      'لا ترتبط Adminium بأي علاقة مع الشركات التي تتصل بها هذه الإضافات. كل اسم وعلامة ملك لصاحبه.',
  },
} satisfies Record<LocaleTag, Record<string, string>>;
