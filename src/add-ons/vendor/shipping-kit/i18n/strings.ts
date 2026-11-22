/*
 * VENDORED from add-ons/packages/shipping-kit/src/i18n/strings.ts — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * Every string the shared carrier screens show, in all eight locales.
 *
 * Same nested shape as the host's `src/i18n/strings/chrome.ts` — `{ locale:
 * { key: value } }` — because the host merges these into its own bundle and
 * types the key union off English. A locale missing a key is a COMPILE error
 * there, not a runtime fallback, which is the whole point of the shape.
 *
 * Keys are namespaced under `addon.shipping-kit.*`, and `{carrier}` is the name of whichever add-on is drawing. Every add-on's strings land
 * in one flat bundle with the host's, so a bare `rates.title` would be a
 * collision waiting for the second carrier.
 *
 * A NOTE FOR TRANSLATORS, and it is not optional. The English avoids a short
 * list of commercial and quantity-break words on purpose, and several of them
 * are the printing trade's own — which is exactly why the list is not spelled
 * out in this file. It lives in `sources.test.ts`, as the guard that fails the
 * build when one of them appears, so there is one copy of it and it is an
 * executable one rather than a comment that drifts. A parcel service costs
 * money and is named plainly: rates, prices, what it costs, no charge.
 *
 * Please keep the equivalent restraint in your language rather than reaching
 * for the marketing word, and where your language's natural term happens to
 * contain one of the forbidden English fragments as a substring, prefer the
 * plainer phrase a works would actually say — the release check reads bytes,
 * not meaning, so an innocent word with an unlucky spelling still trips it.
 *
 * Two more rules about the company's name. It is named ONLY to say what is
 * being connected to — never as a partner, never as an endorsement. And no
 * string here may be turned into a claim of affiliation by a translation that
 * reads more warmly than the English.
 */

