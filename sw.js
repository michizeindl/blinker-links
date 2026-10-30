// Service Worker der Sammlung „Blinker links“: macht die Sammlung auf Android als App installierbar (ohne Chrome-Zeichen) und
// hält die Dateien für den Fall ohne Netz bereit. Strategie „zuerst Netz“: jede Anfrage geht ans Netz (Neues kommt sofort
// an); nur wenn das Netz fehlt, antwortet die Kopie aus dem Zwischenspeicher. Nur eigene Dateien, keine fremden Server.
// Beim ersten Besuch wird nur das Gerüst (HTML, CSS, JS, Schriften, Icons, Startseiten-Bild) vorab abgelegt. Spielbilder landen erst
// (ebenso die Klänge außer Blinker + Straße der Startseite) im Zwischenspeicher, wenn das Spiel sie lädt (fetch unten merkt jede vollständige eigene Antwort) – nach einer Fahrt geht es offline
// (seit v7 lädt das Spiel Bilder nur bei Bedarf: Motive, die noch in keiner Fahrt vorkamen, zeichnet offline der Code als Ersatz).
// Bei Änderungen an dieser Datei VERSION erhöhen – alte Zwischenspeicher dieser Sammlung (Präfix „blinker-links-“) werden gelöscht.
const PREFIX = 'blinker-links-';
const VERSION = PREFIX + 'v15';   // v15: Vorladen (29.10.2026) – Route schon im Startbild, Bilder der nächsten Situationen im Hintergrund, große Bilder erst klein (bilder/klein), Fassungen in ruhigen Momenten vorbereitet, Klänge weich überblendet, Wetter-Sprüche. v14: Nacht/Häuser (29.10.2026) – Tagesablauf (nie Nacht → Tag), weiche Licht-/Wetter-Überblendung, Lücke bei Personen zwischen Parkern (S033), Einzelhäuser in hoher Auflösung mit eigenen Verkleinerungsstufen. v13: kleine Runde (29.10.2026) – Tipps/Hinweise ohne „Gas“, Fahrlehrer-Blasen deckend mit Ton-Streifen, Warnung nach der zweiten Doppelbremse, quer „km/h“ frei, Startseite 320 × 640 ohne Scrollen, ferne Verkehrsteilnehmer/Schilder kontrastreicher. v12: Fassaden mit Tiefe (29.10.2026) – Seitenansichten je Haus (bilder/hausseite), Dach- und Putz-Texturen (bilder/textur), Garage als Lückenfüller. v11: Startseite (29.10.2026) – Anzeigezeile erst nach Fahrten, Tacho mittig, Knopf „Go“ mit Leerlauf-Vibration, Slogan entfernt. v10: Tunnel innen (29.10.2026) – Wände/Decke als Bild, Ausfahrt mit Ausblick-Bild, Portal-Öffnung durchsichtig, Blendung beim Ausfahren. v9: letzte Runde (29.10.2026) – Endbild mit Tipp/Mindestwertung, Protokoll größer, Tunnelportal + Tunnel innen, Kopfzeile „verdient“, Handgriff-Leiste, Doppelbremse-Hinweis. v8: Spielertest (29.10.2026) – geführte erste Fahrt, Punkte sichtbar, Kreuzung größer + Alltagssprache, Freischaltung ab 550, start/texte.js. v7: Phase-5-Korrektur (28.10.2026) – Bilder nur bei Bedarf (bilder.js), Querformat flach, Doppelbremse-Einblendung, Endbild-Figur, Intro-Pfeil, Startseite ohne Scrollen, kürzere Atmo-Schleifen, kleinere Icons. v6: Phase 4 (28.10.2026) – Klänge (klaenge/, start/klang.js; Blinker + Straße der Startseite vorab, alle übrigen Klänge wie die Bilder erst beim Abspielen im Laufzeit-Zwischenspeicher), Nachauftrags-Bilder. v5: Phase-3-Korrektur (28.10.2026) – markenneutrale Fahrzeuge; Spielbilder nicht mehr vorab, sondern erst beim Spielen abgelegt (Laufzeit-Zwischenspeicher). v4: Phase 3 (28.10.2026) – gestaltete Bilder (fahrschule-blinker-links/bilder/, start/mappe/), Fassaden, Himmel. v3: Phase 2b (28.10.2026) – alle Kreuzungen, Abbiegen/Kreisel, Führerscheinmappe (start/mappe.js, start/karten.js), Wetter, Routen; Netz-Anfragen ohne HTTP-Zwischenspeicher. v2: Phase 2a (28.10.2026) – 100 Situationen über Vorlagen (vorlagen.js), Warnblinker/Abblenden, Bild-Anschlüsse, Endbild-Tafel. v1: Phase 1.

