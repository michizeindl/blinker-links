// Gemeinsamer Blinker-Takt der Sammlung „Blinker links“ (Startseite: Cockpit-Pfeil; Spiel: Blinker-Kontrollleuchte).
// Ein Zeitgeber für Licht und (ab Phase 4) Klang: Der Blinker-Klang hängt sich mit BL_TAKT.bei(fn) an die Flanken
// (fn(true) = Licht geht an = „Tick“, fn(false) = Licht geht aus = „Tack“), damit Pfeil und Ticken nie auseinanderlaufen.
// Frequenz 1,5 Hz (90 Takte/min, Mitte des zulässigen Bereichs 60–120/min), Licht 50 % der Zeit an.
// reduced-motion: hell(t) liefert ein weiches Auf- und Abblenden statt hartem An/Aus (MZ, 28.10.2026).
(function () {
  'use strict';
  const PERIODE = 1 / 1.5;                  // Sekunden je Takt
  let null0 = performance.now() / 1000;     // Takt beginnt beim Laden „an“
  const ruhig = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const jetzt = () => performance.now() / 1000;
  const phase = t => (((t == null ? jetzt() : t) - null0) / PERIODE) % 1;
  const an = t => phase(t) < 0.5;
  // 0–1: Helligkeit der Lampe. Normal: hart an/aus mit kurzer Glühflanke (echte Lampe), ruhig: Sinus
  function hell(t) {
    const p = phase(t);
    if (ruhig()) return 0.5 - 0.5 * Math.cos(p * 2 * Math.PI);
    if (p < 0.5) return Math.min(1, p / 0.04);          // 25 ms Anglühen
    return Math.max(0, 1 - (p - 0.5) / 0.06);            // 40 ms Nachglühen
  }
  const abos = new Set();
  let letzt = null, laeuft = false;
  function schleife() {
    if (!abos.size) { laeuft = false; return; }
    const a = an();
    if (a !== letzt) { letzt = a; abos.forEach(f => { try { f(a); } catch (e) { /* Abonnent kaputt – Takt läuft weiter */ } }); }
    requestAnimationFrame(schleife);
  }
  window.BL_TAKT = {
    PERIODE, an, hell, phase, ruhig,
    // Takt neu beginnen lassen (z. B. wenn der Blinker im Spiel eingeschaltet wird – erstes Aufleuchten sofort)
    neu() { null0 = jetzt(); letzt = null; },
    bei(fn) { abos.add(fn); if (!laeuft) { laeuft = true; requestAnimationFrame(schleife); } return () => abos.delete(fn); },
  };
})();
