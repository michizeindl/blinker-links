// Gemeinsame Grundlagen der Sammlung „Blinker links“ für Startseite und Spiel: Stufen, Freischaltung, Bestwerte,
// Statistik (nur echte abgeschlossene Fahrten), Logo-Einbettung, Footer. Speicher nur localStorage mit Präfix „mg:“.
//   mg:best:blinker-links-<stufe>:<firma>   Bestwert je Stufe (schreibt der Rahmen bei Rahmen.ende, 0 zählt nie)
//   mg:blinker-links:stat:<firma>           Statistik (JSON, siehe statistik())
//   mg:blinker-links:stufe:<firma>          zuletzt gewählte Stufe
(function () {
  'use strict';
  const K = window.KUNDE || {};
  const FIRMA = K.firma || '';
  const STUFEN = [
    { id: 'fahrstunde', name: 'Fahrstunde' },
    { id: 'uebung', name: 'Übungsfahrt' },
    { id: 'pruefung', name: 'Prüfungsfahrt' },
  ];
  const lesen = k => { try { return localStorage.getItem('mg:' + k); } catch (e) { return null; } };
  const schreiben = (k, v) => { try { localStorage.setItem('mg:' + k, v); } catch (e) { /* privat / gesperrt */ } };
  const bestId = stufe => 'blinker-links-' + stufe;
  function best(stufe) { const b = lesen('best:' + bestId(stufe) + ':' + FIRMA); return b == null ? null : +b; }

  // Statistik: nur abgeschlossene Fahrten (kein Abbruch) zählen (Auftrag Phase 1)
  //   fahrten, abgeschlossen: { fahrstunde, uebung, pruefung }, doppelbremsen, schulterOk, schulterAlle, karten: [ID, …]
  function statistik() {
    let s = null;
    try { s = JSON.parse(lesen('blinker-links:stat:' + FIRMA) || 'null'); } catch (e) { s = null; }
    s = Object.assign({ fahrten: 0, abgeschlossen: {}, doppelbremsen: 0, schulterOk: 0, schulterAlle: 0, karten: [] }, s || {});
    if (!Array.isArray(s.karten)) s.karten = [];
    return altFrei(s);
  }
  function statistikSpeichern(s) { schreiben('blinker-links:stat:' + FIRMA, JSON.stringify(s)); }

  // Freischaltung (MZ, 29.10.2026): Übungsfahrt ab 550 Punkten (Bestwert) in der Fahrstunde, Prüfungsfahrt ab 550 in der Übungsfahrt.
  // Bereits gespeicherte Freischaltungen (alte Regel: eine abgeschlossene Fahrt der Stufe davor) bleiben: beim ersten Lesen nach dem
  // Wechsel werden sie einmal in s.frei übernommen (s.regel = 2).
  const FREI_AB = 550;
  const VORHER = { uebung: 'fahrstunde', pruefung: 'uebung' };
  function frei(stufe, s) {
    s = s || statistik();
    const v = VORHER[stufe];
    if (!v) return true;
    return !!(s.frei && s.frei[stufe]) || (best(v) || 0) >= FREI_AB;
  }
  function altFrei(s) {
    if (s.regel === 2) return s;
    s.frei = Object.assign({}, s.frei, { uebung: (s.abgeschlossen.fahrstunde || 0) > 0 || undefined, pruefung: (s.abgeschlossen.uebung || 0) > 0 || undefined });
    Object.keys(s.frei).forEach(k => { if (!s.frei[k]) delete s.frei[k]; });
    s.regel = 2;
    if (s.fahrten > 0 || Object.keys(s.frei).length) statistikSpeichern(s);
    return s;
  }
  function gewaehlt() {
    const g = lesen('blinker-links:stufe:' + FIRMA);
    return STUFEN.some(x => x.id === g) && frei(g) ? g : 'fahrstunde';
  }
  function waehlen(stufe) { schreiben('blinker-links:stufe:' + FIRMA, stufe); }

  const zahl = n => Math.round(n).toLocaleString('de-DE');
  const ruhig = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || /[#&]ruhig\b/.test(location.hash);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Logo als eingebettetes SVG (Gruppen #zeichen/#schriftzug bleiben fürs Intro erreichbar). Nur echte SVGs ohne Skript;
  // über file:// oder bei Fehlern als <img>. farbe = CSS-Farbe für Zeichen und Schrift (z. B. weiß im Intro).
  function logoEinbetten(el, adresse) {
    const alsBild = () => { el.innerHTML = `<img src="${esc(adresse)}" alt="">`; return null; };
    if (!adresse) return Promise.resolve(null);
    if (location.protocol === 'file:') return Promise.resolve(alsBild());
    return fetch(adresse).then(r => r.ok ? r.text() : Promise.reject()).then(t => {
      const s = t.trim();
      if (!/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(s) || /<script|on\w+=/i.test(s)) return alsBild();
      el.innerHTML = s.replace(/<title>.*?<\/title>/s, '');
      const svg = el.querySelector('svg');
      if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.removeAttribute('role'); }
      return svg;
    }).catch(alsBild);
  }

  // Footer (MZ, 28.10.2026): Kontaktdaten, Datenschutz/Impressum nur unterstrichen – nichts verlinkt oder anklickbar
  function fussHtml() {
    const z1 = (K.kontakt || []).map(esc).join(' – ');
    const z2 = [K.telefon, K.web].filter(Boolean).map(esc).concat((K.rechtliches || []).map(r => `<u>${esc(r.text)}</u>`)).join(' – ');
    return `<span>${z1}</span><span>${z2}</span>`;
  }

  window.BL_BASIS = { K, FIRMA, STUFEN, lesen, schreiben, bestId, best, statistik, statistikSpeichern, frei, FREI_AB, VORHER, gewaehlt, waehlen, zahl, ruhig, esc, logoEinbetten, fussHtml };
})();
