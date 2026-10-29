// „Blinker links“ – Ton (Phase 4, 28.10.2026). Für Startseite UND Spiel (eine Datei, Klänge in ../klaenge/, Liste klaenge/liste.js
// aus Material/Skripte/blinker-ton.py). Klang-Konzept MZ (28.10.2026): keine Musik; Startseite + Startbild = Blinker-Ticken im
// Takt von start/takt.js (Cockpit-Pfeil blinkt synchron) + leise Straße; im Spiel Motor (Tonhöhe/Lautstärke mit dem Tempo),
// Reifenrollen, Blinker + Hebel, Warnblinker-Taste, Wischer, Atmo je Gebiet, seltene Geräusche, Doppelbremse (Quietschen + Ruck),
// Gefahr erkannt (hell), Fehlalarm/zu spät (gedämpft), Tippen (Klick); Endbild je Bewertungsstufe eigener Klang, danach wieder
// leise Blinker + Straße. Eigene Ton-Steuerung neben dem Rahmen (rahmen.js bleibt unverändert, Muster „Hammerpreis“ klang.js).
// Ton an/aus: Knopf #tonKnopf (Startseite start.js bzw. Rahmen; Speicher mg:ton). Ton erst nach dem ersten Tippen (Browser-Regel).
// Laden: Gruppe g (Blinker, Straße) beim ersten Tippen, Gruppe s (Bedienung, Motor) beim ersten Tippen im Spiel, Gruppe b
// (Atmo je Gebiet, seltene Geräusche, Endbild) erst bei Bedarf. Testhilfen: BL_KLANG.protokoll, BL_KLANG.zustand(), #tonprotokoll.
(function () {
  'use strict';
  const LISTE = window.BL_KLANG_LISTE || {};
  const BASIS = (() => { try { return new URL('../klaenge/', document.currentScript.src).href; } catch (e) { return 'klaenge/'; } })();
  const IM_SPIEL = !!window.Rahmen;
  const PROTO_KONSOLE = /(^|[#&])tonprotokoll\b/.test(location.hash);
  const SCHLEIFEN = ['strasse', 'motor-leer', 'motor-fahrt', 'rollen', 'atmo-stadt', 'atmo-schule', 'atmo-land', 'atmo-autobahn', 'regen-dach', 'wind'];
  // leichte Tonhöhen-Variation (±), damit Wiederholungen nicht nerven
  const VARI = { klick: 0.05, tick: 0.01, tack: 0.01, 'hebel-an': 0.03, 'hebel-aus': 0.03, 'warn-taste': 0.03, erkannt: 0.02, fehlalarm: 0.02,
    hupe: 0.04, klingel: 0.04, hund: 0.05, lkw: 0.05, wischer: 0.02, quietschen: 0.04 };
  // seltene Geräusche je Umgebung: [Name, Gewicht, Mindestabstand s] – sparsam, zufällig, mit Seite (Stereo)
  const SELTEN = {
    stadt: [['hupe', 3, 45], ['klingel', 3, 40], ['hund', 1, 60], ['martinshorn', 1, 120]],
    wohngebiet: [['klingel', 3, 40], ['hund', 2, 50], ['schulglocke', 2, 90], ['hupe', 1, 60]],
    land: [['traktor', 3, 70], ['hund', 2, 60], ['klingel', 1, 60]],
    autobahn: [['martinshorn', 1, 150], ['hupe', 1, 90]],
  };
  const SELTEN_ABSTAND = [22, 45];        // zwischen zwei seltenen Geräuschen (gleich welches) zufällig so viele Sekunden
  const LKW_ABSTAND = [10, 22];           // Autobahn: Lkw rauscht vorbei
  const ATMO = { stadt: 'atmo-stadt', wohngebiet: 'atmo-schule', land: 'atmo-land', autobahn: 'atmo-autobahn' };
  const WISCH_PERIODE = 1.7;              // wie szene.js regen(): Wischer schwingt alle 1,7s (1,1s hin und zurück)

  // ---------- Grundlagen ----------
  let ac = null, haupt = null, busFx = null, busLoop = null;
  let speicherGeht = true;
  const tonGespeichert = () => { try { return localStorage.getItem('mg:ton') !== 'aus'; } catch (e) { speicherGeht = false; return true; } };
  let tonAn = tonGespeichert();
  const bytes = {}, puffer = {}, laedt = {}, zuletzt = {};
  const protokoll = [];
  function merken(name, art) {
    const e = { t: +(performance.now() / 1000).toFixed(2), name, art };
    protokoll.push(e); if (protokoll.length > 600) protokoll.shift();
    if (PROTO_KONSOLE) console.debug('[Ton]', art, name);   // eslint-disable-line no-console
  }
  function holen(n) {
    if (!bytes[n]) bytes[n] = fetch(BASIS + n + '.mp3').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null).then(b => { if (!b) delete bytes[n]; return b; });
    return bytes[n];
  }
  // MP3 bringt vorn 1105 Proben Stille (22,05 kHz) und hinten Füllstille mit – genau auf die echte Länge schneiden (wie rahmen.js)
  function zuschneiden(b, proben) {
    const RATE = 22050, VORLAUF = 1105, ueber = b.duration * RATE - proben;
    if (ueber < 2) return b;
    const ab = Math.round((ueber >= VORLAUF - 4 ? VORLAUF : 0) / RATE * b.sampleRate);
    const laenge = Math.min(b.length - ab, Math.round(proben / RATE * b.sampleRate));
    const neu = ac.createBuffer(b.numberOfChannels, laenge, b.sampleRate);
    for (let k = 0; k < b.numberOfChannels; k++) neu.getChannelData(k).set(b.getChannelData(k).subarray(ab, ab + laenge));
    return neu;
  }
  function laden(n) {
    if (puffer[n]) return Promise.resolve(puffer[n]);
    if (!ac || !LISTE[n]) return Promise.resolve(null);
    if (!laedt[n]) {
      laedt[n] = holen(n)
        .then(b => b ? new Promise(ok => ac.decodeAudioData(b.slice(0), ok, () => ok(null))) : null)
        .then(b => { b = b ? zuschneiden(b, LISTE[n][0]) : null; puffer[n] = b; if (!b) delete laedt[n]; return b; })
        .catch(() => { delete laedt[n]; return null; });
    }
    return laedt[n];
  }
  function gruppeLaden(g) { Object.keys(LISTE).filter(n => LISTE[n][2] === g).forEach(laden); }
  function aufbauen() {
    haupt = ac.createGain(); haupt.gain.value = tonAn ? 1 : 0.0001;
    const grenze = ac.createDynamicsCompressor();   // sanfter Begrenzer, falls mehrere Klänge zusammenfallen
    grenze.threshold.value = -6; grenze.knee.value = 6; grenze.ratio.value = 12; grenze.attack.value = 0.003; grenze.release.value = 0.25;
    haupt.connect(grenze).connect(ac.destination);
    busFx = ac.createGain(); busLoop = ac.createGain();
    busFx.connect(haupt); busLoop.connect(haupt);
  }
  function wecken() {
    if (!tonAn) return;
    const ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ac = new AC(); } catch (e) { return; }
      aufbauen();
      gruppeLaden('g');
      if (IM_SPIEL) gruppeLaden('s');
      ac.onstatechange = () => { if (ac.state === 'running') anwenden(); };
    }
    if (ac.state === 'suspended' && !document.hidden) ac.resume().catch(() => {});
    anwenden();
  }
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(e => addEventListener(e, wecken, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend().catch(() => {});
    else if (tonAn) ac.resume().catch(() => {});
  });
  // Ton-Knopf: der Handler der Seite (start.js bzw. Rahmen) läuft zuerst und schreibt mg:ton – danach hier lesen
  function knopfAnschliessen() {
    const knopf = document.querySelector('#tonKnopf');
    if (!knopf || knopf.dataset.klang) return;
    knopf.dataset.klang = '1';
    knopf.addEventListener('click', () => {
      tonAn = speicherGeht ? tonGespeichert() : !tonAn;
      merken(tonAn ? 'an' : 'aus', 'schalter');
      if (!ac) { wecken(); return; }
      const t = ac.currentTime;
      haupt.gain.cancelScheduledValues(t); haupt.gain.setValueAtTime(Math.max(0.0001, haupt.gain.value), t);
      if (tonAn) { haupt.gain.linearRampToValueAtTime(1, t + 0.3); ac.resume().catch(() => {}); anwenden(); spielen('klick'); }
      else { haupt.gain.linearRampToValueAtTime(0.0001, t + 0.25); setTimeout(() => { if (!tonAn) { allesAus(); ac.suspend().catch(() => {}); } }, 350); }
    });
  }
  knopfAnschliessen();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', knopfAnschliessen);
  const laeuft = () => tonAn && ac && ac.state === 'running';

  // ---------- Effekte ----------
  // o: { faktor (Pegel ×), rate, vari, verzoegerung (s), seite (−1…1) }
  function spielen(name, o) {
    o = o || {};
    const f = LISTE[name];
    if (!f) return null;
    if (!laeuft()) { merken(name, 'still'); return null; }
    const b = puffer[name];
    if (!b) { laden(name).then(x => { if (x && o.nachladen) spielen(name, Object.assign({}, o, { nachladen: false })); }); merken(name, 'laedt'); return null; }
    const jetzt = ac.currentTime, vorher = zuletzt[name] != null ? jetzt - zuletzt[name] : 1e9;
    if (vorher < 0.035 && !o.verzoegerung) return null;   // gleicher Klang doppelt im selben Augenblick
    zuletzt[name] = jetzt;
    const q = ac.createBufferSource(), v = ac.createGain();
    q.buffer = b;
    const vari = o.vari != null ? o.vari : (VARI[name] || 0);
    q.playbackRate.value = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * vari);
    v.gain.value = f[1] * (o.faktor != null ? o.faktor : 1);
    let kette = q.connect(v);
    if (o.seite && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.seite)); kette = kette.connect(p); }
    kette.connect(busFx);
    q.start(jetzt + (o.verzoegerung || 0));
    merken(name, o.verzoegerung ? 'spielt+' + o.verzoegerung.toFixed(2) : 'spielt');
    return { aus(d) { try { const a = ac.currentTime; v.gain.setTargetAtTime(0.0001, a, (d || 0.12) / 3); q.stop(a + (d || 0.12) + 0.05); } catch (e) { /* schon zu Ende */ } } };
  }

  // ---------- Schleifen (Straße, Motor, Atmo, Regen, Wind) ----------
  const lauf = {};   // Name → { q, v, p (Pegelfaktor), r (Rate) }
  let soll = {};     // Name → { p, r }
  function schleifenSetzen() {
    if (!laeuft()) return;
    const t = ac.currentTime;
    for (const n of SCHLEIFEN) {
      const s = soll[n], l = lauf[n];
      if (s && !l) {
        const b = puffer[n];
        if (!b) { laden(n).then(x => { if (x) schleifenSetzen(); }); continue; }
        const q = ac.createBufferSource(), v = ac.createGain();
        q.buffer = b; q.loop = true; q.playbackRate.value = s.r || 1;
        v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(Math.max(0.0001, LISTE[n][1] * s.p), t + (s.ein || 1.2));
        q.connect(v).connect(busLoop);
        q.start(t, Math.random() * b.duration);
        lauf[n] = { q, v, p: s.p, r: s.r || 1 };
        merken(n, 'schleife an');
      } else if (s && l) {
        if (Math.abs(l.p - s.p) > 0.01) { l.p = s.p; l.v.gain.setTargetAtTime(Math.max(0.0001, LISTE[n][1] * s.p), t, s.zeit || 0.25); }
        if (Math.abs(l.r - (s.r || 1)) > 0.005) { l.r = s.r || 1; l.q.playbackRate.setTargetAtTime(l.r, t, 0.15); }
      } else if (!s && l) {
        delete lauf[n];
        try { l.v.gain.setTargetAtTime(0.0001, t, 0.35); l.q.stop(t + 2); } catch (e) { /* egal */ }
        merken(n, 'schleife aus');
      }
    }
  }
  function allesAus() {
    for (const n in lauf) { const l = lauf[n]; delete lauf[n]; try { l.v.gain.setTargetAtTime(0.0001, ac.currentTime, 0.1); l.q.stop(ac.currentTime + 0.6); } catch (e) { /* egal */ } }
  }

  // ---------- Szenen ----------
  // start = Startseite/Startbild (Blinker + Straße), spiel (Fahrgeräusch, Atmo, Ereignisse), ende (Endbild-Klang, danach leise Blinker + Straße)
  let szene = 'start', endeAb = 0, fahrt = null, seltenNaechst = 0, lkwNaechst = 0, wischNaechst = 0, letzteUpd = 0;
  function blinkerSoll() {
    if (szene === 'start') return 1;
    if (szene === 'ende') return performance.now() >= endeAb ? 0.6 : 0;
    return fahrt && fahrt.blinkt ? 1 : 0;
  }
  function anwenden() {
    if (!laeuft()) return;
    if (szene === 'start') soll = { strasse: { p: 1 } };
    else if (szene === 'ende') soll = performance.now() >= endeAb ? { strasse: { p: 0.6, ein: 2.5 } } : {};
    else soll = fahrtSoll();
    schleifenSetzen();
  }
  function fahrtSoll() {
    const s = {};
    const f = fahrt;
    if (!f) return s;
    // Motor: Leerlauf (1k) und Fahrt (4k) überblendet, Tonhöhe steigt mit dem Tempo; beim Gasgeben etwas lauter
    const x = Math.max(0, Math.min(1, f.v / 36));
    const gas = f.bremse ? 0.85 : f.dv > 0.3 ? 1.12 : 1;
    s['motor-leer'] = { p: Math.max(0.05, 1 - x * 1.6) * gas, r: 0.88 + x * 0.7, zeit: 0.15 };
    s['motor-fahrt'] = { p: Math.min(1, x * 1.5) * gas, r: 0.62 + x * 0.45, zeit: 0.15 };
    s.rollen = { p: Math.min(1, x * 1.3) * (f.nass ? 1.25 : 1), r: 0.85 + x * 0.3, zeit: 0.2 };
    // Atmo je Gebiet (Tunnel und Autobahn-Fahrt: draußen leiser); Nacht auf dem Land: Wind statt Vögel
    const nacht = f.wetter === 'nacht', tunnel = f.tunnel > 0.5;
    let atmo = ATMO[f.umgebung] || 'atmo-land';
    if (f.gebiet === 'innenstadt') atmo = 'atmo-stadt';
    if (atmo === 'atmo-schule' && f.gebiet !== 'schule') atmo = 'atmo-stadt';
    if (atmo === 'atmo-land' && (nacht || f.schnee || f.regen)) atmo = null;
    if (atmo && !tunnel) s[atmo] = { p: (nacht ? 0.6 : 1) * (f.regen ? 0.7 : 1), ein: 2 };
    if (f.regen && !tunnel) s['regen-dach'] = { p: f.wetterArt === 'niesel' ? 0.6 : 1, ein: 2 };
    if ((f.schnee || f.gebiet === 'nacht' || f.wetter === 'nebel') && !tunnel) s.wind = { p: f.schnee ? 1 : 0.7, ein: 2 };
    return s;
  }
  function seltenes() {
    const t = ac.currentTime, f = fahrt;
    if (f.umgebung === 'autobahn' && t >= lkwNaechst) {
      if (lkwNaechst) spielen('lkw', { seite: Math.random() < 0.7 ? -0.5 : 0.5, faktor: 0.7 + Math.random() * 0.4, nachladen: true });
      else laden('lkw');
      lkwNaechst = t + LKW_ABSTAND[0] + Math.random() * (LKW_ABSTAND[1] - LKW_ABSTAND[0]);
    }
    if (t < seltenNaechst) return;
    const erst = !seltenNaechst;
    seltenNaechst = t + SELTEN_ABSTAND[0] + Math.random() * (SELTEN_ABSTAND[1] - SELTEN_ABSTAND[0]);
    if (erst) return;
    if (f.tunnel > 0.5) return;
    const pool = (SELTEN[f.umgebung] || []).filter(([n, , ab]) => (n !== 'schulglocke' || f.gebiet === 'schule') && (zuletzt[n] == null || t - zuletzt[n] >= ab));
    if (!pool.length) return;
    let r = Math.random() * pool.reduce((a, p) => a + p[1], 0), wahl = pool[0][0];
    for (const [n, w] of pool) { r -= w; if (r <= 0) { wahl = n; break; } }
    spielen(wahl, { seite: (Math.random() * 2 - 1) * 0.7, nachladen: true });
  }
  function wischen() {
    const f = fahrt;
    if (!(f.wetter === 'regen' || f.regen || f.wischer)) { wischNaechst = 0; return; }
    const jetzt = performance.now() / 1000;
    if (!wischNaechst) wischNaechst = (Math.floor(jetzt / WISCH_PERIODE) + 1) * WISCH_PERIODE;   // im Takt der Zeichnung
    if (jetzt >= wischNaechst - 0.06) {
      spielen('wischer', { rate: 1.3, verzoegerung: Math.max(0, wischNaechst - jetzt), faktor: f.v < 1 ? 0.8 : 1 });
      wischNaechst += WISCH_PERIODE;
      if (wischNaechst < jetzt) wischNaechst = (Math.floor(jetzt / WISCH_PERIODE) + 1) * WISCH_PERIODE;
    }
  }

  // Blinker-Ticken an den Flanken des gemeinsamen Takts (Licht an = Tick, Licht aus = Tack)
  if (window.BL_TAKT) window.BL_TAKT.bei(an => { const p = blinkerSoll(); if (p > 0) spielen(an ? 'tick' : 'tack', { faktor: p }); });

  // Rahmen.ton umleiten: Klänge dieser Liste spielt diese Datei (z. B. „klick“ des Ton-Schalters), andere weiter der Rahmen
  if (IM_SPIEL && window.Rahmen.ton) {
    const alt = window.Rahmen.ton;
    window.Rahmen.ton = function (name, ab) { if (LISTE[name]) { spielen(name); return { aus() {} }; } if (name === 'bestwert') return { aus() {} }; return alt.call(this, name, ab); };
  }

  // ---------- Schnittstelle für Spiel und Startseite ----------
  window.BL_KLANG = {
    protokoll,
    ton: (name, o) => spielen(name, o),
    szene(n) {
      if (n === szene && n !== 'ende') return;
      szene = n; merken(n, 'szene');
      if (n === 'spiel') { seltenNaechst = 0; lkwNaechst = 0; wischNaechst = 0; fahrt = null; }
      else fahrt = null;
      anwenden();
    },
    // Endbild: Klang je Bewertungsstufe (abbruch = gedämpfter Buzzer), danach leise Blinker + Straße
    ende(punkte, abbruch) {
      szene = 'ende'; fahrt = null;
      const n = abbruch ? 'abbruch' : punkte >= 900 ? 'ende-900' : punkte >= 800 ? 'ende-800' : punkte >= 700 ? 'ende-700' : punkte >= 550 ? 'ende-550' : 'ende-0';
      const sek = LISTE[n] ? LISTE[n][0] / 22050 : 2;
      endeAb = performance.now() + (sek + 1.0) * 1000;
      merken(n, 'ende');
      anwenden();
      if (laeuft()) laden(n).then(b => { if (b && szene === 'ende') spielen(n, { verzoegerung: 0.35 }); else if (!b) merken(n, 'fehlt'); });
      setTimeout(() => { if (szene === 'ende') anwenden(); }, (sek + 1.05) * 1000);
    },
    // jedes Bild aus spiel.js: { v, dv, bremse, umgebung, gebiet, wetter, wetterArt, regen, schnee, wischer, tunnel, blinkt, nass }
    fahrt(f) {
      if (szene !== 'spiel') return;
      fahrt = f;
      if (!laeuft()) return;
      const jetzt = performance.now();
      wischen();
      if (jetzt - letzteUpd < 90) return;
      letzteUpd = jetzt;
      seltenes();
      soll = fahrtSoll();
      schleifenSetzen();
    },
    zustand() { return { szene, an: tonAn, ac: ac ? ac.state : null, schleifen: Object.keys(lauf), geladen: Object.keys(puffer).filter(n => puffer[n]) }; },
  };
})();
