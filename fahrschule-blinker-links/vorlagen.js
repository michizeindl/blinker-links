// „Blinker links“ – Vorlagen (Abläufe der Situationen im Code, Phase 2a). Jede der 100 Situationen des Text Writers nutzt
// eine Vorlage mit Parametern (Zuordnung in daten.js, ABLAEUFE). Wenige allgemeine Abläufe tragen viele Situationen:
//   tuer, querer (jemand quert die Fahrbahn), bus (Schulbus), einscherer (Fahrzeug/Rad zieht vor dir auf die Spur),
//   vorne (Vordermann bremst, biegt ab, ist langsam, Abstand), stauende, rettung (Einsatzfahrzeug von hinten),
//   spiegel (Gefahr hinter dir), spurwechsel, abbiegen, gegen (Gegenverkehr), halt (Ampel, Bahnübergang, Kreisel …),
//   tempo (Schild/Fahrbahn + Tempo anpassen), licht (Licht an), hindernis, kreuzung (Draufsicht), anfahren,
//   rad-ueberholen, ueberholen.
// Eine Vorlage legt Objekte an und setzt R.vorzeichen, R.gefahr, R.hand, R.tempoA, R.endePos (Bedeutung: spiel.js).
// Alles Gezeichnete sind Code-Platzhalter mit Bild-Anschluss (bilder.js). Texte kommen aus texte.js (Felder der Situation).
window.BL_VORLAGEN = function (H) {
  'use strict';
  const D = H.D;
  const rand = () => ({ stadt: 4.4, wohngebiet: 4.2, land: 3.0, autobahn: 3.4 }[H.W.umgebung] || 3.2);
  const randL = () => ({ stadt: -6.0, wohngebiet: -5.6, land: -6.4, autobahn: -7.6 }[H.W.umgebung] || -6.2);
  const gegenX = () => ({ stadt: -3.4, wohngebiet: -2.9, land: -3.5, autobahn: -3.75 }[H.W.umgebung] || -3.5);
  const parkX = () => (H.W.umgebung === 'stadt' ? 2.85 : 2.7);
  const vor = o => o.pos - H.W.s;   // Abstand eines Objekts vor uns (m)
  const istHinten = o => H.W.hinten.includes(o);
  // Lage eines Fahrzeugs hinter uns: im toten Winkel bzw. gleich daneben
  const daneben = (o, vorn) => (istHinten(o) && o.dz > -5.5 && o.dz < (vorn || 16)) || (o.vorne && vor(o.vorne) < 6 && vor(o.vorne) > -6);
  const radler = (pos, x, extra) => Object.assign({ typ: 'radler', pos, x, v: 0, vx: 0, jacke: '#d9822b', helm: '#f0f0f0', k: Math.floor(Math.random() * 9), richtung: 1 }, extra || {});

  const V = {};
  // kreiselFahrt(R, bogen, auto): Einfahrt nach rechts, dann bogen Meter im Kreis; auto = Ausfahrt mit Blinker rechts von selbst
  function kreiselFahrt(R, bogen, auto) {
    const W = H.W;
    R.kreisel = { phase: 'ein' };
    W.dreh = { seite: 1, t: 0, danach() { W.kreis = { r: 38 }; R.kreisel.phase = 'kreis'; R.kreisel.bis = W.s + bogen; H.UI.fahrlehrer('neutral', H.hinweis('H031'), 2.2); } };
    R.kreisel.auto = auto;
  }
  function kreiselSchritt(R) {
    const W = H.W, k = R.kreisel;
    if (!k) return;
    if (k.phase === 'kreis' && k.auto && W.s > k.bis - 22 && !W.blinker) W.blinker = 'rechts';
    if (k.phase === 'kreis' && k.auto && W.s > k.bis) { k.phase = 'aus'; W.dreh = { seite: 1, t: 0, danach() { W.kreis = null; k.phase = 'fertig'; k.fertigAm = W.s; W.blinker = null; } }; }
  }

  // ---------- Tür geht auf (S001) ----------
  V.tuer = {
    aufbau(R) {
      const K = R.P;
      H.sperre(K - 40, K + 20);
      H.dazu(H.auto(K - 16, 2.85)); H.dazu(H.auto(K + 3, 2.85));
      const a = R.wagen = H.dazu(H.auto(K - 8, 2.85, { insasse: true, tuer: 0, farbe: '#5f6366' }));
      const tuerPos = K - 8 + 4.3 * 0.42;
      const p = R.person = H.dazu(H.figur('fussgaenger', tuerPos + 0.4, 1.75, { versteckt: true, jacke: '#2f3a4a' }));
      R.vorzeichen = { obj: a, sofort: true };
      R.gefahr = H.gefahr({ obj: a, objs: [a, p], hind: () => ({ pos: tuerPos - 1, v: 0, abstand: 3 }), ausloesen: () => H.nahGenug(tuerPos - 1, 0, 3),
        start() { R.tuerT = 0; }, frei: () => R.tuerT > 3 && a.tuer < 0.15 });
      R.endePos = K + 8;
    },
    schritt(R, dt) {
      const a = R.wagen, p = R.person;
      if (R.tuerT == null) return;
      R.tuerT += dt;
      if (R.tuerT < 0.6) a.tuer = R.tuerT / 0.6;
      if (R.tuerT > 0.8) p.versteckt = false;
      if (R.tuerT > 2.4) { p.vx = 1.4; p.gehen = 1; }
      if (p.x > 4.4) { p.vx = 0; p.gehen = 0; }
      if (R.tuerT > 2.8) a.tuer = Math.max(0, a.tuer - dt * 2.2);
    },
  };

  // ---------- Jemand quert die Fahrbahn (Kind, Fußgänger, Tier …) ----------
  // p: wer, von ('rechts'|'links'), anzahl, tempo (m/s), x0, dz, abstand, parker, zebra, einbahn, einmuendung, deckung { art, x, dz, richtung, warn, rundum },
  //    vz ('stehen'|'ball'|'deckung'|'lotsin'|'herrchen'|'augen'|'sonne'|'kinderGegen'|{ schild, dz, x }), einer (nur die erste Figur quert),
  //    zurueck (tritt auf die Fahrbahn und wieder zurück), gegenBus, ahnenV, hand (Abblenden, z. B. Wild)
  V.querer = {
    aufbau(R, p) {
      const W = H.W, rechts = p.von !== 'links', s = rechts ? -1 : 1, K = R.P + (p.dz || 0);
      R.K = K; R.rechts = rechts; R.s = s;
      H.sperre(K - 45, K + 25);
      if (p.einbahn) { W.einbahn = true; R.keinGegenverkehr = true; }
      if (p.ohneGegen) R.keinGegenverkehr = true;
      if (p.zebra) { H.mark({ art: 'zebra', pos: K - 1.5, x0: W.einbahn ? -4.9 : -4.9 }); H.schild('zebra', K - 4, rand() + 0.4); }
      if (p.parker) [-24, -12.5, 3].forEach(d => H.dazu(H.auto(K + d, parkX())));
      if (p.einmuendung) H.mark({ art: 'einmuendung', pos: K + 3, seiten: 'rechts' });
      let deck = null;
      if (p.deckung) { const d = p.deckung; deck = R.deck = H.dazu(H.auto(K + (d.dz || -8), d.x, { art: d.art, richtung: d.richtung || 1, licht: { warn: !!d.warn }, rundum: d.rundum })); }
      if (p.tonnen) [0, 1.2, 2.4].forEach(i => H.dazu({ typ: 'tonne', x: -5.4, pos: K + i, farbe: i ? '#2b2f33' : '#2f6b3a' }));
      const wer = p.wer || 'kind', tierArt = { hund: 'hund', reh: 'reh', wildschwein: 'wildschwein' }[wer];
      const x0 = p.x0 != null ? p.x0 : (rechts ? rand() : randL());
      const v = p.tempo || (tierArt ? 4.2 : wer === 'rollator' ? 0.75 : /kind/.test(wer) ? 2.4 : 1.5);
      const anzahl = p.anzahl || 1, figs = [];
      for (let i = 0; i < anzahl; i++) {
        const dx = -s * i * (tierArt ? 1.3 : 0.8), dzz = i ? (i % 2 ? 0.9 : -0.9) * Math.ceil(i / 2) : 0;
        const f = tierArt ? { typ: tierArt, x: x0 + dx, pos: K + dzz, vx: 0, v: 0, blick: s, k: i * 3, fell: tierArt === 'wildschwein' ? '#3b2f28' : tierArt === 'hund' ? '#8a6a3a' : undefined }
          : H.figur(i > 0 && p.begleit ? p.begleit : wer, K + dzz, x0 + dx);
        f.versteckt = !(p.sichtbar || p.vz === 'stehen');
        if (p.laengs && i > 0) { f.v = p.laengs; f.gehen = 0.7; }
        figs.push(H.dazu(f));
      }
      if (p.mitHund) figs.push(H.dazu({ typ: 'hund', x: x0 - s * 0.6, pos: K + 0.8, vx: 0, v: 0, blick: s, k: 5, fell: '#c9a46a', versteckt: !(p.sichtbar || p.vz === 'stehen') }));
      R.figs = figs;
      const geher = p.einer ? [figs[0]] : figs, haupt = figs[0];
      R.geher = geher;
      const bisSpur = Math.abs(x0 - (rechts ? 1.9 : -1.9)), extra = Math.max(0, bisSpur / v - 0.8);
      const vz = p.vz;
      if (vz === 'stehen') R.vorzeichen = { obj: haupt, objs: figs.slice(), sofort: true };
      else if (vz === 'ball') { const ball = R.ball = H.dazu({ typ: 'ball', x: x0 - s * 0.7, pos: K - 1, versteckt: true, dreh: 0, vx: 0, v: 0 }); R.vorzeichen = { obj: ball, ausloesen: () => H.nahGenug(K, 0, 4, extra + 1.8), start() { ball.versteckt = false; ball.vx = s * 2.6; } }; }
      else if (vz && vz.schild) R.vorzeichen = { obj: H.schild(vz.schild, K + (vz.dz || -110), vz.x || rand()), sofort: true };
      else if (vz === 'deckung' && deck) R.vorzeichen = { obj: deck, sofort: true };
      else if (vz === 'lotsin') { const l = R.lotsin = H.dazu(H.figur('lotsin', K - 3, rand() - 0.6)); R.lotsinX = l.x; figs.forEach(f => { f.versteckt = false; }); R.vorzeichen = { obj: l, objs: [l].concat(figs), sofort: true }; }
      else if (vz === 'herrchen') { const h = H.dazu(H.figur('fussgaenger', K - 22, rand() + 0.8, { gehen: 0.6, v: 0.8 })); haupt.versteckt = false; R.vorzeichen = { obj: h, objs: [h, haupt], sofort: true }; }
      else if (vz === 'augen') { const a = H.dazu({ typ: 'augen', x: x0 - 0.5, pos: K + 2, anzahl }); R.augen = a; R.vorzeichen = { obj: a, sofort: true }; }
      else if (vz === 'sonne') { const so = R.sonne = H.dazu({ typ: 'lichtschein', x: 0, pos: W.s + 150, staerke: 0.5 }); R.vorzeichen = { obj: so, sofort: true }; W.blendung = { st: 0.3 }; }
      else if (vz === 'kinderGegen') { const k = [0, 1, 2].map(i => H.dazu(H.figur('kind-ranzen', K + 12 + i * 0.8, randL() + 0.2 - i * 0.3))); R.vorzeichen = { obj: k[0], objs: k, sofort: true }; }
      if (R.vorzeichen && p.ahnenV != null) R.vorzeichen.ahnenV = p.ahnenV;
      if (p.gegenBus) { R.gegenBus = H.dazu(H.auto(K + 175, gegenX(), { art: 'schulbus', richtung: -1, v: -9 })); R.keinGegenverkehr = true; }
      R.gefahr = H.gefahr({ obj: haupt, objs: figs, hind: () => ({ pos: K, v: 0, abstand: p.abstand || 3 }),
        ausloesen: () => H.nahGenug(K, 0, p.abstand || 3, extra),
        start() {
          geher.forEach((f, i) => { f.versteckt = false; f.vx = s * v * (1 - i * 0.06); f.v = 0; f.gehen = tierArt ? 0 : 1.2; if (f.typ === 'reh') f.springt = true; });
          figs.forEach(f => { f.versteckt = false; });
          if (R.lotsin) { R.lotsin.vx = s * 1.2; R.lotsin.gehen = 1; }
        },
        frei: () => p.zurueck ? !!R.zurueckFertig : geher.every(f => (rechts ? f.x < -2.8 : f.x > 2.6)) });
      if (p.hand) R.hand = H.handgriffe({ ankuendigen: () => true, auftrag: '', frist: () => R.gefahr.erkannt || R.gefahr.doppel || K - H.W.s < 45, fristText: H.hinweis('H016') });
      R.endePos = K + 10;
    },
    schritt(R, dt) {
      const p = R.p, rechts = R.rechts;
      if (R.ball && !R.ball.versteckt) { R.ball.dreh -= dt * 9; if (rechts ? R.ball.x < -8 : R.ball.x > 8) R.ball.vx = 0; }
      const ende = rechts ? randL() : rand() + 0.2;
      R.geher.forEach((f, i) => {
        if (p.zurueck && i === 0) {
          if (!R.umkehr && f.vx && (rechts ? f.x <= 0.6 : f.x >= -0.6)) { R.umkehr = true; f.vx = 0; f.gehen = 0; R.umkehrT = 0; }
          return;
        }
        if (f.vx && (rechts ? f.x < ende : f.x > ende)) { f.vx = 0; f.gehen = 0; f.springt = false; if (f.typ === 'reh' || f.typ === 'wildschwein') f.versteckt = true; }
      });
      if (p.zurueck && R.umkehr && !R.zurueckFertig) {
        R.umkehrT += dt;
        const f = R.figs[0];
        if (R.umkehrT > 1.6) { f.vx = -R.s * 1.4; f.gehen = 1; if (rechts ? f.x > 2.6 : f.x < -2.6) { R.zurueckFertig = true; f.vx = 0; f.gehen = 0; } }
      }
      if (R.lotsin) {
        const l = R.lotsin;
        if (!R.gefahr.geloest && l.vx < 0 && l.x < 1.3) { l.vx = 0; l.gehen = 0; }
        if (R.gefahr.geloest && l.x < R.lotsinX) { l.vx = 1.2; l.gehen = 1; } else if (R.gefahr.geloest) { l.vx = 0; l.gehen = 0; }
      }
      if (R.gegenBus) { const b = R.gegenBus; if (b.v && b.pos <= R.K + 14) { b.v = 0; b.licht.warn = true; } }
      if (R.sonne) R.sonne.pos = H.W.s + 150;
    },
  };

  // ---------- Schulbus hält (S022) ----------
  V.bus = {
    aufbau(R) {
      const K = R.P;
      H.sperre(K - 40, K + 20);
      H.schild('haltestelle', K - 15, 4.6);
      const bus = H.dazu(H.auto(K - 13, 2.75, { art: 'schulbus', licht: { warn: true } }));
      const kind = R.kind = H.dazu(H.figur('kind-ranzen', K + 0.3, 1.9, { versteckt: true }));
      // § 20 Abs. 4: wer das Warnblinklicht früh antippt, fährt mit Schrittgeschwindigkeit vorbei
      R.vorzeichen = { obj: bus, sofort: true, ahnenV: 2.2 };
      R.gefahr = H.gefahr({ obj: kind, hind: () => ({ pos: K, v: 0, abstand: 3 }), ausloesen: () => H.nahGenug(K, 0, 3),
        start() { kind.versteckt = false; kind.vx = -2.6; kind.gehen = 2; }, frei: () => kind.x < -2.8 });
      R.endePos = K + 8;
    },
    schritt(R) { if (R.kind.x < -6.2) { R.kind.vx = 0; R.kind.gehen = 0; } },
  };

  // ---------- Fahrzeug oder Rad zieht vor dir auf deine Spur ----------
  // p.modus: haltestelle (Bus fährt an), rueckwaerts (aus der Einfahrt), gehweg (Kind auf dem Rad), schlagloch (E-Scooter),
  //          seitenstrasse (Auto von rechts, rechts vor links), feldweg (Traktor), lkw (Lkw schert aus), kolonne (Auto aus der linken Kolonne),
  //          einfaedler (Transporter vom Einfädelungsstreifen, danach Spurwechsel links)
  V.einscherer = {
    aufbau(R, p) {
      const W = H.W, K = R.P, m = p.modus;
      H.sperre(K - 45, K + 40);
      R.folge = () => null;
      if (m === 'haltestelle') {
        H.schild('haltestelle', K + 3, 4.6);
        const o = R.o = H.dazu(H.auto(K - 10, 2.9, { art: 'bus' }));
        R.vorzeichen = { obj: o, sofort: true };
        R.gefahr = H.gefahr({ obj: o, hind: () => ({ pos: o.pos, v: o.v, abstand: 6 }), ausloesen: () => H.nahGenug(o.pos, 0, 6),
          start() { o.licht.blink = 'links'; R.los = true; }, frei: () => o.x < 0.4 && o.v > 5 });
        R.schrittE = dt => { if (!R.los) return; o.v = Math.min(10, o.v + 1.4 * dt); if (o.x > 0.15) o.x = Math.max(0.15, o.x - 0.9 * dt); else o.licht.blink = null; };
        R.vorFolgen = () => (R.gefahr.geloest ? { pos: o.pos, v: o.v, abstand: 14 } : null);
        R.endePos = K + 40;
      } else if (m === 'rueckwaerts') {
        const o = R.o = H.dazu({ typ: 'quer', art: 'van', x: 6.6, pos: K + 1, laenge: 5.4, breite: 2.0, hoehe: 2.25, farbe: '#eef0f0', vx: 0, v: 0, licht: { rueck: true } });
        R.vorzeichen = { obj: o, sofort: true };
        R.gefahr = H.gefahr({ obj: o, hind: () => ({ pos: K - 0.5, v: 0, abstand: 3 }), ausloesen: () => H.nahGenug(K - 0.5, 0, 3, 0.6),
          start() { o.vx = -1.3; }, frei: () => !!R.umgestellt && R.o2.v > 5 });
        R.schrittE = dt => {
          if (!R.umgestellt && o.x < 2.0) { o.vx = 0; R.stehT = (R.stehT || 0) + dt; }
          if (!R.umgestellt && R.stehT > 1.2) { R.umgestellt = true; o.versteckt = true; R.o2 = H.dazu(H.auto(K + 1, 0.2, { art: 'van', farbe: '#eef0f0', v: 1 })); }
          if (R.o2) R.o2.v = Math.min(11, R.o2.v + 1.6 * dt);
        };
        R.vorFolgen = () => (R.o2 ? { pos: R.o2.pos, v: R.o2.v, abstand: 12 } : null);
        R.endePos = K + 35;
      } else if (m === 'gehweg') {
        const k = R.o = H.dazu(radler(K - 18, 4.4, { v: 3.2, jacke: '#e2622f', helm: '#2f63c6', bild: 'menschen/kind-rad' }));
        R.vorzeichen = { obj: k, sofort: true };
        R.gefahr = H.gefahr({ obj: k, hind: () => ({ pos: k.pos, v: k.v, abstand: 4 }), ausloesen: () => H.nahGenug(k.pos, k.v, 4),
          start() { k.vx = -1.7; k.v = 2.4; }, frei: () => k.x < -2.6 });
        R.schrittE = () => { if (k.vx && k.x < -5.2) { k.vx = 0; k.versteckt = true; } };
        R.endePos = () => k.pos + 8;
      } else if (m === 'schlagloch') {
        const vs = W.zielV * 0.5, s0 = 85, sc = R.o = H.dazu(H.figur('scooter', W.s + s0, 1.5, { v: vs }));
        // Schlagloch so legen, dass der Scooter es erreicht, wenn uns noch das Reaktionsfenster bleibt
        const vr = W.zielV - vs, G = vr * H.ST().fenster + vr * vr / (2 * 0.85 * H.bremsA()) + 6, T = Math.max(2, (s0 - G) / vr);
        const loch = H.dazu({ typ: 'schlagloch', x: 1.5, pos: sc.pos + vs * T + 2 });
        R.vorzeichen = { obj: loch, objs: [loch], sofort: true };
        R.gefahr = H.gefahr({ obj: sc, hind: () => ({ pos: sc.pos, v: sc.v, abstand: 4 }), ausloesen: () => sc.pos > loch.pos - 2.5 || H.nahGenug(sc.pos, sc.v, 4),
          start() { sc.vx = -1.5; }, frei: () => sc.pos > loch.pos + 3 && sc.x > 1.2 });
        R.schrittE = () => {
          if (sc.vx < 0 && sc.x < 0.2) sc.vx = 0;
          if (sc.pos > loch.pos + 1.5 && sc.x < 1.5) sc.vx = 1.2; else if (sc.x >= 1.5 && sc.vx > 0) sc.vx = 0;
          if (R.gefahr.geloest && sc.pos - W.s < 14) { sc.vx = 1.6; }
          if (sc.x > 5.5) { sc.vx = 0; sc.versteckt = true; }
        };
        R.vorFolgen = () => (!sc.versteckt && sc.x < 2.4 ? { pos: sc.pos, v: sc.v, abstand: 6 } : null);
        R.endePos = () => loch.pos + 20;
      } else if (m === 'seitenstrasse') {
        H.mark({ art: 'einmuendung', pos: K + 1, seiten: 'rechts' });
        H.dazu({ typ: 'hecke', x: 3.9, pos: K - 30, laenge: 30, hoehe: 1.7, seite: 1 });
        const o = R.o = H.dazu({ typ: 'quer', art: 'pkw', x: 7.6, pos: K + 5, laenge: 4.3, breite: 1.8, hoehe: 1.45, farbe: H.wahl(['#8b1e1e', '#3c5a7a', '#6d7b5a']), vx: 0, v: 0, licht: {} });
        R.vorzeichen = { obj: o, sofort: true };
        R.gefahr = H.gefahr({ obj: o, hind: () => ({ pos: K, v: 0, abstand: 3 }), ausloesen: () => H.nahGenug(K, 0, 3, 0.8),
          start() { o.vx = -3.2; }, frei: () => o.x < -3.2 });
        R.schrittE = () => { if (o.x < -9) { o.vx = 0; o.versteckt = true; } };
        R.endePos = K + 12;
      } else if (m === 'feldweg') {
        H.mark({ art: 'einmuendung', pos: K + 1, seiten: 'rechts', breite: 5 });
        const st = H.dazu({ typ: 'staub', x: 14, pos: K + 3 });
        const o = R.o = H.dazu({ typ: 'quer', art: 'traktor', x: 15, pos: K + 3.5, laenge: 4, breite: 2.4, hoehe: 2.8, farbe: '#a8322a', vx: -0.6, v: 0, rundum: 'orange', licht: {} });
        R.vorzeichen = { obj: st, objs: [st, o], sofort: true };
        R.gefahr = H.gefahr({ obj: o, hind: () => ({ pos: K, v: 0, abstand: 3 }), ausloesen: () => H.nahGenug(K, 0, 3, 1.2),
          start() { o.vx = -2.6; }, frei: () => !!R.o2 });
        R.schrittE = () => {
          if (o.vx && o.x > 9) st.x = o.x - 1;
          if (!R.o2 && o.x < 1.4) { o.versteckt = true; o.vx = 0; st.versteckt = true; R.o2 = H.dazu(H.auto(K + 3, 0.1, { art: 'traktor', v: 1, rundum: 'orange' })); }
          if (R.o2) R.o2.v = Math.min(7, R.o2.v + 1.2 * (1 / 60));
          if (R.o2 && H.W.s > K + 45) { R.o2.vx = 1.4; if (R.o2.x > 9) R.o2.versteckt = true; }
        };
        R.vorFolgen = () => (R.o2 && R.o2.x < 2.5 ? { pos: R.o2.pos, v: R.o2.v, abstand: 10 } : null);
        R.endePos = K + 70;
      } else if (m === 'lkw') {
        // Du fährst links (Autobahn), rechts holt ein Lkw einen langsameren Lkw ein und schert aus
        W.kx = W.kxZiel = -3.75; R.kxBleibt = -3.75;
        const a = R.o = H.dazu(H.auto(W.s + 140, 0, { art: 'lkw', v: W.zielV * 0.72 }));
        H.dazu(H.auto(W.s + 175, 0, { art: 'lkw', v: W.zielV * 0.6, farbe: '#c9ced2' }));
        R.vorzeichen = { obj: a, aktivWenn: () => !!a.licht.blink };
        R.gefahr = H.gefahr({ obj: a, hind: () => ({ pos: a.pos, v: a.v, abstand: 10 }), ausloesen: () => H.nahGenug(a.pos, a.v, 10),
          start() { a.vx = -1.1; }, frei: () => a.x < -3.5 });
        R.schrittE = () => {
          if (!a.licht.blink && H.nahGenug(a.pos, a.v, 10, 2.2)) a.licht.blink = 'links';
          if (a.x < -3.75) { a.x = -3.75; a.vx = 0; a.licht.blink = null; }
        };
        R.vorFolgen = () => (a.x < -2.5 ? { pos: a.pos, v: a.v, abstand: 25 } : null);
        R.endePos = () => (R.gefahr.geloest && R.t > R.gefahr.tGeloest + 3 ? 0 : 1e9);
      } else if (m === 'kolonne') {
        // Du rollst rechts langsam an einer stehenden Kolonne links vorbei
        W.zielV = 20 / 3.6; W.v = W.zielV;
        const autos = [];
        for (let d = -10; d <= 60; d += 7) autos.push(H.dazu(H.auto(W.s + d + 20, -3.75, { v: 0.6 })));
        const c = R.o = autos.reduce((b, a) => (Math.abs(a.pos - (W.s + 55)) < Math.abs(b.pos - (W.s + 55)) ? a : b));
        c.licht.blink = 'rechts';
        R.vorzeichen = { obj: c, sofort: true };
        R.gefahr = H.gefahr({ obj: c, hind: () => ({ pos: c.pos, v: c.v, abstand: 4 }), ausloesen: () => H.nahGenug(c.pos, c.v, 4, 0.4),
          start() { c.vx = 1.3; c.v = 2.2; }, frei: () => c.x > -0.3 });
        R.schrittE = () => { if (c.x > 0) { c.x = 0; c.vx = 0; c.licht.blink = null; c.v = 4.5; } };
        R.vorFolgen = () => (c.x > -1.5 ? { pos: c.pos, v: c.v, abstand: 7 } : null);
        R.endePos = () => c.pos + 10;
      } else if (m === 'pferd') {
        const h = R.o = H.dazu({ typ: 'pferd', x: 2.9, pos: W.s + 90, v: 1.6, vx: 0, blick: 1, fell: '#5a3a22', jacke: '#2f63c6', scheut: true });
        R.vorzeichen = { obj: h, sofort: true };
        // S056 (MZ, 29.10.2026): nicht angetippt = „verpasst“ (Fehler wie bei anderen Gefahren); das Pferd weicht weiter aus, keine Doppelbremse
        // (nurBis: kein Eingreifen des Fahrlehrers; das Auto bremst über vorFolgen ohnehin hinter dem Pferd ab)
        R.gefahr = H.gefahr({ obj: h, hind: () => ({ pos: h.pos, v: h.v, abstand: 7 }), nurBis: true, bis: () => H.zeit - R.gefahr.t0 > H.ST().fenster + 0.6,
          ausloesen: () => H.nahGenug(h.pos, h.v, 7, 0.4),
          start() { h.vx = -1.1; R.scheuT = 0; }, frei: () => R.scheuT > 2.4 && h.x > 2.6 });
        R.schrittE = dt => {
          if (R.scheuT == null) return;
          R.scheuT += dt;
          if (h.x < 1.3) h.vx = 0;
          if (R.scheuT > 1.6) h.vx = h.x < 2.9 ? 0.8 : 0;
          if (R.gefahr.geloest) { R.maxV = 6; H.W.kxZiel = vor(h) > -6 ? -1.8 : 0; if (vor(h) < -6) R.maxV = null; }
        };
        R.vorFolgen = () => (R.gefahr.geloest || !R.gefahr.aktiv ? null : { pos: h.pos, v: h.v, abstand: 9 });
        R.endePos = () => h.pos + 14;
      } else if (m === 'einfaedler') {
        H.mark({ art: 'spur', pos: W.s, x0: 1.875, x1: 5.6, laenge: 380 });
        const t = R.o = H.dazu(H.auto(W.s + 95, 3.75, { art: 'van', v: W.zielV * 0.78 }));
        R.vorzeichen = { obj: t, sofort: true };
        R.gefahr = H.gefahr({ obj: t, hind: () => ({ pos: t.pos, v: t.v, abstand: 6 }), ausloesen: () => H.nahGenug(t.pos, t.v, 6, 1.4),
          start() { t.licht.blink = 'links'; R.einT = 0; }, frei: () => t.x < 0.3 || (R.hand && R.hand.gelenkt) });
        R.schrittE = dt => { if (R.einT != null) { R.einT += dt; if (R.einT > 1.4 && t.x > 0 && H.W.kx > -2) t.vx = -1.2; } if (t.x < 0) { t.x = 0; t.vx = 0; t.licht.blink = null; } };
        R.hand = H.handgriffe({ ziel: -3.75, ankuendigen: () => R.gefahr.erkannt || R.ahnen || R.gefahr.doppel, belegt: () => false, zurueck: () => H.W.s > t.pos + 30 });
        R.vorFolgen = () => (t.x < 1 && H.W.kx > -2 ? { pos: t.pos, v: t.v, abstand: 12 } : null);
        R.endePos = () => (R.hand.zurueckAm ? R.hand.zurueckAm + 20 : R.hand.gelenkt ? R.hand.gelenktAm + 120 : 1e9);
      }
    },
    schritt(R, dt) { R.schrittE && R.schrittE(dt); if (R.kxBleibt != null && !R.hand) H.W.kxZiel = R.kxBleibt; },
    fertig: R => R.p.modus !== 'lkw' || (R.gefahr.geloest && R.t > R.gefahr.tGeloest + 3),
  };

  // ---------- Vordermann: bremst, parkt, hält an der Haltestelle, biegt ab, ist langsam, Abstand schrumpft ----------
  // p: art, x, v (m/s, sonst Anteil vFaktor), abstand (Anfang), aktion ('bremst'|'parken'|'haltestelle'|'abbiegenLinks'|'langsam'|'naeher'),
  //    vz ('gleich'|'blink'|'langsamer'|'scheibe'|'fahrzeug'|{ schild }), gefahrSchild, radler [[x, dz] …], begleit, folgen (s),
  //    beschlag, abblenden, ueberholverbot, schwanken, nebel
  V.vorne = {
    aufbau(R, p) {
      const W = H.W, art = p.art || 'pkw';
      if (p.kx != null) { W.kx = W.kxZiel = p.kx; R.kxBleibt = p.kx; }
      const vv = p.v != null ? p.v : W.zielV * (p.vFaktor || 0.98);
      let a0 = p.abstand === 'weit' ? Math.max(60, (W.zielV - vv) * H.ST().anfahrt) + 45 : (p.abstand || 34);
      // Phase-5-Korrektur: biegt der Vordermann ab (S042 Traktor), muss er weit genug vorn beginnen – sonst ist er bei schnellen Stufen
      // (Prüfungsfahrt 80 km/h) nach Einblendung und Vorzeichen (ca. 1,8s) schon zu nah und das Reaktionsfenster schrumpft (gemessen 1,2s statt 1,9s)
      if (p.aktion === 'abbiegenLinks') { const vr = Math.max(0, W.zielV - vv); a0 = Math.max(a0, 9 + vr * (H.ST().fenster + 7.5) + vr * vr / (1.7 * H.bremsA()) + 1); }
      let a;
      if (art === 'radler') a = H.dazu(radler(W.s + a0, p.x != null ? p.x : 1.2, { v: vv, jacke: p.jacke || '#3c4a5a', ohneLicht: !!p.ohneLicht }));
      else a = H.dazu(H.auto(W.s + a0, p.x || 0, { art, v: vv, rundum: p.rundum }));
      R.a = a;
      const mitfahrer = [];
      (p.radler || []).forEach(([x, dz], i) => mitfahrer.push(H.dazu(radler(a.pos + dz, x, { v: vv, jacke: ['#c0392b', '#2f63c6', '#f2c500', '#2f8f5a', '#7a4f8f'][i % 5], bild: 'menschen/rennradler' }))));
      R.mit = mitfahrer;
      if (p.ueberholverbot) W.ueberholverbot = true;
      if (p.baken) for (let d = 0; d < 260; d += 12) H.dazu({ typ: 'bake', x: -1.875, pos: W.s + 20 + d });
      const alle = [a].concat(mitfahrer);
      let schildObj = null;
      if (p.schild) schildObj = H.schild(p.schild.art, W.s + (p.schild.dz || 110), p.schild.x != null ? p.schild.x : rand(), p.schild);
      // Vorzeichen
      const vz = p.vz;
      if (vz === 'gleich') R.vorzeichen = { obj: a, objs: alle, sofort: true, gleich: true };
      else if (vz === 'fahrzeug') R.vorzeichen = { obj: a, objs: alle, sofort: true };
      else if (vz === 'blink') R.vorzeichen = { obj: a, gleich: true, aktivWenn: () => !!a.licht.blink };
      else if (vz === 'langsamer') R.vorzeichen = { obj: a, gleich: true, aktivWenn: () => !!R.langsamer };
      else if (vz === 'naeher') R.vorzeichen = { obj: a, gleich: true, aktivWenn: () => !!R.langsamer };
      else if (vz === 'scheibe') R.vorzeichen = { ort: 'scheibe', objs: [], aktivWenn: () => H.W.beschlag > 0.15, nachGeahnt() { R.geblaese = true; } };
      else if (vz === 'schild' && schildObj) R.vorzeichen = { obj: schildObj, sofort: true };
      else if (vz === 'haltestelle') { schildObj = H.schild('haltestelle', a.pos + 95, 4.6); R.vorzeichen = { obj: schildObj, sofort: true }; }
      const ak = p.aktion || 'langsam';
      R.ak = ak;
      const gobjs = p.gefahrSchild && schildObj ? [schildObj] : alle;
      const g = { obj: gobjs[0], objs: gobjs, frei: () => true };
      if (ak === 'bremst') {
        R.blinkAb = H.ST().anfahrt * 0.75;
        Object.assign(g, { hind: () => ({ pos: a.pos, v: a.v, abstand: 5 }), ausloesen: () => R.t > R.blinkAb + 1.7, start() { a.licht.brems = true; R.bremst = true; }, frei: () => a.x > 2.6 });
      } else if (ak === 'parken') {
        R.langsamAb = H.ST().anfahrt * 0.6;
        Object.assign(g, { hind: () => ({ pos: a.pos, v: a.v, abstand: 5 }), ausloesen: () => R.t > R.langsamAb + 2.2, start() { a.licht.brems = true; R.bremst = true; }, frei: () => a.x > 2.4 });
      } else if (ak === 'haltestelle') {
        Object.assign(g, { hind: () => ({ pos: a.pos, v: a.v, abstand: 6 }), ausloesen: () => schildObj && a.pos > schildObj.pos - 28, start() { a.licht.warn = true; a.licht.brems = true; R.bremst = true; }, frei: () => R.wegT > 0 && a.v > 5 });
      } else if (ak === 'abbiegenLinks') {
        Object.assign(g, { hind: () => ({ pos: a.pos, v: a.v, abstand: 8 }), ausloesen: () => H.nahGenug(a.pos, a.v, 8, 0, { verz: 3, min: 2 }), start() { a.licht.blink = 'links'; a.licht.brems = true; R.bremst = true; H.mark({ art: 'einmuendung', pos: a.pos + 10, seiten: 'links', breite: 5 }); }, frei: () => a.x < -3.2 });
      } else if (ak === 'naeher') {
        Object.assign(g, { ausloesen: () => vor(a) < H.W.v * 1.6 || R.ahnen, start() { R.abst = Math.max(6, H.W.v * 1.0); }, hind: () => ({ pos: a.pos, v: a.v, abstand: R.abst || 8 }), frei: () => (R.folgeZeit || 0) > 3 });
      } else {   // langsam: dranbleiben, nicht überholen
        const abst = p.folgeAbstand || 8;
        Object.assign(g, { hind: () => ({ pos: a.pos, v: a.v, abstand: abst }), ausloesen: () => (p.gefahrSchild && schildObj ? vor(schildObj) < 90 : p.gefahrAb ? vor(a) < p.gefahrAb : H.nahGenug(a.pos, a.v, abst, p.frueher || 0)), frei: () => (R.folgeZeit || 0) > (p.folgen || 3.5) });
        g.bis = () => H.zeit - R.gefahr.t0 > H.ST().fenster + 1.5;   // nicht gesehen: Fehler (der Fahrlehrer bleibt ohnehin dahinter)
        if (p.gefahrSchild) { g.hind = null; g.bis = () => H.W.s > schildObj.pos - 3; }
        if (p.nurBis) { g.nurBis = true; g.bis = () => vor(a) < 25; }
        R.vorFolgen = () => (!R.weg ? { pos: a.pos, v: a.v, abstand: abst } : null);
      }
      if (p.beschlag) { g.nachErkannt = () => { R.geblaese = true; }; }
      R.gefahr = H.gefahr(g);
      if (p.abblenden) R.hand = H.handgriffe({ ankuendigen: () => R.gefahr.aktiv, auftrag: '', frist: () => vor(a) < 45, fristText: H.hinweis('H017') });
      if (ak !== 'langsam') R.endePos = () => (R.gefahr.geloest ? a.pos - 30 : 1e9);
      if (ak === 'langsam') R.endePos = () => (R.weg && (a.x > 3.5 || a.versteckt || (p.weg === 'schneller' && vor(a) > 60)) ? 0 : 1e9);
    },
    schritt(R, dt) {
      const p = R.p, a = R.a, g = R.gefahr, W = H.W, ak = R.ak;
      if (R.kxBleibt != null) W.kxZiel = R.kxBleibt;
      const alle = [a].concat(R.mit);
      if (p.beschlag) { if (R.geblaese) W.beschlag = Math.max(0, W.beschlag - dt * 0.4); else if (R.t > 1) W.beschlag = Math.min(0.8, W.beschlag + dt * 0.09); }
      if (p.schwanken && g.aktiv && !g.geloest) a.x = -0.7 + Math.sin(R.t * 2.2) * 0.55;
      if (ak === 'bremst') {
        if (!g.aktiv) { a.v = Math.max(a.v, W.zielV * 0.98); if (R.t > R.blinkAb) a.licht.blink = 'rechts'; return; }
        if (R.bremst) { a.v = Math.max(3, a.v - 5.2 * dt); if (a.v <= 3.05) R.bremst = false; } else { a.vx = 1.4; a.licht.brems = false; }
        if (a.x > 8) { a.versteckt = true; a.vx = 0; a.v = 0; }
      } else if (ak === 'parken') {
        if (!g.aktiv) { if (R.t > R.langsamAb) { R.langsamer = true; a.v = Math.max(W.zielV * 0.55, a.v - 1.0 * dt); } else a.v = Math.max(a.v, W.zielV * 0.98); return; }
        if (R.bremst) { a.v = Math.max(0, a.v - 4.5 * dt); if (a.v <= 0.05) { R.bremst = false; R.parkT = 0; } }
        else { R.parkT += dt; a.licht.brems = false; a.licht.blink = 'rechts'; if (R.parkT > 0.5 && a.x < 2.8) { a.vx = 0.9; a.v = 0.8; } if (a.x >= 2.8) { a.vx = 0; a.v = 0; a.licht.blink = null; } }
      } else if (ak === 'haltestelle') {
        if (!g.aktiv) return;
        if (R.bremst) { a.v = Math.max(0, a.v - 3.2 * dt); if (a.x < 1.0) a.vx = 0.4; else a.vx = 0; if (a.v <= 0.05) { R.bremst = false; R.stehT = 0; } }
        else { R.stehT += dt; a.licht.brems = false; if (R.stehT > 4) { R.wegT = (R.wegT || 0) + dt; a.licht.warn = false; a.v = Math.min(10, a.v + 1.4 * dt); if (a.x > 0) a.vx = -0.4; else a.vx = 0; } }
        R.vorFolgen = () => (g.geloest ? { pos: a.pos, v: a.v, abstand: 14 } : null);
      } else if (ak === 'abbiegenLinks') {
        // Vorzeichen „wird langsamer“ ca. 1,8s vor der Gefahr (gleiches Bremsmodell wie ausloesen, Phase-5-Korrektur)
        if (!g.aktiv) { if (H.nahGenug(a.pos, a.v, 8 + Math.max(0, H.W.v - a.v) * 1.8, 0, { verz: 3, min: 2 })) { R.langsamer = true; a.v = Math.max(4, a.v - 1.2 * dt); } return; }
        if (R.bremst) { a.v = Math.max(2, a.v - 3 * dt); if (a.v <= 2.05) { R.bremst = false; } }
        else { a.vx = -1.6; a.licht.brems = false; }
        if (a.x < -7) { a.versteckt = true; a.vx = 0; }
      } else if (ak === 'naeher') {
        if (R.t > 2) { R.langsamer = true; a.v = Math.max(W.zielV * 0.8, a.v - 0.3 * dt); }
        if (g.aktiv && (g.erkannt || g.doppel)) R.folgeZeit = (R.folgeZeit || 0) + dt;
        if (g.geloest) a.v = Math.min(W.zielV * 1.3, a.v + 1.2 * dt);
        R.vorFolgen = () => (g.geloest || !g.aktiv ? null : { pos: a.pos, v: a.v, abstand: R.abst || 8 });
      } else {
        if (g.aktiv && (g.erkannt || g.doppel || g.verpasst || g.nurBis)) R.folgeZeit = (R.folgeZeit || 0) + dt;
        if (!g.aktiv && p.gefahrSchild) R.folgeZeit = 0;
        if (g.geloest && !R.weg) { R.weg = true; }
        if (R.weg && p.weg === 'schneller') alle.forEach(o => { o.v = Math.min(W.zielV * 1.4, o.v + 2 * dt); if (vor(o) > 160) o.versteckt = true; });
        else if (R.weg) alle.forEach(o => { o.vx = 1.3; o.v = Math.max(2, o.v - dt); o.licht && (o.licht.blink = 'rechts'); if (o.x > 9) { o.vx = 0; o.versteckt = true; } });
      }
      R.mit.forEach(o => { if (!R.weg) o.v = a.v; });
      if (p.blendet && !g.geloest) a.blendet = W.licht === 'fern';
    },
    fertig: R => (R.ak === 'langsam' ? !!R.weg && (R.a.x > 3.5 || R.a.versteckt || (R.p.weg === 'schneller' && vor(R.a) > 60)) : true),
  };

  // ---------- Stauende (S063): Spiegel – Warnblinker ----------
  V.stauende = {
    aufbau(R) {
      const K = R.P;
      const autos = [H.auto(K, 0, { licht: { brems: true } }), H.auto(K + 6, -3.75, { art: 'van', licht: { brems: true } }),
        H.auto(K + 9.5, 0, { art: 'lkw', licht: { brems: true } }), H.auto(K + 16, -3.75, { licht: { brems: true } })];
      autos.forEach(H.dazu);
      R.stau = autos;
      R.vorzeichen = { obj: autos[0], objs: autos, sofort: true, gleich: true };
      R.gefahr = H.gefahr({ obj: autos[0], objs: autos, hind: () => ({ pos: autos[0].pos, v: autos[0].v, abstand: 7 }), ausloesen: () => H.nahGenug(K, 0, 7),
        start() { autos.forEach(a => { a.licht.warn = true; }); }, frei: () => autos[0].v > 8 });
      R.hand = H.handgriffe({ ankuendigen: () => R.gefahr.aktiv || R.ahnen, auftrag: '', frist: () => (R.steh || 0) > 2.2, fristText: H.hinweis('H018') });
      R.endePos = K + 60;
    },
    schritt(R, dt) {
      const g = R.gefahr;
      if (g.aktiv && (g.erkannt || g.doppel) && H.W.v < 0.5) R.steh = (R.steh || 0) + dt;
      if (R.steh > 2.4 && R.hand.gelenkt) {
        R.stau.forEach((a, i) => { a.v = Math.min(16, a.v + (2.2 - i * 0.1) * dt); if (a.v > 4) a.licht.brems = false; if (a.v > 6) a.licht.warn = false; });
        if (R.stau[0].v > 4) H.W.warn = false;
      }
    },
  };

  // ---------- Einsatzfahrzeug von hinten (S017 Stadt: rechts ranfahren; S064 Autobahn: Rettungsgasse) ----------
  V.rettung = {
    aufbau(R, p) {
      const W = H.W;
      R.keinHinten = true; R.keinGegenverkehr = p.modus === 'gasse';
      if (p.modus === 'gasse') {
        W.spuren = 3; W.kx = W.kxZiel = -7.5; R.kxBleibt = -7.5;
        const autos = [];
        [[-7.5, 34], [-3.75, 30], [0, 38], [-7.5, 44], [-3.75, 42], [0, 50], [-7.5, 54], [-3.75, 56]].forEach(([x, d]) => autos.push(H.dazu(H.auto(W.s + d, x, { v: W.zielV * 0.9, licht: {}, art: H.wahl(['pkw', 'pkw', 'kombi', 'van']) }))));
        R.autos = autos; R.vorn = autos[0];
        R.vorzeichen = { obj: autos[0], objs: autos, aktivWenn: () => R.t > 1.5 };
        R.gefahr = H.gefahr({ obj: autos[0], objs: autos, ausloesen: () => autos[0].v < 3.2, hind: () => ({ pos: autos[0].pos, v: autos[0].v, abstand: 4 }),
          frei: () => !!R.rwVorbei });
        R.hand = H.handgriffe({ richtung: 'links', ziel: -8.8, ankuendigen: () => R.gefahr.aktiv, auftrag: '', belegt: () => false,
          nachFertig() { R.gasse = true; } });
        R.vorFolgen = () => ({ pos: autos[0].pos, v: autos[0].v, abstand: 6 });
        R.endePos = () => (R.rwVorbei ? 0 : 1e9);
      } else {
        // Stadt: stockender Verkehr, Rettungswagen kommt von hinten → rechts ranfahren und halten
        const vorn = R.vorn = H.dazu(H.auto(W.s + 26, 0, { v: W.zielV * 0.6 }));
        R.vorFolgen = () => (R.halt ? null : { pos: vorn.pos, v: vorn.v, abstand: 10 });
        R.rw = H.hinten({ art: 'rettung', x: 0, dz: 170, v: W.v + 8, blau: true, farbe: '#f2f3f1' });
        R.vorzeichen = { ort: 'innen', objs: [], aktivWenn: () => istHinten(R.rw) && R.rw.dz < 170 && R.rw.dz > 50 };
        R.gefahr = H.gefahr({ ort: 'innen', objs: [], ausloesen: () => R.rw.dz < 50, bis: () => R.rw.dz < 14, verpasstText: H.hinweis('H019'), frei: () => !!R.rwVorbei });
        R.hand = H.handgriffe({ ziel: 1.7, ankuendigen: () => R.gefahr.erkannt || R.gefahr.verpasst || R.ahnen, auftrag: '', belegt: () => false, nachFertig() { R.halt = true; } });
        R.endePos = () => (R.rwVorbei ? H.W.s - 1 : 1e9);
      }
    },
    schritt(R, dt) {
      const W = H.W, p = R.p;
      if (p.modus === 'gasse') {
        if (R.kxBleibt != null && !(R.hand && R.hand.gelenkt)) W.kxZiel = R.kxBleibt;
        if (R.t > 1.5 && !R.rwVorbei) R.autos.forEach(a => { a.v = Math.max(R.gasse ? 0.4 : 1.4, a.v - 2.2 * dt); a.licht.brems = a.v < 6; });
        if (R.gasse) R.autos.forEach(a => { if (a.x < -6 && a.x > -8.6) a.x -= dt * 0.8; else if (a.x > -4.5 && a.x < -3.0) a.x += dt * 0.6; });
        if (R.gasse && !R.rw) R.rw = H.hinten({ art: 'rettung', x: -5.6, dz: 90, v: W.v + 9, blau: true, farbe: '#f2f3f1' });
        if (R.rw && !istHinten(R.rw)) { R.rwT = (R.rwT || 0) + dt; if (R.rwT > 2.5) R.rwVorbei = true; }
        if (R.rw && R.rw.vorne) R.rw.vorne.v = 12;
        if (R.rwVorbei) R.autos.forEach(a => { a.v = Math.min(14, a.v + 2 * dt); a.licht.brems = false; });
      } else {
        const rw = R.rw;
        if (istHinten(rw)) {
          if (R.halt) { rw.x = -1.6; rw.v = W.v + 7; }
          else if (rw.dz < 10) rw.v = W.v;   // wartet hinter uns, bis wir Platz machen
        } else if (rw.vorne) { rw.vorne.v = 13; R.rwT = (R.rwT || 0) + dt; if (R.rwT > 2) R.rwVorbei = true; }
        if (R.halt && !R.rwVorbei) R.maxV = 0;
        if (R.rwVorbei) { R.maxV = null; R.halt = false; W.kxZiel = 0; }
      }
    },
    fertig: R => !!R.rwVorbei,
  };

  // ---------- Gefahr hinter dir im Spiegel (S074 Drängler, S098 Nebelschlussleuchte, S067 zurück nach rechts) ----------
  V.spiegel = {
    aufbau(R, p) {
      const W = H.W;
      R.keinHinten = true; R.keinGegenverkehr = true;
      if (p.modus === 'draengler') {
        W.kx = W.kxZiel = -3.75; R.kxBleibt = -3.75;
        const lkws = [0, 1, 2, 3].map(i => H.dazu(H.auto(W.s + 25 + i * 22, 0, { art: 'lkw', v: W.zielV * 0.72, farbe: ['#dfe3e6', '#c9ced2', '#e8e4da', '#d5dbe0'][i] })));
        R.lkws = lkws;
        const d = R.d = H.hinten({ art: 'pkw', x: -3.75, dz: 70, v: W.v + 7, farbe: '#c0392b', blink: 'links' });
        R.vorzeichen = { ort: 'innen', objs: [], aktivWenn: () => d.dz < 55 && d.dz > 12 };
        R.gefahr = H.gefahr({ ort: 'innen', objs: [], ausloesen: () => d.dz < 12, bis: () => R.dichtSeit != null && R.t - R.dichtSeit > 6,
          verpasstText: H.hinweis('H020'), frei: () => W.s > lkws[3].pos + 18 });
        R.endePos = () => lkws[3].pos + 25;
      } else if (p.modus === 'nebel') {
        W.sicht = 140; W.nebelschluss = true;
        const h = R.h = H.hinten({ art: 'pkw', x: 0, dz: 22, v: 0, folgt: true, farbe: '#3c5a7a', lichthupe: true });
        R.vorzeichen = { ort: 'scheibe', objs: [], sofort: true };
        R.gefahr = H.gefahr({ ort: 'innen', objs: [], ausloesen: () => R.t > 2.5, bis: () => R.t > 9, verpasstText: H.hinweis('H021'),
          nachErkannt() { W.nebelschluss = false; h.lichthupe = false; }, nachVerpasst() { W.nebelschluss = false; h.lichthupe = false; }, frei: () => !W.nebelschluss });
        R.endePos = () => (W.nebelschluss ? 1e9 : W.s - 1);
        R.fertigNach = 2;
      } else {
        // zurück nach rechts: der überholte Lkw ist im Innenspiegel noch riesig
        W.kx = W.kxZiel = -3.75;
        const l = R.l = H.hinten({ art: 'lkw', x: 0, dz: 7, v: W.v - 1.6, farbe: '#dfe3e6' });
        R.vorzeichen = { ort: 'innen', objs: [], sofort: true, gleich: true };
        R.gefahr = H.gefahr({ ort: 'innen', objs: [], ausloesen: () => true, bis: () => R.t > 6, verpasstText: H.hinweis('H022'), frei: () => R.hand.gelenkt });
        R.hand = H.handgriffe({ ziel: 0, ankuendigen: () => R.t > 0.4, belegt: () => l.dz < 22, auftrag: '' });
        R.endePos = () => (R.hand.gelenkt ? R.hand.gelenktAm + 40 : 1e9);
      }
    },
    schritt(R, dt) {
      const W = H.W, p = R.p;
      if (R.kxBleibt != null) W.kxZiel = R.kxBleibt;
      if (p.modus === 'draengler') {
        const d = R.d;
        if (d.dz < 4.5) { d.v = W.v; R.dichtT = (R.dichtT || 0) + dt; d.lichthupe = R.dichtT > 1 && R.dichtT < 2.5; } else d.v = W.v + 7;
        if (R.gefahr.aktiv && R.dichtSeit == null) R.dichtSeit = R.t;
      }
    },
  };

  // ---------- Spurwechsel (Stadtring, Ausfahrt, Reißverschluss, Falschfahrer, Panne, Mittelspur, Matsch, Hindernis mit Gegenverkehr, Einfädeln) ----------
  V.spurwechsel = {
    aufbau(R, p) {
      const W = H.W, K = R.P, m = p.modus;
      R.keinHinten = ['ausfahrt', 'reissverschluss', 'stadtring', 'einfaedeln'].includes(m);
      if (m === 'stadtring') {
        W.einbahn = true; R.keinGegenverkehr = true;
        // der Kleinwagen links verschwindet gerade aus dem Spiegel in den toten Winkel und bleibt dort ein paar Sekunden
        const tw = R.tw = H.hinten({ art: 'pkw', x: -3.4, dz: 30, v: W.v + 2.5, farbe: '#f2f3f1' });
        R.vorzeichen = { ort: 'links', objs: [], aktivWenn: () => istHinten(tw) && tw.dz > 3.2 && tw.dz < 40 };
        R.gefahr = H.gefahr({ ort: 'links', durch: 'schulter', durchSeite: 'links', objs: [], ausloesen: () => istHinten(tw) && tw.dz < 10, bis: () => !istHinten(tw), frei: () => !istHinten(tw) });
        R.hand = H.handgriffe({ ziel: -3.4, ankuendigen: () => R.t > 1.5, belegt: () => daneben(tw) });
        R.endePos = () => (R.hand.gelenkt ? R.hand.gelenktAm + 35 : 1e9);
      } else if (m === 'ausfahrt') {
        const tafel = H.schild('tafel', K - 160, 6.6, { text: 'Ausfahrt Musterstadt', groesse: 1.8, hoch: 4.2, portal: true, w: 1.9, h: 0.6, px: 0.11 });
        H.mark({ art: 'spur', pos: K, x0: 1.875, x1: 5.6, laenge: 300 });
        const beginn = H.schild('tafel', K, 5.2, { text: '›', groesse: 0.7, w: 0.9, h: 0.9, px: 0.6 });
        H.hinten({ art: 'pkw', x: 0, dz: 11, v: 0, folgt: true, farbe: '#1d1f22' });
        R.vorzeichen = { obj: tafel, sofort: true };
        R.gefahr = H.gefahr({ obj: beginn, ausloesen: () => vor(beginn) < 120, bis: () => W.s > K + 20, frei: () => R.hand.gelenkt || W.s > K + 20 });
        R.hand = H.handgriffe({ ziel: 3.75, ankuendigen: () => R.gefahr.aktiv, nurAm: () => W.s > K - 15, nurAmText: H.hinweis('H023'), belegt: () => false,
          nachLenken() { W.zielV = H.kmhZiel(80); } });
        R.endePos = () => (R.hand.gelenkt ? R.hand.gelenktAm + 60 : 1e9);
      } else if (m === 'reissverschluss') {
        W.kx = W.kxZiel = -3.75; R.kxBleibt = -3.75;
        const sch = H.schild('fahrstreifenende', K - 280, -7.0, { groesse: 1.0 });
        const baken = []; for (let d = 0; d < 40; d += 5) baken.push(H.dazu({ typ: 'bake', x: -3.75 + Math.min(1.5, d * 0.06) * 0, pos: K + d }));
        for (let i = 0; i < 4; i++) H.dazu(H.auto(W.s + 40 + i * 30, 0, { v: W.zielV * 0.55 }));
        R.zielV = W.zielV * 0.6; W.zielV = R.zielV;
        const tw = R.tw = H.hinten({ art: 'pkw', x: 0, dz: 6, v: 0, folgt: false, farbe: '#6d7b5a' });
        R.vorzeichen = { obj: sch, sofort: true };
        R.gefahr = H.gefahr({ obj: baken[0], objs: baken, hind: () => ({ pos: K, v: 0, abstand: 3 }), ausloesen: () => H.nahGenug(K, 0, 3, 1.5), frei: () => R.hand.gelenkt });
        R.hand = H.handgriffe({ ziel: 0, ankuendigen: () => R.gefahr.aktiv || R.ahnen, nurAm: () => K - W.s < 45, nurAmText: H.hinweis('H024'), belegt: () => daneben(tw) });
        R.endePos = () => (R.hand.gelenkt ? R.hand.gelenktAm + 40 : 1e9);
      } else if (m === 'falschfahrer') {
        W.kx = W.kxZiel = -3.75; R.kxBleibt = -3.75;
        const a = anzeigeObj(R.def.vorzeichen || 'Verkehrsfunk', false);
        R.vorzeichen = { obj: a, sofort: true };
        R.gefahr = H.gefahr({ obj: a, ausloesen: () => R.t > 3, start() { W.anzeige.text = R.def.gefahrText || 'Warnung'; W.anzeige.warn = true; }, bis: () => R.t > 9, frei: () => R.hand.gelenkt,
          nachErkannt() { R.maxV = W.zielV * 0.85; } });
        R.hand = H.handgriffe({ ziel: 0, ankuendigen: () => R.gefahr.erkannt || R.gefahr.verpasst || R.gefahr.doppel, belegt: () => false });
        R.endePos = () => (R.hand.gelenkt ? R.hand.gelenktAm + 50 : 1e9);
      } else if (m === 'panne') {
        H.dazu(H.auto(K, 3.3, { licht: { warn: true }, farbe: '#5f6366' }));
        const pers = H.dazu(H.figur('panne', K + 4.6, 3.1, { gehen: 0.5, vx: 0 }));
        const dreieck = H.dazu({ typ: 'warndreieck', x: 3.0, pos: K - 100 });
        R.vorzeichen = { obj: dreieck, sofort: true };
        R.gefahr = H.gefahr({ obj: pers, ausloesen: () => vor(pers) < 150, bis: () => W.s > K - 8, frei: () => W.s > K - 8 || R.gefahr.erkannt });
        R.hand = H.handgriffe({ ziel: -3.75, ankuendigen: () => R.gefahr.aktiv || R.ahnen, belegt: () => false, zurueck: () => W.s > K + 25 });
        R.endePos = () => (R.hand.zurueckAm ? R.hand.zurueckAm + 25 : R.hand.gelenkt && W.s > K + 60 ? 0 : 1e9);
      } else if (m === 'mitte') {
        W.spuren = 3; W.kx = W.kxZiel = -3.75; R.kxBleibt = -3.75;
        const zone = R.zone = H.dazu({ typ: 'zone', x0: -1.8, x1: 1.8, pos: W.s + 18, laenge: 60 });
        H.dazu(H.auto(W.s + 160, -7.5, { v: W.zielV * 1.1 }));
        R.gefahr = H.gefahr({ obj: zone, ausloesen: () => R.t > 1, bis: () => R.t > 8, frei: () => R.hand.gelenkt });
        R.hand = H.handgriffe({ ziel: 0, ankuendigen: () => R.gefahr.erkannt || R.gefahr.verpasst || R.t > 2.5, belegt: () => false });
        R.endePos = () => (R.hand.gelenkt ? R.hand.gelenktAm + 40 : 1e9);
      } else if (m === 'matsch') {
        const lkw = R.lkw = H.dazu(H.auto(W.s + 110, 0, { art: 'lkw', v: W.zielV * 0.55 }));
        H.mark({ art: 'flaeche', stoff: 'matsch', pos: W.s, x0: -2.15, x1: -1.55, laenge: 700, unten: true });
        const zone = R.zone = H.dazu({ typ: 'zone', x0: -2.4, x1: -1.3, pos: W.s + 12, laenge: 45, h: 0.5 });
        R.vorzeichen = { obj: zone, sofort: true, gleich: true, ahnenV: W.zielV * 0.7 };
        R.gefahr = H.gefahr({ obj: zone, ausloesen: () => R.hand.angekuendigt, bis: () => R.hand.gelenkt, verpasstText: H.hinweis('H025'),
          nachVerpasst() { H.W.ruck = H.W.ruhig ? 0 : 0.5; }, nachErkannt() { R.maxV = W.zielV * 0.75; }, frei: () => R.hand.gelenkt });
        R.hand = H.handgriffe({ ziel: -3.75, ankuendigen: () => vor(lkw) < 85, belegt: () => false, zurueck: () => W.s > lkw.pos + lkw.laenge + 25 });
        R.vorFolgen = () => (R.hand.gelenkt ? null : { pos: lkw.pos, v: lkw.v, abstand: 28 });
        R.endePos = () => (R.hand.zurueckAm ? R.hand.zurueckAm + 25 : 1e9);
      } else if (m === 'hindernis') {
        // Hindernis auf deiner Spur (Paketwagen in zweiter Reihe, Ast), Gegenverkehr an der Engstelle
        R.keinGegenverkehr = true;
        H.sperre(K - 40, K + 20);
        const len = p.hindernis === 'ast' ? 1.2 : 6;
        const h = R.h = p.hindernis === 'ast' ? H.dazu({ typ: 'ast', x: 0.2, pos: K }) : H.dazu(H.auto(K, 0.6, { art: 'paket', licht: { warn: true } }));
        if (p.hindernis === 'ast') { for (let i = 0; i < 12; i++) H.mark({ art: 'flaeche', stoff: 'laub', pos: K - 30 + i * 2.5, x0: -1.5, x1: 1.6, laenge: 2, unten: true }); }
        R.vorzeichen = { obj: h, sofort: true };
        R.gefahr = H.gefahr({ obj: null, objs: [], ausloesen: () => H.nahGenug(K, 0, 4, 1.0),
          start() { const g = R.gegen = H.dazu(H.auto(Math.max(K + 70, W.s + 120), gegenX(), { art: p.gegenArt || 'pkw', richtung: -1, v: -(W.zielV * 0.8) })); R.gefahr.obj = g; R.gefahr.objs = [g]; },
          bis: () => R.gegen && R.gegen.pos < W.s + 4, frei: () => R.gegen && R.gegen.pos < W.s - 3 });
        R.hand = H.handgriffe({ ziel: -2.4, ankuendigen: () => R.gefahr.aktiv && (R.gefahr.erkannt || R.gefahr.verpasst || R.gefahr.doppel || R.gefahr.geloest || W.v < 1), belegt: () => R.gegen && vor(R.gegen) > -6 && vor(R.gegen) < 70,
          zurueck: () => W.s > K + len + 6 });
        R.vorFolgen = () => (R.hand.gelenkt ? null : { pos: K, v: 0, abstand: 5 });
        R.endePos = () => (R.hand.zurueckAm ? R.hand.zurueckAm + 15 : 1e9);
      } else if (m === 'einfaedeln') {
        const ende = W.s + 260;
        H.mark({ art: 'spur', pos: W.s - 30, x0: 1.875, x1: 5.6, laenge: 290 });
        W.kx = W.kxZiel = 3.75; R.kxBleibt = 3.75;
        W.v = 70 / 3.6;
        const lkw = R.lkw = H.dazu(H.auto(W.s - 4, 0, { art: 'lkw', v: W.v }));
        const zone = H.dazu({ typ: 'zone', x0: -1.6, x1: 1.6, pos: lkw.pos - 16, laenge: 14 });
        R.lueckeZone = zone;
        R.vorzeichen = { obj: zone, aktivWenn: () => vor(lkw) > 18 };
        R.gefahr = H.gefahr({ obj: lkw, ausloesen: () => R.t > 0.6, bis: () => R.hand.gelenkt || R.t > 10, frei: () => R.hand.gelenkt });
        R.hand = H.handgriffe({ ziel: 0, ankuendigen: () => R.t > 0.6, belegt: () => vor(lkw) < 7 && vor(lkw) > -lkw.laenge - 4 });
        R.vorFolgen = () => (R.hand.gelenkt ? null : { pos: ende, v: 0, abstand: 2 });
        R.endePos = () => (R.hand.gelenkt ? R.hand.gelenktAm + 60 : 1e9);
      }
    },
    schritt(R) {
      const W = H.W, p = R.p;
      if (R.kxBleibt != null && !(R.hand && R.hand.gelenkt)) W.kxZiel = R.kxBleibt;
      if (p.modus === 'stadtring' && istHinten(R.tw)) { const tw = R.tw; tw.v = tw.dz > 6 ? W.v + 2.5 : tw.dz > -2 ? W.v + (R.t > 7 ? 2 : 0.15) : W.v + 4; }
      if (p.modus === 'reissverschluss' && istHinten(R.tw)) { const tw = R.tw; tw.v = R.t < 3 ? W.v : W.v + 3; }
      if (p.modus === 'mitte' && R.zone) R.zone.pos = W.s + 18;
      if (p.modus === 'matsch' && R.zone) R.zone.pos = W.s + 12;
      if (p.modus === 'einfaedeln') { const l = R.lkw; l.v = R.hand.angekuendigt ? Math.max(l.v, W.v + 2.5) : W.v; R.lueckeZone.pos = l.pos - 16; }
    },
  };
  function anzeigeObj(text, warn) { return H.anzeige(text, warn); }

  // ---------- Abbiegen an einer Einmündung (Radweg, Fußgänger, Abknickende Vorfahrt, Gegenverkehr, Motorrad) ----------
  V.abbiegen = {
    aufbau(R, p) {
      const W = H.W, K = p.kreisel ? H.W.s + 75 : R.P + 15, ri = R.def.richtung || p.richtung || 'rechts', re = ri === 'rechts', sx = re ? 1 : -1, m = p.modus;
      R.K = K;
      H.sperre(K - 45, K + 20);
      H.mark({ art: 'einmuendung', pos: K, seiten: m === 'gegen' ? 'beide' : ri, breite: 8 });
      if (p.kx != null) { W.kx = W.kxZiel = p.kx; R.kxBleibt = p.kx; }
      if (p.kmh) { W.zielV = H.kmhZiel(p.kmh); W.v = W.zielV; }
      const halt = m === 'gegen' ? K + 3 : K - 1;
      R.vorFolgen = () => (R.hand.gelenkt ? null : { pos: halt, v: 0, abstand: 2 });
      R.hand = H.handgriffe({ abbiegen: true, ziel: re ? 0.4 : -0.4, ankuendigen: () => halt - W.s < 110, nurAm: () => halt - W.s < 9 });
      if (p.kreisel) { W.kreis = { r: 38 }; W.v = Math.min(W.v, H.kmhZiel(25)); R.keinGegenverkehr = true; R.keinHinten = true; R.hand.auftragAbbiegen = H.hinweis('H032'); R.hand.ankuendigen = () => halt - W.s < 55; }
      if (m === 'radweg') {
        R.hand.beimAnkuendigen = () => { R.tw = H.hinten({ art: 'rad', x: 2.6, dz: 48, v: W.v + 1.5, jacke: '#2f63c6' }); };
        R.vorzeichen = { ort: 'rechts', objs: [], aktivWenn: () => R.tw && istHinten(R.tw) && R.tw.dz > 3.2 && R.tw.dz < 45 };
        R.gefahr = H.gefahr({ ort: 'rechts', durch: 'schulter', durchSeite: 'rechts', objs: [], ausloesen: () => R.tw && istHinten(R.tw) && R.tw.dz < 14,
          bis: () => R.tw && !istHinten(R.tw), frei: () => R.tw && !istHinten(R.tw) && (!R.tw.vorne || vor(R.tw.vorne) > 5) });
        R.hand.belegt = () => R.tw && (daneben(R.tw, 20) || (R.tw.vorne && vor(R.tw.vorne) < 5));
      } else if (m === 'quer' || m === 'quer-weg') {
        // Fußgänger queren die Straße, in die du abbiegst (laufen über die Einmündung)
        const x = re ? rand() + 0.6 : randL() - 0.4, figs = [];
        const namen = p.figuren || ['fussgaenger', 'frau'];
        namen.forEach((n, i) => figs.push(H.dazu(n === 'hund' ? { typ: 'hund', x: x + sx * 0.6, pos: K - 3 - i * 0.6, vx: 0, v: 0, blick: 1, fell: '#c9a46a' } : H.figur(n, K - 3 - i * 0.9, x + (i % 2) * 0.5 * sx))));
        R.figs = figs;
        R.vorzeichen = { obj: figs[0], objs: figs, sofort: true };
        R.gefahr = H.gefahr({ obj: figs[0], objs: figs, ausloesen: () => halt - W.s < 32, start() { figs.forEach(f => { f.v = 1.3; f.gehen = 1; }); },
          bis: () => figs.every(f => f.pos > K + 9), frei: () => figs.every(f => f.pos > K + 9) });
        R.hand.belegt = () => R.gefahr.aktiv && !R.gefahr.geloest;
      } else if (m === 'gehweg') {
        // Ausfahrt vom Parkplatz: Junge auf dem Gehweg kreuzt vor dir
        H.dazu({ typ: 'hecke', x: 3.4, pos: K - 22, laenge: 19, hoehe: 1.3, seite: 1 });
        const j = H.dazu(H.figur('kind-ranzen', K - 4, 6.4, { hoehe: 1.45 }));
        R.vorzeichen = { obj: j, sofort: true };
        R.gefahr = H.gefahr({ obj: j, hind: () => ({ pos: K - 3, v: 0, abstand: 2.2 }), ausloesen: () => H.nahGenug(K - 3, 0, 2.2, 0.8), start() { j.vx = -1.4; j.gehen = 1; }, frei: () => j.x < -1.8 });
        R.hand.belegt = () => R.gefahr.aktiv && !R.gefahr.geloest;
        R.hand.ankuendigen = () => halt - W.s < 60;
      } else if (m === 'zeichen') {
        const sch = H.schild('vorfahrtstrasse', K - 55, 3.6, { knick: 'links', zusatz: ' ' });
        R.vorzeichen = { obj: sch, sofort: true };
        R.gefahr = H.gefahr({ obj: sch, durch: 'blinker', durchSeite: ri, ausloesen: () => K - W.s < 75, bis: () => W.s > K - 7 && W.blinker !== ri, frei: () => R.hand.gelenkt });
        R.hand.nurAm = () => halt - W.s < 14;
      } else if (m === 'gegen') {
        // Linksabbiegen in der Kreuzungsmitte: Lkw kommt entgegen und biegt ab, dahinter ein Motorrad
        R.keinGegenverkehr = true;
        const lkw = R.lkw = H.dazu(H.auto(K + 150, -3.4, { art: 'lkw', richtung: -1, v: -9.5 }));
        const mot = R.mot = H.dazu(H.auto(K + 172, -3.6, { art: 'motorrad', richtung: -1, v: -10 }));
        R.vorzeichen = { obj: mot, aktivWenn: () => vor(lkw) < 70 };
        R.gefahr = H.gefahr({ obj: mot, ausloesen: () => lkw.x > -1.2 || vor(mot) < 45, bis: () => vor(mot) < -2, frei: () => vor(mot) < -3 });
        R.hand.belegt = () => vor(mot) > -4 && vor(mot) < 70 || (lkw.x < 3 && !lkw.versteckt && vor(lkw) < 40);
        R.hand.ankuendigen = () => halt - W.s < 60;
        R.hand.nurAm = () => halt - W.s < 6;
      } else if (m === 'motorrad') {
        R.keinHinten = true;
        R.hand.beimAnkuendigen = () => { R.mot = H.hinten({ art: 'motorrad', x: -3.0, dz: 130, v: W.v + 11, farbe: '#1d1f22' }); };
        R.vorzeichen = { ort: 'innen', objs: [], aktivWenn: () => R.mot && istHinten(R.mot) && R.mot.dz < 130 && R.mot.dz > 35 };
        R.gefahr = H.gefahr({ ort: 'spiegel', durch: 'schulter', durchSeite: 'links', objs: [], ausloesen: () => R.mot && istHinten(R.mot) && R.mot.dz < 35, bis: () => R.mot && !istHinten(R.mot),
          frei: () => R.mot && !istHinten(R.mot) && (!R.mot.vorne || vor(R.mot.vorne) > 12) });
        R.hand.belegt = () => R.mot && ((istHinten(R.mot) && R.mot.dz < 45) || (R.mot.vorne && vor(R.mot.vorne) < 12));
      }
      R.endePos = () => (R.hand.gelenkt ? R.hand.gelenktAm + 28 : 1e9);
    },
    schritt(R, dt) {
      const W = H.W, p = R.p;
      if (R.kxBleibt != null && !R.hand.gelenkt) W.kxZiel = R.kxBleibt;
      if (R.figs && R.gefahr.aktiv) R.figs.forEach(f => { if (f.pos > R.K + 12) { f.v = 0; f.gehen = 0; } });
      if (p.modus === 'gegen') {
        const l = R.lkw;
        if (!l.versteckt && vor(l) < 12 && vor(l) > -20) { l.vx = 2.6; l.v = -5; l.licht.blink = 'rechts'; }
        if (l.x > 9) { l.versteckt = true; l.vx = 0; }
        const m = R.mot; if (vor(m) < -30) m.versteckt = true;
      }
      if (p.modus === 'motorrad' && R.mot && istHinten(R.mot)) R.mot.v = W.v + 11;
      if (p.modus === 'gehweg' && R.gefahr.geloest) { const j = R.gefahr.obj; if (j.x < -4.5) { j.vx = 0; j.gehen = 0; } }
    },
  };

  // ---------- Gegenverkehr (Überholer, Anhänger, Mähdrescher, Radlerin in der Einbahnstraße, Kurve, enge Gasse, Spaziergängerinnen, Blendung, Fernlicht) ----------
  V.gegen = {
    aufbau(R, p) {
      const W = H.W, m = p.modus, gx = gegenX();
      R.keinGegenverkehr = true;
      if (m === 'ueberholer') {
        const lkw = H.dazu(H.auto(W.s + 320, gx, { art: 'lkw', richtung: -1, v: -19 }));
        const o = R.o = H.dazu(H.auto(W.s + 338, gx, { richtung: -1, v: -21, farbe: '#8b1e1e' }));
        R.lkw = lkw;
        R.vorzeichen = { obj: o, aktivWenn: () => o.x > gx + 0.3 };
        R.gefahr = H.gefahr({ obj: o, ausloesen: () => o.x > -1.6, bis: () => vor(o) < 48, bisDoppel: true, ausweichen: { kx: 1.0, v: 0.45 }, frei: () => o.x < gx + 0.9 || vor(o) < -2 });
        R.endePos = () => (vor(lkw) < -14 ? 0 : 1e9);
      } else if (m === 'anhaenger') {
        R.kurveFix = -0.0042;
        const lkw = R.o = H.dazu(H.auto(W.s + 280, gx, { art: 'lkw', richtung: -1, v: -13, laenge: 18 }));
        R.vorzeichen = { obj: lkw, sofort: true };
        R.gefahr = H.gefahr({ obj: lkw, ausloesen: () => vor(lkw) < 120, start() { lkw.vx = 0.8; }, bis: () => vor(lkw) < 38, bisDoppel: true, ausweichen: { kx: 0.9, v: 0.5 }, frei: () => vor(lkw) + lkw.laenge < 0 });
        R.endePos = () => (vor(lkw) + lkw.laenge < -5 ? 0 : 1e9);
      } else if (m === 'maehdrescher') {
        const b = H.dazu(H.auto(W.s + 230, gx, { art: 'begleit', richtung: -1, v: -9, rundum: 'orange' }));
        const md = R.o = H.dazu(H.auto(W.s + 270, gx + 0.6, { art: 'maehdrescher', richtung: -1, v: -9, vorbau: 5.6, rundum: 'orange' }));
        R.vorzeichen = { obj: b, sofort: true };
        R.gefahr = H.gefahr({ obj: md, ausloesen: () => vor(md) < 140, bis: () => vor(md) < 42, bisDoppel: true, ausweichen: { kx: 1.4, v: 0.3 }, frei: () => vor(md) + md.laenge < 0 });
        R.endePos = () => (vor(md) + md.laenge < -4 ? 0 : 1e9);
      } else if (m === 'einbahn') {
        W.einbahn = true;
        const sch = H.schild('einbahn', W.s + 110, 4.4, { zusatz: ' ', zusatzRad: true, groesse: 0.8 });
        const r = R.o = H.dazu(radler(W.s + 210, -1.1, { richtung: -1, v: -4.5, jacke: '#c0392b', bild: 'menschen/radler-vorne' }));
        R.vorzeichen = { obj: sch, sofort: true };
        R.gefahr = H.gefahr({ obj: r, ausloesen: () => H.nahGenug(r.pos, r.v, 8, 0.6), bis: () => vor(r) < 14, bisDoppel: true, ausweichen: { kx: 0.9, v: 0.3 }, frei: () => vor(r) < -1 });
        R.endePos = () => (vor(r) < -4 ? 0 : 1e9);
      } else if (m === 'kurve') {
        R.kurveFix = 0.0035;
        const t = R.t2 = H.dazu(H.auto(W.s + 45, 0, { art: 'traktor', v: 7, rundum: 'orange' }));
        const mais = [H.dazu({ typ: 'hecke', x: 3.8, pos: W.s + 60, laenge: 160, hoehe: 2.6, farbe: '#7f9a3a', oben: '#a2b552', seite: 1, antippbar: true }), H.dazu({ typ: 'hecke', x: -6.4, pos: W.s + 60, laenge: 160, hoehe: 2.6, farbe: '#7f9a3a', oben: '#a2b552', seite: -1, antippbar: true })];
        R.vorzeichen = { obj: mais[0], objs: mais, sofort: true };
        R.vorFolgen = () => (t.x < 2.5 ? { pos: t.pos, v: t.v, abstand: 12 } : null);
        R.gefahr = H.gefahr({ obj: null, objs: [], ausloesen: () => vor(t) < 20 && R.t > 4,
          start() { const g = R.o = H.dazu(H.auto(W.s + 125, gx, { richtung: -1, v: -17 })); R.gefahr.obj = g; R.gefahr.objs = [g]; },
          bis: () => R.o && vor(R.o) < 6, frei: () => R.o && vor(R.o) < -3 });
        R.endePos = () => (R.gefahr.geloest && t.versteckt ? 0 : 1e9);
      } else if (m === 'eng') {
        const r = R.r = H.dazu(radler(W.s + 42, 1.0, { v: 4.2, jacke: '#2f8f5a' }));
        const van = R.o = H.dazu(H.auto(W.s + 170, gx, { art: 'van', richtung: -1, v: -6.5 }));
        R.vorzeichen = { obj: van, sofort: true };
        R.vorFolgen = () => (r.x < 2 ? { pos: r.pos, v: r.v, abstand: 7 } : null);
        R.gefahr = H.gefahr({ obj: van, objs: [van, r], ausloesen: () => vor(van) < 85, bis: () => vor(van) < 3, frei: () => vor(van) < -3 });
        R.endePos = () => (R.gefahr.geloest && r.versteckt ? 0 : 1e9);
      } else if (m === 'rand') {
        const f1 = H.dazu(H.figur('spaziergaengerinnen', W.s + 230, 3.0, { v: -1.2, gehen: 0.8 })), f2 = H.dazu(H.figur('spaziergaengerinnen', W.s + 231.2, 3.6, { v: -1.2, gehen: 0.8, jacke: '#8a5a7a' }));
        R.o = f1;
        R.gefahr = H.gefahr({ obj: f1, objs: [f1, f2], ausloesen: () => H.nahGenug(f1.pos, f1.v, 20, 0.8), bis: () => vor(f1) < 6, ausweichen: { kx: -1.0, v: 0.6 }, frei: () => vor(f2) < -2 });
        R.endePos = () => (vor(f2) < -6 ? 0 : 1e9);
      } else if (m === 'dunkel') {
        const schirm = H.dazu(H.figur('fussgaenger', W.s + 90, 5.2, { schirm: '#2f3a4a', v: 1.1, gehen: 0.7 }));
        const f = R.o = H.dazu(H.figur('dunkel', W.s + 150, 2.3, { v: 1.2, gehen: 0.7 }));
        R.vorzeichen = { obj: schirm, sofort: true };
        R.gefahr = H.gefahr({ obj: f, ausloesen: () => H.nahGenug(f.pos, f.v, 12, 0.6), bis: () => vor(f) < 5, ausweichen: { kx: -0.9, v: 0.55 }, frei: () => vor(f) < -2 });
        R.endePos = () => (vor(f) < -6 ? 0 : 1e9);
      } else if (m === 'blendung') {
        const o = R.o = H.dazu(H.auto(W.s + 330, gx, { richtung: -1, v: -18, fernlicht: true }));
        R.vorzeichen = { obj: o, aktivWenn: () => vor(o) < 300 };
        R.gefahr = H.gefahr({ obj: o, ausloesen: () => vor(o) < 140, bis: () => vor(o) < 12, ausweichen: { kx: 0.5, v: 0.6 }, frei: () => vor(o) < -2 });
        R.endePos = () => (vor(o) < -8 ? 0 : 1e9);
      } else if (m === 'fernlicht') {
        W.licht = 'fern'; R.kurveFix = -0.003;
        const glow = H.dazu({ typ: 'lichtschein', x: -10, pos: W.s + 170, staerke: 0.9 });
        const o = R.o = H.dazu(H.auto(W.s + 330, gx, { richtung: -1, v: -14 }));
        R.vorzeichen = { obj: glow, sofort: true };
        R.gefahr = H.gefahr({ obj: o, ausloesen: () => vor(o) < 150, start() { glow.versteckt = true; }, bis: () => vor(o) < 6, frei: () => vor(o) < -2 });
        R.hand = H.handgriffe({ ankuendigen: () => vor(o) < 240, auftrag: '', frist: () => vor(o) < 70, fristText: H.hinweis('H026'),
          nachFertig() { if (R.hand.uebernommen) o.lichthupeVorne = true; } });
        R.endePos = () => (vor(o) < -8 ? 0 : 1e9);
      }
    },
    schritt(R, dt) {
      const W = H.W, p = R.p, m = p.modus, gx = gegenX(), o = R.o;
      if (m === 'ueberholer') { if (vor(o) < 230 && vor(o) > 80 && o.x < -0.4) o.vx = 1.8; else if (vor(o) <= 80 && o.x > gx) { o.vx = -2.6; o.v = -15; } else o.vx = 0; if (o.x < gx) o.x = gx; }
      if (m === 'anhaenger' && o.x > gx + 1.4) o.vx = 0;
      if (m === 'anhaenger' && vor(o) < 30) o.vx = o.x > gx ? -1 : 0;
      if (m === 'kurve') { const t = R.t2; if (R.gefahr.geloest) { R.folgeT = (R.folgeT || 0) + dt; if (R.folgeT > 1.5) { t.vx = 1.3; if (t.x > 9) { t.vx = 0; t.versteckt = true; } } } }
      if (m === 'eng') { const r = R.r; if (R.gefahr.geloest) { R.folgeT = (R.folgeT || 0) + dt; if (R.folgeT > 1.5) { r.vx = 1.4; if (r.x > 5) { r.vx = 0; r.versteckt = true; } } } }
      if (m === 'blendung') {
        const z = vor(o), bp = z > 5 && z < 170 ? H.bildpunkt(o.x, o.pos, 0.7) : null;
        W.blendung = bp ? { x: bp[0], y: bp[1], st: Math.max(0, Math.min(0.95, 1.1 - z / 160)) * (R.gefahr.erkannt ? 0.6 : 1) } : null;
      }
      if (m === 'fernlicht' && o.lichthupeVorne && vor(o) > 10) { o.fernlicht = Math.floor(R.t * 4) % 2 === 0; } else if (m === 'fernlicht') o.fernlicht = false;
    },
  };

  // ---------- Anhalten an einer Stelle (Ampel, Schulampel, Bahnübergang, Baustellenampel, Kreuzung freihalten, Kreisel, Engstelle) ----------
  V.halt = {
    aufbau(R, p) {
      const W = H.W, K = R.P + 10, m = p.modus, hp = K - 1;
      R.K = K;
      H.sperre(K - 45, K + 35);
      const g = { hind: () => ({ pos: hp, v: 0, abstand: 1.5 }), ausloesen: () => H.nahGenug(hp, 0, 1.5, 0.2), frei: () => false };
      if (m === 'ampel' || m === 'stau') {
        H.mark({ art: 'querstrasse', pos: K, seiten: 'beide', halt: true });
        const a = R.ampel = H.dazu({ typ: 'ampel', x: 4.4, pos: K - 0.6, zustand: 'gruen' });
        if (m === 'ampel') {
          const f = R.fuss = H.dazu({ typ: 'ampel', x: 5.2, pos: K - 5, zustand: 'gruen', fuss: true });
          R.vorzeichen = { obj: f, ausloesen: () => H.nahGenug(hp, 0, 1.5, 1.6), start() { f.zustand = 'rot'; } };
          Object.assign(g, { obj: a, start() { a.zustand = 'gelb'; R.gelbT = 0; }, frei: () => a.zustand === 'gruen' && R.gelbT > 1 });
        } else {
          const stau = R.stau = [11, 17, 23, 29].map(d => H.dazu(H.auto(K + d, 0, { licht: { brems: true } })));
          R.vorzeichen = { obj: stau[0], objs: stau, sofort: true };
          Object.assign(g, { obj: stau[0], objs: stau, frei: () => stau[0].pos > K + 34 });
        }
      } else if (m === 'schulampel') {
        H.mark({ art: 'zebra', pos: K + 0.5 });
        H.mark({ art: 'haltelinie', pos: K - 1.2 });
        const a = R.ampel = H.dazu({ typ: 'ampel', x: 4.4, pos: K - 0.4, zustand: 'gruen' });
        const k = R.kind = H.dazu(H.figur('kind-ranzen', K + 1.2, 4.7));
        R.vorzeichen = { obj: k, sofort: true };
        Object.assign(g, { obj: a, start() { a.zustand = 'gelb'; R.gelbT = 0; }, frei: () => a.zustand === 'gruen' && R.gelbT > 1 });
      } else if (m === 'bahn') {
        const baken = [240, 160, 80].map((d, i) => H.schild('bake', K - d, 3.4, { streifen: 3 - i, groesse: 0.5, hoch: 1.5 }));
        const kreuz = R.kreuz = H.schild('andreaskreuz', K - 4, 3.8, { groesse: 0.9 });
        H.mark({ art: 'gleise', pos: K });
        R.vorzeichen = { obj: baken[0], objs: baken, sofort: true };
        Object.assign(g, { obj: kreuz, hind: () => ({ pos: K - 2.4, v: 0, abstand: 1.5 }), ausloesen: () => H.nahGenug(K - 2.4, 0, 1.5, 0.4), start() { kreuz.blink = true; R.zugT = 0; }, frei: () => R.zug && R.zug.x > 75 });
      } else if (m === 'baustelle') {
        R.keinGegenverkehr = true;
        const sch = H.schild('baustelle', K - 130, 3.2);
        const a = R.ampel = H.dazu({ typ: 'ampel', x: 2.6, pos: K - 0.6, zustand: 'rot' });
        for (let d = 3; d < 75; d += 6) H.dazu({ typ: 'bake', x: 1.0, pos: K + d });
        H.mark({ art: 'haltelinie', pos: K - 1.4 });
        R.vorzeichen = { obj: sch, sofort: true };
        Object.assign(g, { obj: a, start() { R.gegenT = 0; }, frei: () => a.zustand === 'gruen' });
      } else if (m === 'kreisel') {
        R.keinGegenverkehr = true;
        H.mark({ art: 'kreisel', pos: K });
        H.schild('vorfahrt-gewaehren', K - 2.5, 4.4); H.schild('kreisel', K - 2.6, 4.4, { hoch: 1.4, groesse: 0.55 });
        const r = R.rad = H.dazu(radler(K + 4, -9, { vx: 0.1, jacke: '#2f63c6' }));
        R.vorzeichen = { obj: r, sofort: true };
        Object.assign(g, { obj: r, hind: () => ({ pos: K - 0.3, v: 0, abstand: 1.5 }), ausloesen: () => H.nahGenug(K - 0.3, 0, 1.5, 0.8), start() { r.vx = 3.4; }, frei: () => r.x > 3.2 });
      } else if (m === 'engstelle') {
        R.keinGegenverkehr = true;
        const sch = H.schild('vorrang-gegen', K - 25, 3.8);
        for (let d = 1; d < 26; d += 4) H.dazu({ typ: 'bake', x: 0.9, pos: K + d });
        const r = R.rad = H.dazu(radler(K + 95, -1.5, { richtung: -1, v: -4.5, jacke: '#c0392b', bild: 'menschen/radler-vorne' }));
        R.vorzeichen = { obj: sch, sofort: true };
        Object.assign(g, { obj: r, objs: [r], frei: () => vor(r) < -2 });
      }
      R.gefahr = H.gefahr(g);
      R.endePos = () => (m === 'kreisel' ? (R.kreisel && R.kreisel.phase === 'fertig' ? R.kreisel.fertigAm + 30 : 1e9) : R.gefahr.geloest ? K + (m === 'baustelle' ? 80 : m === 'engstelle' ? 30 : 12) : 1e9);
    },
    schritt(R, dt) {
      const W = H.W, p = R.p, m = p.modus, g = R.gefahr, a = R.ampel;
      if ((m === 'ampel' || m === 'schulampel') && g.aktiv) {
        R.gelbT += dt;
        if (a.zustand === 'gelb' && R.gelbT > 1.4) { a.zustand = 'rot'; R.rotT = 0; }
        if (a.zustand === 'rot') { R.rotT += dt; if (W.v < 0.3) R.stehT = (R.stehT || 0) + dt; }
        if (m === 'schulampel' && a.zustand === 'rot' && R.rotT > 0.8 && R.kind.x > -5) { R.kind.vx = -1.3; R.kind.gehen = 1; }
        if (m === 'schulampel' && R.kind.x < -5.2) { R.kind.vx = 0; R.kind.gehen = 0; }
        const bereit = m === 'schulampel' ? R.kind.x < -5 && R.stehT > 1 : R.stehT > 3;
        if (a.zustand === 'rot' && (bereit || R.rotT > 9)) { a.zustand = 'rotgelb'; R.rgT = 0; }
        if (a.zustand === 'rotgelb') { R.rgT += dt; if (R.rgT > 1) a.zustand = 'gruen'; }
        if (R.fuss && a.zustand === 'gruen' && R.rgT > 0) R.fuss.zustand = 'rot';
      }
      if (m === 'stau' && g.aktiv) {
        if (W.v < 0.3) R.stehT = (R.stehT || 0) + dt;
        if (R.stehT > 2.6 || g.doppel) R.stau.forEach((c, i) => { if (R.stehT > 2.6 + i * 0.4) { c.v = Math.min(9, c.v + 2.4 * dt); c.licht.brems = false; } });
      }
      if (m === 'bahn' && g.aktiv && !g.geloest) {
        R.zugT += dt;
        if (!R.zug && R.zugT > 2.6) R.zug = H.dazu({ typ: 'zug', x: -80, pos: R.K, laenge: 48, vx: 26 });
        if (R.zug && R.zug.x > 75) { R.zug.versteckt = true; R.kreuz.blink = false; }
      }
      if (m === 'baustelle' && g.aktiv && !g.geloest) {
        R.gegenT += dt;
        if (!R.gegen1 && R.gegenT > 0.5) { R.gegen1 = H.dazu(H.auto(R.K + 90, -2.4, { richtung: -1, v: -8 })); R.gegen2 = H.dazu(H.auto(R.K + 104, -2.4, { richtung: -1, v: -8, art: 'van' })); }
        if (R.gegen2 && vor(R.gegen2) < -6 && W.v < 0.3) { R.gruenT = (R.gruenT || 0) + dt; if (R.gruenT > 1.2) a.zustand = 'gruen'; }
        if (R.gegenT > 16 && W.v < 0.3) a.zustand = 'gruen';
      }
      if (m === 'baustelle' && g.geloest) W.kxZiel = W.s < R.K + 78 ? -2.5 : 0;
      if (m === 'engstelle' && g.geloest) W.kxZiel = W.s < R.K + 28 ? -1.9 : 0;
      if (m === 'kreisel') { const r = R.rad; if (r.x > 9) { r.vx = 0; r.versteckt = true; } if (g.geloest && !R.gedreht && W.s > R.K - 1) { R.gedreht = true; kreiselFahrt(R, 38, true); } kreiselSchritt(R); }
    },
  };

  // ---------- Tempo anpassen an einem Schild oder einer Stelle der Fahrbahn ----------
  // p: vorher (km/h), limit (km/h), danach (km/h), schild { art, zahl, zone, zusatz, x }, beidseitig, flaeche { stoff, x0, x1, laenge },
  //    gefahr ('schild'|'flaeche'|'scheibe'|'kinder'), vz ('gleich'|'scheibe'|{ schild }|'anzeige'|'baeume'|'windsack'|'flaeche'), bruecke, wind, aquaplaning
  V.tempo = {
    aufbau(R, p) {
      const W = H.W, Z = R.P + 40;
      R.Z = Z;
      if (p.vorher) { W.zielV = p.vorher / 3.6; W.v = W.zielV; }
      H.sperre(Z - 45, Z + 40);
      const sch = p.schild ? H.schild(p.schild.art, Z, p.schild.x != null ? p.schild.x : rand(), p.schild) : null;
      if (sch && p.beidseitig) H.schild(p.schild.art, Z, randL() + 0.6, p.schild);
      let zone = null;
      if (p.flaeche) {
        const f = p.flaeche;
        H.mark({ art: 'flaeche', stoff: f.stoff, pos: Z + (f.dz || 0), x0: f.x0, x1: f.x1, laenge: f.laenge || 40, unten: true });
        zone = H.dazu({ typ: 'zone', x0: f.x0 != null ? f.x0 : -1.8, x1: f.x1 != null ? f.x1 : 1.8, pos: Z + (f.dz || 0), laenge: Math.min(40, f.laenge || 40), h: 0.5 });
      }
      if (p.bruecke) { H.dazu({ typ: 'gelaender', x: W.umgebung === 'autobahn' ? 4.6 : 2.6, pos: Z, laenge: 140, seite: 1 }); H.dazu({ typ: 'gelaender', x: W.umgebung === 'autobahn' ? -6.4 : -5.8, pos: Z, laenge: 140, seite: -1 }); }
      // Vorzeichen
      const vz = p.vz;
      if (vz === 'gleich' && sch) R.vorzeichen = { obj: sch, sofort: true, gleich: true, ahnenV: null };
      else if (vz === 'schild' && sch) R.vorzeichen = { obj: sch, sofort: true };
      else if (vz === 'scheibe') R.vorzeichen = { ort: 'scheibe', objs: [], sofort: true };
      else if (vz && vz.schild) R.vorzeichen = { obj: H.schild(vz.schild, Z + (vz.dz || -90), vz.x != null ? vz.x : rand(), vz), sofort: true };
      else if (vz === 'anzeige') R.vorzeichen = { obj: H.anzeige(R.def.vorzeichen || '', false), sofort: true };
      else if (vz === 'flaeche' && zone) R.vorzeichen = { obj: zone, sofort: true };
      else if (vz === 'windsack') R.vorzeichen = { obj: H.dazu({ typ: 'windsack', x: 6.2, pos: Z - 50 }), sofort: true };
      else if (vz === 'baeume') { const b = []; for (let d = -120; d < 40; d += 14) { b.push(H.dazu({ typ: 'baum', x: 3.6, pos: Z + d, groesse: 1.1, k: d })); b.push(H.dazu({ typ: 'baum', x: -7.2, pos: Z + d + 7, groesse: 1.1, k: d + 3 })); } R.vorzeichen = { obj: b[6], objs: b, sofort: true }; }
      if (R.vorzeichen && R.vorzeichen.ahnenV === null) delete R.vorzeichen.ahnenV;
      // Gefahr
      const art = p.gefahr || 'schild';
      const g = { frei: () => W.s > Z, ausloesen: () => Z - W.s < Math.max(70, W.v * 4.5), bis: () => W.s > Z - 4 };
      g.durchBremse = art === 'schild' || art === 'flaeche' || art === 'scheibe';
      if (art === 'schild' && sch) Object.assign(g, { obj: sch });
      else if (art === 'flaeche' && zone) Object.assign(g, { obj: zone });
      else if (art === 'scheibe') Object.assign(g, { ort: 'scheibe', objs: [], ausloesen: () => W.s > Z - 2, bis: () => W.s > Z + 22, frei: () => W.s > Z + 22 || R.gefahr.erkannt });
      else if (art === 'kinder') {
        const kp = Z + (p.kinderDz || 42), k1 = H.dazu(H.figur('kind', kp, 0.4, { hoehe: 1.15 })), k2 = H.dazu(H.figur('kind-ranzen', kp + 0.8, 1.1, { hoehe: 1.2, ranzen: null }));
        R.kinder = [k1, k2];
        Object.assign(g, { obj: k1, objs: [k1, k2], hind: () => ({ pos: kp, v: 0, abstand: 4 }), ausloesen: () => H.nahGenug(kp, 0, 4, 1.5), bis: null,
          start() { R.kT = 0; }, frei: () => k1.x > 3 && k2.x > 3 });
      }
      R.gefahr = H.gefahr(g);
      const T = H.tempoAufgabe(p.limit, Z, p.danach);
      T.text = p.text || null;
      R.endePos = Z + (art === 'kinder' ? (p.kinderDz || 42) + 8 : art === 'scheibe' ? 26 : p.kurve ? 60 : 25);
    },
    schritt(R, dt) {
      const W = H.W, p = R.p, Z = R.Z;
      if (R.kinder && R.gefahr.aktiv) { R.kT += dt; if (R.kT > 2.4 && (R.gefahr.erkannt || R.gefahr.doppel)) R.kinder.forEach((k, i) => { if (k.x < 3.2) { k.vx = 1.2; k.gehen = 1; } else { k.vx = 0; k.gehen = 0; } }); }
      if (p.wind && W.s > Z && W.s < Z + 140) { const b = Math.sin((W.s - Z) / 140 * Math.PI); W.kx += Math.sin(R.t * 3) * 0.25 * b * dt * (W.v / 25); if (!W.ruhig) W.lenk += Math.sin(R.t * 5) * 0.05 * b; }
      if (p.kurve) R.kurveFix = W.s > Z - 70 ? (p.kurve === 'links' ? -0.0045 : 0.0045) : null;
      if (p.aquaplaning && W.s > Z && W.s < Z + 30 && !W.ruhig) W.lenk += Math.sin(R.t * 9) * 0.03;
    },
  };

  // ---------- Licht einschalten (Tunnel, Dämmerung) ----------
  V.licht = {
    aufbau(R, p) {
      const W = H.W, K = R.P + 30;
      R.K = K;
      W.licht = 'tag';
      if (p.modus === 'tunnel') {
        const sch = H.schild('tunnel', K - 170, 6.0, { groesse: 0.9 });
        const portal = H.dazu({ typ: 'portal', x: 0, pos: K });
        W.tunnelLage = { a: K, e: K + 180 };   // Tunnel innen (szene.js tunnelInnen): Einfahrt K, Ausfahrt K + 180
        R.vorzeichen = { obj: sch, objs: [sch, portal], sofort: true };
        R.gefahr = H.gefahr({ objs: [], durch: 'abblenden', ausloesen: () => K - W.s < 150, bis: () => W.s > K - 8, verpasstText: H.hinweis('H027'),
          nachVerpasst() { W.licht = 'abblend'; }, frei: () => W.s > K - 8 || R.gefahr.erkannt });
        R.endePos = K + 210;
      } else {
        const gx = gegenX();
        const a = H.dazu(H.auto(W.s + 180, gx, { richtung: -1, v: -14, licht: { an: true } })), b = H.dazu(H.auto(W.s + 260, gx, { richtung: -1, v: -14, licht: { an: true } }));
        R.keinGegenverkehr = true;
        R.vorzeichen = { obj: a, objs: [a, b], sofort: true };
        R.gefahr = H.gefahr({ objs: [], durch: 'abblenden', ausloesen: () => R.t > 2.2, bis: () => R.t > 9, verpasstText: H.hinweis('H028'),
          nachVerpasst() { W.licht = 'abblend'; }, frei: () => R.gefahr.erkannt || R.t > 9 });
        R.endePos = () => (vor(b) < -5 ? 0 : 1e9);
      }
    },
    schritt(R) {
      const W = H.W;
      if (R.p.modus === 'tunnel') { const d = W.s - R.K; W.tunnel = d < -2 ? 0 : d < 12 ? (d + 2) / 14 : d < 175 ? 1 : d < 195 ? (195 - d) / 20 : 0; }
    },
  };

  // ---------- Hindernis auf der Fahrbahn (Reifenteile; Schmutzwasser auf der Scheibe) ----------
  V.hindernis = {
    aufbau(R, p) {
      const W = H.W, K = R.P + 20;
      R.K = K;
      if (p.modus === 'schmutz') {
        H.sperre(K - 30, K + 90);
        const van = R.van = H.dazu(H.auto(W.s + 26, 0, { art: 'van', v: W.zielV }));
        const pf = H.dazu({ typ: 'zone', x0: -1.6, x1: 1.6, pos: K, laenge: 6, h: 0.3 });
        H.mark({ art: 'flaeche', stoff: 'pfuetze', pos: K, x0: -1.7, x1: 1.7, laenge: 6, unten: true });
        H.mark({ art: 'zebra', pos: K + 80 }); H.schild('zebra', K + 77, 4.8);
        H.dazu(H.figur('frau', K + 81, 4.6));
        R.vorzeichen = { obj: pf, objs: [pf, van], sofort: true };
        R.gefahr = H.gefahr({ ort: 'scheibe', objs: [], ausloesen: () => van.pos > K + 2, start() { W.schmutz = 1; }, bis: () => H.zeit - R.gefahr.t0 > H.ST().fenster + 0.5, bisDoppel: true,
          nachErkannt() { R.wischen = true; }, nachDoppel() { R.wischen = true; }, frei: () => W.schmutz < 0.03 });
        R.endePos = K + 95;
      } else {
        const reifen = H.dazu({ typ: 'reifen', x: 0.1, pos: K });
        const autos = [H.dazu(H.auto(W.s + 45, 0, { v: W.zielV })), H.dazu(H.auto(W.s + 75, 0, { v: W.zielV, art: 'kombi' }))];
        R.autos = autos;
        R.vorzeichen = { obj: autos[0], objs: autos, aktivWenn: () => autos.some(a => Math.abs(a.x) > 0.3) };
        R.gefahr = H.gefahr({ obj: reifen, hind: () => ({ pos: K, v: 0, abstand: 6 }), ausloesen: () => H.nahGenug(K, 0, 6), ausweichen: { kx: -1.4, v: 0.55 }, frei: () => W.s > K + 3 });
        R.endePos = K + 40;
      }
    },
    schritt(R, dt) {
      const W = H.W;
      if (R.p.modus === 'schmutz') {
        if (R.wischen) { W.wischer = true; W.schmutz = Math.max(0, W.schmutz - dt * 1.1); R.maxV = W.zielV * 0.7; }
        if (R.wischen && W.schmutz <= 0) { W.wischer = R.t % 1 < 0.9 && !R.gefahr.geloest; R.maxV = null; }
      } else {
        R.autos.forEach(a => { const d = R.K - a.pos; a.vx = d < 14 && d > -2 ? -0.9 : d <= -2 && a.x < 0 ? 0.9 : 0; if (d < -2 && a.x >= 0) { a.x = 0; a.vx = 0; } });
      }
    },
  };

  // ---------- Vorfahrt-Kreuzung (Draufsicht in schirme.js) ----------
  V.kreuzung = {
    aufbau(R) {
      const K = R.P;
      R.K = K;
      H.sperre(K - 30, K + 20);
      const LG = (H.D.KREUZ_LAGE && H.D.KREUZ_LAGE[R.def.kreuzung]) || {};
      if (LG.form === 'kreisel') H.mark({ art: 'kreisel', pos: K });
      else if (LG.ohne === 'w' || LG.ohne === 'o') H.mark({ art: 'einmuendung', pos: K, seiten: LG.ohne === 'w' ? 'rechts' : 'links', breite: LG.feldweg ? 5 : 8 });
      else H.mark({ art: 'querstrasse', pos: K, halt: (LG.ampel && LG.ampel.s !== 'aus') || (LG.schild && LG.schild.s === '206'), warte: LG.schild && (LG.schild.s === '205' || LG.schild.s === '215') });
      const SCH = { 205: 'vorfahrt-gewaehren', 206: 'halt', 306: 'vorfahrtstrasse', 215: 'kreisel' }, s = LG.schild && LG.schild.s;
      if (SCH[s]) { H.schild(SCH[s], K - 4, rand(), s === '306' && LG.knick ? { knick: 'links', zusatz: ' ' } : {}); if (s === '215') H.schild('vorfahrt-gewaehren', K - 4.1, rand(), { hoch: 1.4, groesse: 0.55 }); }
      if (LG.ampel && LG.ampel.s) {
        const zst = LG.ampel.s === 'g' ? 'gruen' : LG.ampel.s === 'r' ? 'rot' : 'aus';
        H.dazu({ typ: 'ampel', x: rand() - 0.6, pos: K - 2.5, zustand: zst });
        // zweite Ampel links der Zufahrt (wie an echten Kreuzungen), damit das Signal schon von Weitem auffällt
        if (H.W.umgebung === 'stadt' || H.W.umgebung === 'wohngebiet') H.dazu({ typ: 'ampel', x: -rand() - 1.2, pos: K - 2.5, zustand: zst, links: true });
      }
      if (LG.polizei) R.polizist = H.dazu(H.figur(LG.polizei === 'brust' ? 'polizist' : 'polizist-seite', K + 4, -1.5, { jacke: '#2d4a7a', haar: '#f4f4f0', weste: '#e8ff3a' }));
      const TX = H.TX, RT = H.RT, D_ = H.D;
      R.kreuzungDef = (TX && TX.kreuzungen && TX.kreuzungen[R.def.kreuzung] && Object.assign({ id: R.def.kreuzung }, TX.kreuzungen[R.def.kreuzung])) || D_.KREUZUNGEN.find(k => k.id === R.def.kreuzung) || D_.KREUZUNGEN[0];
      R.kreuzungDef.texte = { titel: RT('KREUZUNG_TITEL') || 'Wer fährt zuerst?', anleitung: RT('KREUZUNG_ANLEITUNG') || '', richtig: RT('KREUZUNG_RICHTIG') || 'Richtige Reihenfolge', falsch: RT('KREUZUNG_FALSCH') || 'Nicht ganz – so wäre es richtig', rot: H.hinweis('H029'), polizei: H.hinweis('H030') };
      const du = (R.kreuzungDef.fahrzeuge || []).find(f => /^du$/i.test(f.id)) || {};
      R.duWohin = /links/.test(du.wohin || '') ? -1 : /rechts/.test(du.wohin || '') ? 1 : 0;
      R.duKreisel = LG.form === 'kreisel';
      H.teil('vorfahrt', D.PUNKTE.handgriffe);
      R.vorFolgen = () => (R.kreuzungFertig ? null : { pos: K - 0.5, v: 0, abstand: 1.5 });
      R.keinGegenverkehr = true;
      R.endePos = () => (R.kreisel ? (R.kreisel.phase === 'fertig' ? R.kreisel.fertigAm + 25 : 1e9) : R.duWohin ? (R.gedreht && !H.W.dreh ? K + 4 : 1e9) : K + 14);
    },
    schritt(R) {
      const W = H.W;
      // nach dem Lösen: Ampel wird grün (wer bei Rot stand), dann geradeaus, abbiegen oder durch den Kreisel
      if (R.kreuzungFertig && !R.gedreht && W.s > R.K - 3) {
        R.gedreht = true;
        W.objekte.forEach(o => { if (o.typ === 'ampel') o.zustand = 'gruen'; });
        if (R.duKreisel) kreiselFahrt(R, 34, true);
        else if (R.duWohin) { W.blinker = R.duWohin < 0 ? 'links' : 'rechts'; W.dreh = { seite: R.duWohin, t: 0, danach() { W.blinker = null; } }; }
      }
      kreiselSchritt(R);
      if (!R.kreuzungOffen && !R.kreuzungFertig && H.W.v < 0.25 && R.P - H.W.s < 6) {
        R.kreuzungOffen = true;
        H.phase('kreuzung');
        H.UI.kreuzung(R.kreuzungDef, ergebnis => {
          R.kreuzungOffen = false; R.kreuzungFertig = true; H.phase('situation');
          H.vergeben('vorfahrt', Math.round(D.PUNKTE.handgriffe * ergebnis.anteil), H.mitteOben());
          if (ergebnis.anteil < 1) { H.fehler('vorfahrt', R.def.fehlertext); H.UI.fahrlehrer('neutral', H.spruch('kreuzung') || H.hinweis('H014'), 2.6); }
          else H.UI.fahrlehrer('freut', H.spruch('lob'), 2);
        });
      }
    },
    fertig: R => R.kreuzungFertig,
  };

  // ---------- Anfahren vom Fahrbahnrand (S006, S029) ----------
  V.anfahren = {
    aufbau(R) {
      const W = H.W;
      W.v = 0; W.kx = W.kxZiel = 2.75; W.zielV = 0;
      H.sperre(W.s - 20, W.s + 30);
      H.dazu(H.auto(W.s + 9, 2.85));
      R.keinHinten = true; R.keinGegenverkehr = true;
      R.radAb = 0.3;
      R.vorzeichen = { ort: 'links', objs: [], aktivWenn: () => R.rad && istHinten(R.rad) && R.rad.dz > 3.2 && R.rad.dz < 34 };
      R.gefahr = H.gefahr({ ort: 'links', durch: 'schulter', durchSeite: 'links', objs: [], ausloesen: () => R.rad && istHinten(R.rad) && R.rad.dz < 16, bis: () => R.rad && !istHinten(R.rad),
        frei: () => R.rad && !istHinten(R.rad) });
      R.hand = H.handgriffe({ ziel: 0, ankuendigen: () => R.t > 0.6, auftrag: H.hinweis('H015'),
        belegt: () => (R.rad && istHinten(R.rad) && R.rad.dz > -6 && R.rad.dz < 14) || (R.rad && R.rad.vorne && vor(R.rad.vorne) < 3 && vor(R.rad.vorne) > -6),
        nachLenken() { W.zielV = H.kmhZiel(H.D.GEBIETE[R.def.gebiet].kmh); } });
      R.endePos = () => (R.hand.gelenkt ? R.hand.gelenktAm + 45 : 1e9);
    },
    schritt(R) {
      if (!R.rad && R.t > R.radAb) R.rad = H.hinten({ art: 'rad', x: 0.2, dz: 30, v: 5.6, farbe: '#d9822b', jacke: '#d9822b' });
      if (R.rad && istHinten(R.rad) && R.hand.gelenkt) R.rad.v = Math.max(5.6, H.W.v + 1.5);   // überholt trotzdem
      const f = R.rad && R.rad.vorne;
      if (f && vor(f) > 18) { f.vx = -1.4; if (f.x < -6) { f.versteckt = true; f.vx = 0; } }
    },
  };

  // ---------- Radler überholen (S044) ----------
  V['rad-ueberholen'] = {
    aufbau(R) {
      const W = H.W;
      const rad = R.rad = H.dazu(radler(W.s + Math.max(70, (W.zielV - 5.5) * H.ST().anfahrt) + 30, 1.25, { v: 5.5, jacke: '#d9822b', k: 1, bild: 'menschen/rennradler' }));
      R.keinGegenverkehr = true;
      R.hand = H.handgriffe({ ziel: -2.2, ankuendigen: () => vor(rad) < 70, belegt: () => false, zurueck: () => W.s > rad.pos + 14 });
      R.vorFolgen = () => (W.kx > -1 && !R.hand.gelenkt ? { pos: rad.pos, v: rad.v, abstand: 14 } : null);
      R.endePos = () => (R.hand.zurueckAm ? R.hand.zurueckAm + 25 : 1e9);
    },
  };

  // ---------- Überholen auf der Autobahn (S066, schnelles Auto von hinten links) ----------
  V.ueberholen = {
    aufbau(R, p) {
      const W = H.W, art = p.art || 'lkw', v0 = Math.min(p.v || 19, W.zielV * 0.78);
      const lkw = R.lkw = H.dazu(H.auto(W.s + Math.max(80, (W.zielV - v0) * H.ST().anfahrt) + 60, 0, { art, v: v0 }));
      R.keinHinten = true;
      R.hand = H.handgriffe({ ziel: -3.75, ankuendigen: () => vor(lkw) < 95,
        beimAnkuendigen() { R.tw = H.hinten({ art: 'pkw', x: -3.75, dz: 34, v: W.v + 5, farbe: '#8b1e1e' }); },
        belegt: () => R.tw && istHinten(R.tw) && R.tw.dz > -5.5 && R.tw.dz < 16,
        zurueck: () => W.s > lkw.pos + lkw.laenge + 16 });
      R.vorzeichen = { ort: 'links', objs: [], aktivWenn: () => R.tw && istHinten(R.tw) && R.tw.dz > 3.2 };
      R.gefahr = H.gefahr({ ort: 'links', durch: 'schulter', durchSeite: 'links', objs: [], ausloesen: () => R.tw && istHinten(R.tw) && R.tw.dz < 16, bis: () => R.tw && !istHinten(R.tw), frei: () => R.tw && !istHinten(R.tw) });
      R.vorFolgen = () => (W.kx > -1.6 && !R.hand.gelenkt ? { pos: lkw.pos, v: lkw.v, abstand: 26 } : null);
      R.endePos = () => (R.hand.zurueckAm ? R.hand.zurueckAm + 40 : 1e9);
    },
    schritt(R) {
      const tw = R.tw, W = H.W;
      if (tw && istHinten(tw)) {
        tw.v = tw.dz > 7 ? W.v + 4.5 : tw.dz > -3 ? W.v + 1.4 : W.v + 6;
        if (R.hand.gelenkt && Math.abs(tw.x - W.kx) < 1.6 && tw.dz > 0) tw.v = tw.dz > 12 ? W.v + 2 : W.v;
      }
    },
  };

  return V;
};
