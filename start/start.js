// Startseite „Blinker links“: Logo, Tacho mit Bestwert, Kontrollleuchten je Stufe (Wahl, gemerkt), Statistik, Footer,
// Ton-Knopf, Cockpit-Pfeil im gemeinsamen Blinker-Takt (start/takt.js).
// Testhilfen (Adresse): #best=854,761,0 (Bestwerte je Stufe nur anzeigen)  #stat=12,37,3,92 (Fahrten, Karten,
//   Doppelbremsen, Schulterblick-% nur anzeigen; schaltet auch alle Stufen frei)  #intro (Intro immer)
//   #intro=1.4 (Standbild)  #ruhig (wie „Bewegung reduzieren“)
(function () {
  'use strict';
  const B = window.BL_BASIS, K = B.K, T = window.BL_TAKT, $ = s => document.querySelector(s);
  const hash = location.hash;
  const wert = name => { const m = new RegExp('[#&]' + name + '=([^&]*)').exec(hash); return m ? decodeURIComponent(m[1]) : null; };
  if (B.ruhig()) document.documentElement.classList.add('ruhig');

  // ---------- Logo (eingebettet, ids bleiben fürs Intro) ----------
  window.BL_LOGO = B.logoEinbetten($('#logo'), K.logoAufHell || K.logo);
  $('#logo').setAttribute('aria-label', K.firma || '');
  document.title = 'Blinker links – ' + (K.kurzname || K.firma || '');

  // ---------- Ton-Knopf (Klänge folgen in Phase 4: Blinker-Ticken + Straße leise) ----------
  const TON_AN = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
  const TON_AUS = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.6-.4 1.4-1.4 2.1 2.1 2.1-2.1 1.4 1.4-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1z"/></svg>';
  let tonAn = B.lesen('ton') !== 'aus';
  const tonZeigen = () => { $('#tonKnopf').innerHTML = tonAn ? TON_AN : TON_AUS; $('#tonKnopf').setAttribute('aria-pressed', tonAn ? 'true' : 'false'); };
  $('#tonKnopf').addEventListener('click', () => { tonAn = !tonAn; B.schreiben('ton', tonAn ? 'an' : 'aus'); tonZeigen(); });
  tonZeigen();

  // ---------- Bestwerte und Statistik ----------
  let s = B.statistik();
  const bestTest = wert('best'), statTest = wert('stat');
  let bests = B.STUFEN.map(x => B.best(x.id));
  if (bestTest != null) bests = bestTest.split(',').map(v => v === '' || v == null ? null : Math.max(0, Math.min(1000, +v || 0)) || null);
  let karten = s.karten.length, fahrten = s.fahrten, doppel = s.doppelbremsen, schulter = s.schulterAlle ? Math.round(100 * s.schulterOk / s.schulterAlle) : null;
  if (statTest) {
    const [f, k, d, q] = statTest.split(',').map(Number);
    fahrten = f || 0; karten = k || 0; doppel = d || 0; schulter = isNaN(q) ? null : q;
    s = Object.assign({}, s, { abgeschlossen: { fahrstunde: 1, uebung: 1, pruefung: 1 } });
  }
  const gesamt = Math.max(0, ...bests.map(b => b || 0));
  $('#statFahrten').textContent = fahrten > 0 ? B.zahl(fahrten) : '–';
  $('#statKarten').textContent = B.zahl(karten);
  $('#statKartenBalken').style.width = Math.min(100, karten) + '%';
  $('#lcd').innerHTML = fahrten > 0
    ? `<span>Doppelbremse</span><b>${B.zahl(doppel)}×</b><span>–</span><span>Schulterblick</span><b>${schulter == null ? '–' : schulter + ' %'}</b>`
    : '<span>Bereit für die erste Fahrt</span>';
  $('#fuss').innerHTML = B.fussHtml();

  // ---------- Tacho: Skala 0–1.000, Zeiger auf dem höchsten Bestwert (Intro lässt ihn von 0 hochschwingen) ----------
  const NS = 'http://www.w3.org/2000/svg', svg = $('#tachoSvg');
  const w = v => (135 + 270 * v / 1000) * Math.PI / 180;
  const pt = (v, r) => [100 + r * Math.cos(w(v)), 100 + r * Math.sin(w(v))];
  const el = (n, a, text) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); if (text != null) e.textContent = text; return e; };
  const bogen = (v0, v1, r) => { const [x0, y0] = pt(v0, r), [x1, y1] = pt(Math.max(v0 + 0.01, v1), r); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${(v1 - v0) * .27 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  el('circle', { cx: 100, cy: 100, r: 97, fill: 'none', stroke: '#2b3033', 'stroke-width': 2 });
  el('path', { d: bogen(0, 1000, 88), fill: 'none', stroke: '#1d2326', 'stroke-width': 6, 'stroke-linecap': 'round' });
  const leuchtBogen = el('path', { d: bogen(0, 0, 88), fill: 'none', stroke: '#3ddc6f', 'stroke-width': 6, 'stroke-linecap': 'round', style: 'filter:drop-shadow(0 0 4px rgba(61,220,111,.8))' });
  const striche = [];
  for (let v = 0; v <= 1000; v += 25) {
    const gross = v % 100 === 0, [x0, y0] = pt(v, gross ? 70 : 74), [x1, y1] = pt(v, 80);
    striche.push([v, el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: '#58605c', 'stroke-width': gross ? 2 : 1, 'stroke-linecap': 'round' })]);
    if (v % 200 === 0) { const [tx, ty] = pt(v, 58); el('text', { x: tx, y: ty + 3.5, fill: '#aeb8b2', 'font-family': 'Kanit', 'font-size': 9.5, 'text-anchor': 'middle' }, v.toLocaleString('de-DE')); }
  }
  const zeiger = el('line', { x1: 100 + 46, y1: 100, x2: 100 + 86, y2: 100, stroke: '#ff5a2a', 'stroke-width': 3.4, 'stroke-linecap': 'round', style: 'filter:drop-shadow(0 0 3px rgba(255,90,42,.9))' });
  el('circle', { cx: 100, cy: 100, r: 44, fill: '#070909', stroke: '#22282a', 'stroke-width': 1.5 });
  el('text', { x: 100, y: 84, fill: '#8e9893', 'font-family': 'Kanit', 'font-size': 7.5, 'letter-spacing': 1.2, 'text-anchor': 'middle' }, 'DEIN BESTWERT');
  const tachoZahl = el('text', { x: 100, y: 112, fill: '#fff', 'font-family': 'Kanit', 'font-weight': 600, 'font-size': 34, 'text-anchor': 'middle' }, '0');
  el('text', { x: 100, y: 125, fill: '#aeb8b2', 'font-family': 'Kanit', 'font-size': 8.5, 'text-anchor': 'middle' }, '/1.000 Punkte');
  $('#tacho').setAttribute('aria-label', 'Dein Bestwert: ' + B.zahl(gesamt) + ' von 1.000 Punkten');
  // Zeiger auf v (0–1.000); Intro und Einblendung rufen das je Bild auf
  function tachoStellen(v) {
    v = Math.max(0, Math.min(1000, v));
    zeiger.setAttribute('transform', `rotate(${(135 + 270 * v / 1000).toFixed(2)} 100 100)`);
    leuchtBogen.setAttribute('d', bogen(0, v, 88));
    leuchtBogen.style.opacity = v > 1 ? 1 : 0;
    striche.forEach(([sv, l]) => l.setAttribute('stroke', sv <= v + 0.5 && v > 0 ? '#e8efe9' : '#58605c'));
    tachoZahl.textContent = B.zahl(v);
  }
  tachoStellen(0);
  // Ohne Intro: Zeiger schwingt beim Laden sanft hoch (reduced-motion: sofort)
  function tachoSchwung(dauer, fertig) {
    if (B.ruhig() || !gesamt) { tachoStellen(gesamt); fertig && fertig(); return; }
    const t0 = performance.now();
    const schritt = jetzt => {
      const p = Math.min(1, (jetzt - t0) / dauer), e = 1 - Math.pow(1 - p, 3);
      // leichtes Überschwingen wie eine echte Nadel
      tachoStellen(gesamt * (e + Math.sin(p * Math.PI) * 0.04 * (1 - p)));
      if (p < 1) requestAnimationFrame(schritt); else { tachoStellen(gesamt); fertig && fertig(); }
    };
    requestAnimationFrame(schritt);
  }

  // ---------- Kontrollleuchten je Stufe (Wahl gemerkt; gesperrte Stufen nur abgegraut, ohne Hinweistext) ----------
  const SYM = {
    fahrstunde: '<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="11.5"/><circle cx="15" cy="15" r="3"/><path d="M4 13.5h8M18 13.5h8M15 18v8.5"/></svg>',
    uebung: '<svg viewBox="0 0 30 30" aria-hidden="true"><path d="M10 3 4 27M20 3l6 24M15 4v4M15 12v5M15 21v5"/></svg>',
    pruefung: '<svg viewBox="0 0 30 30" aria-hidden="true"><rect x="6" y="4" width="18" height="23" rx="2.5"/><path d="M11 4V2.5h8V4M10 15l3.5 3.5L20 11"/></svg>',
  };
  let stufe = B.gewaehlt();
  if (statTest && wert('stufe')) stufe = wert('stufe');
  const leuchten = $('#leuchten');
  B.STUFEN.forEach((x, i) => {
    const frei = B.frei(x.id, s), knopf = document.createElement('button');
    knopf.type = 'button'; knopf.className = 'leuchte' + (frei ? '' : ' aus'); knopf.dataset.stufe = x.id;
    knopf.setAttribute('role', 'radio');
    if (!frei) { knopf.disabled = true; knopf.setAttribute('aria-disabled', 'true'); }
    // gesperrte Stufe (MZ, 29.10.2026): ausgegraut mit Hinweis „Frei ab 550 Punkten in der …“ (Text aus start/texte.js), kein „demnächst“
    const TS = window.BL_START_TEXTE || {}, vorher = B.VORHER[x.id];
    const freiAb = !frei && vorher && TS.STUFE_FREI_AB ? TS.STUFE_FREI_AB.replace('{punkte}', B.zahl(B.FREI_AB)).replace('{stufe}', (TS.stufen && TS.stufen[vorher] && TS.stufen[vorher].kurz) || '') : '';
    knopf.innerHTML = `${SYM[x.id]}<span>${B.esc(x.name)}</span>${freiAb ? `<b class="frei-ab">${B.esc(freiAb)}</b>` : `<b>${bests[i] ? B.zahl(bests[i]) : '–'}</b>`}`;
    knopf.setAttribute('aria-label', x.name + (freiAb ? ' – ' + freiAb : bests[i] ? ', Bestwert ' + B.zahl(bests[i]) : ''));
    knopf.addEventListener('click', () => { if (!frei) return; stufe = x.id; B.waehlen(stufe); zeigeWahl(); });
    leuchten.append(knopf);
  });
  function zeigeWahl() {
    leuchten.querySelectorAll('.leuchte').forEach(k => {
      const an = k.dataset.stufe === stufe;
      k.classList.toggle('an', an); k.setAttribute('aria-checked', an ? 'true' : 'false');
    });
  }
  zeigeWahl();
  $('#spielen').addEventListener('click', () => B.waehlen(stufe));

  // ---------- Cockpit-Pfeil blinkt im gemeinsamen Takt (Klang hängt sich in Phase 4 an BL_TAKT.bei) ----------
  const pfeil = $('#blinkL path');
  let blinken = !document.documentElement.classList.contains('intro');
  function blinkBild() {
    const h = blinken ? T.hell() : 0;
    pfeil.style.fill = h > 0.02 ? `color-mix(in srgb, var(--licht) ${Math.round(h * 100)}%, #26302a)` : '';
    pfeil.parentNode.style.filter = h > 0.02 ? `drop-shadow(0 0 4px rgba(61,220,111,${(0.95 * h).toFixed(2)})) drop-shadow(0 0 10px rgba(61,220,111,${(0.6 * h).toFixed(2)}))` : 'none';
    requestAnimationFrame(blinkBild);
  }
  requestAnimationFrame(blinkBild);

  // Schnittstelle fürs Intro
  window.BL_START = {
    gesamt, tachoStellen, tachoSchwung,
    blinkenAn() { if (!blinken) { blinken = true; T.neu(); } },
  };
  if (!document.documentElement.classList.contains('intro')) setTimeout(() => tachoSchwung(1100), 350);
})();