const SPIEL = 'fahrschule-blinker-links/';
const GERUEST = [
  './', 'index.html', 'blinker-links.webmanifest',
  'start/start.css', 'start/start.js', 'start/intro.js', 'start/basis.js', 'start/icon.js', 'start/takt.js', 'start/scheibe.webp', 'start/mappe.js', 'start/karten.js', 'start/texte.js',
  'start/klang.js', 'klaenge/liste.js', 'klaenge/tick.mp3', 'klaenge/tack.mp3', 'klaenge/strasse.mp3',
  'kunde/kunde.js', 'kunde/logo-quer.svg', 'kunde/logo-hoch.svg', 'kunde/zeichen.svg',
  'schrift/schrift.css', 'schrift/kanit-light.woff2', 'schrift/kanit-regular.woff2', 'schrift/kanit-medium.woff2',
  'schrift/kanit-semibold.woff2', 'schrift/kanit-semibolditalic.woff2', 'schrift/kanit-extrabolditalic.woff2',
  'icons/icon.svg', 'icons/favicon.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-maskable-192.png',
  SPIEL, SPIEL + 'index.html', SPIEL + 'rahmen.css', SPIEL + 'rahmen.js', SPIEL + 'blinker.css', SPIEL + 'daten.js',
  SPIEL + 'texte.js', SPIEL + 'bilder.js', SPIEL + 'szene.js', SPIEL + 'schirme.js', SPIEL + 'vorlagen.js', SPIEL + 'spiel.js',
  SPIEL + 'bilder/platzhalter/land.webp', 'start/mappe/zu.webp', 'start/mappe/stempel.webp',
];

// einzeln ablegen: fehlt eine Datei (z. B. anderes Kundenlogo), bricht nicht alles ab
function ablegen(adressen) {
  return caches.open(VERSION).then(c => Promise.all(adressen.map(a => {
    const url = new URL(a, self.location.href).href;
    return fetch(url).then(r => (r.status === 200 && r.type === 'basic') ? c.put(url, r) : null).catch(() => null);
  })));
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(ablegen(GERUEST).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen.filter(n => n.startsWith(PREFIX) && n !== VERSION).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const anfrage = e.request, adresse = new URL(anfrage.url);
  if (anfrage.method !== 'GET' || adresse.origin !== self.location.origin) return;
  // cache: 'no-cache' = beim Server nachfragen (304 ist billig) statt eine alte Kopie aus dem HTTP-Zwischenspeicher des Browsers zu nehmen –
  // sonst zeigt der Browser nach einem Versionswechsel zuerst noch die alte Fassung (Fund Phase 2a)
  // (Seitenaufrufe „navigate“ dürfen nicht mit Zusatz-Optionen weitergereicht werden – dort die Adresse nehmen)
  e.respondWith(fetch(anfrage.mode === 'navigate' ? anfrage.url : anfrage, { cache: 'no-cache' }).then(antwort => {
    // nur vollständige eigene Antworten merken (keine Teilantworten, keine Fehlerseiten)
    if (antwort.status === 200 && antwort.type === 'basic' && !anfrage.headers.has('range')) {
      const kopie = antwort.clone();
      e.waitUntil(caches.open(VERSION).then(c => c.put(anfrage, kopie)).catch(() => {}));
    }
    return antwort;
  }).catch(() => caches.open(VERSION).then(c => c.match(anfrage, { ignoreSearch: true })).then(t => t || Response.error())));
});
