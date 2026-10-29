// „Blinker links“ – Spiellogik (Phase 2a): eine Fahrt = neun Situationen aus dem Pool der 100 Situationen des Text Writers
// (S001–S100, nach Stufe gefiltert, gemischte Gebiete) + eine Vorfahrt-Kreuzung. Jede Situation läuft über eine Vorlage
// (vorlagen.js, Zuordnung ID → Vorlage + Parameter in daten.js, ABLAEUFE). Aufgaben: Gefahr erkannt (antippen – auf der
// Scheibe, im Spiegel oder über ein Bedienteil), Gefahr ahnen (Vorzeichen früh antippen), Handgriffe aus dem Feld
// „Handgriffe“ (Spiegel – Blinker links/rechts – Schulterblick – Lenken, Warnblinker, Abblenden), Tempo anpassen (Bremse
// halten), Vorfahrt-Kreuzung (Draufsicht, schirme.js). Zu spät oder falsch → Doppelbremse (−150), die dritte = Abbruch mit
// 0 Punkten. Nie ein Unfall. Zeichnen: szene.js, Bildschirme/Figur/Overlays: schirme.js, Werte: daten.js (+ texte.js).
//
// Testhilfen (Adresse, kombinierbar mit &):
//   #stufe=fahrstunde|uebung|pruefung   Stufe wählen (gesperrte Stufen werden für den Test freigegeben)
//   #situation=S017 (oder =17, auch KR08)  diese Situation zuerst (auch außerhalb der Stufe)   #anzahl=3   nur drei Situationen
//   #kreuzung   Kreuzung zuerst    #los   ohne Startbild sofort losfahren    #tempo=2   doppelte Spielgeschwindigkeit
//   #ende=854   Beispiel-Endbild (nichts wird gespeichert)    #abbruch   Beispiel-Endbild Abbruch
//   #ruhig      wie „Bewegung reduzieren“    #einfach   einfache Darstellung erzwingen
//   #fps        Bildrate oben links: aktuell (letzte 90 Bilder) – Ø seit Laden – min (schlechteste Sekunde) – normal/einfach
//   #frei       alle Stufen frei (nur Anzeige)    #best=854   Bestwert im Startbild nur anzeigen
(function () {
  'use strict';
  const R_ = window.Rahmen, D = window.BL_DATEN, BB = window.BL_BASIS, SZ = window.BL_SZENE, UI = window.BL_UI, TX = window.BL_TEXTE;
  const FZ = D.FAHRZEUGE.auto;
  const hash = location.hash;
  const hw = name => { const m = new RegExp('[#&]' + name + '(?:=([^&]*))?(?:&|$)').exec(hash); return m ? (m[1] == null ? '' : decodeURIComponent(m[1])) : null; };
  const TEST = {
    stufe: hw('stufe'), situation: hw('situation'), anzahl: hw('anzahl') ? Math.max(1, Math.min(10, +hw('anzahl') || 10)) : 10,
    kreuzung: hw('kreuzung') != null, los: hw('los') != null, tempo: Math.max(0.25, Math.min(4, +(hw('tempo') || 1) || 1)),
    wetter: hw('wetter'), ende: hw('ende'), abzug: hw('abzug'), doppel: hw('doppel'), tipp: hw('tipp'), abbruch: hw('abbruch') != null, einfach: hw('einfach') != null, fps: hw('fps') != null, frei: hw('frei') != null, best: hw('best'),
  };
  const ruhig = BB.ruhig();
  function sitzungLesen(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  const klemm = (v, a, b) => Math.max(a, Math.min(b, v));
  // Ton (Phase 4): start/klang.js – Ereignisse hier, Fahrgeräusch je Bild in schritt()
  const KL = () => window.BL_KLANG || { ton() {}, szene() {}, ende() {}, fahrt() {} };
  const zufall = () => Math.random();
  const wahl = liste => liste[Math.floor(Math.random() * liste.length)];

  // ---------- Texte: Pool des Text Writers (texte.js), Beispiele aus daten.js als Ersatz ----------
  const SPRUECHE = {};
  for (const [a, l] of Object.entries(D.SPRUECHE)) SPRUECHE[a] = l.map(t => ({ text: t }));
  if (TX && TX.sprueche) for (const [a, l] of Object.entries(TX.sprueche)) if (l.length) SPRUECHE[a] = l;
  const offen = {};
  function spruch(anlass) {
    const l = SPRUECHE[anlass] || [];
    if (!l.length) return '';
    if (!offen[anlass] || !offen[anlass].length) offen[anlass] = l.slice().sort(() => zufall() - 0.5);
    return offen[anlass].pop().text;
  }
  const RT = k => TX && TX.rahmen && TX.rahmen[k] ? TX.rahmen[k].Text || TX.rahmen[k].Titel || '' : '';
  const abbruchBand = RT('ABBRUCH_BAND') || D.TEXTE.abbruchBand;
  const RAHMEN_TEXTE = {
    anleitung: Object.assign({}, D.TEXTE.anleitung, TX && TX.anleitung || {}),
    abbruchBand: abbruchBand.split(' – ')[0],
    abbruch: RT('ABBRUCH_TEXT') || D.TEXTE.abbruch,
    rueck: k => RT('RUECK_' + k),
  };
  // Hinweise des Fahrlehrers nur aus texte.js (blinker-hinweise-entwurf.md, IDs H001…); {richtung} wird eingesetzt
  const HW = (id, richtung) => ((TX && TX.hinweise && TX.hinweise[id]) || '').replace('{richtung}', richtung || '');
  window.BL_HW = HW;
  const unterzeile = titel => { if (!TX || !TX.rahmen) return ''; const e = Object.values(TX.rahmen).find(r => r.Titel === titel && r.Unterzeile); return e ? e.Unterzeile : ''; };

  // ---------- Stufe ----------
  let stufe = TEST.stufe && D.STUFEN[TEST.stufe] ? TEST.stufe : BB.gewaehlt();
  const ST = () => D.STUFEN[stufe];
  const STUFE_NR = { fahrstunde: 1, uebung: 2, pruefung: 3 };
  const gebietName = g => (D.GEBIETE[g] || {}).name || g;
  const kmhZiel = (kmh) => kmh * ST().tempo / 3.6;

  // ---------- Situationen: Texte (texte.js) + Ablauf (daten.js, ABLAEUFE) ----------
  const GEBIET_ID = { 'Innenstadt': 'innenstadt', '30er/Schule': 'schule', 'Landstraße': 'land', 'Autobahn': 'autobahn', 'Nacht/Wetter': 'nacht' };
  const SCHRITT = { 'Spiegel': 'spiegel', 'Lenken': 'lenken', 'Warnblinker': 'warn', 'Abblenden': 'abblenden' };
  function handAus(text) {
    const schritte = [], teile = (text || '').split(' – ').map(s => s.trim()).filter(Boolean);
    let richtung = null, m;
    for (const t of teile) {
      if (SCHRITT[t]) schritte.push(SCHRITT[t]);
      else if ((m = /^Blinker (links|rechts)/.exec(t))) { schritte.push('blinker'); richtung = m[1]; }
      else if ((m = /^Schulterblick (links|rechts)/.exec(t))) { schritte.push('schulter'); richtung = richtung || m[1]; }
    }
    return { schritte, richtung };
  }
  function situationAus(id) {
    const s = TX && TX.situationen && TX.situationen[id], a = D.ABLAEUFE[id];
    if (!s || !a) return null;
    const hand = handAus(s.Handgriffe), p = a[1] || {};
    return { id, vorlage: a[0], p, gebiet: GEBIET_ID[s.Gebiet] || 'land', stufe: +s.Stufe || 1, titel: s.Titel, vorzeichen: s.Vorzeichen, gefahrText: s.Gefahr,
      bereich: s.Bereich || 'Verkehrsbeobachtung', fehlertext: s.Fehlertext, regel: s.Regel, schritte: hand.schritte, richtung: p.richtung || hand.richtung, wetter: p.wetter };
  }
  function kreuzungAus(id) {
    const k = TX && TX.kreuzungen && TX.kreuzungen[id], e = D.KREUZUNGEN.find(x => x.id === id);
    if (!k && !e) return null;
    const q = k || e;
    // Gebiet: Feldweg/Landstraße auf dem Land, sonst Stadt bzw. Wohngebiet
    const geb = /Feldweg/.test(q.Regelung || '') ? 'land' : (D.KREUZ_LAGE[id] || {}).ampel || (D.KREUZ_LAGE[id] || {}).polizei || (D.KREUZ_LAGE[id] || {}).form === 'kreisel' ? 'innenstadt' : 'schule';
    return { id, vorlage: 'kreuzung', kreuzung: id, p: geb === 'land' ? { umgebung: 'land', kmh: 60 } : {}, gebiet: geb, stufe: +q.Stufe || 1, titel: q.Titel, bereich: 'Verkehrsbeobachtung', fehlertext: 'Vorfahrt falsch eingeschätzt', regel: q.Regel, schritte: [] };
  }
  const ALLE = Object.keys(D.ABLAEUFE).map(situationAus).filter(Boolean);
  // Kreuzungen: alle 24 des Text Writers (Phase 2b: Schilder, Ampeln, Polizei, Kreisel, Einmündungen)
  const KREUZ_IDS = TX && TX.kreuzungen ? Object.keys(TX.kreuzungen) : D.KREUZUNGEN.map(k => k.id);
  const KREUZ = KREUZ_IDS.map(kreuzungAus).filter(Boolean);

  // ---------- Welt (liest szene.js) ----------
  let L = null;
  const W = {
    s: 0, v: 0, kx: 0, kxZiel: 0, gier: 0, nicken: 0, kurve: 0, kurvenSumme: 0, kurvenF: 1, umgebung: 'land', wetter: 'klar', sicht: 70, saat: 1,
    objekte: [], schilder: [], markierungen: [], sperren: [], hinten: [], blinker: null, bremse: false, lenk: 0, warn: false, licht: 'tag',
    spiegel: { innen: 9, links: 9, rechts: 9 }, schulter: null, hilfe: null, fuss: 0, ruck: 0, blitz: 0, doppel: 0, zeigeDoppel: false,
    einfach: TEST.einfach || sitzungLesen('mg:blinker-links:einfach') === '1', ruhig, zielV: 0, auge: FZ.augenhoehe, tachoMax: 200,
  };

  // ---------- Fahrt ----------
  let F = null, R = null, zeit = 0;
  function finde(k) {
    const s = String(k).toUpperCase();
    if (/^KR\d+$/.test(s)) return kreuzungAus(s);
    const id = /^\d+$/.test(s) ? 'S' + String(+s).padStart(3, '0') : s;
    return ALLE.find(x => x.id === id) || null;
  }
  // ---------- Zufallsrouten (Phase 2b): zusammenhängende Strecke durch Musterstadt, zuletzt Gespieltes meiden ----------
  // #route=<zahl> = fester Zufallswert (ohne Gedächtnis), sonst Math.random + Gedächtnis in localStorage
  function zufallsGen(saat) { let a = saat >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  const UMG_GEBIET = { stadt: 'innenstadt', wohngebiet: 'schule', land: 'land', autobahn: 'autobahn' };
  const abschnitt = s => s.gebiet === 'nacht' ? UMG_GEBIET[(s.p && s.p.umgebung) || 'land'] || 'land' : s.gebiet;
  const MERK = 'blinker-links:zuletzt:' + (BB.FIRMA || '');
  function gedaechtnis() { try { return JSON.parse(BB.lesen(MERK) || 'null') || { s: [], k: [] }; } catch (e) { return { s: [], k: [] }; } }
  function routeBauen(nr, rnd, merk) {
    const RT_ = D.ROUTE, pool = ALLE.filter(s => s.stufe <= nr);
    const misch = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    // frische zuerst: nicht in der Merkliste, danach die am längsten nicht gespielten
    const frisch = l => { const alt = merk.s, key = x => alt.indexOf(x.id); return misch(l).sort((x, y) => key(x) - key(y)); };   // nie gespielt (−1) zuerst, dann am längsten her
    const reihe = RT_.routen[Math.floor(rnd() * RT_.routen.length)];
    const gewaehlt = [], n = RT_.situationen;
    // je Abschnitt etwa gleich viele, Nacht/Wetter mindestens nachtMin
    const nacht = frisch(pool.filter(s => s.gebiet === 'nacht')).slice(0, RT_.nachtMin);
    gewaehlt.push(...nacht);
    const rest = frisch(pool.filter(s => !gewaehlt.includes(s)));
    const proAbschnitt = {};
    reihe.forEach(g => { proAbschnitt[g] = (proAbschnitt[g] || 0) + 1; });
    const ziel = {}; Object.keys(proAbschnitt).forEach(g => { ziel[g] = Math.round(n * proAbschnitt[g] / reihe.length); });
    for (const s of rest) { if (gewaehlt.length >= n) break; const g = abschnitt(s); if (ziel[g] > gewaehlt.filter(x => abschnitt(x) === g).length) gewaehlt.push(s); }
    for (const s of rest) { if (gewaehlt.length >= n) break; if (!gewaehlt.includes(s) && reihe.includes(abschnitt(s))) gewaehlt.push(s); }
    // in Routen-Reihenfolge legen (bei doppelten Abschnitten wie Land – Autobahn – Land auf beide verteilen)
    const liste = [];
    const nachAbschnitt = {}; gewaehlt.forEach(s => { (nachAbschnitt[abschnitt(s)] = nachAbschnitt[abschnitt(s)] || []).push(s); });
    reihe.forEach((g, i) => { const l = nachAbschnitt[g] || [], vorkommen = reihe.filter(x => x === g).length, k = reihe.slice(0, i).filter(x => x === g).length; const teil = Math.ceil(l.length / vorkommen); liste.push(...l.slice(k * teil, (k + 1) * teil)); });
    // Kreuzung eingestreut (nicht ganz vorn), zuletzt gespielte Kreuzungen meiden
    const kr = KREUZ.filter(k => k.stufe <= nr), krFrisch = misch(kr.filter(k => !merk.k.includes(k.id)));
    for (let i = 0; i < RT_.kreuzungen && kr.length; i++) {
      const k = krFrisch[i] || misch(kr)[0];
      // an die Stelle mit passendem Abschnitt (Feldweg aufs Land, sonst in Stadt/Wohngebiet), sonst irgendwo ab Platz 3
      let at = liste.findIndex((s, j) => j >= 2 && abschnitt(s) === k.gebiet);
      if (at < 0) at = liste.findIndex((s, j) => j >= 2 && (abschnitt(s) === 'innenstadt' || abschnitt(s) === 'schule'));
      if (at < 0) at = 2 + Math.floor(rnd() * Math.max(1, liste.length - 2));
      liste.splice(at, 0, k);
    }
    return { reihe, liste };
  }
  function fahrtListe() {
    const nr = STUFE_NR[stufe] || 1;
    const fest = hw('route') != null && hw('route') !== '';
    const rnd = fest ? zufallsGen(+hw('route') || 1) : zufall;
    const merk = fest ? { s: [], k: [] } : gedaechtnis();
    const { liste, reihe } = routeBauen(nr, rnd, merk);
    W.route = reihe;
    if (TEST.kreuzung) { const k = liste.findIndex(s => s.vorlage === 'kreuzung'); if (k >= 0) liste.unshift(liste.splice(k, 1)[0]); }
    if (TEST.situation) { const s = finde(TEST.situation); if (s) { const k = liste.findIndex(x => x.id === s.id); if (k >= 0) liste.splice(k, 1); liste.unshift(s); } }
    return liste.slice(0, Math.min(10, TEST.anzahl));
  }
  function merken(liste) {
    if (hw('route') != null) return;
    const m = gedaechtnis();
    liste.forEach(s => { const l = s.vorlage === 'kreuzung' ? m.k : m.s; const i = l.indexOf(s.id); if (i >= 0) l.splice(i, 1); l.push(s.id); });
    m.s = m.s.slice(-D.ROUTE.merken); m.k = m.k.slice(-D.ROUTE.merkenKreuzung);
    BB.schreiben(MERK, JSON.stringify(m));
  }
  function fahrtNeu() {
    F = { liste: fahrtListe(), idx: -1, kartenNeu: [], punkte: 0, abzug: 0, doppel: 0, rts: [], bereiche: {}, fehler: [], karten: [], schulterOk: 0, schulterAlle: 0,
      start: zeit, phase: 'titel', wartet: 0, sitPunkte: [], fehlalarmZeit: -9, abbruch: false };
    D.BEREICHE.forEach(b => { F.bereiche[b] = { ist: 0, max: 0 }; });
    kopfWert = kopfZiel = 0;
    W.doppel = 0; W.dbWarn = 0; W.zeigeDoppel = true; W.fuss = 0; W.ruck = 0; W.blitz = 0; W.rand = []; W.randAb = 1; W.kreis = null;
    merken(F.liste);
  }

  // ---------- Hilfen für die Vorlagen ----------
  const FARBEN = SZ.AUTO;
  const kennzeichen = () => SZ.kennzeichen();   // „BAG-“ + 1–2 Buchstaben + 1–4 Ziffern, je Fahrzeug neu (MZ, 28.10.2026)
  // Fahrzeug-Arten: Maße in m (Länge, Breite, Höhe) und Farbe für den Code-Platzhalter
  const ARTEN = {
    pkw: [4.3, 1.8, 1.45], kombi: [4.7, 1.85, 1.5], sportwagen: [4.4, 1.85, 1.25], van: [5.4, 2.0, 2.25], paket: [6.0, 2.1, 2.6, '#c9a46a'],
    eiswagen: [5.2, 2.0, 2.4, '#f3e9d8'], rettung: [6.5, 2.1, 2.8, '#f2f3f1'], begleit: [4.7, 1.85, 1.6, '#f2f3f1'],
    lkw: [13, 2.5, 3.7, '#dfe3e6'], bus: [12, 2.55, 3.1, '#e9e4d6'], schulbus: [12, 2.55, 3.1, '#e8c547'], wohnmobil: [7, 2.3, 3.0, '#f2f3f1'],
    traktor: [4, 2.4, 2.8, '#a8322a'], muell: [9, 2.5, 3.4, '#e6762a'], raeum: [9, 2.5, 3.3, '#e6762a'], maehdrescher: [8, 3.6, 3.9, '#4d7d3a'],
    motorrad: [2.1, 0.85, 1.85, '#2a2d33'], polizei: [4.8, 1.85, 1.55, '#eef1f3'],
  };
  function auto(pos, x, extra) {
    const e = extra || {}, art = e.art || 'pkw', a = ARTEN[art] || ARTEN.pkw;
    const o = Object.assign({ typ: 'fahrzeug', art, x, pos, farbe: a[3] || wahl(FARBEN), laenge: a[0], breite: a[1], hoehe: a[2], richtung: 1, v: 0, vx: 0, kennzeichen: kennzeichen(), licht: {} }, e);
    if (art === 'kombi' || art === 'sportwagen' || art === 'polizei') { o.modell = art; o.art = 'pkw'; }   // Polizei: Bild fahrzeuge|gegenverkehr/polizei
    if (art === 'begleit') o.modell = 'begleit';
    return o;
  }
  function dazu(o) { W.objekte.push(o); return o; }
  function schildDazu(art, pos, x, extra) { const o = Object.assign({ typ: 'schild', art, pos, x }, extra || {}); W.schilder.push(o); return o; }
  // Figuren (Code-Platzhalter, Bild-Anschluss menschen/<figur>)
  const FIGUREN = {
    kind: { hoehe: 1.2, jacke: '#e2622f', haar: '#6b4a2b', ranzen: '#2f63c6' }, 'kind-ranzen': { hoehe: 1.25, jacke: '#d94f70', haar: '#2a1d14', ranzen: '#f2c500' },
    frau: { hoehe: 1.68, jacke: '#7a4f8f', haar: '#3b2a20' }, 'frau-kinderwagen': { hoehe: 1.68, jacke: '#7a4f8f', haar: '#3b2a20', wagen: true },
    fussgaenger: { hoehe: 1.78, jacke: '#3c5a7a', haar: '#4a3426' }, lotsin: { hoehe: 1.7, jacke: '#ffd21a', haar: '#5a4030', weste: '#ff8a1e', kelle: true },
    rollator: { hoehe: 1.6, jacke: '#8a6e8f', haar: '#cfcfcf', rollator: true }, arbeiter: { hoehe: 1.8, jacke: '#ff8a1e', haar: '#3b2a20', weste: '#e8ff3a' },
    'mann-schirm': { hoehe: 1.8, jacke: '#2f3a4a', haar: '#3b2a20', schirm: '#1d1f22' }, dunkel: { hoehe: 1.8, jacke: '#15171a', haar: '#111' },
    panne: { hoehe: 1.78, jacke: '#ffd21a', haar: '#4a3426', weste: '#ff8a1e' }, scooter: { hoehe: 1.8, jacke: '#2f63c6', haar: '#4a3426', roller: true },
    spaziergaengerinnen: { hoehe: 1.68, jacke: '#5f8a5a', haar: '#9a8a7a' }, gruppe: { hoehe: 1.8, jacke: '#7a3a2c', haar: '#3b2a20' },
    familie: { hoehe: 1.82, jacke: '#3c5a7a', haar: '#3b2a20' }, 'junge-hund': { hoehe: 1.45, jacke: '#2f8f5a', haar: '#6b4a2b' },
  };
  function figur(name, pos, x, extra) {
    return Object.assign({ typ: 'person', figur: name, pos, x, gehen: 0, vx: 0, v: 0, k: Math.floor(zufall() * 9) }, FIGUREN[name] || FIGUREN.fussgaenger, extra || {});
  }
  // Wetter-Physik (Phase 2b): Haftung aus Wetter × Fläche unter dem Auto bzw. der nächsten Fläche (für den Start von Gefahren)
  function flaecheBei(pos) { const m = W.markierungen.find(m => m.art === 'flaeche' && pos >= m.pos && pos <= m.pos + (m.laenge || 20)); return m ? (D.FLAECHE[m.stoff] || 1) : 1; }
  function wetterHaftung() { return (D.WETTER[W.wetterArt] || D.WETTER.klar).haftung; }
  // Wetter × Fläche multiplizieren sich (Glätte bei Schnee 0,25 × 0,35 ≈ 0,09) – nach unten bei 0,12 begrenzen, damit es spielbar bleibt (MZ 28.10.2026)
  function bremsA(pos) { return FZ.bremsMax * Math.max(0.12, wetterHaftung() * flaecheBei(pos == null ? W.s : pos)); }
  function sichtV() {   // höchstens so schnell, dass Reaktionsfenster + Bremsweg in die Sicht passen
    const sicht = W.sichtWeite || 400; if (sicht >= 250) return 99;
    const a = 0.85 * bremsA(), fe = ST().fenster, s = sicht * 0.9;
    return (-fe + Math.sqrt(fe * fe + 2 * s / a)) * a;
  }
  // Ab wann eine Gefahr beginnt: Lücke zum Hindernis so groß, dass man „fenster“ Sekunden Zeit zum Reagieren hat
  // bremst = { verz, min }: das Hindernis bremst ab dem Start der Gefahr (m/s² bis min m/s) – dann zählt dessen Weg im Fenster und das
  // Tempo am Ende des Fensters (Phase-5-Korrektur: Traktor biegt ab S042 – vorher real nur 1,2–1,5s statt 1,9–2,6s)
  function nahGenug(pos, hv, abstand, extra, bremst) {
    const gap = pos - W.s - abstand, fe = ST().fenster + (extra || 0), a = 0.85 * Math.min(bremsA(), bremsA(pos));
    if (bremst) {
      const v0 = hv || 0, tS = Math.max(0, (v0 - bremst.min) / bremst.verz), t = Math.min(fe, tS);
      const weg = v0 * t - bremst.verz * t * t / 2 + bremst.min * Math.max(0, fe - tS), vEnde = Math.max(bremst.min, v0 - bremst.verz * fe);
      const vr = Math.max(0.8, W.v - vEnde);
      return gap <= Math.max(0, W.v * fe - weg) + vr * vr / (2 * a) + 1;
    }
    const vr = Math.max(0.8, W.v - (hv || 0));
    return gap <= vr * fe + vr * vr / (2 * a) + 1;
  }
  function teil(name, max, bereich) { R.teile[name] = { max, ist: 0, bereich: bereich || (D.ZUORDNUNG[name] === 'situation' ? R.def.bereich : D.ZUORDNUNG[name]) || R.def.bereich }; }
  function vergeben(name, ist, popup, wort) {
    const t = R.teile[name]; if (!t) return;
    t.ist = klemm(ist, 0, t.max);
    if (popup && t.ist > 0) UI.popup(F && F.einf ? '' : '+' + Math.round(t.ist), popup[0], popup[1], 'gut', wort);
  }
  function fehler(art, text) {
    // verpasst/tempo in Abstands- und Licht-Situationen → eigene Art (Tipp im Endbild, daten.js FEHLERART_SITUATION)
    if ((art === 'verpasst' || art === 'tempo') && R && R.def && D.FEHLERART_SITUATION && D.FEHLERART_SITUATION[R.def.id]) art = D.FEHLERART_SITUATION[R.def.id];
    F.fehler.push({ art, text: text.includes(' – ') ? text : text + ' – ' + gebietName(R ? R.def.gebiet : ''), gewicht: D.FEHLERGEWICHT[art] || 1 });
  }
  // Gefahr: obj/objs = was antippen; hind() = Hindernis { pos, v, abstand } (zu spät → Doppelbremse) oder bis() = Zeitpunkt,
  // ab dem sie verpasst ist (ohne Hindernis: Fehler statt Doppelbremse; bisDoppel: Fahrlehrer greift ein);
  // ort = 'innen'|'links'|'rechts' (im Spiegel antippen) oder 'scheibe' (irgendwo auf die Scheibe); durch = Bedienteil, das als
  // Erkennen zählt ('abblenden', 'blinker', 'schulter', 'warn'); ausweichen = { kx, v } statt Anhalten
  function gefahr(o) {
    return Object.assign({ aktiv: false, t0: 0, erkannt: false, doppel: false, verpasst: false, geloest: false, tGeloest: 0, objs: o.obj ? [o.obj] : [] }, o);
  }
  // Handgriffe aus dem Feld „Handgriffe“ der Situation (Vorlage kann richtung/ziel/… ergänzen)
  function handgriffe(o) {
    return Object.assign({ schritte: R.def.schritte.slice(), richtung: R.def.richtung, angekuendigt: false, tAn: 0, folge: [], gelenkt: false, gelenktAm: 0, zurueckAm: 0, uebernommen: false, warteHinweis: false, letzterFortschritt: 0, ziel: 0 }, o);
  }
  // Tempo-Aufgabe: bis zur Stelle pos auf limit (km/h) herunterbremsen; danach gilt danach (km/h, Stufen-Faktor)
  function tempoAufgabe(limit, pos, danach) {
    R.tempoA = { limit, pos, danach: danach != null ? danach : limit, minV: 999, fertig: false };
    teil('tempoZiel', D.PUNKTE.tempo.ziel); teil('tempoSanft', D.PUNKTE.tempo.sanft);
    return R.tempoA;
  }
  function anzeige(text, warn) { const o = { typ: 'anzeige', pos: W.s, x: 0 }; W.anzeige = { text, warn: !!warn, an: true, obj: o }; return o; }
  const H = {
    get W() { return W; }, get L() { return L; }, get R() { return R; }, D, FZ, ST, bremsA, hinweis: HW, kmhZiel, zufall, wahl, klemm, UI, spruch,
    stufe: () => stufe, auto, dazu, schild: schildDazu, figur, nahGenug, gefahr, handgriffe, teil, vergeben, fehler, tempoAufgabe, anzeige,
    mark: m => { W.markierungen.push(m); return m; }, sperre: (a, b) => W.sperren.push([a, b]), hinten: o => { W.hinten.push(o); return o; },
    mitteOben: () => mitteOben(), bildpunkt: (x, pos, h) => SZ.bildpunkt(x, pos, h),
    anfahrt: (v, min) => W.s + Math.max(min || 60, (v || W.zielV) * ST().anfahrt),
    phase: p => { F.phase = p; }, RT, TX, doppelbremse: t => doppelbremse(t), get zeit() { return zeit; },
  };
  const VORLAGEN = window.BL_VORLAGEN(H);

  // ---------- Handgriffe ----------
  const NAMEN = { spiegel: 'Spiegel', blinker: 'Blinker', schulter: 'Schulterblick', lenken: 'Lenken', warn: 'Warnblinker', abblenden: 'Abblenden' };
  function naechsterSchritt(h) {
    const getan = new Set(h.folge.filter(f => f.ok).map(f => f.art));
    return h.schritte.find(s => !getan.has(s)) || null;
  }
  function handgriff(art, seite) {
    const h = R && R.hand;
    if (!h || !h.angekuendigt || h.gelenkt || !h.schritte.includes(art)) return false;
    const ok = art === 'spiegel' ? (!h.richtung || seite === 'innen' || seite === h.richtung) : (art === 'blinker' || art === 'schulter') ? seite === h.richtung : true;
    h.folge.push({ art, seite, ok, t: R.t });
    if (ok) h.letzterFortschritt = R.t;
    if (art === 'blinker' && !ok) UI.fahrlehrer('neutral', HW('H003', h.richtung), 2.2);
    // ohne Lenken (Warnblinker, Abblenden, Spiegel): fertig, sobald alle Schritte da sind
    if (ok && !h.schritte.includes('lenken') && !naechsterSchritt(h)) handFertig(h);
    return true;
  }
  function handFertig(h) {
    h.gelenkt = true; h.gelenktAm = W.s;
    handBewerten(h);
    h.nachFertig && h.nachFertig();
  }
  function handBewerten(h) {
    const erst = art => h.folge.findIndex(f => f.art === art && f.ok);
    const idx = h.schritte.map(s => erst(s));
    h.schritte.forEach((s, i) => {
      const ok = idx[i] >= 0 || (s === 'lenken' && !h.uebernommen);
      vergeben(s, ok ? (s === 'blinker' && h.folge.some(f => f.art === 'blinker' && !f.ok) ? R.teile[s].max / 2 : R.teile[s].max) : 0);
      if (!ok && s !== 'lenken') fehler(s, NAMEN[s] + ' vergessen');
    });
    const ohneL = idx.filter((v, i) => h.schritte[i] !== 'lenken');
    const alle = ohneL.every(v => v >= 0), reihe = alle && ohneL.every((v, i) => i === 0 || v > ohneL[i - 1]);
    if (R.teile.reihenfolge) vergeben('reihenfolge', reihe ? R.teile.reihenfolge.max : 0);
    const namen = h.schritte.concat(R.teile.reihenfolge ? ['reihenfolge'] : []);
    const summe = namen.reduce((a, n) => a + (R.teile[n] ? R.teile[n].ist : 0), 0), max = namen.reduce((a, n) => a + (R.teile[n] ? R.teile[n].max : 0), 0);
    const pp = mitteOben();
    if (summe > 0) UI.popup(F && F.einf ? '' : '+' + Math.round(summe), pp[0], pp[1], summe >= max * 0.8 ? 'gut' : 'mittel', reihe && summe >= max * 0.8 ? RAHMEN_TEXTE.rueck('HANDGRIFF_OK') : alle && !reihe ? RAHMEN_TEXTE.rueck('REIHENFOLGE') : '');
    if (h.schritte.includes('schulter')) { F.schulterAlle++; if (idx[h.schritte.indexOf('schulter')] >= 0) F.schulterOk++; }
    if (alle && !reihe && ohneL.length > 1) fehler('reihenfolge', 'Reihenfolge ' + h.schritte.filter(s => s !== 'lenken').map(s => NAMEN[s]).join(' – '));
    if (h.uebernommen) return;
    if (alle) UI.fahrlehrer('freut', reihe ? spruch('lob') : HW('H009'), 2.2);
    else UI.fahrlehrer('neutral', spruch('handgriff') || HW('H010'), 2.4, 'halb');
  }
  function lenken(seite) {
    const h = R && R.hand;
    if (!h || !h.angekuendigt || h.gelenkt || !h.schritte.includes('lenken')) return;
    if (h.richtung && seite !== h.richtung) { UI.fahrlehrer('neutral', HW('H004', h.richtung), 1.8); return; }
    if (h.nurAm && !h.nurAm()) { UI.fahrlehrer('neutral', h.nurAmText || HW('H005'), 1.8); return; }
    if (h.belegt && h.belegt()) {
      h.folge.push({ art: 'lenken', seite, ok: false, t: R.t });
      doppelbremse(R.def.fehlertext || 'Auto im toten Winkel übersehen');
      h.nachDoppel && h.nachDoppel();
      return;
    }
    handgriff('lenken', seite);
    handFertig(h);
    if (h.abbiegen) W.dreh = { seite: h.richtung === 'links' ? -1 : 1, t: 0 };
    W.kxZiel = h.ziel;
    h.nachLenken && h.nachLenken();
  }
  function handSchritt() {
    const h = R.hand;
    if (!h) return;
    if (!h.angekuendigt && h.ankuendigen()) {
      h.angekuendigt = true; h.tAn = R.t; h.letzterFortschritt = R.t;
      const G = D.PUNKTE.gewichte, summe = h.schritte.reduce((a, s) => a + (G[s] || 4), 0) + (h.schritte.length > 1 ? G.reihenfolge : 0), f = D.PUNKTE.handgriffe / summe;
      h.schritte.forEach(s => teil(s, (G[s] || 4) * f));
      if (h.schritte.length > 1) teil('reihenfolge', G.reihenfolge * f);
      const a = h.auftrag != null ? h.auftrag : auftragText(h);
      if (a) UI.fahrlehrer('neutral', a, 3);
      h.beimAnkuendigen && h.beimAnkuendigen();
    }
    if (h.angekuendigt && !h.gelenkt) {
      const naechst = naechsterSchritt(h);
      const zeigen = F.einf || ST().hilfen === 'immer' || (ST().hilfen === 'spaet' && R.t - h.letzterFortschritt > 3);
      const l = h.richtung === 'links' ? 'L' : 'R';
      const warten = naechst === 'lenken' && ((h.belegt && h.belegt()) || (h.nurAm && !h.nurAm()));
      W.hilfe = !zeigen || warten ? null : naechst === 'spiegel' ? 'spiegel' : naechst === 'blinker' ? 'blinker' + l : naechst === 'schulter' ? 'schulter' + l : naechst === 'lenken' ? 'lenken' + l : naechst;
      if (F.einf || ST().hilfen === 'immer') UI.hinweis(h.schritte.map(s => ({ text: NAMEN[s], fertig: h.folge.some(f => f.art === s && f.ok), jetzt: s === naechst })));
      if (naechst === 'lenken' && h.belegt && h.belegt() && !h.warteHinweis && h.folge.length) { h.warteHinweis = true; if (ST().hilfen !== 'nie') UI.fahrlehrer('neutral', spruch('warten') || HW('H006'), 2.2); }
      // Frist (z. B. Abblenden, bevor der Gegenverkehr da ist) oder zu lange gezögert: Fahrlehrer übernimmt
      const geduld = { fahrstunde: 16, uebung: 12, pruefung: 9 }[stufe] + (h.nurAm ? 8 : 0);
      const frist = F.einf ? false : h.frist ? h.frist() : R.t - h.tAn > geduld;
      if (frist && !(h.belegt && h.belegt())) {
        h.uebernommen = true;
        UI.fahrlehrer('neutral', h.fristText || (h.schritte.includes('lenken') ? HW('H007') : HW('H008')), 2.4);
        if (h.schritte.includes('lenken')) fehler('lenken', R.def.fehlertext || 'Handgriffe nicht ausgeführt');
        handFertig(h);
        if (h.schritte.includes('lenken')) { W.kxZiel = h.ziel; W.blinker = h.richtung || null; if (h.abbiegen) W.dreh = { seite: h.richtung === 'links' ? -1 : 1, t: 0 }; h.nachLenken && h.nachLenken(); }
        if (h.schritte.includes('abblenden')) W.licht = 'abblend';
        if (h.schritte.includes('warn')) W.warn = true;
      }
    } else if (!R.tempoA || R.tempoA.fertig) { UI.hinweis(null); }
    if (h.gelenkt && h.schritte.includes('lenken')) {
      if (W.blinker === h.richtung && Math.abs(W.kx - h.ziel) < 0.25 && !W.dreh) W.blinker = null;   // Rückstellung
      if (!h.zurueckAm && h.zurueck && h.zurueck()) { h.zurueckAm = W.s; W.kxZiel = h.zurueckZiel != null ? h.zurueckZiel : 0; W.blinker = h.zurueckZiel != null && h.zurueckZiel < W.kx ? 'links' : 'rechts'; R.rueckBlinker = true; }
      if (R.rueckBlinker && Math.abs(W.kx - W.kxZiel) < 0.25) { W.blinker = null; R.rueckBlinker = false; }
    }
  }
  function auftragText(h) {
    if (h.abbiegen) return h.auftragAbbiegen || HW('H001', h.richtung);
    if (h.schritte.includes('lenken') && h.richtung) return HW('H002', h.richtung);
    return '';
  }

  // ---------- Situation starten / beenden ----------
  function wetterSetzen(w) {
    W.regen = w === 'regen' || w === 'nachtregen' || w === 'niesel'; W.schnee = w === 'schnee';
    W.wetter = w === 'nachtregen' ? 'nacht' : w === 'niesel' ? 'regen' : (w || 'klar');
    W.wetterArt = w || 'klar';
    W.sichtWeite = (D.WETTER[W.wetterArt] || D.WETTER.klar).sicht;
    W.sicht = W.wetter === 'nebel' ? W.sichtWeite : W.sichtWeite;
  }
  function situationStarten(def) {
    W.objekte = []; W.schilder = []; W.markierungen = []; W.sperren = []; W.hinten = [];
    W.blinker = null; W.hilfe = null; W.schulter = null; W.kxZiel = 0; W.kx = Math.abs(W.kx) > 1 ? 0 : W.kx;
    W.warn = false; W.anzeige = null; W.blendung = null; W.beschlag = 0; W.schmutz = 0; W.wischer = false; W.tunnel = 0; W.tunnelLage = null; W.ueberholverbot = false;
    W.einbahn = false; W.nebelschluss = false; W.dreh = null; W.drehGier = 0; W.sonneX = 0; W.kreis = null; W.ortstafel = null;
    const p = def.p || {}, geb = D.GEBIETE[def.gebiet] || D.GEBIETE.land;
    W.umgebung = p.umgebung || geb.umgebung; W.spuren = p.spuren || 2;
    // Testhilfe #wetter=nacht|regen|… (Tunnel innen 29.10.2026: Ausfahrt nachts prüfen) – nur mit #situation
    wetterSetzen((TEST.situation && TEST.wetter) || def.wetter || (def.gebiet === 'nacht' ? 'nacht' : 'klar'));
    bilderVorrang();
    W.licht = p.licht || (W.wetter === 'nacht' ? 'abblend' : 'tag');
    W.saat = 1 + Math.floor(zufall() * 50);
    W.zielV = kmhZiel(p.kmh || geb.kmh);
    W.v = W.zielV;
    R = { def, p, V: VORLAGEN[def.vorlage], teile: {}, t: 0, gefahr: null, vorzeichen: null, hand: null, fertigT: 0, ahnen: false, endePos: 0 };
    R.P = W.s + W.zielV * ST().anfahrt + 30;
    R.V.aufbau(R, p);
    const vorher = F.idx > 0 ? F.liste[F.idx - 1] : null, umgVorher = vorher ? ((vorher.p && vorher.p.umgebung) || (D.GEBIETE[vorher.gebiet] || {}).umgebung) : null;
    const stadtArt = u => u === 'stadt' || u === 'wohngebiet';
    if (umgVorher && stadtArt(umgVorher) !== stadtArt(W.umgebung) && W.umgebung !== 'autobahn' && umgVorher !== 'autobahn') schildDazu('ortstafel', W.s + 45, stadtArt(W.umgebung) ? 3.4 : 3.2, { groesse: 1.2, hoch: 2.0, text: 'Musterstadt', ende: !stadtArt(W.umgebung) });
    if (R.vorzeichen) { R.vorzeichen.objs = R.vorzeichen.objs || (R.vorzeichen.obj ? [R.vorzeichen.obj] : []); teil('ahnen', D.PUNKTE.ahnen); }
    if (R.gefahr) teil('erkannt', D.PUNKTE.erkannt);
    if (!R.keinHinten && W.umgebung !== 'autobahn') W.hinten.push({ art: 'pkw', x: W.kx, dz: 26 + zufall() * 20, v: 0, folgt: true, farbe: wahl(FARBEN) });
    R.gegenAb = 1.5 + zufall() * 4;
    R.wetterSpruch = !['klar', 'abend'].includes(W.wetter) && zufall() < 0.6;
  }
  function situationBeenden() {
    let ist = 0, max = 0;
    for (const n in R.teile) {
      const t = R.teile[n]; ist += t.ist; max += t.max;
      const b = F.bereiche[t.bereich]; if (b) { b.ist += t.ist; b.max += t.max; }
    }
    const p = max > 0 ? (D.PUNKTE.normieren ? Math.round(ist * 100 / max) : Math.round(ist)) : 0;
    F.punkte += p;
    F.sitPunkte.push({ id: R.def.id, punkte: p });
    // Spielertest 29.10.2026: verdiente Punkte der Situation kurz einblenden (ruhig, unter dem Innenspiegel)
    if (!F.einf && max > 0 && F.phase !== 'fertig') { const pp = mitteOben(); UI.popup('+' + p, pp[0], pp[1] - L.armaturen * 0.12, p >= 80 ? 'gut' : p >= 40 ? 'mittel' : 'schlecht', RT('PUNKTE_VERDIENT') || 'verdient', 'summe'); }
    if (!R.doppelHier && max > 0 && ist / max >= D.PUNKTE.karteAb && /^S\d+$/.test(R.def.id) && (!R.gefahr || R.gefahr.erkannt || !R.teile.erkannt)) F.karten.push(R.def.id);
    W.hilfe = null; UI.hinweis(null);
  }
  function naechsteSituation() {
    F.idx++;
    if (F.idx >= F.liste.length) return fahrtEnde(false);
    const def = F.liste[F.idx];
    F.phase = 'wechsel';
    UI.karte((F.idx + 1) + '/' + F.liste.length + ' – ' + gebietName(def.gebiet), def.titel, ruhig ? 1.6 : 1.3, () => {
      situationStarten(def);
      anzeigen();
    }, () => {
      F.phase = 'situation';
      if (sichtV() < W.zielV - 0.5) UI.fahrlehrer('neutral', HW('H033'), 2.4);
      else if ((W.wetterArt === 'schnee' || W.markierungen.some(m => m.stoff === 'glaette')) && !F.glaetteGesagt) { F.glaetteGesagt = true; UI.fahrlehrer('neutral', HW('H034'), 2.4); }
      else if (R.wetterSpruch) UI.fahrlehrer('neutral', spruch('wetter'), 2.4);
    });
  }

  // ---------- Tippen, Wischen, Bremse ----------
  let druck = null;
  function runter(x, y) {
    if (!F || F.phase === 'kreuzung' || F.phase === 'fertig') return;
    druck = { x0: x, y0: y, x, y, art: null };
    W.bremse = false;
    if (drin(L.bremse, x, y, 10)) { druck.art = 'bremse'; W.bremse = true; }
  }
  function bewegen(x, y) {
    if (!druck) return;
    druck.x = x; druck.y = y;
    const dx = x - druck.x0, dy = y - druck.y0;
    if (druck.art === 'bremse') { if (!drin(L.bremse, x, y, 40)) { W.bremse = false; druck.art = 'weg'; } return; }
    if (!druck.art && Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy) * 1.3 && druck.y0 < L.armaturen + 20) {
      druck.art = 'wisch';
      schulterblick(dx < 0 ? 'links' : 'rechts');
    }
  }
  function hoch() {
    if (!druck) return;
    const d = druck; druck = null;
    if (d.art === 'bremse') { W.bremse = false; return; }
    if (d.art) return;
    tippen(d.x0, d.y0);
  }
  function drin(r, x, y, rand) { rand = rand || 0; return x >= r.x - rand && x <= r.x + r.w + rand && y >= r.y - rand && y <= r.y + r.h + rand; }
  function tippen(x, y) {
    if (!F || F.phase !== 'situation') return;
    if (F.einf && EINF.tipp(x, y)) return;
    const b = L.blinker;
    if (drin(b, x, y, 8)) return blinker(x < b.x + b.w / 2 ? 'links' : 'rechts');
    if (drin(L.licht, x, y, 6)) { KL().ton('klick'); return licht(); }
    if (drin(L.warn, x, y, 6)) return warnblinker();
    if (drin(L.spiegelInnen, x, y, 12)) { KL().ton('klick', { faktor: 0.7 }); return spiegel('innen'); }
    if (drin(L.spiegelL, x, y, 10)) { KL().ton('klick', { faktor: 0.7 }); return spiegel('links'); }
    if (drin(L.spiegelR, x, y, 10)) { KL().ton('klick', { faktor: 0.7 }); return spiegel('rechts'); }
    const l = L.lenkrad;
    if (y > L.armaturen && Math.hypot(x - l.cx, y - l.cy) < l.r * 1.18) { KL().ton('klick', { faktor: 0.7 }); return lenken(x < l.cx ? 'links' : 'rechts'); }
    if (y > 48 && y < L.armaturen) return scheibe(x, y);
  }
  // Bedienteil zählt als „Gefahr erkannt“, wenn die Gefahr das vorsieht (z. B. Licht an vor dem Tunnel)
  function durch(art, seite) {
    const g = R && R.gefahr;
    if (g && g.aktiv && !g.geloest && !g.erkannt && !g.doppel && !g.verpasst && g.durch === art && (!g.durchSeite || g.durchSeite === seite) && (!g.durchWenn || g.durchWenn())) erkannt();
  }
  // Spielertest 29.10.2026: schnelles Doppeltippen schaltete den Blinker gleich wieder aus – nach jedem Umschalten 0,3s Sperre
  let blinkerSperre = -9;
  function blinker(seite) {
    if (performance.now() - blinkerSperre < 300) return;
    blinkerSperre = performance.now();
    W.blinker = W.blinker === seite ? null : seite;
    KL().ton(W.blinker ? 'hebel-an' : 'hebel-aus');
    if (W.blinker) { window.BL_TAKT.neu(); handgriff('blinker', seite); durch('blinker', seite); }
  }
  function licht() {
    if (W.licht === 'abblend') { W.licht = 'fern'; return; }
    W.licht = 'abblend';
    handgriff('abblenden'); durch('abblenden');
  }
  function warnblinker() {
    W.warn = !W.warn;
    KL().ton('warn-taste', { rate: W.warn ? 1 : 0.94 });
    if (W.warn) { window.BL_TAKT.neu(); handgriff('warn'); durch('warn'); }
  }
  function spiegel(art) {
    W.spiegel[art] = 0;
    const g = R && R.gefahr, vz = R && R.vorzeichen;
    const passt = ort => ort === art || ort === 'spiegel';
    if (g && g.aktiv && !g.geloest && !g.erkannt && !g.doppel && !g.verpasst && passt(g.ort)) erkannt();
    else if (vz && passt(vz.ort) && !R.ahnen && vzAktiv(vz) && !(g && (g.erkannt || g.doppel))) geahnt(L.B / 2, L.spiegelInnen.y + 40);
    handgriff('spiegel', art);
  }
  function schulterblick(seite) {
    if (W.schulter && W.schulter.t < W.schulter.dauer) return;
    W.schulter = { seite, t: 0, dauer: ruhig ? 1.3 : 1.1, p: 0 };
    handgriff('schulter', seite);
    durch('schulter', seite);
  }
  // Tipp auf die Scheibe: Vorzeichen (ahnen), Gefahr (erkannt) oder Fehlalarm
  function scheibe(x, y) {
    const treffer = (objs) => (objs || []).some(o => o && o._box && !o.versteckt && imKasten(o._box, x, y));
    const vz = R && R.vorzeichen, gf = R && R.gefahr;
    if (gf && gf.aktiv && !gf.geloest && (gf.ort === 'scheibe' || treffer(gf.objs) || (vz && !vz.ort && treffer(vz.objs)))) {
      if (gf.erkannt || gf.doppel || gf.verpasst) return;
      return erkannt();
    }
    if (vz && !R.ahnen && vzAktiv(vz) && (vz.ort === 'scheibe' || treffer(vz.objs))) return geahnt(x, y);
    if (vz && (R.ahnen || vz.ort === 'scheibe') && treffer(vz.objs)) return;
    if (gf && treffer(gf.objs)) return;   // Gefahr schon erledigt oder noch nicht da: kein Fehlalarm
    if (gf && gf.ort === 'scheibe' && (gf.erkannt || gf.verpasst)) return;
    // Fehlalarm (in der Einführung nur erklären, ohne Abzug)
    if (F.einf) { UI.popup('', x, y, 'schlecht', RAHMEN_TEXTE.rueck('FEHLALARM')); KL().ton('fehlalarm'); EINF.fehlalarm(); return; }
    F.abzug += D.PUNKTE.fehlalarm;
    const b = F.bereiche[D.ZUORDNUNG.fehlalarm]; if (b) b.max += -D.PUNKTE.fehlalarm;
    UI.popup(String(D.PUNKTE.fehlalarm), x, y, 'schlecht', RAHMEN_TEXTE.rueck('FEHLALARM'));
    if (zeit - F.fehlalarmZeit > 8) { fehler('fehlalarm', 'Fehlalarm'); UI.fahrlehrer('neutral', spruch('fehlalarm'), 2, 'schlecht'); }
    F.fehlalarmZeit = zeit;
    KL().ton('fehlalarm');
    anzeigen();
  }
  function imKasten(b, x, y) {
    const w = b[2] - b[0], h = b[3] - b[1], rand = Math.max(30, Math.min(70, Math.max(w, h) * 0.5));
    return x >= b[0] - rand && x <= b[2] + rand && y >= b[1] - rand && y <= b[3] + rand;
  }
  function vzAktiv(vz) {
    if (vz.aktivWenn) return vz.aktivWenn();
    return vz.sofort || vz.gestartet;
  }
  function geahnt(x, y) {
    R.ahnen = true;
    KL().ton('erkannt', { rate: 1.12 });
    vergeben('ahnen', D.PUNKTE.ahnen, [x, y], RAHMEN_TEXTE.rueck('GEAHNT'));
    const vz = R.vorzeichen;
    if (vz.gleich && R.gefahr && !R.gefahr.erkannt) {
      R.gefahr.erkannt = true; R.gefahr.frueh = true; R.folgen = true;
      vergeben('erkannt', D.PUNKTE.erkannt);
      R.gefahr.nachErkannt && R.gefahr.nachErkannt();
    }
    UI.fahrlehrer('freut', spruch('geahnt'), 2.2);
    R.ahnenV = vz.ahnenV != null ? vz.ahnenV : W.zielV * 0.75;
    vz.nachGeahnt && vz.nachGeahnt();
  }
  function erkannt(rtFest) {
    const g = R.gefahr;
    g.erkannt = true; R.folgen = true;
    const rt = rtFest != null ? rtFest : zeit - g.t0, P = D.PUNKTE, Fz = ST().fenster;
    const p = rt <= P.reaktion.voll ? P.erkannt : Math.max(P.reaktion.min, P.erkannt - (rt - P.reaktion.voll) / Math.max(0.3, Fz - P.reaktion.voll) * (P.erkannt - P.reaktion.min));
    F.rts.push(rt);
    const ob = g.objs.find(o => o && o._box), box = ob ? ob._box : [L.B / 2, L.armaturen * 0.4, L.B / 2, L.armaturen * 0.4];
    vergeben('erkannt', Math.round(p), [(box[0] + box[2]) / 2, Math.max(80, box[1])], rt > 1.6 ? RAHMEN_TEXTE.rueck('ZU_SPAET') : RAHMEN_TEXTE.rueck('ERKANNT'));
    if (rt > 1.6) fehler('spaet', 'Spät reagiert');
    KL().ton(rt > 1.6 ? 'fehlalarm' : 'erkannt', rt > 1.6 ? { faktor: 0.8 } : null);
    UI.fahrlehrer(rt < 1.2 ? 'freut' : 'nickt', rt < 1.2 ? spruch('lob') : HW('H011'), rt < 1.2 ? 2 : 2.4, rt < 1.2 ? '' : 'halb');
    g.nachErkannt && g.nachErkannt();
    anzeigen();
  }
  function verpasst(g) {
    g.verpasst = true;
    KL().ton('fehlalarm', { faktor: 0.8 });
    vergeben('erkannt', 0);
    fehler('verpasst', R.def.fehlertext || 'Gefahr übersehen');
    UI.fahrlehrer('skeptisch', g.verpasstText || HW('H012'), 2.4, 'schlecht');
    g.nachVerpasst && g.nachVerpasst();
  }
  const DB_WARN_RUECKFALL = 'Noch eine Doppelbremse, dann ist für heute Schluss.';
  let dbWarnLetzte = -1;
  function dbWarnung() {
    const l = [1, 2, 3].map(n => RT('DB_WARNUNG_' + n)).filter(Boolean);
    if (!l.length) return DB_WARN_RUECKFALL;
    let i = Math.floor(zufall() * l.length);
    if (l.length > 1 && i === dbWarnLetzte) i = (i + 1) % l.length;
    dbWarnLetzte = i; return l[i];
  }
  function doppelbremse(text) {
    F.doppel++; W.doppel = F.doppel; F.abzug += D.PUNKTE.doppelbremse; R.doppelHier = true;
    F.fehler.push({ art: 'doppelbremse', text: 'Doppelbremse – ' + (R.def.titel || gebietName(R.def.gebiet)), gewicht: D.FEHLERGEWICHT.doppelbremse });
    W.fuss = 1; W.ruck = ruhig ? 0 : 1; W.blitz = 1;
    KL().ton('quietschen'); KL().ton('ruck', { verzoegerung: 0.16 });
    R_.vibrieren && R_.vibrieren([60, 40, 90]);
    UI.popup(String(D.PUNKTE.doppelbremse), L.B / 2, L.armaturen - 40, 'schlecht', 'Doppelbremse');
    const letzte = F.doppel >= D.PUNKTE.abbruchBei;
    // Kleine Runde 29.10.2026 (MZ): nach der vorletzten Doppelbremse kurzer Spruch, direkt danach ruhige Warnung (DB_WARNUNG_1…3, ca. 3,2s),
    // Zähler leuchtet kurz auf (W.dbWarn, szene.js doppelAnzeige). Mechanik unverändert.
    const warnen = !letzte && F.doppel === D.PUNKTE.abbruchBei - 1;
    UI.fahrlehrer('erschrickt', letzte ? spruch('abbruch') : spruch('doppelbremse'), letzte ? 3 : warnen ? 2 : 2.6);
    if (letzte) setTimeout(() => UI.fahrlehrer('seufzt', '', 0), 1400);
    if (warnen) { const f = F; setTimeout(() => { if (F !== f || F.phase === 'fertig' || F.abbruch) return; W.dbWarn = 3.2; UI.fahrlehrer('neutral', dbWarnung(), 3.2, 'warn'); }, 2050); }
    anzeigen();
    if (letzte) { F.phase = 'fertig'; F.abbruch = true; setTimeout(() => fahrtEnde(true), 2200); }
  }

  // ---------- Fahren ----------
  function hindernis() {
    if (!R) return null;
    const g = R.gefahr;
    if (g && g.hind && g.aktiv && !g.geloest && !g.ausweichen && (R.folgen || g.doppel || g.frueh)) return g.hind();
    return R.vorFolgen ? R.vorFolgen() : null;
  }
  function regeln(dt) {
    let ziel = W.zielV;
    if (R && R.ahnenV != null && R.gefahr && !R.gefahr.geloest) ziel = Math.min(ziel, R.ahnenV);
    if (R && R.maxV != null) ziel = Math.min(ziel, R.maxV);
    if (W.kreis) ziel = Math.min(ziel, kmhZiel(25));   // im Kreisel langsam
    ziel = Math.min(ziel, sichtV() * (W.licht === 'fern' && W.wetter === 'nacht' ? 1.3 : 1));
    let brems = 0;
    const h = hindernis();
    if (h) {
      const gap = h.pos - W.s - h.abstand, vr = W.v - h.v;
      if (gap <= 0.05) { brems = vr > 0 ? 99 : 0; ziel = Math.min(ziel, Math.max(0, h.v)); }
      else {
        if (vr > 0) brems = vr * vr / (2 * gap);
        ziel = Math.min(ziel, Math.max(0, h.v + gap * 0.45));
      }
      if (brems < 0.25) brems = 0;
      brems = Math.min(brems, R.gefahr && R.gefahr.doppel ? bremsA() * 1.6 : bremsA() * 1.2);
      if (gap <= 0.05) brems = 99;
    }
    if (W.bremse) brems = Math.max(brems, 5.5);
    const vorher = W.v;
    if (brems > 0) W.v = Math.max(h && !W.bremse ? Math.min(W.v, Math.max(0, h.v)) : 0, W.v - brems * dt);
    else if (W.v < ziel) W.v = Math.min(ziel, W.v + FZ.anfahren * (W.v < 3 ? 0.8 : 1) * dt);
    else if (W.v > ziel) W.v = Math.max(ziel, W.v - Math.max(FZ.motorbremse, (W.v - ziel) * 0.8) * dt);
    const a = (W.v - vorher) / Math.max(dt, 1e-4);
    W.nicken += ((ruhig ? 0 : klemm(a * 0.9, -9, 4)) - W.nicken) * Math.min(1, dt * 6);
  }
  function seitlich(dt) {
    const d = W.kxZiel - W.kx;
    const kann = Math.min(1, W.v / 4);
    W.kx += d * Math.min(1, 1.25 * kann * dt);
    const dreh = W.dreh ? W.dreh.seite * 0.55 * Math.sin(Math.PI * Math.min(1, W.dreh.t / (W.dreh.dauer || 2.4))) : 0;
    W.lenk += (klemm(-d * 0.35 * kann + dreh + (W.kreis ? -0.22 : 0), -0.6, 0.6) * (ruhig ? 0.6 : 1) - W.lenk) * Math.min(1, dt * 5);
    W.kreisGier = (W.kreisGier || 0) + ((W.kreis ? L.B * (ruhig ? 0.2 : 0.3) : 0) - (W.kreisGier || 0)) * Math.min(1, dt * 2);   // im Kreis in die Kurve schauen
    W.gier = (W.gierSchulter || 0) + (W.drehGier || 0) + W.kreisGier;
    if (W.schulter) {
      const sb = W.schulter; sb.t += dt;
      const p = sb.t / sb.dauer;
      sb.p = p < 0.25 ? p / 0.25 : p > 0.75 ? Math.max(0, (1 - p) / 0.25) : 1;
      W.gierSchulter = ruhig ? 0 : (sb.seite === 'links' ? 1 : -1) * L.B * 0.06 * sb.p;
      if (p >= 1) { W.schulter = null; W.gierSchulter = 0; }
    }
  }
  // ---------- Abbiegen (Phase 2b): Schwenk in die neue Straße mit Überblendung (szene.js), Kreisel = Fahrt im Kreis ----------
  // W.dreh = { seite (-1 links, 1 rechts), t, dauer, wechsel }: bis zur Mitte schwenkt der Blick in die Querstraße, in der Mitte
  // wird die neue Straße gesetzt (Kulisse neu, alte Querstraße weg), danach dreht sie aus der Seite ins Bild.
  function abbiegenSchritt(dt) {
    const d = W.dreh;
    if (!d) return;
    d.dauer = d.dauer || (ruhig ? 1.8 : 2.4);
    d.t += dt;
    const p = Math.min(1, d.t / d.dauer), A = L.B * (ruhig ? 0.25 : 0.62), e = x => x * x * (3 - 2 * x);
    if (p < 0.5) W.drehGier = -d.seite * A * e(p / 0.5);
    else {
      if (!d.wechsel) {
        d.wechsel = true; W.drehWechsel = true;
        // neue Straße: Querstraßen hinter uns entfernen, Kulisse neu würfeln; Dinge der alten Straße vor uns verschwinden
        W.markierungen = W.markierungen.filter(m => !(m.art === 'querstrasse' || m.art === 'einmuendung' || m.art === 'kreisel') || m.pos > W.s + 30);
        W.saat = 1 + Math.floor(zufall() * 50);
        W.objekte.forEach(o => { if (o.pos > W.s - 2 && !o.bleibt && !o.zielstrasse) o.versteckt = true; });
        W.schilder = W.schilder.filter(s => s.pos < W.s - 2 || s.zielstrasse);
        W.rand = []; W.kreis = null;
        if (d.danach) d.danach();
      }
      W.drehGier = d.seite * A * (1 - e((p - 0.5) / 0.5));
    }
    if (p >= 1) { W.dreh = null; W.drehGier = 0; }
  }
  function kurve(dt) {
    const amp = { land: 0.0024, autobahn: 0.0009, wohngebiet: 0.0007, stadt: 0 }[W.umgebung] * (ruhig ? 0.5 : 1);
    const ziel = R && ((R.gefahr && R.gefahr.aktiv && !R.gefahr.geloest) || (R.hand && R.hand.angekuendigt && !R.hand.zurueckAm && !R.hand.gelenkt)) ? 0.35 : 1;
    W.kurvenF += (ziel - W.kurvenF) * Math.min(1, dt * 0.8);
    W.kurve = R && R.kurveFix != null ? R.kurveFix * (ruhig ? 0.6 : 1) : amp * W.kurvenF * (0.6 * Math.sin(W.s / 230 + W.saat) + 0.4 * Math.sin(W.s / 530 + W.saat * 2));
    abbiegenSchritt(dt);
    if (W.dreh) W.kurve += W.dreh.seite * 0.012 * Math.sin(Math.PI * Math.min(1, W.dreh.t / (W.dreh.dauer || 2.4))) * (ruhig ? 0.5 : 1);
    // Kreisel: im Kreis gegen den Uhrzeigersinn = gleichmäßige Linkskurve (Mittelinsel links, zeichnet szene.js)
    if (W.kreis) W.kurve = -1 / W.kreis.r * (ruhig ? 0.7 : 1);
    W.kurvenSumme += W.kurve * W.v * dt;
  }
  function bewegen_(dt) {
    for (const o of W.objekte) {
      if (o.v) o.pos += o.v * dt;
      if (o.vx) o.x += o.vx * dt;
    }
    for (let i = W.hinten.length - 1; i >= 0; i--) {
      const o = W.hinten[i];
      if (o.folgt) { o.v = W.v; o.x += (W.kx - o.x) * Math.min(1, dt); continue; }
      o.dz -= (o.v - W.v) * dt;
      if (o.dz < -(o.art === 'rad' ? 2.5 : o.art === 'lkw' ? 13 : 5)) {
        W.hinten.splice(i, 1);
        const vorne = o.art === 'rad'
          ? dazu({ typ: 'radler', x: o.x, pos: W.s + 1.5, v: o.v, vx: 0, jacke: o.jacke || '#d9822b', helm: '#f0f0f0', k: 6, richtung: 1 })
          : dazu(auto(W.s + 0.5, o.x, { art: ['rettung', 'motorrad', 'lkw'].includes(o.art) ? o.art : 'pkw', v: o.v + (o.art === 'lkw' ? 0 : 2), farbe: o.farbe || wahl(FARBEN), rundum: o.blau ? 'blau' : null }));
        o.vorne = vorne;
        if (R && R.rad === o) R.rad.vorne = vorne;
        continue;
      }
      if (o.dz > 400) W.hinten.splice(i, 1);
    }
    if (R && !R.keinGegenverkehr && W.umgebung !== 'autobahn' && !W.einbahn && F.phase === 'situation') {
      R.gegenAb -= dt;
      if (R.gegenAb <= 0) {
        R.gegenAb = (4 + zufall() * 8) / (ST().verkehr || 1);
        const x = W.umgebung === 'stadt' ? -3.4 : W.umgebung === 'wohngebiet' ? -2.9 : -3.5;
        dazu(auto(W.s + 190, x, { richtung: -1, v: -(W.zielV * (0.9 + zufall() * 0.2) + 2), gegen: true, licht: { an: W.wetter === 'daemmerung' } }));
      }
    }
    W.objekte = W.objekte.filter(o => !(o.gegen && o.pos < W.s - 8));
    randLeben(dt);
  }

  // ---------- Lebende Strecke (Phase 2b): harmlose Randobjekte je Umgebung, parallel oder weg von der Fahrbahn ----------
  function randLeben(dt) {
    const L_ = W.rand;
    for (let i = L_.length - 1; i >= 0; i--) { const o = L_[i]; if (o.v) o.pos += o.v * dt; if (o.vx) o.x += o.vx * dt; if (o.pos < W.s - 15 || o.pos > W.s + 600) L_.splice(i, 1); }
    if (!F || F.phase === 'kreuzung' || W.kreis) return;
    W.randAb -= dt;
    if (W.randAb > 0) return;
    const nacht = W.wetter === 'nacht', cfg = D.RAND[nacht ? 'nacht' : W.umgebung] || D.RAND.land;
    W.randAb = cfg.takt * (0.5 + zufall()) / (W.einfach ? D.RAND.einfach : 1);
    const art = wahl(cfg.arten), weit = W.s + Math.min(220, Math.max(90, W.v * 7)), stadt = W.umgebung === 'stadt';
    const gesperrt = pos => W.sperren.some(([a, b]) => pos > a - 10 && pos < b + 10);
    if (gesperrt(weit)) return;
    const fig = (name, x, v, extra) => L_.push(Object.assign(figur(name, weit, x, { v, gehen: v ? 1 : 0, rand: true }), extra || {}));
    // Phase 4: mehr Figuren (Bogen „Menschen 2“); Mann mit Schirm nur bei Regen
    if (art === 'passant') fig(wahl(W.regen ? ['mann-schirm', 'mann-schirm', 'fussgaenger', 'frau-tasche'] : ['fussgaenger', 'frau', 'frau-kinderwagen', 'frau-tasche', 'gehstock', 'spaziergaengerin']), zufall() < 0.5 ? (stadt ? 5.6 : 5.0) : (stadt ? -6.4 : -6.0), (zufall() < 0.5 ? 1 : -1) * (1 + zufall() * 0.4));
    else if (art === 'passant-paar') { fig('frau', -6.6, 1.1); L_.push(figur('fussgaenger', weit + 0.8, -6.1, { v: 1.1, gehen: 1, rand: true })); }
    else if (art === 'lieferwagen') { if (!W.einbahn) L_.push(auto(weit + 80, stadt ? -3.4 : -2.9, { art: 'paket', richtung: -1, v: -(W.zielV * 0.85), gegen: true, rand: true })); }
    else if (art === 'bus-gegen' || art === 'schulbus-gegen') { if (!W.einbahn) L_.push(auto(weit + 80, stadt ? -3.4 : -2.9, { art: art === 'bus-gegen' ? 'bus' : 'schulbus', richtung: -1, v: -(W.zielV * 0.8), gegen: true, rand: true })); }
    else if (art === 'kinder-zaun') { const x = zufall() < 0.5 ? 7.4 : -8.2; L_.push({ typ: 'gelaender', x: x - 0.3 * Math.sign(x), pos: weit - 6, laenge: 18, seite: Math.sign(x), rand: true }); fig('kind-ranzen', x + Math.sign(x) * 0.8, 1.0); L_.push(figur('kind', weit + 1.2, x + Math.sign(x) * 1.4, { v: 1.0, gehen: 1, hoehe: 1.15, rand: true })); }
    else if (art === 'reiterin') { if (nacht || W.schnee) return; const s = zufall() < 0.5 ? 1 : -1; L_.push({ typ: 'pferd', x: s * (13 + zufall() * 8), pos: weit, vx: s * 1.3, v: 0, blick: s, rand: true }); }
    // Polizei (nur Optik): Kontrolle am rechten Rand – Streifenwagen von hinten, Polizist daneben
    else if (art === 'kontrolle') { if (nacht || zufall() < 0.6 || W.einbahn) return; const x = stadt ? 3.0 : 4.4; L_.push(auto(weit, x, { art: 'polizei', v: 0, rand: true }), figur('polizist', weit - 2.5, x + 1.3, { rand: true })); }
    else if (art === 'traktor-feld') { const x = (zufall() < 0.5 ? 1 : -1) * (26 + zufall() * 20); L_.push(auto(weit, x, { art: 'traktor', v: 0, vx: Math.sign(x) * 1.2, rand: true, rundum: null })); }
    else if (art === 'radler-radweg') L_.push({ typ: 'radler', x: 5.4, pos: weit, v: 5 + zufall() * 1.5, vx: 0, jacke: wahl(['#d9822b', '#c0392b', '#2f63c6']), helm: '#f0f0f0', k: 2, richtung: 1, rand: true });
    else if (art === 'rehe-wald') { const x = -(30 + zufall() * 12); L_.push({ typ: 'reh', x, pos: weit, vx: -0.4, v: 0, blick: -1, rand: true }, { typ: 'reh', x: x - 2.4, pos: weit + 1.5, vx: -0.4, v: 0, blick: -1, rand: true }); for (let d = -8; d < 14; d += 5) L_.push({ typ: 'baum', x: x - 6 - (d % 3), pos: weit + d, groesse: 1.3, k: d + 40, rand: true }); }
    else if (art === 'baustelle') { const x = 7.5; L_.push(figur('arbeiter', weit, x + 1.2, { rand: true }), { typ: 'bake', x, pos: weit - 4, rand: true }, { typ: 'bake', x, pos: weit + 4, rand: true }, auto(weit + 3, x + 3.5, { art: 'van', v: 0, farbe: '#e6762a', rand: true })); }
    // Tunnel (S079): Gegenfahrbahn hat im Portal-Bild keine eigene Röhre – dort keinen Gegenverkehr (fuhr sonst durch die Flügelmauer)
    else if ((art === 'lkw-kolonne' || art === 'gegen-autobahn') && W.tunnelLage) { /* nichts */ }
    else if (art === 'lkw-kolonne') { for (let i = 0; i < 3; i++) L_.push(auto(weit + 120 + i * 20, -11.0, { art: 'lkw', richtung: -1, v: -22, gegen: true, rand: true, licht: { an: nacht } })); }
    else if (art === 'gegen-autobahn') { for (let i = 0; i < 2; i++) L_.push(auto(weit + 120 + i * 30, -10.8 - (i % 2) * 3.6, { richtung: -1, v: -30, gegen: true, rand: true, licht: { an: nacht } })); }
    else if (art === 'gegen-mix') {   // Gegenverkehr mit wechselnden Fahrzeugen (Phase-3-Korrektur: neue markenneutrale Bögen)
      const pool = { stadt: ['pkw', 'kombi', 'van', 'paket', 'polizei'], wohngebiet: ['pkw', 'kombi', 'eiswagen', 'van'], land: ['pkw', 'kombi', 'van', 'wohnmobil', 'lkw', 'polizei'] }[W.umgebung];
      if (pool && !W.einbahn && !(R && R.keinGegenverkehr)) L_.push(auto(weit + 80, W.umgebung === 'land' ? -3.5 : stadt ? -3.4 : -2.9, { art: wahl(pool), richtung: -1, v: -(W.zielV * 0.85), gegen: true, rand: true, licht: { an: nacht } }));
    }
    else if (art === 'gegen-licht') { if (W.umgebung !== 'autobahn' && !W.einbahn && !(R && R.keinGegenverkehr)) L_.push(auto(weit + 120, -3.5, { richtung: -1, v: -(W.zielV * 0.9), gegen: true, rand: true, licht: { an: true } })); }
    else if (art === 'fenster') { const x = (zufall() < 0.5 ? 1 : -1) * (24 + zufall() * 10); L_.push({ typ: 'haus', x, pos: weit, laenge: 12, tiefe: 9, hoehe: 7, farbe: '#d9c7a9', dach: '#5a5f66', seite: Math.sign(x), k: Math.floor(zufall() * 99), fenster: true, rand: true }); }
    // Lkw-Kolonne auf der eigenen Spur nur, wenn sie davonfährt bzw. sicher Abstand hält
  }

  function situationSchritt(dt) {
    R.t += dt;
    R.V.schritt && R.V.schritt(R, dt);
    if (!R) return;   // Einführung beendet (neue Fahrt beginnt)
    const vz = R.vorzeichen, g = R.gefahr;
    if (vz && !vz.gestartet && vz.ausloesen && vz.ausloesen()) { vz.gestartet = true; vz.start && vz.start(); }
    if (g && !g.aktiv && g.ausloesen()) {
      g.aktiv = true; g.t0 = zeit; g.start && g.start();
      if (vz && vz.ausloesen && !vz.gestartet) { vz.gestartet = true; vz.start && vz.start(); }
    }
    if (g && g.aktiv && !g.geloest) {
      if (!g.erkannt && !g.doppel && !g.verpasst && g.objs.length && W.sichtWeite < 250 && g.objs.every(o => o && o.pos - W.s > W.sichtWeite * 0.95)) g.t0 = zeit;
      if (!g.erkannt && !g.doppel && !g.verpasst) {
        if (g.hind && !g.nurBis) {
          // zu spät? Dann muss der Fahrlehrer bremsen
          const h = g.hind(), gap = h.pos - W.s - h.abstand, vr = W.v - h.v;
          const noetig = vr > 0 ? vr * vr / (2 * Math.max(0.01, gap)) : 0;
          if ((gap < 0.6 && vr > 0.5) || noetig > bremsA() * 0.85) { g.doppel = true; vergeben('erkannt', 0); doppelbremse(R.def.fehlertext); g.nachDoppel && g.nachDoppel(); }
        }
        if (!g.doppel && g.bis && g.bis()) {
          if (g.bisDoppel) { g.doppel = true; vergeben('erkannt', 0); doppelbremse(R.def.fehlertext); g.nachDoppel && g.nachDoppel(); }
          else verpasst(g);
        }
      }
      if (g.ausweichen && (g.erkannt || g.doppel || g.verpasst)) { if (g.ausweichen.kx != null) W.kxZiel = g.ausweichen.kx; R.maxV = W.zielV * (g.ausweichen.v != null ? g.ausweichen.v : 0.6); }
      if (g.frei()) { g.geloest = true; g.tGeloest = R.t; R.folgen = false; R.ahnenV = null; R.maxV = null; if (g.ausweichen) W.kxZiel = g.ausweichen.zurueck != null ? g.ausweichen.zurueck : 0; g.nachFrei && g.nachFrei(); }
    }
    handSchritt();
    tempoSchritt();
    if (F.einf) { if (EINF.hilfe !== undefined) W.hilfe = EINF.hilfe; }
    else if (!(R.hand && R.hand.angekuendigt && !R.hand.gelenkt)) W.hilfe = R.hilfeTempo && ST().hilfen !== 'nie' && (ST().hilfen === 'immer' || R.t > 3) ? 'bremse' : null;
    // Sicherung: kommt eine Gefahr oder ein Handgriff-Auftrag nach 45s nicht, entfällt der Teil; nach 80s endet die Situation
    if (F.einf) return;
    if (g && !g.aktiv && R.t > 45) { g.aktiv = g.geloest = true; delete R.teile.erkannt; }
    if (R.hand && !R.hand.angekuendigt && R.t > 45) { const h = R.hand; h.angekuendigt = h.gelenkt = true; h.gelenktAm = h.zurueckAm = W.s; }
    if (R.t > 80 && F.phase === 'situation') { situationBeenden(); naechsteSituation(); return; }
    const endePos = typeof R.endePos === 'function' ? R.endePos() : R.endePos;
    const fertig = (!g || g.geloest) && (!R.hand || R.hand.gelenkt) && (!R.tempoA || R.tempoA.fertig) && (!R.V.fertig || R.V.fertig(R)) && W.s > endePos;
    if (fertig && F.phase === 'situation') {
      R.fertigT += dt;
      if (R.fertigT > 0.8) { situationBeenden(); naechsteSituation(); }
    }
  }
  // Tempo-Aufgabe: an der Stelle pos zählt das Tempo (Ziel bis +3 km/h voll, bis +10 halb), ruhig gebremst = nie weit darunter
  function tempoSchritt() {
    const T = R.tempoA;
    if (!T || T.fertig) return;
    const kmh = W.v * 3.6, bis = T.pos - W.s;
    if (bis < 160) T.minV = Math.min(T.minV, kmh);
    // Ein Daumen reicht (Phase 2b): wer rechtzeitig unter das Limit bremst, hat die Stelle erkannt – Antippen bringt nur den Ahnen-Bonus
    const g = R.gefahr;
    if (W.bremse && T.bremsT == null && bis < 220) T.bremsT = zeit;
    if (g && g.durchBremse && !g.erkannt && !g.doppel && !g.verpasst && !g.geloest && T.bremsT != null && kmh <= T.limit + D.PUNKTE.tempo.toleranz && W.s < T.pos + 2) {
      if (!g.aktiv) { g.aktiv = true; g.t0 = T.bremsT; g.start && g.start(); }
      erkannt(Math.max(0, T.bremsT - g.t0));
    }
    R.hilfeTempo = bis < 130 && kmh > T.limit + D.PUNKTE.tempo.toleranz;
    if (W.s >= T.pos) {
      T.fertig = true; R.hilfeTempo = false;
      const p = D.PUNKTE.tempo, ueber = kmh - T.limit;
      const ziel = ueber <= p.toleranz ? p.ziel : ueber <= p.halbBis ? p.ziel / 2 : 0;
      vergeben('tempoZiel', ziel, mitteOben());
      vergeben('tempoSanft', T.minV >= T.limit - 12 || T.minV >= T.limit * 0.6 ? p.sanft : 0);
      if (ziel < p.ziel) { fehler('tempo', R.def.fehlertext || 'Zu schnell'); UI.fahrlehrer(ueber > p.halbBis ? 'erschrickt' : 'skeptisch', T.text || HW('H013'), 2.6, 'schlecht'); }
      else UI.fahrlehrer('freut', spruch('lob'), 2);
      W.zielV = kmhZiel(T.danach);
      T.nach && T.nach();
    }
  }

  // ---------- Ende ----------
  function bewertung(p) { return (D.BEWERTUNGEN.find(([ab]) => p >= ab) || D.BEWERTUNGEN[D.BEWERTUNGEN.length - 1])[1]; }
  function protokoll() {
    return D.BEREICHE.map(name => { const b = F.bereiche[name]; return { name, wert: b.max > 0 ? Math.round(100 * Math.max(0, b.ist) / b.max) : null }; });
  }
  function fehlerTop3() {
    const zaehl = new Map();
    F.fehler.forEach(f => { const z = zaehl.get(f.text) || { text: f.text, n: 0, gewicht: 0 }; z.n++; z.gewicht += f.gewicht; zaehl.set(f.text, z); });
    return [...zaehl.values()].sort((a, b) => b.gewicht - a.gewicht).slice(0, 3).map(z => z.n > 1 ? z.text + ' (' + z.n + '×)' : z.text);
  }
  // Letzte Runde 29.10.2026: ein Tipp zum teuersten Fehler der Fahrt (Summe der Fehlergewichte je Art; Variante zufällig, Texte T01… aus
  // blinker-tipps-entwurf.md). Ohne Fehler kein Tipp.
  function tippZu(art) { const l = TX && TX.tipps && TX.tipps[art]; return l && l.length ? l[Math.floor(Math.random() * l.length)] : ''; }
  function tippFahrt() {
    const je = {};
    F.fehler.forEach(f => { if (f.art) je[f.art] = (je[f.art] || 0) + f.gewicht; });
    const arten = Object.keys(je).sort((a, b) => je[b] - je[a]);
    for (const a of arten) { const t = tippZu(a); if (t) return t; }
    return '';
  }
  // Rechnung im Endbild: Abzüge immer ohne Vorzeichen (nie „-0“); Mindestwertung („rechnerisch −13 – 1 Punkt“) mit echtem Minuszeichen
  const mitMinus = v => (v < 0 ? '−' : '') + Math.abs(v).toLocaleString('de-DE');
  function rechnungDaten(verdient, abzug, ergebnis) {
    const roh = Math.round(verdient - abzug);
    return { verdient, abzug, ergebnis, texte: [RT('PUNKTE_VERDIENT') || 'verdient', RT('PUNKTE_ABZUG') || 'Abzüge', RT('PUNKTE_ERGEBNIS') || 'Ergebnis'],
      mindest: roh < 1 && ergebnis === 1 ? (RT('PUNKTE_MINDEST') || 'Rechnerisch {rechnerisch} – fürs Ankommen gibt es 1 Punkt.').replace('{rechnerisch}', mitMinus(roh)) : '' };
  }
  // unterste Stufe: Unterzeile passend zur Fahrt (mit/ohne Doppelbremse)
  function unterzeileFahrt(p, doppel) {
    const b = bewertung(p);
    if (b === D.BEWERTUNGEN[D.BEWERTUNGEN.length - 1][1]) return RT(doppel > 0 ? 'UNTER_0_MIT_DB' : 'UNTER_0_OHNE_DB') || unterzeile(b);
    return unterzeile(b);
  }
  function fahrtEnde(abbruch) {
    if (!F || F.beendet) return;
    F.beendet = true; F.phase = 'fertig';
    W.bremse = false; W.hilfe = null; UI.hinweis(null);
    const dauer = zeit - F.start;
    let punkte = 0;
    if (!abbruch) punkte = Math.max(1, Math.min(1000, Math.round(F.punkte + F.abzug)));
    const rt = F.rts.length ? F.rts.reduce((a, b) => a + b, 0) / F.rts.length : null;
    DEF.id = BB.bestId(stufe);
    const alt = BB.best(stufe);
    let hinweis = '';
    if (!abbruch) {
      const s = BB.statistik();
      const freiVorher = { uebung: BB.frei('uebung', s), pruefung: BB.frei('pruefung', s) };
      s.fahrten++; s.abgeschlossen[stufe] = (s.abgeschlossen[stufe] || 0) + 1;
      s.doppelbremsen += F.doppel; s.schulterOk += F.schulterOk; s.schulterAlle += F.schulterAlle;
      F.karten.forEach(k => { if (!s.karten.includes(k)) { s.karten.push(k); F.kartenNeu.push(k); } });
      BB.statistikSpeichern(s);
      F.freiVorher = freiVorher;
    }
    window.BL_LETZTE = { kartenNeu: F.kartenNeu.slice(), punkte, abbruch, dauer, rt, doppel: F.doppel, abzug: F.abzug, sitPunkte: F.sitPunkte.slice(), protokoll: protokoll(), stufe };
    R_.ende(punkte, { verzoegerung: 0 });   // speichert den Bestwert – erst danach Freischaltung prüfen (ab 550 Punkten, MZ 29.10.2026)
    if (F.freiVorher) {
      const s = BB.statistik();
      if (!F.freiVorher.uebung && BB.frei('uebung', s)) hinweis = 'Übungsfahrt freigeschaltet';
      else if (!F.freiVorher.pruefung && BB.frei('pruefung', s)) hinweis = 'Prüfungsfahrt freigeschaltet';
    }
    KL().ende(punkte, abbruch);
    UI.fahrt(false);
    UI.ende({
      punkte, abbruch, bewertung: abbruch ? RAHMEN_TEXTE.abbruchBand : bewertung(punkte), stufe: ST().name, rt,
      bereiche: protokoll(), fehler: fehlerTop3(), doppel: F.doppel, neu: !abbruch && (alt == null || punkte > alt), alt,
      hinweis, text: abbruch ? RAHMEN_TEXTE.abbruch : unterzeileFahrt(punkte, F.doppel), tipp: tippFahrt(),
      rechnung: rechnungDaten(Math.round(F.punkte), Math.abs(Math.round(F.abzug)), punkte),
      karten: abbruch ? null : { neu: F.kartenNeu.length, gesamt: BB.statistik().karten.length, max: Object.keys((TX && TX.karten) || {}).length || 100 },
    });
  }

  // ---------- Anzeige oben ----------
  // Spielertest 29.10.2026: die Kopfzeile zeigt die verdienten Punkte (ohne Abzüge) und zählt sichtbar hoch; Abzüge erscheinen als
  // Einblendung und im Endbild in der Rechnung „verdient – Abzüge = Ergebnis“. Situationsname auf schmalen Handys kürzer.
  let kopfWert = 0, kopfZiel = 0;
  const kopfKurz = new Map();
  // Letzte Runde 29.10.2026 (GPT Player: „Kopfzeile zeigt Punkte ohne Abzüge, nicht gekennzeichnet“): „320 Punkte verdient“
  const kopfRechts = p => p.toLocaleString('de-DE') + ' Punkte ' + (RT('KOPF_VERDIENT') || 'verdient');
  function kopfLinks(nr, gebiet) {
    const voll = nr + ' – ' + gebiet, schluessel = innerWidth + '|' + voll;
    if (kopfKurz.has(schluessel)) return kopfKurz.get(schluessel);
    const el = document.querySelector('#anzeige .links');
    let text = voll;
    const re = document.querySelector('#anzeige .rechts');
    if (el && re && el.clientWidth > 0) {
      re.textContent = kopfRechts(1000);   // längster Punktestand, damit die Zeile im Spiel nicht umspringt
      const passt = s => { el.textContent = s; return el.scrollWidth <= el.clientWidth + 1; };
      const kurz = gebiet.split('/')[0];
      text = passt(voll) ? voll : passt(nr + ' – ' + kurz) ? nr + ' – ' + kurz : nr;
    }
    if (el && el.clientWidth > 0) kopfKurz.set(schluessel, text);
    return text;
  }
  function anzeigen() {
    if (!F || !R) return;
    if (F.einf) { R_.anzeige(EINF.kopf(), ''); return; }
    kopfZiel = Math.max(0, Math.round(F.punkte + laufendePunkte()));
    R_.anzeige(kopfLinks((F.idx + 1) + '/' + F.liste.length, gebietName(R.def.gebiet)), kopfRechts(Math.round(kopfWert)));
  }
  function kopfZaehlen(dt) {
    if (kopfWert === kopfZiel) return;
    const d = kopfZiel - kopfWert, schritt = Math.max(40, Math.abs(d) * 3) * dt;
    kopfWert = Math.abs(d) <= schritt ? kopfZiel : kopfWert + Math.sign(d) * schritt;
  }
  function laufendePunkte() {
    if (!R) return 0;
    let ist = 0, max = 0;
    for (const n in R.teile) { ist += R.teile[n].ist; max += R.teile[n].max; }
    return max > 0 ? ist * 100 / max : 0;
  }
  function mitteOben() { return [L.B / 2, L.armaturen * 0.5]; }

  // ---------- Bildrate: Selbstmessung in den ersten Sekunden ----------
  const FPS = { bilder: 0, zeit: 0, messung: null, laufend: [], wert: 0 };
  window.BL_FPS = FPS;
  function fpsMessen(echtDt) {
    FPS.laufend.push(echtDt); if (FPS.laufend.length > 90) FPS.laufend.shift();
    FPS.wert = FPS.laufend.length / FPS.laufend.reduce((a, b) => a + b, 0);
    // Anzeige #fps (29.10.2026, MZ: am echten Handy ablesen): Mittel seit dem Laden, Minimum je volle Sekunde (erste 1,5s Anlauf ohne)
    FPS.alleZeit = (FPS.alleZeit || 0) + echtDt; FPS.alleBilder = (FPS.alleBilder || 0) + 1;
    if (FPS.alleZeit > 1.5) {
      FPS.sekZeit = (FPS.sekZeit || 0) + echtDt; FPS.sekBilder = (FPS.sekBilder || 0) + 1;
      if (FPS.sekZeit >= 1) { const r = FPS.sekBilder / FPS.sekZeit; FPS.min = FPS.min == null ? r : Math.min(FPS.min, r); FPS.sekZeit = 0; FPS.sekBilder = 0; }
    }
    if (!F) return;
    const einfachMerken = () => { W.einfach = true; try { sessionStorage.setItem('mg:blinker-links:einfach', '1'); } catch (e) { /* egal */ } };
    if (FPS.messung == null) {
      FPS.vorlauf = (FPS.vorlauf || 0) + echtDt;
      if (FPS.vorlauf < 1.5) return;
      FPS.zeit += echtDt; FPS.bilder++;
      if (FPS.zeit > 4) { FPS.messung = FPS.bilder / FPS.zeit; if (FPS.messung < 40 && !W.einfach) einfachMerken(); }
      return;
    }
    if (!W.einfach && FPS.laufend.length >= 90 && FPS.wert < 30) einfachMerken();
  }


  // ---------- Geführte erste Fahrt (Spielertest 29.10.2026, MZ: „alle sechs umsetzen“) ----------
  // Nur beim allerersten Start der Fahrstunde (gemerkt in mg:blinker-links:einfuehrung:<firma>) oder über „Handgriffe zeigen“
  // (Startbild; Startseite → #einfuehrung&los). Ruhige Übungsstrecke (Einbahnstraße, zwei Spuren), ohne Wertung/Bestwert, jederzeit
  // „Überspringen“. Schritte = Hinweise H035–H046 (Text + Etikett, Text Writer): Begrüßung → Ball rollt auf die Straße (Gefahr
  // antippen) → Fehlalarm erklärt → Bremse halten → Spurwechsel Spiegel – Blinker – Schulterblick – Lenken → Doppelbremse gezeigt
  // (Fuß, ohne Ruck, ohne Abzug) → dreimal ist Schluss → Lob, dann direkt die normale Fahrt. Jeder Übungsschritt wartet; nach 5s Hilfe
  // (Sprechblase erneut, Etikett deutlicher, Ring um die Gefahr). Testhilfen: #einfuehrung (erzwingen), #ohneeinfuehrung.
  const EINF_KEY = 'blinker-links:einfuehrung:' + (BB.FIRMA || '');
  const ET = id => (TX && TX.hinweisEtikett && TX.hinweisEtikett[id]) || '';
  const EINF = {
    erzwungen: hw('einfuehrung') != null, hilfe: undefined, s: null,
    noetig() {
      if (hw('ohneeinfuehrung') != null || TEST.situation || TEST.kreuzung) return false;
      if (this.erzwungen) return true;
      return stufe === 'fahrstunde' && BB.lesen(EINF_KEY) !== '1';
    },
    kopf() { return ''; },   // Kopfzeile bleibt leer: dort sitzt „Überspringen“ (schirme.js)
    start() {
      this.erzwungen = false;
      F = { einf: true, liste: [], idx: 0, kartenNeu: [], punkte: 0, abzug: 0, doppel: 0, rts: [], bereiche: {}, fehler: [], karten: [], schulterOk: 0, schulterAlle: 0,
        start: zeit, phase: 'situation', wartet: 0, sitPunkte: [], fehlalarmZeit: -9, abbruch: false };
      D.BEREICHE.forEach(b => { F.bereiche[b] = { ist: 0, max: 0 }; });
      W.doppel = 0; W.dbWarn = 0; W.zeigeDoppel = true; W.fuss = 0; W.ruck = 0; W.blitz = 0; W.rand = []; W.randAb = 1; W.kreis = null;
      const def = { id: 'EINF', vorlage: 'einfuehrung', p: { umgebung: 'stadt', kmh: 50 }, gebiet: 'innenstadt', stufe: 1, titel: '', bereich: 'Verkehrsbeobachtung', schritte: [], richtung: 'links' };
      F.liste = [def];
      this.nr = -1; this.fehlalarmGesagt = false; this.hilfe = undefined; this.stand = false; this.ball = null;
      situationStarten(def);
      UI.fahrt(true);
      UI.einf({ ueberspringen: () => this.ende(true), text: RT('EINFUEHRUNG_UEBERSPRINGEN') || 'Überspringen' });
      UI.fahrlehrer('neutral', '', 0);
      this.weiter();
      anzeigen();
    },
    // Schrittfolge: art 'sagen' (Erklärung; läuft nach der Lesezeit weiter, Tippen schaltet früher weiter) oder 'tun' (wartet, bis erledigt)
    SCHRITTE: [
      { id: 'H035', art: 'sagen', ziel: 'mitte', nach: 0.6 },
      { id: 'H036', art: 'tun', ziel: 'ball', start() { EINF.ballStart(); }, fertig: () => EINF.ballErkannt(), weiterNach: 3.6 },
      { id: 'H037', art: 'tun', ziel: 'ball', nurWenn: () => !EINF.ballErkannt(), fertig: () => EINF.ballErkannt(), ringNach: 5 },
      { id: 'H038', art: 'sagen', ziel: 'scheibe', nach: 1.4, nurWenn: () => !EINF.fehlalarmGesagt },
      { id: 'H039', art: 'tun', ziel: 'bremse', hilfe: 'bremse', fertig: () => EINF.bremseFertig() },
      { id: 'H040', art: 'tun', ziel: 'spiegel', start() { EINF.spurStart(); }, hand: 'spiegel' },
      { id: 'H041', art: 'tun', ziel: 'blinker', hand: 'blinker' },
      { id: 'H042', art: 'tun', ziel: 'schulter', hand: 'schulter' },
      { id: 'H043', art: 'tun', ziel: 'lenken', hand: 'lenken' },
      { id: 'H044', art: 'sagen', ziel: 'doppel', hilfe: 'doppel', nach: 1.8, start() { W.fuss = 1; } },
      { id: 'H045', art: 'sagen', ziel: 'doppel', hilfe: 'doppel', start() { EINF.punkteT = 0; } },
      { id: 'H046', art: 'sagen', ziel: 'mitte', dauer: 3 },
    ],
    weiter() {
      for (;;) {
        this.nr++;
        const s = this.SCHRITTE[this.nr];
        if (!s) { this.ende(false); return; }
        if (s.nurWenn && !s.nurWenn()) continue;
        this.s = s; this.t = 0; this.gezeigt = false; this.hilfeGezeigt = false; this.stand = false;
        UI.etikett(null);
        return;
      }
    },
    zeigen() {
      const s = this.s;
      this.gezeigt = true;
      s.start && s.start();
      UI.fahrlehrer(s.id === 'H046' ? 'freut' : 'neutral', HW(s.id), 60);
      this.etikett();
    },
    etikett(stark) {
      const s = this.s; if (!s || !L) return;
      const text = ET(s.id);
      if (!text) { UI.etikett(null); return; }
      const z = this.zielPunkt(s.ziel);
      UI.etikett(z ? { text, x: z[0], y: z[1], unten: z[2], stark: !!stark, mitte: s.ziel === 'mitte' || s.ziel === 'scheibe' } : null);
    },
    // Lage des Etiketts: [x, y, unten (Etikett unter dem Punkt, Pfeil nach oben)]
    zielPunkt(ziel) {
      const rechts = R && R.hand && R.hand.richtung === 'rechts';
      if (ziel === 'mitte') return [L.B / 2, L.armaturen * 0.34, true];
      if (ziel === 'scheibe') return [L.B / 2, L.armaturen * 0.5, true];
      if (ziel === 'bremse') { const r = L.bremse; return [r.x + r.w / 2, r.y - 12, false]; }
      if (ziel === 'spiegel') { const r = L.spiegelInnen; return [r.x + r.w / 2, r.y + r.h + 12, true]; }
      if (ziel === 'blinker') { const b = L.blinker; return [b.x + b.w * (rechts ? 0.75 : 0.25), b.y - 12, false]; }
      if (ziel === 'schulter') return [L.B / 2, L.dach + (L.armaturen - L.dach) * 0.62 - 34, false];
      if (ziel === 'lenken') { const l = L.lenkrad, sx = rechts ? 1 : -1; return [l.cx + sx * l.r * 0.85, Math.min(L.H - 30, l.cy - l.r * 0.65 - 30) - 10, false]; }
      if (ziel === 'doppel') { const d = SZ.doppelKasten(L); return [d.x + d.w / 2, d.y + d.h + 10, true]; }
      if (ziel === 'ball') { const b = this.ball && this.ball._box; return b ? [(b[0] + b[2]) / 2, b[1] - 18, false] : null; }
      return null;
    },
    schritt(dt) {
      const s = this.s; if (!s) return;
      this.t += dt;
      if (!this.gezeigt) { this.hilfe = null; if (this.t >= (s.nach || 0.25)) { this.t = 0; this.zeigen(); } return; }
      // Ring am Bedienteil (Spurwechsel: Ring kommt aus den Handgriffen), Ring um die Gefahr erst als Hilfe
      this.hilfe = s.hand ? undefined : s.hilfe || null;
      W.hilfeObj = s.ziel === 'ball' && this.t > (s.ringNach || 99) && this.ball && !this.ballErkannt() ? this.ball : null;
      if (['ball', 'lenken', 'blinker', 'doppel'].includes(s.ziel)) this.etikett(this.hilfeGezeigt);
      if (s.id === 'H045') { this.punkteT += dt; W.doppel = this.punkteT < 0.6 ? 0 : Math.min(3, Math.floor((this.punkteT - 0.6) / 0.6) + 1); }
      if (s.art === 'tun') {
        const fertig = s.hand ? this.handWeiter(s.hand) : s.fertig && s.fertig();
        if (fertig) { W.hilfeObj = null; this.weiter(); return; }
        if (s.weiterNach && this.t > s.weiterNach) { this.weiter(); return; }   // H036 erklärt, dann H037 „antippen“
        if (this.t > 5 && !this.hilfeGezeigt && !this.stand) { this.hilfeGezeigt = true; UI.fahrlehrer('neutral', HW(s.id), 60); this.etikett(true); }
        return;
      }
      if (this.t > (s.dauer || Math.max(3.6, HW(s.id).length * 0.075))) this.sagenFertig();
    },
    sagenFertig() { if (this.s && this.s.id === 'H045') W.doppel = 0; this.weiter(); },
    tipp() {
      const s = this.s;
      if (s && s.art === 'sagen' && this.gezeigt && this.t > 0.6) { this.sagenFertig(); return true; }
      return false;
    },
    fehlalarm() {
      if (this.fehlalarmGesagt) return;
      this.fehlalarmGesagt = true;
      UI.fahrlehrer('neutral', HW('H038'), 60);
      clearTimeout(this.fehlUhr);
      this.fehlUhr = setTimeout(() => { if (F && F.einf && this.s && this.s.art === 'tun' && this.gezeigt) UI.fahrlehrer('neutral', HW(this.s.id), 60); }, 3400);
    },
    // Übung 1: ein Ball rollt von rechts auf die Straße und bleibt liegen, bis er angetippt ist (dann rollt er weiter, wir fahren an)
    ballStart() {
      const b = this.ball = dazu({ typ: 'ball', x: 4.6, pos: W.s + 55, dreh: 0, vx: -1.4, v: 0, r: 0.18 });   // Ball 1,5× (MZ, 29.10.2026: „etwas zu klein“)
      R.gefahr = gefahr({ obj: b, ausloesen: () => true, frei: () => R.gefahr.erkannt && b.x < -3 });
      teil('erkannt', D.PUNKTE.erkannt);
      R.vorFolgen = () => (R.gefahr && !R.gefahr.geloest ? { pos: b.pos, v: 0, abstand: 12 } : null);   // hält 12 m statt 14 m davor
      R.einfBall = () => { if (!R.gefahr || R.gefahr.obj !== b) return; if (!R.gefahr.erkannt && b.x < 1.0) b.vx = 0; if (R.gefahr.erkannt) b.vx = b.x < -7 ? 0 : -2.6; b.dreh = (b.dreh || 0) + b.vx * 0.06; };
    },
    ballErkannt() { return !!(R && R.gefahr && R.gefahr.erkannt); },
    // Übung 2: Bremse halten bis zum Stillstand, dann loslassen – wir rollen weiter
    bremseFertig() {
      if (W.bremse && W.v < 0.4) this.stand = true;
      if (this.stand && !W.bremse) { this.hilfe = null; UI.etikett(null); }
      return this.stand && !W.bremse && W.v > 1.2;
    },
    // Übung 3: Spurwechsel nach links (Einbahnstraße, linke Spur frei)
    spurStart() {
      R.gefahr = null; R.vorFolgen = null; R.einfBall = null;
      R.hand = handgriffe({ schritte: ['spiegel', 'blinker', 'schulter', 'lenken'], richtung: 'links', ziel: -3.4, ankuendigen: () => true, belegt: () => false, auftrag: '' });
    },
    handWeiter(art) {
      const h = R && R.hand; if (!h) return true;
      if (art === 'lenken') return h.gelenkt;
      return h.folge.some(f => f.art === art && f.ok);
    },
    ende(uebersprungen) {
      if (!F || !F.einf) return;
      BB.schreiben(EINF_KEY, '1');
      clearTimeout(this.fehlUhr);
      this.s = null; this.hilfe = undefined; W.hilfeObj = null;
      UI.einf(null); UI.etikett(null); UI.hinweis(null);
      if (uebersprungen) UI.fahrlehrer('neutral', '', 0);
      W.hilfe = null; W.blinker = null; W.kxZiel = 0; W.doppel = 0; W.fuss = 0; W.bremse = false;
      R = null;
      fahrtStarten();
    },
  };
  VORLAGEN.einfuehrung = {
    aufbau(R) {
      W.einbahn = true; R.keinHinten = true; R.keinGegenverkehr = true;
      R.endePos = 1e9;
    },
    schritt(R, dt) { R.einfBall && R.einfBall(); EINF.schritt(dt); },
    fertig: () => false,
  };
  window.BL_EINF = EINF;

  // ---------- Rahmen-Anschluss ----------
  let echtZuletzt = performance.now();
  function neu() {
    W.s = 0; W.v = 0; W.kx = W.kxZiel = 0; W.objekte = []; W.schilder = []; W.hinten = []; W.markierungen = [];
    R = null; F = null; zeit = 0;
    if (R_.zustand !== 'spiel') return;
    KL().szene('spiel');
    if (EINF.noetig()) return EINF.start();
    fahrtStarten();
  }
  function fahrtStarten() {
    fahrtNeu();
    UI.fahrt(true);
    UI.fahrlehrer('neutral', '', 0);
    const anl = stufe === 'pruefung' ? spruch('pruefung') : spruch('start');
    const s0 = F.liste[0], g0 = D.GEBIETE[s0.gebiet];
    W.umgebung = (s0.p && s0.p.umgebung) || g0.umgebung; wetterSetzen(s0.wetter || (s0.gebiet === 'nacht' ? 'nacht' : 'klar'));
    bilderVorrang();
    const stTitel = TX && TX.stufen && TX.stufen[stufe] && TX.stufen[stufe].titel || ST().name;
    UI.titel(stTitel, 'Musterstadt – ' + F.liste.length + ' Situationen', ruhig ? 2.4 : 2.2, () => {
      UI.fahrlehrer('neutral', anl, 2.6);
      naechsteSituation();
    });
  }
  // Ladezeit (Phase-5-Korrektur): bilder.js lädt vorab nur Cockpit, Fahrlehrer, Himmel. Je Situation hier die Bilder für die aktuelle
  // und die nächste Situation anfordern: Fassaden bzw. Randstreifen und Horizont des Gebiets, Bäume (Wohngebiet/Land), Tiere (Land),
  // Nachtfassungen nur bei Dunkelheit, Draufsicht nur vor einer Kreuzung, Endbild-Fahrlehrer zur letzten Situation.
  function bilderVorrang() {
    const BI = window.BL_BILDER;
    if (!BI || !BI.vorrang || !F || !F.liste) return;
    const teile = new Set(), i0 = Math.max(0, F.idx);
    for (let i = i0; i <= i0 + 1 && i < F.liste.length; i++) {
      const def = F.liste[i], p = def.p || {}, umg = p.umgebung || (D.GEBIETE[def.gebiet] || D.GEBIETE.land).umgebung;
      const w = def.wetter || (def.gebiet === 'nacht' ? 'nacht' : 'klar'), dunkel = /nacht/.test(w);
      teile.add('(fassade|rand|hausseite)/' + umg + '-' + (dunkel ? '' : '(?!.*-nacht$)'));
      if (umg === 'stadt' || umg === 'wohngebiet') teile.add('textur/(putz-hell|dach-)');   // Häuser mit Tiefe (29.10.2026)
      teile.add('kulisse/horizont-' + (umg === 'autobahn' ? 'land' : umg));
      if (umg === 'land' || umg === 'wohngebiet') teile.add('baum/');
      if (umg === 'land') teile.add('tiere/');
      if (def.vorlage === 'kreuzung') teile.add('draufsicht/');
      if (p.modus === 'tunnel') teile.add('tunnel/(wand|decke|ausblick-' + (dunkel ? 'nacht' : 'tag') + ')');   // Tunnel innen (29.10.2026)
    }
    if (F.idx >= F.liste.length - 2) teile.add('fahrlehrer/ende-(daumen|klemmbrett)$');
    BI.vorrang(new RegExp('^(' + [...teile].join('|') + ')'));
  }
  function schritt(dtRahmen) {
    const jetzt = performance.now(), echt = (jetzt - echtZuletzt) / 1000; echtZuletzt = jetzt;
    if (echt > 0 && echt < 0.5) fpsMessen(echt);
    if (TEST.fps) UI.fps(`${Math.round(FPS.wert)} B/s
Ø ${Math.round(FPS.alleBilder / Math.max(FPS.alleZeit, 0.001))} – min ${FPS.min == null ? '…' : Math.round(FPS.min)}
${W.einfach ? 'einfach' : 'normal'}`);
    const dt = dtRahmen * TEST.tempo;
    zeit += dt;
    if (!F) return;
    if (!F.beendet) {
      KL().fahrt({ v: W.v, dv: W.v - (F.vVorher != null ? F.vVorher : W.v), bremse: W.bremse, umgebung: W.umgebung, gebiet: R ? R.def.gebiet : null,
        wetter: W.wetter, wetterArt: W.wetterArt, regen: W.regen, schnee: W.schnee, wischer: W.wischer, tunnel: W.tunnel || 0,
        blinkt: !!(W.blinker || W.warn), nass: W.regen || W.schnee });
      F.vVorher = W.v;
    }
    W.spiegel.innen += dt; W.spiegel.links += dt; W.spiegel.rechts += dt;
    W.dbWarn = Math.max(0, (W.dbWarn || 0) - dt);
    W.fuss = Math.max(0, W.fuss - dt / 1.6); W.ruck = Math.max(0, W.ruck - dt / 0.5); W.blitz = Math.max(0, W.blitz - dt / 0.6);
    if (F.phase === 'kreuzung') return;
    if (R && (F.phase === 'situation' || F.phase === 'fertig')) situationSchritt(dt);
    bewegen_(dt);
    regeln(dt);
    seitlich(dt);
    kurve(dt);
    W.s += W.v * dt;
    kopfZaehlen(dt);
    if (R && (F.phase === 'situation' || F.phase === 'wechsel')) anzeigen();
  }
  // flach quer (Phase-5-Korrektur): Sprechblase neben dem Fahrlehrer statt darunter, schmal genug für den Platz rechts vom Innenspiegel
  function cssLage() {
    const h = document.documentElement, s = h.style;
    h.classList.toggle('bl-flach', !!L.flach);
    s.setProperty('--bl-armaturen', L.armaturen + 'px');
    s.setProperty('--bl-blase', Math.round(L.flach ? 54 : L.spiegelInnen.y + L.spiegelInnen.h + 10) + 'px');
    s.setProperty('--bl-blase-max', Math.round(L.flach ? Math.max(170, L.B - 70 - (L.spiegelInnen.x + L.spiegelInnen.w) - 12) : 300) + 'px');
  }
  function zeichne(g, B, H, zustand, dt) {
    if (!(B > 0 && H > 0)) return;   // Spiel im versteckten iframe (Größe 0): nichts zeichnen, beim Sichtbarwerden neu einmessen
    if (!L || L.B !== B || L.H !== H) { L = SZ.layout(B, H); cssLage(); }
    if (zustand !== 'spiel' && !(zustand === 'ende' && F)) { g.fillStyle = '#16181a'; g.fillRect(0, 0, B, H); return; }
    SZ.zeichne(g, W, L, dt, Math.min(window.devicePixelRatio || 1, 2.5));
  }

  const frage = TX && TX.frage && TX.frage.length ? wahl(TX.frage) : D.TEXTE.frage;
  const DEF = {
    id: BB.bestId(stufe), wertung: 'hoch', hoechst: 1000,
    format: p => p.toLocaleString('de-DE') + ' Punkte',
    texte: { titel: D.TEXTE.titel, untertitel: frage, anleitung: RAHMEN_TEXTE.anleitung[stufe], ende: '' },
    neu, schritt, zeichne, runter, bewegen, hoch,
    groesse(B, H) { L = SZ.layout(B, H); cssLage(); },
  };

  function startbild() {
    KL().szene('start');
    const s = BB.statistik();
    const freiAb = id => { const v = BB.VORHER[id]; return v ? (RT('STUFE_FREI_AB') || '').replace('{punkte}', BB.zahl(BB.FREI_AB)).replace('{stufe}', (TX && TX.stufen && TX.stufen[v] && TX.stufen[v].kurz) || D.STUFEN[v].name) : ''; };
    const stufen = BB.STUFEN.map(x => ({ id: x.id, name: x.name, frei: TEST.frei || x.id === stufe || BB.frei(x.id, s), best: BB.best(x.id), freiAb: freiAb(x.id) }));
    if (TEST.best != null) stufen.forEach(x => { if (x.id === stufe) x.best = Math.max(0, Math.min(1000, +TEST.best || 0)); });
    UI.start({
      stufe, stufen, frage, anleitung: RAHMEN_TEXTE.anleitung,
      wahl(id) { stufe = id; BB.waehlen(id); DEF.id = BB.bestId(id); },
      los() { DEF.id = BB.bestId(stufe); document.getElementById('losKnopf').click(); },
      einfuehrung: { text: RT('EINFUEHRUNG_NOCHMAL') || 'Handgriffe zeigen', los() { EINF.erzwungen = true; DEF.id = BB.bestId(stufe); document.getElementById('losKnopf').click(); } },
    });
  }
  UI.beimNochmal(() => { UI.endeAus(); document.getElementById('nochmalKnopf').click(); });

  R_.spiel(DEF);
  if (TEST.ende != null || TEST.abbruch) {
    const p = TEST.abbruch ? 0 : Math.max(0, Math.min(1000, +TEST.ende || 854));
    // Testhilfen Endbild: #ende=1&abzug=330 (Mindestwertung), &doppel=0|1|2, &tipp=<art> (ohne: tempo; &tipp=keiner = ohne Fehler)
    const tAbzug = TEST.abzug != null ? Math.max(0, +TEST.abzug || 0) : (p > 840 ? 10 : 160), tDoppel = TEST.doppel != null ? +TEST.doppel || 0 : (TEST.abbruch ? 3 : 1);
    const tVerdient = Math.max(0, TEST.abzug != null && p === 1 ? Math.round(tAbzug * 0.96) : p + tAbzug), keiner = TEST.tipp === 'keiner';
    KL().ende(p, TEST.abbruch);
    UI.ende({
      punkte: p, abbruch: TEST.abbruch, bewertung: TEST.abbruch ? RAHMEN_TEXTE.abbruchBand : bewertung(p), stufe: ST().name, rt: 0.82,
      bereiche: [95, 88, 84, 65, 95].map((w, i) => ({ name: D.BEREICHE[i], wert: w })),
      fehler: keiner ? [] : ['Schulterblick vergessen – Landstraße', 'Blinker vergessen – Innenstadt', tDoppel ? 'Doppelbremse – 30er/Schule' : 'Zu schnell – Autobahn'],
      rechnung: rechnungDaten(tVerdient, tAbzug, p), tipp: keiner ? '' : tippZu(TEST.tipp || (tDoppel ? 'doppelbremse' : 'tempo')),
      doppel: tDoppel, neu: false, alt: 761, hinweis: '', karten: TEST.abbruch ? null : { neu: 3, gesamt: 40, max: 100 }, text: TEST.abbruch ? RAHMEN_TEXTE.abbruch : unterzeileFahrt(p, tDoppel), beispiel: true,
    });
  } else startbild();
  if (TEST.los && TEST.ende == null && !TEST.abbruch) setTimeout(() => { const b = document.querySelector('.bl-start [data-los]'); if (b) b.click(); }, 50);

  // Testschnittstelle (nur lesen bzw. für Bots: Lage der Ziele und Bedienteile)
  window.BL_TEST = {
    get W() { return W; }, get F() { return F; }, get R() { return R; }, get L() { return L; }, get zeit() { return zeit; },
    ALLE, KREUZ,
    // Routen erzeugen ohne zu fahren: route(saat) fest; routen(n) = n Fahrten hintereinander mit Gedächtnis (nur im Speicher)
    route(saat, stufeId) { const r = routeBauen(STUFE_NR[stufeId || stufe] || 1, zufallsGen(saat), { s: [], k: [] }); return { reihe: r.reihe, ids: r.liste.map(s => s.id), gebiete: r.liste.map(s => s.gebiet), wetter: r.liste.map(s => s.wetter || (s.gebiet === 'nacht' ? 'nacht' : 'klar')) }; },
    routen(n, stufeId) { const m = { s: [], k: [] }, aus = []; for (let i = 0; i < n; i++) { const r = routeBauen(STUFE_NR[stufeId || stufe] || 1, zufall, m); r.liste.forEach(s => { const l = s.vorlage === 'kreuzung' ? m.k : m.s; const j = l.indexOf(s.id); if (j >= 0) l.splice(j, 1); l.push(s.id); }); m.s = m.s.slice(-D.ROUTE.merken); m.k = m.k.slice(-D.ROUTE.merkenKreuzung); aus.push({ reihe: r.reihe, ids: r.liste.map(s => s.id), gebiete: r.liste.map(s => s.gebiet), wetter: r.liste.map(s => s.wetter || (s.gebiet === 'nacht' ? 'nacht' : 'klar')) }); } return aus; },
    bremsA: () => bremsA(), sichtV: () => sichtV(),
    ziele() {
      const k = o => o && o._box && !o.versteckt ? { x: (o._box[0] + o._box[2]) / 2, y: (o._box[1] + o._box[3]) / 2 } : null;
      const g = R && R.gefahr, vz = R && R.vorzeichen;
      const sp = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
      const ortZiel = ort => ort === 'innen' || ort === 'spiegel' ? sp(L.spiegelInnen) : ort === 'links' ? sp(L.spiegelL) : ort === 'rechts' ? sp(L.spiegelR) : ort === 'scheibe' ? { x: L.B / 2, y: L.armaturen * 0.45 } : null;
      const gOffen = g && g.aktiv && !g.erkannt && !g.doppel && !g.verpasst && !g.geloest;
      const gZiel = !gOffen ? null : g.ort ? ortZiel(g.ort) : g.objs.map(k).find(Boolean) || (g.durch ? { durch: g.durch, seite: g.durchSeite } : null);
      const vZiel = vz && !R.ahnen && vzAktiv(vz) ? (vz.ort ? ortZiel(vz.ort) : (vz.objs || []).map(k).find(Boolean) || null) : null;
      return { vorzeichen: vZiel, gefahr: gZiel, durch: gOffen && g.durch ? { art: g.durch, seite: g.durchSeite } : null,
        hand: R && R.hand ? { angekuendigt: R.hand.angekuendigt, gelenkt: R.hand.gelenkt, naechst: naechsterSchritt(R.hand), belegt: R.hand.belegt ? R.hand.belegt() : false, nurAm: R.hand.nurAm ? R.hand.nurAm() : true, richtung: R.hand.richtung } : null,
        kreuzung: F && F.phase === 'kreuzung', phase: F && F.phase, tempo: R && R.hilfeTempo, tempoLimit: R && R.tempoA && !R.tempoA.fertig ? R.tempoA.limit : null, tempoBis: R && R.tempoA && !R.tempoA.fertig ? R.tempoA.pos - W.s : null };
    },
  };
})();