export const strings = {
  "en-US": {
    "addon.shipping-kit.set.demo": "Use the demo carrier",
    "addon.shipping-kit.set.demoOn": "Rates, labels and tracking come back from a seeded stand-in. Nothing reaches a real carrier.",
    "addon.shipping-kit.set.demoOff": "Rates, labels and tracking come from the carrier with the account you connected. With no account connected, nothing is quoted or booked.",
    // ── Host chrome this add-on owns: the connect sentence, its own settings
    //    panel copy, what a disconnect takes and keeps, and its activity lines.
    "addon.shipping-kit.set.cutoffLabel": "Collection cut-off",
    "addon.shipping-kit.set.cutoffNote": "Book before this and the driver comes the same afternoon.",
    "addon.shipping-kit.set.weights": "Default parcel weights",
    "addon.shipping-kit.set.weightsNote": "Worked out from what the shop says one of each weighs, plus the box. The rate card behind them is edited in your Adminium dashboard.",
    "addon.shipping-kit.set.weightAssumed": "{kg} kg — assumed",
    "addon.shipping-kit.set.weightKg": "{kg} kg",

    // ── the add-on itself ──────────────────────────────────────────────────
    "addon.shipping-kit.notAffiliated": "Adminium is not affiliated with this company.",
    "addon.shipping-kit.account.notConnectedTitle": "Your {carrier} account is not connected",
    "addon.shipping-kit.account.notConnectedBody": "No rates can be fetched and no collection booked until it is. Connect it in Add-ons, or switch on the demo carrier in {carrier}'s settings to try the flow without sending anything.",
    "addon.shipping-kit.account.demoNotice": "Demo carrier: rates and bookings here are simulated and nothing reaches {carrier}. Connect your {carrier} account in Add-ons and switch the demo off to book for real.",
    "addon.shipping-kit.demoChip": "Demo carrier — no real shipment was booked",
    "addon.shipping-kit.onlyCarrier": "{carrier} is the only delivery company connected.",
    "addon.shipping-kit.connectAnother": "Connect another in Add-ons.",

    // ── what connecting allows ─────────────────────────────────────────────

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
    "addon.shipping-kit.setting.apiKey": "API key",
    "addon.shipping-kit.setting.accountNumber": "Account number",
    "addon.shipping-kit.setting.demo": "Use the demo carrier instead",
    "addon.shipping-kit.setting.demoHint":
      "Rates, labels and tracking come back from a seeded stand-in, so you can try the whole flow without an account. Nothing is sent to a real carrier.",
    "addon.shipping-kit.setting.cutoff": "Collection cut-off",
    "addon.shipping-kit.setting.cutoffHint":
      "Book before this and the driver comes the same afternoon.",

    // ── the parcel ─────────────────────────────────────────────────────────
    "addon.shipping-kit.action.book": "Book a collection",
    "addon.shipping-kit.parcel.title": "The parcel",
    "addon.shipping-kit.parcel.sub": "Filled in from the order. Change anything wrong.",
    "addon.shipping-kit.parcel.contents": "Contents",
    "addon.shipping-kit.parcel.weight": "Weight",
    "addon.shipping-kit.parcel.dims": "Dimensions",
    "addon.shipping-kit.parcel.goingTo": "Going to",

    // ── a customer this add-on cannot place ────────────────────────────────
    "addon.shipping-kit.dest.unknownTitle": "No address for this parcel",
    "addon.shipping-kit.dest.unknownBody": "The shop has not said where {customer}'s parcel is going, so nothing has been filled in. Type the address — no other customer's is used in its place.",
    "addon.shipping-kit.dest.name": "Send to",
    "addon.shipping-kit.dest.street": "Street",
    "addon.shipping-kit.dest.city": "Town or city",
    "addon.shipping-kit.dest.needAddress": "Add a town and a postcode before you get rates.",
    "addon.shipping-kit.parcel.contentsValue": "{quantity} × {what}",
    "addon.shipping-kit.parcel.contentsValueMore": "{quantity} × {what} and {more} more",
    "addon.shipping-kit.parcel.contentsFrom": "From order {ref}, quantity {quantity}",
    "addon.shipping-kit.parcel.weightFrom": "{kg}kg — {quantity} at {each}g each, plus the box",
    "addon.shipping-kit.parcel.weightAssumed": "{kg}kg — the shop has not said what these weigh: {what}. Type the real weight here.",
    "addon.shipping-kit.parcel.weightShop": "{kg}kg — order {ref}'s own weight, packed",
    "addon.shipping-kit.parcel.weightFromMany": "{kg}kg — {quantity} items weighing {grams}g, plus the box",
    "addon.shipping-kit.parcel.dimsFrom": "A box sized for what is in it",
    "addon.shipping-kit.parcel.dimsFromTube": "Rolled in a tube — the longest piece is over 60cm",

    // ── rates and booking ──────────────────────────────────────────────────
    "addon.shipping-kit.rates.get": "Get rates",
    "addon.shipping-kit.rates.title": "Rates for this parcel",
    "addon.shipping-kit.rates.simulated": "These services, prices and dates come from a demo carrier. Nothing is sent to a real one.",
    "addon.shipping-kit.rates.arrives": "arrives {date}",
    "addon.shipping-kit.rates.cheapest": "cheapest",
    "addon.shipping-kit.rates.book": "Book the collection",
    "addon.shipping-kit.rates.cutoffLine":
      "Book before {cutoff} and the driver comes this afternoon. It is {now} now.",
    "addon.shipping-kit.rates.cutoffMissed":
      "It is {now}, past the {cutoff} cut-off, so the van calls on {day}.",
    "addon.shipping-kit.service.exp1200": "Express by {by}",
    "addon.shipping-kit.service.expNwd": "Express, next working day",
    "addon.shipping-kit.service.eco2wd": "Economy, second working day",

    // ── the result ─────────────────────────────────────────────────────────
    "addon.shipping-kit.booked.title": "Collection booked",
    "addon.shipping-kit.booked.tracking": "Tracking reference",
    "addon.shipping-kit.booked.window": "Collection window",
    "addon.shipping-kit.booked.service": "Service",
    "addon.shipping-kit.label.download": "Download",
    "addon.shipping-kit.label.print": "Print",
    "addon.shipping-kit.tracking.title": "Tracking",
    "addon.shipping-kit.tracking.simulated": "Demo carrier — these scans are simulated",
    "addon.shipping-kit.event.collected": "Picked up from the shop",
    "addon.shipping-kit.event.atHub": "Sorted at the depot",
    "addon.shipping-kit.event.outForDelivery": "Out with the driver",

    // ── the refusal ────────────────────────────────────────────────────────
    "addon.shipping-kit.error.title": "The carrier would not take this address",
    "addon.shipping-kit.error.simulated": "Demo carrier — this refusal is simulated",
    "addon.shipping-kit.error.remedy1":
      "Check the postcode against the country it is going to. For {country} it looks like {example}.",
    "addon.shipping-kit.error.remedy2": "If the address is right as it stands, hand the parcel over the counter and mark it collected.",
    "addon.shipping-kit.error.retry": "Try again",
    "addon.shipping-kit.error.postcode": "Postcode",
    "addon.shipping-kit.error.country": "Country",

    // ── the customer's two surfaces ────────────────────────────────────────
    "addon.shipping-kit.checkout.title": "Delivery by {carrier}",
    "addon.shipping-kit.checkout.sub": "Worked out from what is in your basket.",
    "addon.shipping-kit.checkout.fromReady":
      "Counted from {day}, the first day the shop can hand this over.",
    "addon.shipping-kit.checkout.simulated":
      "These rates come from a demo carrier. Nothing is sent to a real one.",
    "addon.shipping-kit.panel.carrier": "Carrier",
    "addon.shipping-kit.panel.due": "Due",
    "addon.shipping-kit.panel.notSent": "This order has not gone out with a carrier yet.",
    "addon.shipping-kit.panel.trackIt": "Track it",
    "addon.shipping-kit.panel.noPage":
      "The demo carrier has no tracking page of its own — the events above are all of it.",

    // ── the inbound half: a prepaid return label ──────────────────────────
    "addon.shipping-kit.returns.title": "Prepaid return label",
    "addon.shipping-kit.returns.intro": "Get a label to send this back. The shop pays the carriage — you put the label on the parcel and hand it over.",
    "addon.shipping-kit.returns.toDepot": "It goes back to {name}, {city}.",
    "addon.shipping-kit.returns.notSetUp": "The shop has not given the carrier a returns address yet, so no label can be made here.",
    "addon.shipping-kit.returns.sender": "Collected from your address",
    "addon.shipping-kit.returns.senderName": "Your name",
    "addon.shipping-kit.returns.parcelNote": "A small parcel is assumed — about {kg} kg with the box. The depot weighs what actually arrives.",
    "addon.shipping-kit.returns.make": "Get the prepaid label",
    "addon.shipping-kit.returns.made": "Return label ready",
    "addon.shipping-kit.returns.apply": "Print it, fix it to the parcel and hand the parcel over. The tracking follows it back.",
    "addon.shipping-kit.set.returns": "Returns address",
    "addon.shipping-kit.set.returnsName": "Name on the label",
    "addon.shipping-kit.set.returnsNote": "Where a customer's return parcel is delivered. With no address here, the return surface says so and makes nothing.",
    "addon.shipping-kit.setting.returnsName": "Returns address — name on the label",
    "addon.shipping-kit.setting.returnsLines": "Returns address — street",
    "addon.shipping-kit.setting.returnsCity": "Returns address — town or city",
    "addon.shipping-kit.setting.returnsPostcode": "Returns address — postcode",
    "addon.shipping-kit.setting.returnsCountry": "Returns address — country",
  },

  "de-DE": {
    "addon.shipping-kit.set.demo": "Den Demo-Versanddienst nutzen",
    "addon.shipping-kit.set.demoOn": "Preise, Etiketten und Sendungsverfolgung kommen aus einem hinterlegten Ersatz. Nichts erreicht einen echten Versanddienst.",
    "addon.shipping-kit.set.demoOff": "Preise, Etiketten und Sendungsverfolgung kommen vom Versender über das verbundene Konto. Ohne verbundenes Konto wird nichts angefragt oder gebucht.",
    // ── Host chrome this add-on owns: the connect sentence, its own settings
    //    panel copy, what a disconnect takes and keeps, and its activity lines.
    "addon.shipping-kit.set.cutoffLabel": "Annahmeschluss für die Abholung",
    "addon.shipping-kit.set.cutoffNote": "Vorher gebucht, und der Fahrer kommt noch am selben Nachmittag.",
    "addon.shipping-kit.set.weights": "Voreingestellte Paketgewichte",
    "addon.shipping-kit.set.weightsNote": "Errechnet aus dem Stückgewicht, das der Betrieb angibt, plus Karton. Die Preisliste dahinter wird in Ihrem Adminium-Dashboard gepflegt.",
    "addon.shipping-kit.set.weightAssumed": "{kg} kg — angenommen",
    "addon.shipping-kit.set.weightKg": "{kg} kg",

    "addon.shipping-kit.notAffiliated": "Adminium steht in keiner Verbindung zu diesem Unternehmen.",
    "addon.shipping-kit.account.notConnectedTitle": "Ihr {carrier}-Konto ist nicht verbunden",
    "addon.shipping-kit.account.notConnectedBody": "Bis es verbunden ist, lassen sich keine Preise abrufen und keine Abholung buchen. Verbinden Sie es unter Add-ons oder schalten Sie in den {carrier}-Einstellungen den Demo-Versender ein, um den Ablauf zu testen, ohne etwas zu senden.",
    "addon.shipping-kit.account.demoNotice": "Demo-Versender: Preise und Buchungen hier sind simuliert, nichts erreicht {carrier}. Verbinden Sie Ihr {carrier}-Konto unter Add-ons und schalten Sie die Demo aus, um echt zu buchen.",
    "addon.shipping-kit.demoChip": "Demo-Versender — es wurde keine echte Sendung gebucht",
    "addon.shipping-kit.onlyCarrier": "{carrier} ist der einzige verbundene Lieferdienst.",
    "addon.shipping-kit.connectAnother": "Weitere unter Add-ons verbinden.",


    "addon.shipping-kit.setting.apiKey": "API-Schlüssel",
    "addon.shipping-kit.setting.accountNumber": "Kundennummer",
    "addon.shipping-kit.setting.demo": "Stattdessen den Demo-Versender nutzen",
    "addon.shipping-kit.setting.demoHint":
      "Preise, Etiketten und Sendungsverfolgung kommen aus einem hinterlegten Ersatz, sodass Sie den ganzen Ablauf ohne Konto ausprobieren können. Es geht nichts an einen echten Versender.",
    "addon.shipping-kit.setting.cutoff": "Annahmeschluss für die Abholung",
    "addon.shipping-kit.setting.cutoffHint":
      "Vorher gebucht, kommt der Fahrer noch am selben Nachmittag.",

    "addon.shipping-kit.action.book": "Abholung buchen",
    "addon.shipping-kit.parcel.title": "Das Paket",
    "addon.shipping-kit.parcel.sub": "Aus dem Auftrag übernommen. Ändern Sie, was nicht stimmt.",
    "addon.shipping-kit.parcel.contents": "Inhalt",
    "addon.shipping-kit.parcel.weight": "Gewicht",
    "addon.shipping-kit.parcel.dims": "Maße",
    "addon.shipping-kit.parcel.goingTo": "Geht an",

    // ── a customer this add-on cannot place ────────────────────────────────
    "addon.shipping-kit.dest.unknownTitle": "Keine Adresse für dieses Paket",
    "addon.shipping-kit.dest.unknownBody": "Der Betrieb hat nicht angegeben, wohin das Paket für {customer} geht, deshalb ist nichts vorausgefüllt. Tragen Sie die Adresse ein — es wird keine andere Adresse ersatzweise verwendet.",
    "addon.shipping-kit.dest.name": "Empfänger",
    "addon.shipping-kit.dest.street": "Straße",
    "addon.shipping-kit.dest.city": "Ort",
    "addon.shipping-kit.dest.needAddress": "Ort und Postleitzahl eintragen, dann Preise abrufen.",
    "addon.shipping-kit.parcel.contentsValue": "{quantity} × {what}",
    "addon.shipping-kit.parcel.contentsValueMore": "{quantity} × {what} und {more} weitere",
    "addon.shipping-kit.parcel.contentsFrom": "Aus Auftrag {ref}, Menge {quantity}",
    "addon.shipping-kit.parcel.weightFrom": "{kg}kg — {quantity} à {each}g, plus Karton",
    "addon.shipping-kit.parcel.weightAssumed": "{kg}kg — der Betrieb hat kein Gewicht angegeben für: {what}. Tragen Sie hier das echte Gewicht ein.",
    "addon.shipping-kit.parcel.weightShop": "{kg}kg — das eigene Gewicht von Auftrag {ref}, verpackt",
    "addon.shipping-kit.parcel.weightFromMany": "{kg}kg — {quantity} Stück mit zusammen {grams}g, plus Karton",
    "addon.shipping-kit.parcel.dimsFrom": "Ein Karton, passend zum Inhalt",
    "addon.shipping-kit.parcel.dimsFromTube": "Gerollt in einer Hülse — das längste Stück misst über 60cm",

    "addon.shipping-kit.rates.get": "Preise abrufen",
    "addon.shipping-kit.rates.title": "Preise für dieses Paket",
    "addon.shipping-kit.rates.simulated": "Diese Dienste, Preise und Termine kommen von einem Demo-Versender. Nichts geht an einen echten.",
    "addon.shipping-kit.rates.arrives": "da am {date}",
    "addon.shipping-kit.rates.cheapest": "am günstigsten",
    "addon.shipping-kit.rates.book": "Abholung buchen",
    "addon.shipping-kit.rates.cutoffLine":
      "Bis {cutoff} gebucht, kommt der Fahrer heute Nachmittag. Es ist jetzt {now}.",
    "addon.shipping-kit.rates.cutoffMissed":
      "Es ist {now} und damit nach dem Annahmeschluss um {cutoff} — der Wagen kommt am {day}.",
    "addon.shipping-kit.service.exp1200": "Express bis {by}",
    "addon.shipping-kit.service.expNwd": "Express, nächster Werktag",
    "addon.shipping-kit.service.eco2wd": "Sparversand, zweiter Werktag",

    "addon.shipping-kit.booked.title": "Abholung gebucht",
    "addon.shipping-kit.booked.tracking": "Sendungsnummer",
    "addon.shipping-kit.booked.window": "Abholfenster",
    "addon.shipping-kit.booked.service": "Versandart",
    "addon.shipping-kit.label.download": "Herunterladen",
    "addon.shipping-kit.label.print": "Drucken",
    "addon.shipping-kit.tracking.title": "Sendungsverfolgung",
    "addon.shipping-kit.tracking.simulated": "Demo-Versender — diese Scans sind simuliert",
    "addon.shipping-kit.event.collected": "Im Betrieb abgeholt",
    "addon.shipping-kit.event.atHub": "Im Verteilzentrum bearbeitet",
    "addon.shipping-kit.event.outForDelivery": "Beim Fahrer zur Zustellung",

    "addon.shipping-kit.error.title": "Der Versender hat diese Adresse abgelehnt",
    "addon.shipping-kit.error.simulated": "Demo-Versender — diese Ablehnung ist simuliert",
    "addon.shipping-kit.error.remedy1":
      "Prüfen Sie die Postleitzahl gegen das Zielland. Eine aus {country} sieht aus wie {example}.",
    "addon.shipping-kit.error.remedy2": "Stimmt die Adresse so, geben Sie das Paket über den Tresen und markieren Sie es als abgeholt.",
    "addon.shipping-kit.error.retry": "Erneut versuchen",
    "addon.shipping-kit.error.postcode": "Postleitzahl",
    "addon.shipping-kit.error.country": "Land",

    "addon.shipping-kit.checkout.title": "Zustellung mit {carrier}",
    "addon.shipping-kit.checkout.sub": "Aus dem Inhalt Ihres Warenkorbs ermittelt.",
    "addon.shipping-kit.checkout.fromReady":
      "Gerechnet ab {day}, dem ersten Tag, an dem der Laden das Paket abgeben kann.",
    "addon.shipping-kit.checkout.simulated":
      "Diese Preise kommen von einem Demo-Versender. Es geht nichts an einen echten.",
    "addon.shipping-kit.panel.carrier": "Versender",
    "addon.shipping-kit.panel.due": "Erwartet",
    "addon.shipping-kit.panel.notSent": "Dieser Auftrag ist noch nicht mit einem Versender unterwegs.",
    "addon.shipping-kit.panel.trackIt": "Sendung verfolgen",
    "addon.shipping-kit.panel.noPage":
      "Der Demo-Versender hat keine eigene Verfolgungsseite — mehr als die Ereignisse oben gibt es nicht.",

    // ── the inbound half: a prepaid return label ──────────────────────────
    "addon.shipping-kit.returns.title": "Vorausbezahltes Rücksendeetikett",
    "addon.shipping-kit.returns.intro": "Holen Sie ein Etikett, um dies zurückzuschicken. Der Betrieb übernimmt das Porto — Sie kleben das Etikett auf das Paket und geben es ab.",
    "addon.shipping-kit.returns.toDepot": "Es geht zurück an {name}, {city}.",
    "addon.shipping-kit.returns.notSetUp": "Der Betrieb hat dem Versanddienst noch keine Rücksendeadresse genannt, deshalb kann hier kein Etikett erstellt werden.",
    "addon.shipping-kit.returns.sender": "Abholung an Ihrer Adresse",
    "addon.shipping-kit.returns.senderName": "Ihr Name",
    "addon.shipping-kit.returns.parcelNote": "Angenommen wird ein kleines Paket — etwa {kg} kg mit Karton. Das Depot wiegt, was tatsächlich ankommt.",
    "addon.shipping-kit.returns.make": "Vorausbezahltes Etikett erstellen",
    "addon.shipping-kit.returns.made": "Rücksendeetikett bereit",
    "addon.shipping-kit.returns.apply": "Drucken Sie es, kleben Sie es auf das Paket und geben Sie das Paket ab. Die Sendungsverfolgung begleitet es zurück.",
    "addon.shipping-kit.set.returns": "Rücksendeadresse",
    "addon.shipping-kit.set.returnsName": "Name auf dem Etikett",
    "addon.shipping-kit.set.returnsNote": "Wohin das Rücksendepaket einer Kundin oder eines Kunden geliefert wird. Ohne Adresse hier sagt die Rücksendefläche genau das und erstellt nichts.",
    "addon.shipping-kit.setting.returnsName": "Rücksendeadresse — Name auf dem Etikett",
    "addon.shipping-kit.setting.returnsLines": "Rücksendeadresse — Straße",
    "addon.shipping-kit.setting.returnsCity": "Rücksendeadresse — Ort",
    "addon.shipping-kit.setting.returnsPostcode": "Rücksendeadresse — Postleitzahl",
    "addon.shipping-kit.setting.returnsCountry": "Rücksendeadresse — Land",
  },

  "fr-FR": {
    "addon.shipping-kit.set.demo": "Utiliser le transporteur de démonstration",
    "addon.shipping-kit.set.demoOn": "Tarifs, étiquettes et suivi viennent d'un substitut pré-rempli. Rien n'atteint un vrai transporteur.",
    "addon.shipping-kit.set.demoOff": "Les tarifs, étiquettes et suivis viennent du transporteur avec le compte connecté. Sans compte connecté, rien n'est demandé ni réservé.",
    // ── Host chrome this add-on owns: the connect sentence, its own settings
    //    panel copy, what a disconnect takes and keeps, and its activity lines.
    "addon.shipping-kit.set.cutoffLabel": "Heure limite d'enlèvement",
    "addon.shipping-kit.set.cutoffNote": "Réservez avant, et le chauffeur passe le même après-midi.",
    "addon.shipping-kit.set.weights": "Poids de colis par défaut",
    "addon.shipping-kit.set.weightsNote": "Calculés d'après le poids unitaire indiqué par l'atelier, plus le carton. Les tarifs derrière eux se modifient dans votre tableau de bord Adminium.",
    "addon.shipping-kit.set.weightAssumed": "{kg} kg — estimé",
    "addon.shipping-kit.set.weightKg": "{kg} kg",

    "addon.shipping-kit.notAffiliated": "Adminium n'est affilié à aucune de ces sociétés.",
    "addon.shipping-kit.account.notConnectedTitle": "Votre compte {carrier} n'est pas connecté",
    "addon.shipping-kit.account.notConnectedBody": "Tant qu'il ne l'est pas, impossible d'obtenir les tarifs ou de réserver un enlèvement. Connectez-le dans Add-ons, ou activez le transporteur de démonstration dans les réglages {carrier} pour essayer sans rien envoyer.",
    "addon.shipping-kit.account.demoNotice": "Transporteur de démonstration : les tarifs et réservations ici sont simulés et rien n'arrive chez {carrier}. Connectez votre compte {carrier} dans Add-ons et désactivez la démonstration pour réserver pour de vrai.",
    "addon.shipping-kit.demoChip": "Transporteur de démonstration — aucun envoi réel n'a été créé",
    "addon.shipping-kit.onlyCarrier": "{carrier} est la seule société de livraison connectée.",
    "addon.shipping-kit.connectAnother": "Connectez-en une autre dans Add-ons.",


    "addon.shipping-kit.setting.apiKey": "Clé API",
    "addon.shipping-kit.setting.accountNumber": "Numéro de compte",
    "addon.shipping-kit.setting.demo": "Utiliser plutôt le transporteur de démonstration",
    "addon.shipping-kit.setting.demoHint":
      "Les tarifs, les étiquettes et le suivi viennent d'un remplaçant préchargé : vous essayez tout le parcours sans compte. Rien n'est envoyé à un vrai transporteur.",
    "addon.shipping-kit.setting.cutoff": "Heure limite d'enlèvement",
    "addon.shipping-kit.setting.cutoffHint":
      "Réservez avant cette heure et le chauffeur passe l'après-midi même.",

    "addon.shipping-kit.action.book": "Réserver un enlèvement",
    "addon.shipping-kit.parcel.title": "Le colis",
    "addon.shipping-kit.parcel.sub": "Rempli depuis la commande. Corrigez ce qui ne va pas.",
    "addon.shipping-kit.parcel.contents": "Contenu",
    "addon.shipping-kit.parcel.weight": "Poids",
    "addon.shipping-kit.parcel.dims": "Dimensions",
    "addon.shipping-kit.parcel.goingTo": "Destinataire",

    // ── a customer this add-on cannot place ────────────────────────────────
    "addon.shipping-kit.dest.unknownTitle": "Aucune adresse pour ce colis",
    "addon.shipping-kit.dest.unknownBody": "L'atelier n'a pas indiqué où va le colis de {customer} ; rien n'a été prérempli. Saisissez l'adresse — aucune autre adresse client n'est utilisée à la place.",
    "addon.shipping-kit.dest.name": "Nom du destinataire",
    "addon.shipping-kit.dest.street": "Rue",
    "addon.shipping-kit.dest.city": "Ville",
    "addon.shipping-kit.dest.needAddress": "Indiquez une ville et un code postal avant d'obtenir les tarifs.",
    "addon.shipping-kit.parcel.contentsValue": "{quantity} × {what}",
    "addon.shipping-kit.parcel.contentsValueMore": "{quantity} × {what} et {more} de plus",
    "addon.shipping-kit.parcel.contentsFrom": "Depuis la commande {ref}, quantité {quantity}",
    "addon.shipping-kit.parcel.weightFrom": "{kg}kg — {quantity} à {each}g pièce, plus le carton",
    "addon.shipping-kit.parcel.weightAssumed": "{kg}kg — l'atelier n'a pas donné de poids pour : {what}. Saisissez ici le poids réel.",
    "addon.shipping-kit.parcel.weightShop": "{kg}kg — le poids de la commande {ref}, emballée",
    "addon.shipping-kit.parcel.weightFromMany": "{kg}kg — {quantity} articles pesant {grams}g au total, plus le carton",
    "addon.shipping-kit.parcel.dimsFrom": "Un carton à la taille du contenu",
    "addon.shipping-kit.parcel.dimsFromTube": "Roulé en tube — la pièce la plus longue dépasse 60cm",

    "addon.shipping-kit.rates.get": "Obtenir les tarifs",
    "addon.shipping-kit.rates.title": "Tarifs de ce colis",
    "addon.shipping-kit.rates.simulated": "Ces services, tarifs et dates viennent d'un transporteur de démonstration. Rien n'est envoyé à un vrai.",
    "addon.shipping-kit.rates.arrives": "arrive le {date}",
    "addon.shipping-kit.rates.cheapest": "le moins cher",
    "addon.shipping-kit.rates.book": "Réserver l'enlèvement",
    "addon.shipping-kit.rates.cutoffLine":
      "Réservez avant {cutoff} et le chauffeur passe cet après-midi. Il est {now}.",
    "addon.shipping-kit.rates.cutoffMissed":
      "Il est {now}, après l'heure limite de {cutoff} : la camionnette passera le {day}.",
    "addon.shipping-kit.service.exp1200": "Express avant {by}",
    "addon.shipping-kit.service.expNwd": "Express, jour ouvré suivant",
    "addon.shipping-kit.service.eco2wd": "Économique, deuxième jour ouvré",

    "addon.shipping-kit.booked.title": "Enlèvement réservé",
    "addon.shipping-kit.booked.tracking": "Numéro de suivi",
    "addon.shipping-kit.booked.window": "Créneau d'enlèvement",
    "addon.shipping-kit.booked.service": "Service",
    "addon.shipping-kit.label.download": "Télécharger",
    "addon.shipping-kit.label.print": "Imprimer",
    "addon.shipping-kit.tracking.title": "Suivi",
    "addon.shipping-kit.tracking.simulated": "Transporteur de démonstration — scans simulés",
    "addon.shipping-kit.event.collected": "Enlevé à l'atelier",
    "addon.shipping-kit.event.atHub": "Trié au centre de tri",
    "addon.shipping-kit.event.outForDelivery": "En tournée de livraison",

    "addon.shipping-kit.error.title": "Le transporteur a refusé cette adresse",
    "addon.shipping-kit.error.simulated": "Transporteur de démonstration — refus simulé",
    "addon.shipping-kit.error.remedy1":
      "Vérifiez le code postal par rapport au pays de destination. Un code {country} ressemble à {example}.",
    "addon.shipping-kit.error.remedy2": "Si l'adresse est correcte telle quelle, remettez le colis au comptoir et marquez-le comme retiré.",
    "addon.shipping-kit.error.retry": "Réessayer",
    "addon.shipping-kit.error.postcode": "Code postal",
    "addon.shipping-kit.error.country": "Pays",

    "addon.shipping-kit.checkout.title": "Livraison par {carrier}",
    "addon.shipping-kit.checkout.sub": "Calculé d'après le contenu de votre panier.",
    "addon.shipping-kit.checkout.fromReady":
      "Compté à partir du {day}, premier jour où la boutique peut le remettre.",
    "addon.shipping-kit.checkout.simulated":
      "Ces tarifs viennent d'un transporteur de démonstration. Rien n'est envoyé à un vrai.",
    "addon.shipping-kit.panel.carrier": "Transporteur",
    "addon.shipping-kit.panel.due": "Attendu",
    "addon.shipping-kit.panel.notSent": "Cette commande n'est pas encore partie avec un transporteur.",
    "addon.shipping-kit.panel.trackIt": "Suivre le colis",
    "addon.shipping-kit.panel.noPage":
      "Le transporteur de démonstration n'a pas de page de suivi : les étapes ci-dessus sont tout ce qu'il y a.",

    // ── the inbound half: a prepaid return label ──────────────────────────
    "addon.shipping-kit.returns.title": "Étiquette de retour prépayée",
    "addon.shipping-kit.returns.intro": "Obtenez une étiquette pour renvoyer ceci. L'atelier prend le transport en charge — collez l'étiquette sur le colis et déposez-le.",
    "addon.shipping-kit.returns.toDepot": "Il repart vers {name}, {city}.",
    "addon.shipping-kit.returns.notSetUp": "L'atelier n'a pas encore indiqué d'adresse de retour au transporteur ; aucune étiquette ne peut donc être créée ici.",
    "addon.shipping-kit.returns.sender": "Enlèvement à votre adresse",
    "addon.shipping-kit.returns.senderName": "Votre nom",
    "addon.shipping-kit.returns.parcelNote": "Un petit colis est supposé — environ {kg} kg avec le carton. Le dépôt pèse ce qui arrive réellement.",
    "addon.shipping-kit.returns.make": "Obtenir l'étiquette prépayée",
    "addon.shipping-kit.returns.made": "Étiquette de retour prête",
    "addon.shipping-kit.returns.apply": "Imprimez-la, fixez-la sur le colis et déposez le colis. Le suivi l'accompagne au retour.",
    "addon.shipping-kit.set.returns": "Adresse de retour",
    "addon.shipping-kit.set.returnsName": "Nom sur l'étiquette",
    "addon.shipping-kit.set.returnsNote": "Où est livré le colis de retour d'un client. Sans adresse ici, la surface de retour le dit et ne crée rien.",
    "addon.shipping-kit.setting.returnsName": "Adresse de retour — nom sur l'étiquette",
    "addon.shipping-kit.setting.returnsLines": "Adresse de retour — rue",
    "addon.shipping-kit.setting.returnsCity": "Adresse de retour — ville",
    "addon.shipping-kit.setting.returnsPostcode": "Adresse de retour — code postal",
    "addon.shipping-kit.setting.returnsCountry": "Adresse de retour — pays",
  },

  "cs-CZ": {
    "addon.shipping-kit.set.demo": "Použít ukázkového dopravce",
    "addon.shipping-kit.set.demoOn": "Ceny, štítky i sledování se vracejí z připravené náhrady. K opravdovému dopravci se nedostane nic.",
    "addon.shipping-kit.set.demoOff": "Ceny, štítky a sledování přicházejí od dopravce přes připojený účet. Bez připojeného účtu se nic nepoptává ani neobjednává.",
    // ── Host chrome this add-on owns: the connect sentence, its own settings
    //    panel copy, what a disconnect takes and keeps, and its activity lines.
    "addon.shipping-kit.set.cutoffLabel": "Uzávěrka svozu",
    "addon.shipping-kit.set.cutoffNote": "Objednejte dřív a řidič přijede ještě odpoledne.",
    "addon.shipping-kit.set.weights": "Výchozí hmotnosti balíků",
    "addon.shipping-kit.set.weightsNote": "Spočítané z hmotnosti jednoho kusu, kterou uvádí dílna, plus krabice. Ceník za nimi se upravuje ve vašem panelu Adminium.",
    "addon.shipping-kit.set.weightAssumed": "{kg} kg — odhad",
    "addon.shipping-kit.set.weightKg": "{kg} kg",

    "addon.shipping-kit.notAffiliated": "Adminium není nijak spojeno s touto společností.",
    "addon.shipping-kit.account.notConnectedTitle": "Váš účet {carrier} není připojen",
    "addon.shipping-kit.account.notConnectedBody": "Dokud není, nelze získat ceny ani objednat svoz. Připojte ho v Doplňcích, nebo v nastavení {carrier} zapněte ukázkového dopravce a vyzkoušejte postup, aniž by se cokoli odeslalo.",
    "addon.shipping-kit.account.demoNotice": "Ukázkový dopravce: ceny a objednávky jsou zde simulované a nic se nedostane k {carrier}. Chcete-li objednávat doopravdy, připojte svůj účet {carrier} v Doplňcích a ukázku vypněte.",
    "addon.shipping-kit.demoChip": "Demo dopravce — žádná skutečná zásilka nevznikla",
    "addon.shipping-kit.onlyCarrier": "{carrier} je jediný připojený dopravce.",
    "addon.shipping-kit.connectAnother": "Další připojíte v Doplňcích.",


    "addon.shipping-kit.setting.apiKey": "Klíč API",
    "addon.shipping-kit.setting.accountNumber": "Číslo účtu",
    "addon.shipping-kit.setting.demo": "Použít místo toho demo dopravce",
    "addon.shipping-kit.setting.demoHint":
      "Sazby, štítky i sledování se vracejí z připravené náhrady, takže si celý postup vyzkoušíte bez účtu. Skutečnému dopravci se neodesílá nic.",
    "addon.shipping-kit.setting.cutoff": "Uzávěrka svozu",
    "addon.shipping-kit.setting.cutoffHint":
      "Objednáte-li dřív, řidič přijede ještě týž den odpoledne.",

    "addon.shipping-kit.action.book": "Objednat svoz",
    "addon.shipping-kit.parcel.title": "Zásilka",
    "addon.shipping-kit.parcel.sub": "Vyplněno z objednávky. Co nesedí, přepište.",
    "addon.shipping-kit.parcel.contents": "Obsah",
    "addon.shipping-kit.parcel.weight": "Hmotnost",
    "addon.shipping-kit.parcel.dims": "Rozměry",
    "addon.shipping-kit.parcel.goingTo": "Adresát",

    // ── a customer this add-on cannot place ────────────────────────────────
    "addon.shipping-kit.dest.unknownTitle": "K této zásilce není adresa",
    "addon.shipping-kit.dest.unknownBody": "Dílna neuvedla, kam má zásilka {customer} jít, takže není nic předvyplněno. Napište adresu — žádná jiná adresa se místo ní nepoužije.",
    "addon.shipping-kit.dest.name": "Příjemce",
    "addon.shipping-kit.dest.street": "Ulice",
    "addon.shipping-kit.dest.city": "Město",
    "addon.shipping-kit.dest.needAddress": "Doplňte město a PSČ, teprve pak zjistíte sazby.",
    "addon.shipping-kit.parcel.contentsValue": "{quantity} × {what}",
    "addon.shipping-kit.parcel.contentsValueMore": "{quantity} × {what} a {more} dalších",
    "addon.shipping-kit.parcel.contentsFrom": "Z objednávky {ref}, množství {quantity}",
    "addon.shipping-kit.parcel.weightFrom": "{kg}kg — {quantity} po {each}g, plus krabice",
    "addon.shipping-kit.parcel.weightAssumed": "{kg}kg — dílna neuvedla hmotnost u: {what}. Napište sem skutečnou hmotnost.",
    "addon.shipping-kit.parcel.weightShop": "{kg}kg — vlastní hmotnost objednávky {ref}, zabalené",
    "addon.shipping-kit.parcel.weightFromMany": "{kg}kg — {quantity} ks o celkové hmotnosti {grams}g, plus krabice",
    "addon.shipping-kit.parcel.dimsFrom": "Krabice na míru obsahu",
    "addon.shipping-kit.parcel.dimsFromTube": "Sroluje se do tubusu — nejdelší kus přesahuje 60cm",

    "addon.shipping-kit.rates.get": "Zjistit sazby",
    "addon.shipping-kit.rates.title": "Sazby této zásilky",
    "addon.shipping-kit.rates.simulated": "Tyto služby, sazby i termíny pocházejí z ukázkového dopravce. Nic se neposílá skutečnému.",
    "addon.shipping-kit.rates.arrives": "dorazí {date}",
    "addon.shipping-kit.rates.cheapest": "nejlevnější",
    "addon.shipping-kit.rates.book": "Objednat svoz",
    "addon.shipping-kit.rates.cutoffLine":
      "Objednejte do {cutoff} a řidič přijede dnes odpoledne. Teď je {now}.",
    "addon.shipping-kit.rates.cutoffMissed":
      "Je {now}, tedy po uzávěrce v {cutoff} — vůz přijede {day}.",
    "addon.shipping-kit.service.exp1200": "Expres do {by}",
    "addon.shipping-kit.service.expNwd": "Expres, následující pracovní den",
    "addon.shipping-kit.service.eco2wd": "Úsporně, druhý pracovní den",

    "addon.shipping-kit.booked.title": "Svoz objednán",
    "addon.shipping-kit.booked.tracking": "Sledovací číslo",
    "addon.shipping-kit.booked.window": "Okno svozu",
    "addon.shipping-kit.booked.service": "Služba",
    "addon.shipping-kit.label.download": "Stáhnout",
    "addon.shipping-kit.label.print": "Vytisknout",
    "addon.shipping-kit.tracking.title": "Sledování",
    "addon.shipping-kit.tracking.simulated": "Demo dopravce — tyto záznamy jsou simulované",
    "addon.shipping-kit.event.collected": "Vyzvednuto v dílně",
    "addon.shipping-kit.event.atHub": "Roztříděno v depu",
    "addon.shipping-kit.event.outForDelivery": "Vezeme k adresátovi",

    "addon.shipping-kit.error.title": "Dopravce tuto adresu nepřijal",
    "addon.shipping-kit.error.simulated": "Demo dopravce — toto odmítnutí je simulované",
    "addon.shipping-kit.error.remedy1":
      "Zkontrolujte PSČ oproti cílové zemi. Zápis země {country} vypadá takto: {example}.",
    "addon.shipping-kit.error.remedy2": "Pokud je adresa správně, předejte zásilku přes pult a označte ji jako vyzvednutou.",
    "addon.shipping-kit.error.retry": "Zkusit znovu",
    "addon.shipping-kit.error.postcode": "PSČ",
    "addon.shipping-kit.error.country": "Země",

    "addon.shipping-kit.checkout.title": "Doručení s {carrier}",
    "addon.shipping-kit.checkout.sub": "Spočítáno z obsahu vašeho košíku.",
    "addon.shipping-kit.checkout.fromReady":
      "Počítáno od {day}, což je nejbližší den, kdy to obchod může předat.",
    "addon.shipping-kit.checkout.simulated":
      "Tyto sazby vrací demo dopravce. Skutečnému se neodesílá nic.",
    "addon.shipping-kit.panel.carrier": "Dopravce",
    "addon.shipping-kit.panel.due": "Očekáváme",
    "addon.shipping-kit.panel.notSent": "Tato zakázka zatím neodešla s dopravcem.",
    "addon.shipping-kit.panel.trackIt": "Sledovat zásilku",
    "addon.shipping-kit.panel.noPage":
      "Demo dopravce nemá vlastní stránku sledování — víc než události výše nenajdete.",

    // ── the inbound half: a prepaid return label ──────────────────────────
    "addon.shipping-kit.returns.title": "Předplacený štítek k vrácení",
    "addon.shipping-kit.returns.intro": "Získejte štítek a pošlete to zpět. Přepravu hradí dílna — štítek nalepíte na balík a balík předáte.",
    "addon.shipping-kit.returns.toDepot": "Míří zpět na adresu {name}, {city}.",
    "addon.shipping-kit.returns.notSetUp": "Dílna dopravci zatím nesdělila adresu vratek, takže tu štítek vytvořit nejde.",
    "addon.shipping-kit.returns.sender": "Vyzvednutí na vaší adrese",
    "addon.shipping-kit.returns.senderName": "Vaše jméno",
    "addon.shipping-kit.returns.parcelNote": "Počítá se s malým balíkem — zhruba {kg} kg i s krabicí. Depo zváží, co skutečně dorazí.",
    "addon.shipping-kit.returns.make": "Získat předplacený štítek",
    "addon.shipping-kit.returns.made": "Štítek k vrácení je připraven",
    "addon.shipping-kit.returns.apply": "Vytiskněte ho, nalepte na balík a balík předejte. Sledování jde s ním celou cestu zpět.",
    "addon.shipping-kit.set.returns": "Adresa vratek",
    "addon.shipping-kit.set.returnsName": "Jméno na štítku",
    "addon.shipping-kit.set.returnsNote": "Kam se doručí vrácený balík zákazníka. Bez adresy to plocha vratek řekne a nic nevytvoří.",
    "addon.shipping-kit.setting.returnsName": "Adresa vratek — jméno na štítku",
    "addon.shipping-kit.setting.returnsLines": "Adresa vratek — ulice",
    "addon.shipping-kit.setting.returnsCity": "Adresa vratek — město",
    "addon.shipping-kit.setting.returnsPostcode": "Adresa vratek — PSČ",
    "addon.shipping-kit.setting.returnsCountry": "Adresa vratek — země",
  },

  "da-DK": {
    "addon.shipping-kit.set.demo": "Brug demo-fragtfirmaet",
    "addon.shipping-kit.set.demoOn": "Priser, labels og sporing kommer fra en indlagt stedfortræder. Intet når et rigtigt fragtfirma.",
    "addon.shipping-kit.set.demoOff": "Priser, etiketter og sporing kommer fra fragtfirmaet med den tilsluttede konto. Uden en tilsluttet konto bliver intet forespurgt eller booket.",
    // ── Host chrome this add-on owns: the connect sentence, its own settings
    //    panel copy, what a disconnect takes and keeps, and its activity lines.
    "addon.shipping-kit.set.cutoffLabel": "Sidste frist for afhentning",
    "addon.shipping-kit.set.cutoffNote": "Bestil før den, og chaufføren kommer samme eftermiddag.",
    "addon.shipping-kit.set.weights": "Standardvægte for pakker",
    "addon.shipping-kit.set.weightsNote": "Regnet ud fra den stykvægt, værkstedet oplyser, plus kassen. Prislisten bag dem redigeres i jeres Adminium-dashboard.",
    "addon.shipping-kit.set.weightAssumed": "{kg} kg — anslået",
    "addon.shipping-kit.set.weightKg": "{kg} kg",

    "addon.shipping-kit.notAffiliated": "Adminium er ikke tilknyttet dette selskab.",
    "addon.shipping-kit.account.notConnectedTitle": "Din {carrier}-konto er ikke tilsluttet",
    "addon.shipping-kit.account.notConnectedBody": "Indtil den er, kan der ikke hentes priser eller bookes afhentning. Tilslut den under Add-ons, eller slå demo-fragtfirmaet til i {carrier}'s indstillinger for at prøve forløbet uden at sende noget.",
    "addon.shipping-kit.account.demoNotice": "Demo-fragtfirma: priser og bookinger her er simulerede, og intet når frem til {carrier}. Tilslut din {carrier}-konto under Add-ons og slå demoen fra for at booke rigtigt.",
    "addon.shipping-kit.demoChip": "Demo-fragtfirma — der blev ikke oprettet en rigtig forsendelse",
    "addon.shipping-kit.onlyCarrier": "{carrier} er det eneste tilsluttede fragtfirma.",
    "addon.shipping-kit.connectAnother": "Tilslut et mere under Add-ons.",


    "addon.shipping-kit.setting.apiKey": "API-nøgle",
    "addon.shipping-kit.setting.accountNumber": "Kundenummer",
    "addon.shipping-kit.setting.demo": "Brug demo-fragtfirmaet i stedet",
    "addon.shipping-kit.setting.demoHint":
      "Priser, labels og sporing kommer fra en fast stedfortræder, så I kan prøve hele forløbet uden en konto. Der sendes intet til et rigtigt fragtfirma.",
    "addon.shipping-kit.setting.cutoff": "Sidste frist for afhentning",
    "addon.shipping-kit.setting.cutoffHint":
      "Bestil inden da, så kommer chaufføren samme eftermiddag.",

    "addon.shipping-kit.action.book": "Bestil afhentning",
    "addon.shipping-kit.parcel.title": "Pakken",
    "addon.shipping-kit.parcel.sub": "Udfyldt fra ordren. Ret det, der ikke passer.",
    "addon.shipping-kit.parcel.contents": "Indhold",
    "addon.shipping-kit.parcel.weight": "Vægt",
    "addon.shipping-kit.parcel.dims": "Mål",
    "addon.shipping-kit.parcel.goingTo": "Sendes til",

    // ── a customer this add-on cannot place ────────────────────────────────
    "addon.shipping-kit.dest.unknownTitle": "Ingen adresse til denne pakke",
    "addon.shipping-kit.dest.unknownBody": "Værkstedet har ikke oplyst, hvor pakken til {customer} skal hen, så intet er udfyldt. Skriv adressen — ingen anden kundes adresse bruges i stedet.",
    "addon.shipping-kit.dest.name": "Modtager",
    "addon.shipping-kit.dest.street": "Vej og nummer",
    "addon.shipping-kit.dest.city": "By",
    "addon.shipping-kit.dest.needAddress": "Udfyld by og postnummer, før du henter priser.",
    "addon.shipping-kit.parcel.contentsValue": "{quantity} × {what}",
    "addon.shipping-kit.parcel.contentsValueMore": "{quantity} × {what} og {more} mere",
    "addon.shipping-kit.parcel.contentsFrom": "Fra ordre {ref}, antal {quantity}",
    "addon.shipping-kit.parcel.weightFrom": "{kg}kg — {quantity} à {each}g stykket, plus kassen",
    "addon.shipping-kit.parcel.weightAssumed": "{kg}kg — værkstedet har ikke oplyst vægten på: {what}. Skriv den rigtige vægt her.",
    "addon.shipping-kit.parcel.weightShop": "{kg}kg — ordre {ref}s egen vægt, pakket",
    "addon.shipping-kit.parcel.weightFromMany": "{kg}kg — {quantity} stk. der vejer {grams}g i alt, plus kassen",
    "addon.shipping-kit.parcel.dimsFrom": "En kasse i størrelsen efter indholdet",
    "addon.shipping-kit.parcel.dimsFromTube": "Rullet i et rør — det længste stykke er over 60cm",

    "addon.shipping-kit.rates.get": "Hent priser",
    "addon.shipping-kit.rates.title": "Priser for denne pakke",
    "addon.shipping-kit.rates.simulated": "Disse services, priser og datoer kommer fra et demo-fragtfirma. Intet sendes til et rigtigt.",
    "addon.shipping-kit.rates.arrives": "fremme {date}",
    "addon.shipping-kit.rates.cheapest": "billigst",
    "addon.shipping-kit.rates.book": "Bestil afhentningen",
    "addon.shipping-kit.rates.cutoffLine":
      "Bestil inden {cutoff}, så kommer chaufføren i eftermiddag. Klokken er {now}.",
    "addon.shipping-kit.rates.cutoffMissed":
      "Klokken er {now} og dermed efter fristen {cutoff} — bilen kommer {day}.",
    "addon.shipping-kit.service.exp1200": "Ekspres inden kl. {by}",
    "addon.shipping-kit.service.expNwd": "Ekspres, næste hverdag",
    "addon.shipping-kit.service.eco2wd": "Økonomi, anden hverdag",

    "addon.shipping-kit.booked.title": "Afhentning bestilt",
    "addon.shipping-kit.booked.tracking": "Sporingsnummer",
    "addon.shipping-kit.booked.window": "Afhentningsvindue",
    "addon.shipping-kit.booked.service": "Service",
    "addon.shipping-kit.label.download": "Hent",
    "addon.shipping-kit.label.print": "Udskriv",
    "addon.shipping-kit.tracking.title": "Sporing",
    "addon.shipping-kit.tracking.simulated": "Demo-fragtfirma — disse scanninger er simulerede",
    "addon.shipping-kit.event.collected": "Hentet på værkstedet",
    "addon.shipping-kit.event.atHub": "Sorteret i terminalen",
    "addon.shipping-kit.event.outForDelivery": "Med chaufføren ud",

    "addon.shipping-kit.error.title": "Fragtfirmaet ville ikke tage denne adresse",
    "addon.shipping-kit.error.simulated": "Demo-fragtfirma — dette afslag er simuleret",
    "addon.shipping-kit.error.remedy1":
      "Tjek postnummeret mod modtagerlandet. Et {country}-postnummer ser sådan ud: {example}.",
    "addon.shipping-kit.error.remedy2": "Er adressen rigtig, som den står, så udlevér pakken over disken og markér den som afhentet.",
    "addon.shipping-kit.error.retry": "Prøv igen",
    "addon.shipping-kit.error.postcode": "Postnummer",
    "addon.shipping-kit.error.country": "Land",

    "addon.shipping-kit.checkout.title": "Levering med {carrier}",
    "addon.shipping-kit.checkout.sub": "Regnet ud fra indholdet af din kurv.",
    "addon.shipping-kit.checkout.fromReady":
      "Regnet fra {day}, den første dag butikken kan aflevere pakken.",
    "addon.shipping-kit.checkout.simulated":
      "Priserne her kommer fra et demo-fragtfirma. Der sendes intet til et rigtigt.",
    "addon.shipping-kit.panel.carrier": "Fragtfirma",
    "addon.shipping-kit.panel.due": "Ventes",
    "addon.shipping-kit.panel.notSent": "Denne ordre er endnu ikke sendt af sted med et fragtfirma.",
    "addon.shipping-kit.panel.trackIt": "Følg pakken",
    "addon.shipping-kit.panel.noPage":
      "Demo-fragtfirmaet har ingen sporingsside — hændelserne ovenfor er det hele.",

    // ── the inbound half: a prepaid return label ──────────────────────────
    "addon.shipping-kit.returns.title": "Forudbetalt returetiket",
    "addon.shipping-kit.returns.intro": "Få en etiket til at sende dette tilbage. Værkstedet betaler fragten — du sætter etiketten på pakken og afleverer den.",
    "addon.shipping-kit.returns.toDepot": "Den går tilbage til {name}, {city}.",
    "addon.shipping-kit.returns.notSetUp": "Værkstedet har endnu ikke givet fragtfirmaet en returadresse, så der kan ikke laves en etiket her.",
    "addon.shipping-kit.returns.sender": "Afhentes på din adresse",
    "addon.shipping-kit.returns.senderName": "Dit navn",
    "addon.shipping-kit.returns.parcelNote": "Der regnes med en lille pakke — cirka {kg} kg med kassen. Depotet vejer det, der faktisk ankommer.",
    "addon.shipping-kit.returns.make": "Få den forudbetalte etiket",
    "addon.shipping-kit.returns.made": "Returetiketten er klar",
    "addon.shipping-kit.returns.apply": "Print den, sæt den på pakken og aflever pakken. Sporingen følger den tilbage.",
    "addon.shipping-kit.set.returns": "Returadresse",
    "addon.shipping-kit.set.returnsName": "Navn på etiketten",
    "addon.shipping-kit.set.returnsNote": "Hvor en kundes returpakke leveres. Uden en adresse her siger returfladen det og laver ingenting.",
    "addon.shipping-kit.setting.returnsName": "Returadresse — navn på etiketten",
    "addon.shipping-kit.setting.returnsLines": "Returadresse — gade",
    "addon.shipping-kit.setting.returnsCity": "Returadresse — by",
    "addon.shipping-kit.setting.returnsPostcode": "Returadresse — postnummer",
    "addon.shipping-kit.setting.returnsCountry": "Returadresse — land",
  },

  "zh-CN": {
    "addon.shipping-kit.set.demo": "使用演示快递",
    "addon.shipping-kit.set.demoOn": "运价、面单和轨迹都来自预置的替身。没有任何内容送到真实快递公司。",
    "addon.shipping-kit.set.demoOff": "运费、面单和跟踪信息通过已连接的账户来自快递公司。未连接账户时，不会询价或预约。",
    // ── Host chrome this add-on owns: the connect sentence, its own settings
    //    panel copy, what a disconnect takes and keeps, and its activity lines.
    "addon.shipping-kit.set.cutoffLabel": "取件截止时间",
    "addon.shipping-kit.set.cutoffNote": "在此之前预约，司机当天下午就来。",
    "addon.shipping-kit.set.weights": "默认包裹重量",
    "addon.shipping-kit.set.weightsNote": "按店里给出的单件重量加上包装箱算出。其后的价目表在 Adminium 控制台里修改。",
    "addon.shipping-kit.set.weightAssumed": "{kg} 公斤 — 估算",
    "addon.shipping-kit.set.weightKg": "{kg} 公斤",

    "addon.shipping-kit.notAffiliated": "Adminium 与该公司没有任何关联。",
    "addon.shipping-kit.account.notConnectedTitle": "你的 {carrier} 账户尚未连接",
    "addon.shipping-kit.account.notConnectedBody": "连接之前无法获取运费，也无法预约揽收。请在“插件”中连接，或在 {carrier} 设置中打开演示快递，先试用流程而不发送任何内容。",
    "addon.shipping-kit.account.demoNotice": "演示快递：此处的运费和预约均为模拟，不会发送给 {carrier}。请在“插件”中连接你的 {carrier} 账户并关闭演示，才能真正预约。",
    "addon.shipping-kit.demoChip": "演示承运商 — 未创建任何真实运单",
    "addon.shipping-kit.onlyCarrier": "目前只连接了 {carrier} 一家快递公司。",
    "addon.shipping-kit.connectAnother": "在“插件”中再连接一家。",


    "addon.shipping-kit.setting.apiKey": "API 密钥",
    "addon.shipping-kit.setting.accountNumber": "账号",
    "addon.shipping-kit.setting.demo": "改用演示承运商",
    "addon.shipping-kit.setting.demoHint":
      "运费、面单和轨迹都来自预置的替身，无需账号即可走完整个流程。不会向真实承运商发送任何内容。",
    "addon.shipping-kit.setting.cutoff": "取件截止时间",
    "addon.shipping-kit.setting.cutoffHint": "在此之前下单，司机当天下午就来。",

    "addon.shipping-kit.action.book": "预约取件",
    "addon.shipping-kit.parcel.title": "包裹",
    "addon.shipping-kit.parcel.sub": "根据订单填好。有不对的地方请改。",
    "addon.shipping-kit.parcel.contents": "内容物",
    "addon.shipping-kit.parcel.weight": "重量",
    "addon.shipping-kit.parcel.dims": "尺寸",
    "addon.shipping-kit.parcel.goingTo": "寄往",

    // ── a customer this add-on cannot place ────────────────────────────────
    "addon.shipping-kit.dest.unknownTitle": "这件包裹没有地址",
    "addon.shipping-kit.dest.unknownBody": "店里没有说明 {customer} 的包裹寄往何处，因此没有预填任何内容。请填写地址——不会用其他客户的地址顶替。",
    "addon.shipping-kit.dest.name": "收件人",
    "addon.shipping-kit.dest.street": "街道",
    "addon.shipping-kit.dest.city": "城市",
    "addon.shipping-kit.dest.needAddress": "先填城市和邮编，再查询运费。",
    "addon.shipping-kit.parcel.contentsValue": "{quantity} × {what}",
    "addon.shipping-kit.parcel.contentsValueMore": "{quantity} × {what}，另有 {more} 项",
    "addon.shipping-kit.parcel.contentsFrom": "来自订单 {ref}，数量 {quantity}",
    "addon.shipping-kit.parcel.weightFrom": "{kg} 公斤 — {quantity} 件，每件 {each} 克，加包装箱",
    "addon.shipping-kit.parcel.weightAssumed": "{kg} 公斤 — 店里没有给出这些的重量：{what}。请在此填写实际重量。",
    "addon.shipping-kit.parcel.weightShop": "{kg} 公斤 — 订单 {ref} 自己记录的包装后重量",
    "addon.shipping-kit.parcel.weightFromMany": "{kg} 公斤 — {quantity} 件共重 {grams} 克，加包装箱",
    "addon.shipping-kit.parcel.dimsFrom": "按内容物大小配的箱子",
    "addon.shipping-kit.parcel.dimsFromTube": "卷成筒装——最长的一件超过 60 厘米",

    "addon.shipping-kit.rates.get": "查询运费",
    "addon.shipping-kit.rates.title": "这件包裹的运费",
    "addon.shipping-kit.rates.simulated": "这些服务、运费和日期都来自演示承运商，不会发给真实承运商。",
    "addon.shipping-kit.rates.arrives": "{date} 送达",
    "addon.shipping-kit.rates.cheapest": "最便宜",
    "addon.shipping-kit.rates.book": "预约取件",
    "addon.shipping-kit.rates.cutoffLine": "{cutoff} 前预约，司机今天下午就来。现在是 {now}。",
    "addon.shipping-kit.rates.cutoffMissed": "现在是 {now}，已过 {cutoff} 的截止时间，车 {day} 来。",
    "addon.shipping-kit.service.exp1200": "特快，{by} 前送达",
    "addon.shipping-kit.service.expNwd": "特快，次个工作日",
    "addon.shipping-kit.service.eco2wd": "经济，第二个工作日",

    "addon.shipping-kit.booked.title": "取件已预约",
    "addon.shipping-kit.booked.tracking": "运单号",
    "addon.shipping-kit.booked.window": "取件时段",
    "addon.shipping-kit.booked.service": "服务",
    "addon.shipping-kit.label.download": "下载",
    "addon.shipping-kit.label.print": "打印",
    "addon.shipping-kit.tracking.title": "物流轨迹",
    "addon.shipping-kit.tracking.simulated": "演示承运商 — 这些轨迹为模拟结果",
    "addon.shipping-kit.event.collected": "已从店里取件",
    "addon.shipping-kit.event.atHub": "已在转运中心分拣",
    "addon.shipping-kit.event.outForDelivery": "派送员已带出",

    "addon.shipping-kit.error.title": "承运商不接受这个地址",
    "addon.shipping-kit.error.simulated": "演示承运商 — 此次拒收为模拟结果",
    "addon.shipping-kit.error.remedy1": "对照收件国家核对邮编。{country} 的邮编形如 {example}。",
    "addon.shipping-kit.error.remedy2": "如果地址本来就没错，请把包裹在柜台交付，并标记为已取走。",
    "addon.shipping-kit.error.retry": "再试一次",
    "addon.shipping-kit.error.postcode": "邮编",
    "addon.shipping-kit.error.country": "国家/地区",

    "addon.shipping-kit.checkout.title": "由 {carrier} 送达",
    "addon.shipping-kit.checkout.sub": "根据购物车里的东西算出来的。",
    "addon.shipping-kit.checkout.fromReady": "从 {day} 算起，那是店里最早能把它交出去的一天。",
    "addon.shipping-kit.checkout.simulated": "这些运费来自演示承运商，不会发给真实承运商。",
    "addon.shipping-kit.panel.carrier": "承运商",
    "addon.shipping-kit.panel.due": "预计",
    "addon.shipping-kit.panel.notSent": "这份订单还没有交给快递发出。",
    "addon.shipping-kit.panel.trackIt": "查看物流",
    "addon.shipping-kit.panel.noPage": "演示承运商没有自己的查询页面 — 上面的轨迹就是全部。",

    // ── the inbound half: a prepaid return label ──────────────────────────
    "addon.shipping-kit.returns.title": "预付退货标签",
    "addon.shipping-kit.returns.intro": "获取一张标签，把这件退回。运费由店里承担——你把标签贴在包裹上交寄即可。",
    "addon.shipping-kit.returns.toDepot": "它将寄回 {name}，{city}。",
    "addon.shipping-kit.returns.notSetUp": "店里尚未向承运商提供退货地址，因此这里无法生成标签。",
    "addon.shipping-kit.returns.sender": "从你的地址取件",
    "addon.shipping-kit.returns.senderName": "你的姓名",
    "addon.shipping-kit.returns.parcelNote": "按小包裹估算——连箱约 {kg} 公斤。仓库会以实际到件的重量为准。",
    "addon.shipping-kit.returns.make": "获取预付标签",
    "addon.shipping-kit.returns.made": "退货标签已就绪",
    "addon.shipping-kit.returns.apply": "打印后贴到包裹上，再把包裹交寄。下方的物流轨迹会随它一路回来。",
    "addon.shipping-kit.set.returns": "退货地址",
    "addon.shipping-kit.set.returnsName": "标签上的名称",
    "addon.shipping-kit.set.returnsNote": "顾客的退货包裹会送到这里。此处没有地址时，退货界面会如实说明，并且不会生成标签。",
    "addon.shipping-kit.setting.returnsName": "退货地址——标签上的名称",
    "addon.shipping-kit.setting.returnsLines": "退货地址——街道",
    "addon.shipping-kit.setting.returnsCity": "退货地址——城市",
    "addon.shipping-kit.setting.returnsPostcode": "退货地址——邮编",
    "addon.shipping-kit.setting.returnsCountry": "退货地址——国家或地区",
  },

  "zh-TW": {
    "addon.shipping-kit.set.demo": "使用示範快遞",
    "addon.shipping-kit.set.demoOn": "運價、面單和軌跡都來自預置的替身。沒有任何內容送到真實快遞公司。",
    "addon.shipping-kit.set.demoOff": "運費、標籤和追蹤資訊透過已連接的帳戶來自快遞業者。未連接帳戶時，不會詢價或預約。",
    // ── Host chrome this add-on owns: the connect sentence, its own settings
    //    panel copy, what a disconnect takes and keeps, and its activity lines.
    "addon.shipping-kit.set.cutoffLabel": "取件截止時間",
    "addon.shipping-kit.set.cutoffNote": "在此之前預約，司機當天下午就來。",
    "addon.shipping-kit.set.weights": "預設包裹重量",
    "addon.shipping-kit.set.weightsNote": "依店裡提供的單件重量加上包裝箱算出。其後的價目表在 Adminium 控制台裡修改。",
    "addon.shipping-kit.set.weightAssumed": "{kg} 公斤 — 估算",
    "addon.shipping-kit.set.weightKg": "{kg} 公斤",

    "addon.shipping-kit.notAffiliated": "Adminium 與該公司並無任何關聯。",
    "addon.shipping-kit.account.notConnectedTitle": "你的 {carrier} 帳戶尚未連接",
    "addon.shipping-kit.account.notConnectedBody": "連接之前無法取得運費，也無法預約收件。請在「附加元件」中連接，或在 {carrier} 設定中開啟示範快遞，先試用流程而不傳送任何內容。",
    "addon.shipping-kit.account.demoNotice": "示範快遞：此處的運費和預約均為模擬，不會傳送給 {carrier}。請在「附加元件」中連接你的 {carrier} 帳戶並關閉示範，才能真正預約。",
    "addon.shipping-kit.demoChip": "示範業者 — 未建立任何真實託運",
    "addon.shipping-kit.onlyCarrier": "目前只連接了 {carrier} 一家貨運公司。",
    "addon.shipping-kit.connectAnother": "在「附加元件」裡再連接一家。",


    "addon.shipping-kit.setting.apiKey": "API 金鑰",
    "addon.shipping-kit.setting.accountNumber": "帳號",
    "addon.shipping-kit.setting.demo": "改用示範業者",
    "addon.shipping-kit.setting.demoHint":
      "運費、標籤與追蹤都來自預設的替身，不必開帳號就能走完整個流程。不會送出任何東西給真實業者。",
    "addon.shipping-kit.setting.cutoff": "取件截止時間",
    "addon.shipping-kit.setting.cutoffHint": "在這之前預約，司機當天下午就到。",

    "addon.shipping-kit.action.book": "預約取件",
    "addon.shipping-kit.parcel.title": "包裹",
    "addon.shipping-kit.parcel.sub": "依訂單填好。有不對的地方請改。",
    "addon.shipping-kit.parcel.contents": "內容物",
    "addon.shipping-kit.parcel.weight": "重量",
    "addon.shipping-kit.parcel.dims": "尺寸",
    "addon.shipping-kit.parcel.goingTo": "寄往",

    // ── a customer this add-on cannot place ────────────────────────────────
    "addon.shipping-kit.dest.unknownTitle": "這件包裹沒有地址",
    "addon.shipping-kit.dest.unknownBody": "店裡沒有說明 {customer} 的包裹要寄到哪裡，因此沒有預先填入任何內容。請填寫地址——不會用其他顧客的地址頂替。",
    "addon.shipping-kit.dest.name": "收件人",
    "addon.shipping-kit.dest.street": "街道",
    "addon.shipping-kit.dest.city": "城市",
    "addon.shipping-kit.dest.needAddress": "先填城市和郵遞區號，再查詢運費。",
    "addon.shipping-kit.parcel.contentsValue": "{quantity} × {what}",
    "addon.shipping-kit.parcel.contentsValueMore": "{quantity} × {what}，另有 {more} 項",
    "addon.shipping-kit.parcel.contentsFrom": "來自訂單 {ref}，數量 {quantity}",
    "addon.shipping-kit.parcel.weightFrom": "{kg} 公斤 — {quantity} 件，每件 {each} 公克，加包裝箱",
    "addon.shipping-kit.parcel.weightAssumed": "{kg} 公斤 — 店裡沒有提供這些的重量：{what}。請在此填入實際重量。",
    "addon.shipping-kit.parcel.weightShop": "{kg} 公斤 — 訂單 {ref} 自己記錄的包裝後重量",
    "addon.shipping-kit.parcel.weightFromMany": "{kg} 公斤 — {quantity} 件共重 {grams} 公克，加包裝箱",
    "addon.shipping-kit.parcel.dimsFrom": "依內容物大小配的箱子",
    "addon.shipping-kit.parcel.dimsFromTube": "捲成筒裝——最長的一件超過 60 公分",

    "addon.shipping-kit.rates.get": "查詢運費",
    "addon.shipping-kit.rates.title": "這件包裹的運費",
    "addon.shipping-kit.rates.simulated": "這些服務、運費和日期都來自示範業者，不會送給真實業者。",
    "addon.shipping-kit.rates.arrives": "{date} 送達",
    "addon.shipping-kit.rates.cheapest": "最便宜",
    "addon.shipping-kit.rates.book": "預約取件",
    "addon.shipping-kit.rates.cutoffLine": "{cutoff} 前預約，司機今天下午就到。現在是 {now}。",
    "addon.shipping-kit.rates.cutoffMissed": "現在是 {now}，已過 {cutoff} 的截止時間，車 {day} 才來。",
    "addon.shipping-kit.service.exp1200": "快捷，{by} 前送達",
    "addon.shipping-kit.service.expNwd": "快捷，次一個工作天",
    "addon.shipping-kit.service.eco2wd": "經濟，第二個工作天",

    "addon.shipping-kit.booked.title": "取件已預約",
    "addon.shipping-kit.booked.tracking": "追蹤號碼",
    "addon.shipping-kit.booked.window": "取件時段",
    "addon.shipping-kit.booked.service": "服務",
    "addon.shipping-kit.label.download": "下載",
    "addon.shipping-kit.label.print": "列印",
    "addon.shipping-kit.tracking.title": "追蹤紀錄",
    "addon.shipping-kit.tracking.simulated": "示範業者 — 這些紀錄為模擬結果",
    "addon.shipping-kit.event.collected": "已從店裡取件",
    "addon.shipping-kit.event.atHub": "已在轉運站分揀",
    "addon.shipping-kit.event.outForDelivery": "外務員已帶出",

    "addon.shipping-kit.error.title": "貨運業者不收這個地址",
    "addon.shipping-kit.error.simulated": "示範業者 — 此次拒收為模擬結果",
    "addon.shipping-kit.error.remedy1": "對照收件國家核對郵遞區號。{country} 的寫法像 {example}。",
    "addon.shipping-kit.error.remedy2": "若地址本來就正確，請將包裹在櫃檯交付，並標記為已取走。",
    "addon.shipping-kit.error.retry": "再試一次",
    "addon.shipping-kit.error.postcode": "郵遞區號",
    "addon.shipping-kit.error.country": "國家/地區",

    "addon.shipping-kit.checkout.title": "由 {carrier} 配送",
    "addon.shipping-kit.checkout.sub": "依購物車裡的東西算出來的。",
    "addon.shipping-kit.checkout.fromReady": "從 {day} 算起，那是店裡最早能把它交出去的一天。",
    "addon.shipping-kit.checkout.simulated": "這些運費來自示範業者，不會送給真實業者。",
    "addon.shipping-kit.panel.carrier": "貨運業者",
    "addon.shipping-kit.panel.due": "預計",
    "addon.shipping-kit.panel.notSent": "這份訂單還沒有交給貨運寄出。",
    "addon.shipping-kit.panel.trackIt": "查看配送",
    "addon.shipping-kit.panel.noPage": "示範業者沒有自己的查詢頁 — 上面的紀錄就是全部。",

    // ── the inbound half: a prepaid return label ──────────────────────────
    "addon.shipping-kit.returns.title": "預付退貨標籤",
    "addon.shipping-kit.returns.intro": "取得一張標籤，把這件退回。運費由店裡負擔——你把標籤貼在包裹上交寄即可。",
    "addon.shipping-kit.returns.toDepot": "它將寄回 {name}，{city}。",
    "addon.shipping-kit.returns.notSetUp": "店裡尚未向承運業者提供退貨地址，因此這裡無法產生標籤。",
    "addon.shipping-kit.returns.sender": "從你的地址取件",
    "addon.shipping-kit.returns.senderName": "你的姓名",
    "addon.shipping-kit.returns.parcelNote": "按小包裹估算——連箱約 {kg} 公斤。倉庫會以實際到件的重量為準。",
    "addon.shipping-kit.returns.make": "取得預付標籤",
    "addon.shipping-kit.returns.made": "退貨標籤已就緒",
    "addon.shipping-kit.returns.apply": "列印後貼到包裹上，再把包裹交寄。下方的追蹤紀錄會隨它一路回來。",
    "addon.shipping-kit.set.returns": "退貨地址",
    "addon.shipping-kit.set.returnsName": "標籤上的名稱",
    "addon.shipping-kit.set.returnsNote": "顧客的退貨包裹會送到這裡。此處沒有地址時，退貨介面會如實說明，並且不會產生標籤。",
    "addon.shipping-kit.setting.returnsName": "退貨地址——標籤上的名稱",
    "addon.shipping-kit.setting.returnsLines": "退貨地址——街道",
    "addon.shipping-kit.setting.returnsCity": "退貨地址——城市",
    "addon.shipping-kit.setting.returnsPostcode": "退貨地址——郵遞區號",
    "addon.shipping-kit.setting.returnsCountry": "退貨地址——國家或地區",
  },

  "ar-EG": {
    "addon.shipping-kit.set.demo": "استخدم شركة الشحن التجريبية",
    "addon.shipping-kit.set.demoOn": "الأسعار والملصقات والتتبّع تأتي من بديل مُعدّ سلفًا. لا يصل شيء إلى شركة شحن حقيقية.",
    "addon.shipping-kit.set.demoOff": "تأتي الأسعار والملصقات والتتبع من شركة الشحن عبر الحساب المتصل. دون حساب متصل لا يُطلب سعر ولا يُحجز شيء.",
    // ── Host chrome this add-on owns: the connect sentence, its own settings
    //    panel copy, what a disconnect takes and keeps, and its activity lines.
    "addon.shipping-kit.set.cutoffLabel": "آخر موعد للاستلام",
    "addon.shipping-kit.set.cutoffNote": "احجز قبله ويأتي السائق بعد ظهر اليوم نفسه.",
    "addon.shipping-kit.set.weights": "أوزان الطرود الافتراضية",
    "addon.shipping-kit.set.weightsNote": "محسوبة من وزن القطعة الواحدة الذي يذكره المحل، زائد الصندوق. أما قائمة الأسعار خلفها فتُعدَّل من لوحة Adminium.",
    "addon.shipping-kit.set.weightAssumed": "{kg} كجم — تقديري",
    "addon.shipping-kit.set.weightKg": "{kg} كجم",

    "addon.shipping-kit.notAffiliated": "لا توجد أي علاقة بين Adminium وهذه الشركة.",
    "addon.shipping-kit.account.notConnectedTitle": "حسابك في {carrier} غير متصل",
    "addon.shipping-kit.account.notConnectedBody": "لا يمكن جلب الأسعار أو حجز استلام حتى يتصل. اربطه من صفحة الإضافات، أو شغّل شركة الشحن التجريبية في إعدادات {carrier} لتجربة الخطوات دون إرسال أي شيء.",
    "addon.shipping-kit.account.demoNotice": "شركة شحن تجريبية: الأسعار والحجوزات هنا محاكاة ولا يصل شيء إلى {carrier}. اربط حسابك في {carrier} من صفحة الإضافات وأوقف التجربة للحجز فعلًا.",
    "addon.shipping-kit.demoChip": "شركة شحن تجريبية — لم تُنشأ أي شحنة حقيقية",
    "addon.shipping-kit.onlyCarrier": "‏{carrier} هي شركة التوصيل الوحيدة الموصولة.",
    "addon.shipping-kit.connectAnother": "أضف غيرها من صفحة الإضافات.",


    "addon.shipping-kit.setting.apiKey": "مفتاح الـ API",
    "addon.shipping-kit.setting.accountNumber": "رقم الحساب",
    "addon.shipping-kit.setting.demo": "استخدم شركة الشحن التجريبية بدلاً منها",
    "addon.shipping-kit.setting.demoHint":
      "الأسعار والملصقات والتتبّع كلها من بديل مُعدّ سلفًا، فتجرّب المسار كاملًا دون حساب. ولا يُرسَل أي شيء إلى شركة شحن حقيقية.",
    "addon.shipping-kit.setting.cutoff": "آخر موعد لطلب الاستلام",
    "addon.shipping-kit.setting.cutoffHint": "احجز قبله يمر السائق بعد ظهر اليوم نفسه.",

    "addon.shipping-kit.action.book": "احجز موعد استلام",
    "addon.shipping-kit.parcel.title": "الطرد",
    "addon.shipping-kit.parcel.sub": "مملوء من الطلب. غيّر ما هو غير صحيح.",
    "addon.shipping-kit.parcel.contents": "المحتويات",
    "addon.shipping-kit.parcel.weight": "الوزن",
    "addon.shipping-kit.parcel.dims": "الأبعاد",
    "addon.shipping-kit.parcel.goingTo": "إلى",

    // ── a customer this add-on cannot place ────────────────────────────────
    "addon.shipping-kit.dest.unknownTitle": "لا يوجد عنوان لهذا الطرد",
    "addon.shipping-kit.dest.unknownBody": "لم يذكر المحل إلى أين يذهب طرد {customer}، لذلك لم يُملأ شيء. اكتب العنوان — ولن يُستخدم عنوان عميل آخر بدلًا منه.",
    "addon.shipping-kit.dest.name": "المرسَل إليه",
    "addon.shipping-kit.dest.street": "الشارع",
    "addon.shipping-kit.dest.city": "المدينة",
    "addon.shipping-kit.dest.needAddress": "اكتب المدينة والرمز البريدي قبل جلب الأسعار.",
    "addon.shipping-kit.parcel.contentsValue": "{quantity} × {what}",
    "addon.shipping-kit.parcel.contentsValueMore": "{quantity} × {what} و{more} غيرها",
    "addon.shipping-kit.parcel.contentsFrom": "من الطلب {ref}، الكمية {quantity}",
    "addon.shipping-kit.parcel.weightFrom": "{kg} كجم — {quantity} بوزن {each} جم للقطعة، زائد الصندوق",
    "addon.shipping-kit.parcel.weightAssumed": "{kg} كجم — لم يذكر المحل وزن: {what}. اكتب الوزن الحقيقي هنا.",
    "addon.shipping-kit.parcel.weightShop": "{kg} كجم — وزن الطلب {ref} نفسه، مغلفًا",
    "addon.shipping-kit.parcel.weightFromMany": "{kg} كجم — {quantity} قطع وزنها معًا {grams} جم، زائد الصندوق",
    "addon.shipping-kit.parcel.dimsFrom": "صندوق بمقاس ما بداخله",
    "addon.shipping-kit.parcel.dimsFromTube": "ملفوف في أسطوانة — أطول قطعة تتجاوز ٦٠ سم",

    "addon.shipping-kit.rates.get": "اجلب الأسعار",
    "addon.shipping-kit.rates.title": "أسعار هذا الطرد",
    "addon.shipping-kit.rates.simulated": "هذه الخدمات والأسعار والتواريخ من شركة شحن تجريبية. لا يُرسل شيء إلى شركة حقيقية.",
    "addon.shipping-kit.rates.arrives": "يصل {date}",
    "addon.shipping-kit.rates.cheapest": "الأرخص",
    "addon.shipping-kit.rates.book": "احجز الاستلام",
    "addon.shipping-kit.rates.cutoffLine":
      "احجز قبل {cutoff} يمر السائق بعد ظهر اليوم. الساعة الآن {now}.",
    "addon.shipping-kit.rates.cutoffMissed":
      "الساعة {now}، أي بعد آخر موعد {cutoff} — ستمر السيارة يوم {day}.",
    "addon.shipping-kit.service.exp1200": "سريع، قبل {by}",
    "addon.shipping-kit.service.expNwd": "سريع، يوم العمل التالي",
    "addon.shipping-kit.service.eco2wd": "اقتصادي، ثاني يوم عمل",

    "addon.shipping-kit.booked.title": "تم حجز الاستلام",
    "addon.shipping-kit.booked.tracking": "رقم التتبّع",
    "addon.shipping-kit.booked.window": "نافذة الاستلام",
    "addon.shipping-kit.booked.service": "الخدمة",
    "addon.shipping-kit.label.download": "تنزيل",
    "addon.shipping-kit.label.print": "طباعة",
    "addon.shipping-kit.tracking.title": "التتبّع",
    "addon.shipping-kit.tracking.simulated": "شركة شحن تجريبية — هذه الحركات محاكاة",
    "addon.shipping-kit.event.collected": "تم الاستلام من المحل",
    "addon.shipping-kit.event.atHub": "فُرز في المستودع",
    "addon.shipping-kit.event.outForDelivery": "مع مندوب التوصيل",

    "addon.shipping-kit.error.title": "شركة الشحن رفضت هذا العنوان",
    "addon.shipping-kit.error.simulated": "شركة شحن تجريبية — هذا الرفض محاكاة",
    "addon.shipping-kit.error.remedy1":
      "راجع الرمز البريدي مقابل بلد الوصول. رمز {country} يبدو هكذا: {example}.",
    "addon.shipping-kit.error.remedy2": "إذا كان العنوان صحيحًا كما هو، فسلّم الطرد على الطاولة وعلّمه كمستلَم.",
    "addon.shipping-kit.error.retry": "حاول مرة أخرى",
    "addon.shipping-kit.error.postcode": "الرمز البريدي",
    "addon.shipping-kit.error.country": "البلد",

    "addon.shipping-kit.checkout.title": "التوصيل عبر {carrier}",
    "addon.shipping-kit.checkout.sub": "محسوبة مما في سلّتك.",
    "addon.shipping-kit.checkout.fromReady":
      "محسوبة من {day}، وهو أول يوم يستطيع فيه المحل تسليم الطرد.",
    "addon.shipping-kit.checkout.simulated":
      "هذه الأسعار من شركة شحن تجريبية. ولا يُرسَل شيء إلى شركة حقيقية.",
    "addon.shipping-kit.panel.carrier": "شركة الشحن",
    "addon.shipping-kit.panel.due": "متوقّع",
    "addon.shipping-kit.panel.notSent": "لم يخرج هذا الطلب مع شركة شحن بعد.",
    "addon.shipping-kit.panel.trackIt": "تتبّع الشحنة",
    "addon.shipping-kit.panel.noPage":
      "شركة الشحن التجريبية ليس لها صفحة تتبّع خاصة — الأحداث أعلاه هي كل ما هناك.",

    // ── the inbound half: a prepaid return label ──────────────────────────
    "addon.shipping-kit.returns.title": "ملصق إرجاع مدفوع مسبقًا",
    "addon.shipping-kit.returns.intro": "احصل على ملصق لإعادة هذا. المحل يتحمل تكلفة النقل — ألصق الملصق على الطرد وسلّمه.",
    "addon.shipping-kit.returns.toDepot": "يعود إلى {name}، {city}.",
    "addon.shipping-kit.returns.notSetUp": "لم يزوّد المحل شركة الشحن بعنوان للإرجاع بعد، لذلك لا يمكن إنشاء ملصق هنا.",
    "addon.shipping-kit.returns.sender": "الاستلام من عنوانك",
    "addon.shipping-kit.returns.senderName": "اسمك",
    "addon.shipping-kit.returns.parcelNote": "نفترض طردًا صغيرًا — نحو {kg} كجم مع الصندوق. المستودع يزن ما يصل فعليًا.",
    "addon.shipping-kit.returns.make": "الحصول على الملصق المدفوع مسبقًا",
    "addon.shipping-kit.returns.made": "ملصق الإرجاع جاهز",
    "addon.shipping-kit.returns.apply": "اطبعه وألصقه على الطرد ثم سلّم الطرد. التتبع أدناه يرافقه في طريق العودة.",
    "addon.shipping-kit.set.returns": "عنوان الإرجاع",
    "addon.shipping-kit.set.returnsName": "الاسم على الملصق",
    "addon.shipping-kit.set.returnsNote": "المكان الذي يُسلَّم إليه طرد إرجاع العميل. بدون عنوان هنا، تقول واجهة الإرجاع ذلك ولا تنشئ شيئًا.",
    "addon.shipping-kit.setting.returnsName": "عنوان الإرجاع — الاسم على الملصق",
    "addon.shipping-kit.setting.returnsLines": "عنوان الإرجاع — الشارع",
    "addon.shipping-kit.setting.returnsCity": "عنوان الإرجاع — المدينة",
    "addon.shipping-kit.setting.returnsPostcode": "عنوان الإرجاع — الرمز البريدي",
    "addon.shipping-kit.setting.returnsCountry": "عنوان الإرجاع — البلد",
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

