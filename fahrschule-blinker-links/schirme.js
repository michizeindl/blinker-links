// „Blinker links“ – eigene Schirme über dem Rahmen (Stil 3 „Wegweiser“, MZ 28.10.2026): Startbild mit Wegweiser-Schild,
// Stufen als Pfeilschilder am Pfosten und Bestwert-Tafel; Endbild mit Ziel-Schild „Ziel – Musterstadt“, Punkten, Plakette
// (mittlere Reaktionszeit), Prüfungsprotokoll (Netz-Grafik, fünf Bereiche) und Fehlerliste; dazu im Spiel der Fahrlehrer
// (Code-Platzhalter: Mann, Mimik neutral/freut/erschrickt, MZ 28.10.2026) mit Sprechblase, Einblendungen (Stufen-Titel,
// Gebiet je Situation), Hinweis-Leiste (Fahrstunde), Punkte-Popups und die Vorfahrt-Kreuzung in Draufsicht.
// Die Schirme des Rahmens sind per CSS aus; der Rahmen speichert weiter den Bestwert (Rahmen.ende).
(function () {
  'use strict';
  const KL = (n, o) => { if (window.BL_KLANG) window.BL_KLANG.ton(n, o); };   // Ton (Phase 4, start/klang.js)
  const BB = window.BL_BASIS, K = BB.K, D = window.BL_DATEN, BI = window.BL_BILDER || {};
  const $ = s => document.querySelector(s);
  const esc = BB.esc;
  const el = (tag, klasse, html) => { const e = document.createElement(tag); if (klasse) e.className = klasse; if (html != null) e.innerHTML = html; return e; };
  const zahl = BB.zahl;
  const ruhig = BB.ruhig();
  if (ruhig) document.documentElement.classList.add('ruhig');
  document.documentElement.style.setProperty('--gruen', (K.farben && K.farben.haupt) || '#1E7A3E');
  const heim = K.startseite || '../';

  // ---------- gemeinsame SVG-Teile ----------
  const PFEIL = 'M1 13 15 1v7h18v10H15v7z';
  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc354"/><stop offset=".55" stop-color="#ff9a1a"/><stop offset="1" stop-color="#f07d00"/></linearGradient>
    <linearGradient id="blech" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="hell"/><stop offset=".5" class="mitte"/><stop offset="1" class="dunkel"/></linearGradient>
    <symbol id="uhr" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.5"/><path d="M12 9v4.5l2.8 1.8M10 2.5h4"/></symbol>
    <symbol id="pfeilR" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></symbol>
    <g id="grossschild"><path d="M2 79 44 4Q46 1 50 1H326q8 0 8 8V149q0 8-8 8H50q-4 0-6-3Z" fill="#e9ece9"/>
      <path d="M7 79 47 8.4Q49 5 52.6 5H323q7 0 7 7V146q0 7-7 7H52.6Q49 153 47 149.6Z" fill="url(#blech)"/>
      <path d="M8.2 79 47 9.8Q49 6.2 52.6 6.2H323q5.8 0 5.8 5.8" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1"/>
      <circle cx="316" cy="19" r="2.4" fill="#cfd5d0"/><circle cx="316" cy="139" r="2.4" fill="#cfd5d0"/></g>
    <g id="kleinschild"><path d="M1 21 17 2Q18 .6 20 .6H244q5 0 5 5v30.8q0 5-5 5H20Q18 41.4 17 40Z" fill="#e9ece9"/>
      <path d="M4.4 21 19 3.8Q20 2.8 21.6 2.8H243q3.2 0 3.2 3.2V36q0 3.2-3.2 3.2H21.6Q20 39.2 19 38.2Z" fill="url(#blech)"/></g>
    <g id="kleinschild-an"><path d="M1 21 17 2Q18 .6 20 .6H244q5 0 5 5v30.8q0 5-5 5H20Q18 41.4 17 40Z" fill="#ffd014"/>
      <path d="M4.4 21 19 3.8Q20 2.8 21.6 2.8H243q3.2 0 3.2 3.2V36q0 3.2-3.2 3.2H21.6Q20 39.2 19 38.2Z" fill="url(#blech)"/></g>
    <g id="flagge"><path d="M2 1v17" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M3 2h17v10H3z" fill="#fff"/>
      <path d="M3 2h4.25v3.33H3zM11.5 2h4.25v3.33H11.5zM7.25 5.33h4.25v3.33H7.25zM15.75 5.33H20v3.33h-4.25zM3 8.66h4.25V12H3zM11.5 8.66h4.25V12H11.5z" class="flaggeFeld"/></g>
  </defs></svg>`;
  document.body.insertAdjacentHTML('afterbegin', DEFS);

  // ---------- Fahrlehrer (Code-Platzhalter bis Phase 3) ----------
  // Ruhige, flache Figur: Kopf, kurzes Haar, Polohemd in Kundenfarbe. Mimik über Augenbrauen, Augen und Mund.
  function fahrlehrerSvg(stimmung) {
    // Bild-Anschluss fahrlehrer/<stimmung>.webp (Phase 3); sonst Code-Figur
    const bild = BI.url && BI.url('fahrlehrer/' + stimmung);
    if (bild) return `<img src="${bild}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`;
    const f = (K.farben && K.farben.haupt) || '#1E7A3E';
    const M = {
      neutral: { brau: 'M37 41q6-3 12-1M55 40q6-2 12 1', auge: '<ellipse cx="43" cy="48" rx="2.6" ry="2.9"/><ellipse cx="61" cy="48" rx="2.6" ry="2.9"/>', mund: '<path d="M45 64q7 2 14 0" fill="none" stroke="#5a3424" stroke-width="2.4" stroke-linecap="round"/>' },
      freut: { brau: 'M37 39q6-4 12-2M55 37q6-2 12 2', auge: '<path d="M40 49q3-4 6 0M58 49q3-4 6 0" fill="none" stroke="#2a1d16" stroke-width="2.4" stroke-linecap="round"/>', mund: '<path d="M43 61q9 9 18 0z" fill="#fff" stroke="#5a3424" stroke-width="2" stroke-linejoin="round"/>' },
      erschrickt: { brau: 'M36 37q6-5 13-3M55 34q7-2 13 3', auge: '<circle cx="43" cy="48" r="3.6" fill="#fff" stroke="#2a1d16" stroke-width="1.4"/><circle cx="43" cy="48" r="1.8"/><circle cx="61" cy="48" r="3.6" fill="#fff" stroke="#2a1d16" stroke-width="1.4"/><circle cx="61" cy="48" r="1.8"/>', mund: '<ellipse cx="52" cy="65" rx="4.5" ry="5.5" fill="#5a3424"/>' },
    }[{ nickt: 'freut', skeptisch: 'neutral', seufzt: 'neutral' }[stimmung] || stimmung] || {};
    return `<svg viewBox="0 0 104 104" aria-hidden="true"><defs><clipPath id="flRund${stimmung}"><circle cx="52" cy="52" r="50"/></clipPath></defs>
      <g clip-path="url(#flRund${stimmung})"><rect width="104" height="104" fill="#dfe6ea"/><rect y="70" width="104" height="34" fill="#cdd6db"/>
      <path d="M14 104q4-26 38-28 34 2 38 28z" fill="${f}"/><path d="M42 77l10 10 10-10" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M44 70h16v10q-8 5-16 0z" fill="#d8a582"/>
      <ellipse cx="52" cy="50" rx="19" ry="23" fill="#e6b694"/>
      <ellipse cx="33.5" cy="52" rx="3.2" ry="5" fill="#dca783"/><ellipse cx="70.5" cy="52" rx="3.2" ry="5" fill="#dca783"/>
      <path d="M33 47q-2-21 19-23 21 0 20 22-3-11-9-13-9 4-21 1-7 3-9 13z" fill="#4a3528"/>
      <path d="M52 51q-2 6 0 8 2 1 3 0" fill="none" stroke="#c48d6c" stroke-width="1.6" stroke-linecap="round"/>
      <path d="${M.brau}" fill="none" stroke="#3a2a20" stroke-width="2.6" stroke-linecap="round"/>
      <g fill="#2a1d16">${M.auge}</g>${M.mund}</g></svg>`;
  }

  // ---------- Startbild (Wegweiser) ----------
  const start = el('section', 'bl-schirm bl-start');
  start.hidden = true;
  const ende = el('section', 'bl-schirm bl-ende');
  ende.hidden = true;
  const logoStart = el('div', 'bl-logo'), logoEnde = el('div', 'bl-logo');
  [logoStart, logoEnde].forEach(l => { l.setAttribute('role', 'img'); l.setAttribute('aria-label', K.firma || ''); BB.logoEinbetten(l, K.logoAufHell || K.logo); });
  const hg = () => `<div class="bl-hg" style="background-image:url(${BI.land || 'bilder/platzhalter/land.webp'})" aria-hidden="true"></div>`;
  document.body.append(start, ende);

  let startOpts = null;
  function startbild(o) {
    startOpts = o;
    start.innerHTML = hg() + `<div class="bl-spalten"><div class="bl-sp1">
        <div class="bl-lehrer"><div class="bl-figur">${fahrlehrerSvg('freut')}</div><div class="bl-blase">${esc(o.frage)}</div></div>
        <div class="bl-gross"><svg class="platte" viewBox="0 0 335 158" preserveAspectRatio="none" aria-hidden="true"><use href="#grossschild"/></svg>
          <h1 class="bl-band">${esc(D.TEXTE.titel)}</h1>
          <p class="bl-anl"></p></div>
      </div><div class="bl-sp2">
        <div class="bl-pfosten" aria-hidden="true"></div>
        <div class="bl-stufen" role="radiogroup" aria-label="Stufe"></div>
        <div class="bl-tafel bl-bestt"><span>Dein Bestwert</span><b></b></div>
        <div class="bl-knoepfe">${o.einfuehrung ? `<button class="bl-einfknopf" type="button" data-einf><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M8 6.8l4.6 3.2L8 13.2z"/></svg>${esc(o.einfuehrung.text)}</button>` : ''}<button class="bl-knopf" type="button" data-los>Los geht's</button><a class="bl-knopf zweit" href="${esc(heim)}">Zum Menü</a></div>
      </div></div>`;
    start.prepend(logoStart);
    const stufen = start.querySelector('.bl-stufen');
    o.stufen.forEach(s => {
      const b = el('button', 'bl-stufe' + (s.frei ? '' : ' aus'));
      b.type = 'button'; b.dataset.id = s.id; b.setAttribute('role', 'radio');
      if (!s.frei) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
      // gesperrte Stufe: ausgegraut mit Hinweis „Frei ab 550 Punkten in der …“ (MZ, 29.10.2026; kein „demnächst“)
      if (!s.frei && s.freiAb) b.setAttribute('aria-label', s.name + ' – ' + s.freiAb);
      b.innerHTML = `<svg class="platte" viewBox="0 0 250 42" preserveAspectRatio="none" aria-hidden="true"><use href="#kleinschild"/></svg><span class="inhalt"><span class="name">${esc(s.name)}${!s.frei && s.freiAb ? `<small>${esc(s.freiAb)}</small>` : ''}</span><span class="haken" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2 6.5l2.6 2.6L10 3"/></svg></span></span><i class="schelle" aria-hidden="true"></i>`;
      b.addEventListener('click', () => { if (!s.frei) return; o.stufe = s.id; o.wahl(s.id); startZeigen(); });
      stufen.append(b);
    });
    start.querySelector('[data-los]').addEventListener('click', () => { start.hidden = true; o.los(); });
    const einf = start.querySelector('[data-einf]');
    if (einf) einf.addEventListener('click', () => { start.hidden = true; o.einfuehrung.los(); });
    startZeigen();
    start.hidden = false;
    // Spielertest 29.10.2026 (quer kurz halb leer): Inhalt erst sichtbar machen, wenn Schrift und Logo da sind (höchstens 600 ms warten)
    start.classList.add('baut');
    const fertig = () => start.classList.remove('baut');
    Promise.race([Promise.all([document.fonts ? document.fonts.ready : null, new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))]), new Promise(r => setTimeout(r, 600))]).then(fertig, fertig);
  }
  function startZeigen() {
    const o = startOpts;
    start.querySelectorAll('.bl-stufe').forEach(b => {
      const an = b.dataset.id === o.stufe;
      b.classList.toggle('an', an); b.setAttribute('aria-checked', an ? 'true' : 'false');
      b.querySelector('use').setAttribute('href', an ? '#kleinschild-an' : '#kleinschild');
    });
    start.querySelector('.bl-anl').textContent = o.anleitung[o.stufe] || '';
    const s = o.stufen.find(x => x.id === o.stufe), best = s && s.best || 0;
    start.querySelector('.bl-bestt b').innerHTML = `${zahl(best)}<small>/1.000 Punkte</small>`;
  }

  // ---------- Endbild (Ziel-Schild + Prüfungsprotokoll) ----------
  let nochmalFn = null;
  function endbild(d) {
    const zahlText = d.abbruch ? '0' : zahl(d.punkte);
    const rt = d.rt != null ? 'Ø ' + d.rt.toFixed(2).replace('.', ',') + 's' : 'Ø –';
    const schalter = (K.schalter || []).map(s => s.link
      ? `<a class="bl-schalter" href="${esc(s.link)}" target="_blank" rel="noopener"><span>${esc(s.text)}</span><svg><use href="#pfeilR"/></svg></a>`
      : `<span class="bl-schalter"><span>${esc(s.text)}</span><svg><use href="#pfeilR"/></svg></span>`).join('');
    const fehlerListe = d.fehler.length ? d.fehler.map(f => `<li>${esc(f)}</li>`).join('') : `<li class="keine">${esc(textAus('FEHLER_KEINE') || 'Keine Fehler – sauber gefahren.')}</li>`;
    ende.innerHTML = hg() + `<div class="bl-spalten"><div class="bl-sp1">
        <div class="bl-zielwrap"><div class="bl-pfosten kurz l" aria-hidden="true"></div><div class="bl-pfosten kurz r" aria-hidden="true"></div>
        <div class="bl-flende" aria-hidden="true" data-szene="${!d.abbruch && d.punkte >= 700 ? 'daumen' : 'klemmbrett'}"></div>
        <div class="bl-ziel${d.abbruch ? ' abbruch' : ''}">
          <h1 class="bl-band${d.abbruch ? ' still' : ''}">${esc(d.bewertung)}</h1>
          <i class="niete" style="left:9px;top:9px"></i><i class="niete" style="right:9px;top:9px"></i><i class="niete" style="left:9px;bottom:9px"></i><i class="niete" style="right:9px;bottom:9px"></i>
          <div class="ort"><svg viewBox="0 0 22 18" aria-hidden="true"><use href="#flagge"/></svg>Ziel – ${esc(K.ort || 'Musterstadt')}</div>
          <div class="zahl">${zahlText}</div>
          <div class="fuss"><div class="von">${d.abbruch ? esc(d.text) : 'von 1.000 Punkten'}</div>
          ${d.abbruch ? '' : `<span class="bl-plakette"><svg><use href="#uhr"/></svg>${esc(rt)} <span>Reaktion</span></span>`}</div>
        </div></div>
        <div class="bl-tafel bl-zeilen">
          ${d.abbruch || !d.text ? '' : `<p class="bl-unterzeile">${esc(d.text)}</p>`}
          ${!d.abbruch && d.rechnung ? `<p class="bl-rechnung">${esc(d.rechnung.texte[0])} <b>${zahl(d.rechnung.verdient)}</b> <i>−</i> ${esc(d.rechnung.texte[1])} <b>${zahl(d.rechnung.abzug)}</b> <i>=</i> ${esc(d.rechnung.texte[2])} <b>${zahl(d.rechnung.ergebnis)}</b></p>` : ''}
          ${!d.abbruch && d.rechnung && d.rechnung.mindest ? `<p class="bl-mindest">${esc(d.rechnung.mindest)}</p>` : ''}
          <div class="bl-bestreihe${d.karten ? '' : ' allein'}"><p class="bl-bestzeile${d.neu ? ' neu' : ''}">${d.neu ? (d.alt == null ? 'Dein erster Bestwert' : 'Neuer Bestwert') : 'Dein Bestwert: <b>' + zahl(d.alt || 0) + '</b>/1.000'}</p>
          ${d.karten ? `<a class="bl-mappezeile${d.karten.neu ? ' neu' : ''}" href="${esc(heim)}#mappe"><svg viewBox="0 0 20 16" aria-hidden="true"><rect x="1" y="2" width="12" height="12" rx="1.5"/><rect x="6" y="1" width="12" height="12" rx="1.5"/></svg><span>${d.karten.neu ? '+' + d.karten.neu + (d.karten.neu === 1 ? ' Karte' : ' Karten') + ' – ' : 'Führerscheinmappe '}<b>${d.karten.gesamt}/${d.karten.max}</b></span><svg class="p"><use href="#pfeilR"/></svg></a>` : ''}</div>
        </div>
        ${d.hinweis ? `<p class="bl-freigeschaltet">${esc(d.hinweis)}</p>` : ''}
      </div><div class="bl-sp2">
        <div class="bl-tafel bl-prot">
          <h2 class="k">${esc(textAus('PROTOKOLL_TITEL') || 'Prüfungsprotokoll')} – ${esc(d.stufe)}</h2>
          <svg class="bl-netz" viewBox="0 0 320 190" role="img" aria-label="Prüfungsprotokoll: ${esc(d.bereiche.map(b => b.name + ' ' + (b.wert == null ? 'nicht geprüft' : b.wert + ' Prozent')).join(', '))}"></svg>
          <div class="bl-fehler"><h3>${esc(textAus('FEHLER_TITEL') || 'Fehler')} <b>Doppelbremse: ${d.doppel}×</b></h3><ul>${fehlerListe}</ul>${tippHtml(d.tipp)}</div>
        </div>
        <div class="bl-unten"><div class="bl-reihe">${schalter}</div>
          <div class="bl-reihe"><button class="bl-knopf" type="button" data-nochmal>Nochmal</button><a class="bl-knopf zweit" href="${esc(heim)}">Zum Menü</a></div></div>
      </div></div>`;
    ende.prepend(logoEnde);
    endeFigur();
    ende.querySelector('[data-nochmal]').addEventListener('click', () => { if (d.beispiel) { ende.hidden = true; startbild(startOpts || {}); return; } nochmalFn && nochmalFn(); });
    ende.hidden = false;
    netz(ende.querySelector('.bl-netz'), d.bereiche);   // erst sichtbar: misst Breite und Beschriftungen
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(netzNeu);
    ende.scrollTop = 0;
    bandEinpassen();
    figurPlatz();   // Platz der Figur sofort freihalten (nicht erst, wenn ihr Bild geladen ist)
  }
  function endeFigur() {
    const f = ende.querySelector('.bl-flende');
    if (!f) return;
    const u = BI.url && (BI.url('fahrlehrer/ende-' + f.dataset.szene) || BI.url('fahrlehrer/szene-' + f.dataset.szene));   // ende-*: ohne Autositz
    // feste Maße aus MASSE (Spielertest 29.10.2026: Abbruch-Text war kurz verdeckt, solange das Bild nachlud)
    const m = BI.mass && (BI.mass('fahrlehrer/ende-' + f.dataset.szene) || {}).px;
    f.innerHTML = u ? `<img src="${u}" alt=""${m ? ` width="${m[0]}" height="${m[1]}"` : ''}>` : '';
    f.classList.toggle('da', !!u);
    const img = f.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', figurPlatz, { once: true });
    figurPlatz();
  }
  // Phase-5-Korrektur: der Fahrlehrer am Ziel-Schild darf nie Text verdecken (lange Abbruch-Texte, 320–430 px, quer). Überschneidet
  // eine Textzeile unten im Schild die Figur, bekommt der Fußbereich rechts so viel Abstand, dass der Text links neben der Figur umbricht.
  function figurPlatz() {
    const f = ende.querySelector('.bl-flende'), fuss = ende.querySelector('.bl-ziel .fuss');
    if (!f || !fuss || ende.hidden) return;
    fuss.style.paddingRight = '';
    // gemessen wird der Platz der Figur (feste Breite und Seitenverhältnis in blinker.css), auch solange das Bild noch lädt oder fehlt
    const img = f;
    // Kasten der Figur ohne den weich ausgeblendeten unteren Teil (Maske ab 78 %) und ohne leeren Rand oben
    // laufende Einblend-Animationen (Schild fällt, Figur gleitet) herausrechnen – gemessen wird die Endlage
    const ty = el => { const t = getComputedStyle(el).transform; return t && t !== 'none' ? new DOMMatrix(t).m42 : 0; };
    const dz = -ty(fuss.closest('.bl-ziel')), df = -ty(f);
    const fr = img.getBoundingClientRect(), fo = fr.top + df + fr.height * 0.04, fu = fr.top + df + fr.height * 0.85, fl = fr.left + fr.width * 0.04;
    const zeilen = el => { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()].map(q => ({ width: q.width, right: q.right, top: q.top + dz, bottom: q.bottom + dz })); };
    const trifft = () => [...fuss.children].some(k => zeilen(k).some(q => q.width > 0 && q.right > fl - 6 && q.bottom > fo && q.top < fu));
    if (!trifft()) return;
    const fu2 = fuss.getBoundingClientRect();
    fuss.style.paddingRight = Math.max(0, Math.ceil(fu2.right - fl + 8)) + 'px';
  }
  // Bilder kommen nach und nach (bilder.js): Fahrlehrer im Start-/Endbild und im Spiel nachziehen, sobald sein Bild da ist
  addEventListener('bl-bild', e => {
    const k = e.detail || '';
    if (!/^fahrlehrer\//.test(k)) return;
    if (k === 'fahrlehrer/freut') start.querySelectorAll('.bl-figur').forEach(f => { f.innerHTML = fahrlehrerSvg('freut'); });
    if (k === 'fahrlehrer/' + stimmungJetzt) fahrt.querySelector('.bl-figur').innerHTML = fahrlehrerSvg(stimmungJetzt);
    if (/(szene|ende)-/.test(k) && !ende.hidden) endeFigur();
  });
  // Lange Bewertungen („Fahrlehrer braucht eine Pause“) passen auf schmalen Handys sonst nicht aufs Band: Schrift verkleinern
  function bandEinpassen() {
    ende.querySelectorAll('.bl-ziel .bl-band').forEach(b => {
      b.style.fontSize = ''; b.style.paddingLeft = b.style.paddingRight = '';
      const platz = b.parentNode.clientWidth - 12;
      let fs = parseFloat(getComputedStyle(b).fontSize);
      while (b.offsetWidth > platz && fs > 14) { fs -= 1; b.style.fontSize = fs + 'px'; if (fs < 22) b.style.paddingLeft = b.style.paddingRight = '16px'; }
    });
  }
  addEventListener('resize', () => { if (!ende.hidden) { bandEinpassen(); figurPlatz(); } });
  const textAus = k => window.BL_TEXTE && window.BL_TEXTE.rahmen && window.BL_TEXTE.rahmen[k] ? window.BL_TEXTE.rahmen[k].Text : '';

  // Tipp zum teuersten Fehler (Text beginnt mit „Tipp: “ – das Wort wird nur hervorgehoben, nicht doppelt gesetzt)
  function tippHtml(tipp) {
    if (!tipp) return '';
    const m = /^(Tipp:)\s*(.*)$/.exec(tipp);
    return `<p class="bl-tipp"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5a4.6 4.6 0 0 0-2.7 8.3c.5.4.8.9.8 1.5V12h3.8v-.7c0-.6.3-1.1.8-1.5A4.6 4.6 0 0 0 8 1.5ZM6.1 13.3h3.8v.5c0 .5-.4.9-.9.9H7c-.5 0-.9-.4-.9-.9Z"/></svg><span>${m ? '<b>' + esc(m[1]) + '</b> ' + esc(m[2]) : esc(tipp)}</span></p>`;
  }
  // Netz-Grafik: fünf Fahrkompetenzbereiche, schwächster Bereich markiert (wie Skizze Stil 3).
  // Letzte Runde 29.10.2026 (GPT Player: Schrift zu klein): viewBox = tatsächliche Breite in px, Schrift 13px (schmal 12,5px);
  // Beschriftungen werden gemessen und der Radius so gewählt, dass alles in die Tafel passt.
  function netz(s, bereiche) {
    if (!s) return;
    s._bereiche = bereiche;
    const NS = 'http://www.w3.org/2000/svg';
    // Zeilen je Bereich; '%' = Prozentwert (fett, farbig) – unten an die letzte Namenszeile gehängt, an den Seiten eigene Zeile
    const NAMEN = [['Verkehrsbeobachtung %'], ['Fahrzeug-', 'positionierung', '%'], ['Geschwindigkeits-', 'anpassung %'], ['Kommunikation', '%'], ['Fahrzeug-', 'bedienung', '%']];
    const werte = bereiche.map(b => b.wert);
    const gemessen = werte.filter(w => w != null);
    const schwach = gemessen.length > 1 ? werte.indexOf(Math.min(...gemessen)) : -1;
    while (s.firstChild) s.removeChild(s.firstChild);
    const mach = (n, a, txt, eltern) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; (eltern || s).appendChild(e); return e; };
    const W = Math.round(s.clientWidth || s.getBoundingClientRect().width) || 300;
    const fs = W < 300 ? 12 : 13, lh = Math.round(fs * 1.18 * 10) / 10;
    const pz = v => v == null ? '–' : v + ' %';
    // Zeile als <text> mit optionalem fettem Prozentwert
    const zeile = (x, y, anker, roh, i) => {
      const farbe = i === schwach ? '#c8410c' : (getComputedStyle(document.documentElement).getPropertyValue('--gruen').trim() || '#1E7A3E');
      const t = mach('text', { x, y, 'text-anchor': anker, 'font-size': fs, fill: '#2f3631' });
      const name = roh.replace(/ ?%$/, '');
      if (name) mach('tspan', {}, name, t);
      if (/%$/.test(roh)) mach('tspan', { 'font-weight': 600, fill: farbe, dx: name ? fs * 0.3 : 0 }, pz(werte[i]), t);
      return t;
    };
    // Breiten messen (unsichtbar, gleiche Schrift)
    const breite = (i) => Math.max(...NAMEN[i].map(z => { const t = zeile(0, -999, 'start', z, i); const w = t.getComputedTextLength(); s.removeChild(t); return w; }));
    const bw = [0, 1, 2, 3, 4].map(breite);
    const seite = Math.max(bw[1], bw[4]), unten = Math.max(bw[2], bw[3]);
    const sin72 = Math.sin(72 * Math.PI / 180), sin36 = Math.sin(36 * Math.PI / 180);
    let r = Math.min(innerHeight < 640 ? 36 : innerHeight < 780 ? 42 : innerHeight < 880 ? 52 : 60,   // 29.10.2026: kleiner auf niedrigen Hochformaten (ohne Scrollen)
       (W / 2 - 10 - seite) / sin72, (W / 2 - 12 - unten) / sin36);
    r = Math.max(36, Math.floor(r));
    const cx = W / 2, cy = Math.round(fs + 8 + r);
    const w = i => (-90 + 72 * i) * Math.PI / 180;
    const P = (i, f) => [cx + r * f * Math.cos(w(i)), cy + r * f * Math.sin(w(i))];
    const poly = f => [0, 1, 2, 3, 4].map(i => P(i, typeof f === 'function' ? f(i) : f).map(v => v.toFixed(1)).join(',')).join(' ');
    const gitter = '#d6dcd7', linie = getComputedStyle(document.documentElement).getPropertyValue('--gruen').trim() || '#1E7A3E', rot = '#c8410c';
    mach('polygon', { points: poly(1), fill: '#f6f8f6', stroke: gitter, 'stroke-width': 1.2 });
    for (const f of [.25, .5, .75]) mach('polygon', { points: poly(f), fill: 'none', stroke: gitter, 'stroke-width': .8 });
    for (let i = 0; i < 5; i++) { const [x, y] = P(i, 1); mach('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: gitter, 'stroke-width': .8 }); }
    const f = i => werte[i] == null ? 0 : werte[i] / 100;
    const flaeche = mach('polygon', { points: poly(f), fill: linie, 'fill-opacity': .2, stroke: linie, 'stroke-width': 2, 'stroke-linejoin': 'round', class: 'bl-netzflaeche' });
    flaeche.style.transformOrigin = `${cx}px ${cy}px`;
    for (let i = 0; i < 5; i++) {
      if (werte[i] == null) continue;
      const [x, y] = P(i, f(i));
      mach('circle', { cx: x, cy: y, r: i === schwach ? 4 : 3, fill: i === schwach ? rot : linie, stroke: '#fff', 'stroke-width': 1.2 });
    }
    let hoehe = cy + r;
    for (let i = 0; i < 5; i++) {
      const [vx, vy] = P(i, 1), c = Math.cos(w(i)), sn = Math.sin(w(i));
      if (i === 0) { zeile(vx, vy - 8, 'middle', NAMEN[0][0], 0); continue; }
      const n = NAMEN[i].length, anker = c > 0 ? 'start' : 'end';
      const y0 = sn < .5 ? vy - (n * lh) / 2 + fs * .8 : vy + fs * 1.05;
      const x0 = vx + (c > 0 ? 8 : -8) + (sn >= .5 ? (c > 0 ? 3 : -3) : 0);
      NAMEN[i].forEach((z, k) => zeile(x0, y0 + k * lh, anker, z, i));
      hoehe = Math.max(hoehe, y0 + (n - 1) * lh + fs * 0.3);
    }
    s.setAttribute('viewBox', `0 0 ${W} ${Math.ceil(hoehe + 2)}`);
  }
  // Schrift kommt evtl. erst nach dem Aufbau bzw. Breite ändert sich (Drehen) → neu messen
  function netzNeu() { const s = ende && !ende.hidden && ende.querySelector('.bl-netz'); if (s && s._bereiche) netz(s, s._bereiche); }
  addEventListener('resize', () => { clearTimeout(netzNeu.t); netzNeu.t = setTimeout(netzNeu, 120); });

  // ---------- im Spiel: Fahrlehrer, Hinweis-Leiste, Popups, Einblendungen ----------
  const fahrt = el('div', 'bl-fahrt'); fahrt.hidden = true;
  fahrt.innerHTML = `<div class="bl-fl"><div class="bl-figur"></div></div><div class="bl-sb" role="status" aria-live="polite"></div><div class="bl-hinweis" hidden></div>`;
  const popups = el('div', 'bl-popups');
  const fpsAnz = el('div', 'bl-fps'); fpsAnz.hidden = true;
  document.body.append(fahrt, popups, fpsAnz);
  let stimmungJetzt = '', blasenUhr = 0, warnBis = 0;
  // Kleine Runde 29.10.2026: ton = 'halb' (z. B. „Gesehen – aber etwas spät“), 'schlecht' (verpasst, zu schnell, Fehlalarm), 'warn'
  // (Warnung vor der dritten Doppelbremse) – gleiche weiße Blase, nur ein farbiger Streifen links; Text immer dunkel auf Weiß
  function fahrlehrer(stimmung, text, dauer, ton) {
    // Warnung vor der dritten Doppelbremse bleibt stehen: nur eine neue Doppelbremse (erschrickt) oder das Ende (seufzt) löst sie ab
    if (ton === 'warn') warnBis = performance.now() + (dauer || 3) * 1000 - 60;
    else if (performance.now() < warnBis && stimmung !== 'erschrickt' && stimmung !== 'seufzt') return;
    else warnBis = 0;
    const fig = fahrt.querySelector('.bl-figur');
    if (stimmung !== stimmungJetzt) {
      stimmungJetzt = stimmung; fig.innerHTML = fahrlehrerSvg(stimmung);
      fig.classList.remove('wackeln', 'huepfen', 'nicken'); void fig.offsetWidth;
      if (!ruhig) fig.classList.add(stimmung === 'erschrickt' ? 'wackeln' : stimmung === 'freut' ? 'huepfen' : stimmung === 'nickt' ? 'nicken' : 'x');
    }
    const sb = fahrt.querySelector('.bl-sb');
    clearTimeout(blasenUhr);
    if (!text) { sb.classList.remove('an'); return; }
    sb.textContent = text; sb.className = 'bl-sb an' + (ton ? ' ' + ton : '');
    blasenUhr = setTimeout(() => { sb.classList.remove('an'); if (stimmungJetzt !== 'neutral') fahrlehrer('neutral', '', 0); }, (dauer || 2.4) * 1000);
  }
  function hinweis(schritte) {
    const h = fahrt.querySelector('.bl-hinweis');
    if (!schritte) { h.hidden = true; return; }
    const html = schritte.map(s => `<span class="${s.fertig ? 'fertig' : ''}${s.jetzt ? ' jetzt' : ''}">${esc(s.text)}</span>`).join('<i>–</i>');
    if (h.innerHTML !== html) h.innerHTML = html;
    h.hidden = false;
  }
  function popup(text, x, y, art, wort, extra) {
    const p = el('div', 'bl-popup ' + (art || 'gut') + (extra ? ' ' + extra : ''));
    p.innerHTML = `${text ? `<b>${esc(text)}</b>` : ''}${wort ? `<span>${esc(wort)}</span>` : ''}`;
    p.style.left = Math.max(60, Math.min(innerWidth - 60, x)) + 'px'; p.style.top = Math.max(70, y) + 'px';
    popups.append(p);
    setTimeout(() => p.remove(), 1500);
  }
  // Einblendung mit Tippen zum Überspringen: Stufen-Titel (Level-Titel 2–3s) und Gebiet je Situation
  const einbl = el('div', 'bl-einbl'); einbl.hidden = true; document.body.append(einbl);
  let einblFertig = null;
  einbl.addEventListener('pointerdown', () => { if (einblFertig) einblFertig(); });
  function titel(t, unter, dauer, fertig) {
    einbl.className = 'bl-einbl titel';
    einbl.innerHTML = `<div class="bl-titelschild"><svg class="platte" viewBox="0 0 300 62" preserveAspectRatio="none" aria-hidden="true"><path d="M6 31 30 3.5Q32 1 35.5 1H292q7 0 7 7v46q0 7-7 7H35.5Q32 61 30 58.5Z" fill="#e9ece9"/><path d="M10.5 31 32.6 6.2Q34 4.6 36.4 4.6H290.4q4.9 0 4.9 4.9v43q0 4.9-4.9 4.9H36.4Q34 57.4 32.6 55.8Z" fill="url(#blech)"/></svg>
      <span class="inhalt"><b>${esc(t)}</b></span></div><p>${esc(unter)}</p>`;
    zeigeEinbl(dauer, null, fertig);
  }
  function karte(t, unter, dauer, beiDunkel, fertig) {
    einbl.className = 'bl-einbl karte';
    einbl.innerHTML = `<div class="bl-gebiet"><b>${esc(t)}</b><span>${esc(unter || '')}</span></div>`;
    zeigeEinbl(dauer, beiDunkel, fertig);
  }
  function zeigeEinbl(dauer, beiDunkel, fertig) {
    einbl.hidden = false; einbl.classList.remove('weg'); void einbl.offsetWidth; einbl.classList.add('rein');
    let fertigGemacht = false, dunkelGemacht = false;
    const dunkel = () => { if (!dunkelGemacht) { dunkelGemacht = true; beiDunkel && beiDunkel(); } };
    const schluss = () => {
      if (fertigGemacht) return; fertigGemacht = true; einblFertig = null; dunkel();
      einbl.classList.remove('rein'); einbl.classList.add('weg');
      setTimeout(() => { if (einbl.classList.contains('weg')) einbl.hidden = true; }, 350);
      fertig && fertig();
    };
    setTimeout(dunkel, 330);
    setTimeout(schluss, dauer * 1000);
    einblFertig = schluss;
  }

  // ---------- Vorfahrt-Kreuzung (Draufsicht, Reihenfolge antippen) ----------
  // Phase 2b: alle 24 Kreuzungen – Form (Kreuzung, Einmündung, Kreisel, Feldweg), Schilder/Ampeln/Polizei je Zufahrt aus
  // daten.js (KREUZ_LAGE), Fußgänger (zählen mit), Radweg. Maßstab (300er Raster, ca. 3,7 Einheiten je Meter): Pkw 4,3 m,
  // Lkw/Bus auf 9 m gekürzt (sonst unlesbar), Rad 1,9 m, Fußgänger 0,6 m.
  const kr = el('section', 'bl-kreuzung'); kr.hidden = true; document.body.append(kr);
  const RICHT = { n: [0, -1], o: [1, 0], s: [0, 1], w: [-1, 0] };
  const DREH = { n: 'o', o: 's', s: 'w', w: 'n' };   // im Uhrzeigersinn
  const GEGEN = { n: 's', s: 'n', o: 'w', w: 'o' };
  const WINKEL = { o: 0, s: 90, w: 180, n: -90 };    // Kreisel: Lage der Zufahrt auf dem Ring (Grad, y nach unten)
  function schildSvg(z) {
    if (z === '205') return '<path d="M-8 -6.5H8L0 7.5Z" fill="#fff" stroke="#c8241b" stroke-width="2.6" stroke-linejoin="round"/>';
    if (z === '206') return '<path d="M-3.3 -8H3.3L8 -3.3V3.3L3.3 8H-3.3L-8 3.3V-3.3Z" fill="#c8241b" stroke="#fff" stroke-width="1.2"/><text y="1.9" text-anchor="middle" font-size="4.6" font-weight="700" fill="#fff">STOP</text>';
    if (z === '306') return '<path d="M0 -8.5 8.5 0 0 8.5 -8.5 0Z" fill="#fff" stroke="#999" stroke-width=".5"/><path d="M0 -5.6 5.6 0 0 5.6 -5.6 0Z" fill="#f2c500" stroke="#333" stroke-width=".6"/>';
    if (z === '301') return '<path d="M-8 6.5H8L0 -7.5Z" fill="#fff" stroke="#c8241b" stroke-width="2.6" stroke-linejoin="round"/><path d="M0 -2.5V4" stroke="#111" stroke-width="2"/>';
    if (z === '215') return '<circle r="8" fill="#1d4f9a" stroke="#fff" stroke-width="1.2"/><path d="M-4 -2a4.5 4.5 0 0 1 7 -1M4.2 2a4.5 4.5 0 0 1 -6.5 2.6" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M3.6 -5.2 4.6 -1.6 1 -2.2ZM-3.4 6.6 -2.6 3 -6.2 3.6Z" fill="#fff"/>';
    if (z === '325.2') return '<rect x="-9.5" y="-6.5" width="19" height="13" rx="1.2" fill="#1d4f9a" stroke="#fff" stroke-width="1"/><path d="M-5 3V-1L-2 -3.5 1 -1V3M3 3.2a1.4 1.4 0 1 0 .1 0" fill="none" stroke="#fff" stroke-width="1"/><path d="M-9 6 9 -6" stroke="#c8241b" stroke-width="1.8"/>';
    return '';
  }
  function kreuzung(def, fertig) {
    const T = def.texte || {};
    const LG = (D.KREUZ_LAGE && D.KREUZ_LAGE[def.id]) || {};
    const form = LG.form || (def.Form === 'Einmündung' ? 'einmuendung' : def.Form === 'Kreisverkehr' ? 'kreisel' : 'kreuzung');
    const kreisel = form === 'kreisel', arme = ['n', 'o', 's', 'w'].filter(d => d !== LG.ohne);
    const fz = def.fahrzeuge.filter(f => !f.fehler);
    const C = 150, SP = 15, RR = 44;   // Mitte, halbe Spurbreite, Kreisel: Radius der Fahrspur
    const fix = v => (+v).toFixed(1);
    // Lage vor der Kreuzung: rechte Fahrbahnhälfte aus Sicht des Fahrers
    const lage = von => { const [dx, dy] = RICHT[von]; const h = GEGEN[von], [hx, hy] = RICHT[h], [rx, ry] = RICHT[DREH[h]]; const d = kreisel ? 84 : 62; return { x: C + dx * d + rx * SP, y: C + dy * d + ry * SP, hx, hy }; };
    const raus = f => { const w = /links/.test(f.wohin) ? 'l' : /rechts/.test(f.wohin) ? 'r' : 'g', h = GEGEN[f.von]; return { w, arm: w === 'g' ? h : w === 'r' ? DREH[h] : GEGEN[DREH[h]] }; };
    const randPkt = (arm, d) => { const [ox, oy] = RICHT[arm], [rx, ry] = RICHT[DREH[arm]]; return [C + ox * d + rx * SP, C + oy * d + ry * SP]; };
    const ring = w => [C + Math.cos(w * Math.PI / 180) * RR, C + Math.sin(w * Math.PI / 180) * RR];
    // Weg eines Teilnehmers als Punktliste (für die Fahrt nach dem Lösen)
    function weg(f) {
      if (f.fuss) return { w: [[C - 50, C + 38], [C - 50, C - 38]], o: [[C + 50, C - 38], [C + 50, C + 38]], s: [[C - 38, C + 52], [C + 38, C + 52]], n: [[C + 38, C - 52], [C - 38, C - 52]] }[f.von];
      if (f.radweg) return [[C + 34.5, C + 74], [C + 34.5, C], [C + 34.5, -30]];
      const a = lage(f.von), r = raus(f), pts = [];
      if (kreisel) {
        const w0 = f.kreis ? (LG.kreis && LG.kreis[f.id]) || 135 : WINKEL[f.von];
        if (!f.kreis) pts.push([a.x, a.y]);
        let w1 = WINKEL[r.arm]; while (w1 >= w0) w1 -= 360;   // gegen den Uhrzeigersinn (im Bild) bis zur Ausfahrt
        for (let w = w0; w > w1; w -= 8) pts.push(ring(w));
        pts.push(ring(w1), randPkt(r.arm, 90), randPkt(r.arm, 190));
        return pts;
      }
      const z = randPkt(r.arm, 185);
      const cx = r.w === 'g' ? (a.x + z[0]) / 2 : C + (a.x - C + z[0] - C) * 0.15, cy = r.w === 'g' ? (a.y + z[1]) / 2 : C + (a.y - C + z[1] - C) * 0.15;
      const bez = (p, a0, c, b) => (1 - p) * (1 - p) * a0 + 2 * (1 - p) * p * c + p * p * b;
      for (let i = 0; i <= 30; i++) { const p = i / 30; pts.push([bez(p, a.x, cx, z[0]), bez(p, a.y, cy, z[1])]); }
      return pts;
    }
    const start = f => {
      if (f.fuss || f.radweg || (kreisel && f.kreis)) { const w = weg(f); return { x: w[0][0], y: w[0][1], wink: f.fuss ? 0 : Math.atan2(w[1][1] - w[0][1], w[1][0] - w[0][0]) * 180 / Math.PI + 90 }; }
      const a = lage(f.von); return { x: a.x, y: a.y, wink: Math.atan2(a.hy, a.hx) * 180 / Math.PI + 90 };
    };
    const istDu = f => /^du$/i.test(f.id);
    // Maßstab der Draufsicht: 8 Einheiten je Meter (Fahrzeuge gut erkennbar, Pkw füllt gut die halbe Spur), Länge aus BL_BILDER.MASSE (l in m), Breite nach Bild;
    // sehr lange Fahrzeuge gekürzt (passen sonst nicht vor die Kreuzung), Rad/Fußgänger etwas größer, damit sie erkennbar bleiben
    const dsMass = k => {
      const m = BI.mass && BI.mass(k);
      if (!m || !m.l) return null;
      // Spielertest 29.10.2026: Fahrzeuge/Personen größer (9,5 statt 8 Einheiten je m, Personen ×2,1) – dazu Ausschnitt enger (viewBox)
      const extra = /fussgaenger|polizist/.test(k) ? 2.1 : /rad|motorrad/.test(k) ? 1.2 : 1;
      const l = Math.min(60, m.l * 9.5 * extra);
      return { l, b: l * m.px[0] / m.px[1] };
    };
    const artVon = f => f.fuss ? 'fuss' : /rad/i.test(f.art) ? 'rad' : /lkw|bus|traktor|rettung/i.test(f.art) ? 'lang' : /motorrad/i.test(f.art) ? 'mot' : 'pkw';
    const farbe = f => istDu(f) ? 'var(--gruen)' : /rettung/i.test(f.art) ? '#f2f3f1' : /traktor/i.test(f.art) ? '#a8322a' : /bus/i.test(f.art) ? '#e8c547' : /rad/i.test(f.art) ? '#d9822b' : ['#3a6fb5', '#c0392b', '#6d7b5a', '#5f6366'][fz.indexOf(f) % 4];
    const fahrzeugSvg = f => {
      const s = start(f), art = artVon(f);
      const dsKey = istDu(f) ? 'draufsicht/du' : art === 'rad' ? 'draufsicht/rad' : art === 'mot' ? 'draufsicht/motorrad'
        : art === 'lang' ? 'draufsicht/' + (/bus/i.test(f.art) ? 'bus' : /rettung/i.test(f.art) ? 'rettung' : /traktor/i.test(f.art) ? 'traktor' : 'lkw')
        : /liefer|transporter|van/i.test(f.art) ? 'draufsicht/van' : /polizei/i.test(f.art) ? 'draufsicht/polizei'
        : ['draufsicht/pkw', 'draufsicht/pkw-2', 'draufsicht/pkw-3', 'draufsicht/pkw-4'][fz.indexOf(f) % 4];
      const bildDS = art !== 'fuss' && BI.url && (BI.url(dsKey) || (art !== 'mot' && BI.url('draufsicht/' + (art === 'lang' ? 'lkw' : art === 'rad' ? 'rad' : 'pkw'))));
      const ds = bildDS && dsMass(dsKey);
      let koerper;
      const bildFG = art === 'fuss' && BI.url && BI.url('draufsicht/fussgaenger');
      if (art === 'fuss' && bildFG) { const n = /gruppe/i.test(f.art) ? 3 : 1, m = dsMass('draufsicht/fussgaenger'); koerper = [...Array(n)].map((_, i) => `<image href="${bildFG}" x="${fix((i - (n - 1) / 2) * 8 - m.b / 2)}" y="${fix(-m.l / 2)}" width="${fix(m.b)}" height="${fix(m.l)}"/>`).join(''); }
      else if (art === 'fuss') {
        const n = /gruppe/i.test(f.art) ? 3 : 1;
        koerper = [...Array(n)].map((_, i) => { const dx = (i - (n - 1) / 2) * 5.5, dy = i % 2 ? 2.5 : -1; return `<ellipse cx="${dx}" cy="${dy}" rx="3" ry="2" fill="${['#7a4f8f', '#3c5a7a', '#e2622f'][i]}"/><circle cx="${dx}" cy="${dy}" r="1.5" fill="#4a3426"/>`; }).join('');
      } else if (bildDS && ds) koerper = `<image href="${bildDS}" x="${fix(-ds.b / 2)}" y="${fix(-ds.l / 2)}" width="${fix(ds.b)}" height="${fix(ds.l)}"/>`;
      else if (art === 'rad' || art === 'mot') koerper = `<rect x="-1.2" y="-7" width="2.4" height="14" rx="1.2" fill="#222"/><rect x="-3.6" y="-2.6" width="7.2" height="5.5" rx="2" fill="${farbe(f)}"/><circle cy="-.5" r="2.2" fill="${art === 'mot' ? '#1d1f22' : '#f0f0f0'}"/>`;
      else {
        const L2 = art === 'lang' ? 17 : 8, B2 = art === 'lang' ? 4.8 : 3.4;   // halbe Länge/Breite
        koerper = `<rect x="-${B2}" y="-${L2}" width="${B2 * 2}" height="${L2 * 2}" rx="${art === 'lang' ? 1.6 : 2.4}" fill="${farbe(f)}" stroke="rgba(0,0,0,.35)" stroke-width=".7"/><rect x="-${B2 - 1}" y="-${L2 - 2.5}" width="${(B2 - 1) * 2}" height="3.6" rx="1" fill="rgba(30,40,50,.75)"/>`;
        if (/rettung/i.test(f.art)) koerper += '<rect x="-3" y="-1" width="6" height="1.8" fill="#c8241b"/><rect x="-.9" y="-3.2" width="1.8" height="6" fill="#c8241b"/><circle cx="-2.6" cy="-13" r="1.5" class="blau"/><circle cx="2.6" cy="-13" r="1.5" class="blau"/>';
      }
      // Fahrtrichtung als gelber Pfeil mit Spitze (Fußgänger ohne Pfeil)
      const r = f.fuss || f.radweg || (kreisel && f.kreis) ? { w: 'g' } : raus(f), oben = ds ? -ds.l / 2 - 1.5 : art === 'lang' ? -19 : -10;
      const pfeil = f.fuss ? '' : r.w === 'g' ? `M0 ${oben}v-12M-4.5 ${oben - 6.5} 0 ${oben - 12}l4.5 5.5` : r.w === 'r' ? `M0 ${oben}q0 -10 11 -11M6 ${oben - 15.5}l5.5 4.5-5.5 4` : `M0 ${oben}q0 -10 -11 -11M-6 ${oben - 15.5}l-5.5 4.5 5.5 4`;
      const name = istDu(f) ? 'Du' : f.art + (f.wartet ? ' (wartet)' : '');
      return `<g class="fz${f.fuss ? ' fuss' : ''}" data-id="${esc(f.id)}" role="button" tabindex="0" aria-label="${esc(name)}" transform="translate(${fix(s.x)} ${fix(s.y)}) rotate(${fix(s.wink)})">`
        + `<circle r="20" fill="transparent"/>${koerper}`
        + (pfeil ? `<path d="${pfeil}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${pfeil}" fill="none" stroke="#ffd014" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : '')
        + `<g class="nr" transform="rotate(${fix(-s.wink)})${f.fuss ? ' translate(0 -9)' : ''}"><circle r="9.5"/><text y="4" text-anchor="middle"></text></g>`
        + (istDu(f) ? `<text class="du" transform="rotate(${fix(-s.wink)})" y="${ds ? fix(ds.l / 2 + 9) : art === 'lang' ? 30 : 24}" text-anchor="middle">Du</text>` : '') + '</g>';
    };
    // Straßen: Arme (Gehweg + Fahrbahn), Feldweg, Radweg, Kreisel
    let strasse = '';
    const armRect = (d, halb, farbe) => d === 'n' ? `<rect x="${C - halb}" y="0" width="${halb * 2}" height="${C}" fill="${farbe}"/>` : d === 's' ? `<rect x="${C - halb}" y="${C}" width="${halb * 2}" height="${C}" fill="${farbe}"/>`
      : d === 'w' ? `<rect x="0" y="${C - halb}" width="${C}" height="${halb * 2}" fill="${farbe}"/>` : `<rect x="${C}" y="${C - halb}" width="${C}" height="${halb * 2}" fill="${farbe}"/>`;
    arme.forEach(d => { if (d !== LG.feldweg) strasse += armRect(d, 38, '#a9a7a1'); });
    arme.forEach(d => { strasse += d === LG.feldweg ? armRect(d, 13, '#a88a5e') : armRect(d, 30, '#5b5f63'); });
    if (LG.radweg) strasse += `<rect x="${C + 31}" y="0" width="7" height="300" fill="#b5523b"/>`;
    if (kreisel) strasse += `<circle cx="${C}" cy="${C}" r="70" fill="#a9a7a1"/><circle cx="${C}" cy="${C}" r="62" fill="#5b5f63"/><circle cx="${C}" cy="${C}" r="27" fill="#d2d0c8"/><circle cx="${C}" cy="${C}" r="24" fill="#8fae6a"/><circle cx="${C - 6}" cy="${C - 5}" r="7" fill="#6f9447"/><circle cx="${C + 7}" cy="${C + 6}" r="5" fill="#6f9447"/>`;
    else strasse += `<rect x="${C - 30}" y="${C - 30}" width="60" height="60" fill="#5b5f63"/>`;
    // Mittellinien (enden vor der Kreuzung), Haltlinien/Wartelinien, Furten
    const ab = kreisel ? 70 : 44;
    const linien = arme.filter(d => d !== LG.feldweg).map(d => d === 'n' ? `M${C} 0V${C - ab}` : d === 's' ? `M${C} 300V${C + ab}` : d === 'w' ? `M0 ${C}H${C - ab}` : `M300 ${C}H${C + ab}`).join('');
    let extra = `<path d="${linien}" stroke="#ecece6" stroke-width="2" stroke-dasharray="10 10"/>`;
    const haltlinie = (d, art) => {
      const [dx, dy] = RICHT[d], [rx, ry] = RICHT[DREH[GEGEN[d]]], m = kreisel ? 68 : (LG.fg === d ? 60 : 36);
      const x0 = C + dx * m, y0 = C + dy * m, x1 = x0 + rx * 29, y1 = y0 + ry * 29;
      return `<path d="M${fix(x0)} ${fix(y0)}L${fix(x1)} ${fix(y1)}" stroke="#ecece6" stroke-width="${art === 'halt' ? 3 : 2.2}"${art === 'warte' ? ' stroke-dasharray="3.5 3"' : ''}/>`;
    };
    arme.forEach(d => {
      const sch = LG.schild && LG.schild[d], amp = LG.ampel && LG.ampel[d];
      if ((amp && amp !== 'aus') || sch === '206') extra += haltlinie(d, 'halt');
      else if (sch === '205' || sch === '215') extra += haltlinie(d, 'warte');
    });
    if (LG.fg) {   // Fußgängerfurt (zwei unterbrochene Linien) am Arm LG.fg
      const d = LG.fg, q = d === 'w' || d === 'o', x = d === 'w' ? C - 50 : C + 50, y = d === 's' ? C + 52 : C - 52;
      extra += q ? `<path d="M${x - 6} ${C - 30}V${C + 30}M${x + 6} ${C - 30}V${C + 30}" stroke="#ecece6" stroke-width="1.6" stroke-dasharray="4 3"/>` : `<path d="M${C - 30} ${y - 6}H${C + 30}M${C - 30} ${y + 6}H${C + 30}" stroke="#ecece6" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    }
    if (LG.radweg) extra += `<path d="M${C + 31} ${C - 34}V${C + 34}M${C + 38} ${C - 34}V${C + 34}" stroke="#ecece6" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    // Schilder und Ampeln je Zufahrt (rechts vor der Kreuzung, immer aufrecht)
    let zeichen = '';
    const knickZusatz = d => {
      if (!LG.knick || !(LG.schild && LG.schild[d] === '306')) return '';
      const [k1, k2] = LG.knick.split(''), h = GEGEN[d], arm = k1 === d ? k2 : k1;
      const rel = a2 => a2 === h ? [0, -5] : a2 === DREH[h] ? [5, 0] : a2 === GEGEN[DREH[h]] ? [-5, 0] : [0, 5];
      const [ex, ey] = rel(arm), duenn = arme.filter(x => x !== d && x !== arm).map(x => { const [a2, b2] = rel(x); return `M0 0L${a2} ${b2}`; }).join('');
      return `<g transform="translate(0 15)"><rect x="-7" y="-6" width="14" height="12" fill="#fff" stroke="#333" stroke-width=".6"/><path d="${duenn}" stroke="#111" stroke-width=".9"/><path d="M0 5V0L${ex} ${ey}" stroke="#111" stroke-width="2.2" fill="none"/></g>`;
    };
    arme.forEach(d => {
      const h = GEGEN[d], [dx, dy] = RICHT[d], [rx, ry] = RICHT[DREH[h]], m = kreisel ? 84 : 52;
      const x = C + dx * m + rx * 46, y = C + dy * m + ry * 46;
      const sch = LG.schild && LG.schild[d], amp = LG.ampel && LG.ampel[d];
      if (sch) zeichen += `<g class="vz" transform="translate(${fix(x)} ${fix(y)}) scale(1.4)">${schildSvg(sch)}${knickZusatz(d)}</g>`;
      if (amp) {
        const ax = x + (sch ? dx * 21 : 0), ay = y + (sch ? dy * 21 : 0);
        const lampe = (cy, f2, an) => `<circle cy="${cy}" r="2.2" fill="${an ? f2 : '#2b2d2f'}"/>`;
        zeichen += `<g class="ampel" transform="translate(${fix(ax)} ${fix(ay)}) scale(1.3)"><rect x="-3.8" y="-9.5" width="7.6" height="19" rx="2" fill="#16181a"/>${lampe(-5.5, '#ff2a1a', amp === 'r')}${lampe(0, '#ffb21e', false)}${lampe(5.5, '#3ddc6f', amp === 'g')}`
          + (LG.pfeilL === d ? '<rect x="4.5" y="1.5" width="7.6" height="8" rx="1.5" fill="#16181a"/><path d="M10.5 5.5H6.4M8 3.6 6.2 5.5 8 7.4" stroke="#3ddc6f" stroke-width="1.3" fill="none"/>' : '')
          + (LG.gruenpfeil === d ? '<rect x="4.5" y="-4" width="10" height="7" rx=".8" fill="#111"/><path d="M6.4 -.5H12M10 -2.3 12 -.5 10 1.3" stroke="#3ddc6f" stroke-width="1.3" fill="none"/>' : '')
          + '</g>';
      }
    });
    if (LG.fg && LG.fgAmpel) {   // Fußgängerampel an beiden Enden der Furt
      const d = LG.fg, pkte = d === 'w' ? [[C - 62, C + 42], [C - 38, C - 42]] : d === 'o' ? [[C + 38, C + 42], [C + 62, C - 42]] : d === 's' ? [[C - 42, C + 64], [C + 42, C + 40]] : [[C - 42, C - 40], [C + 42, C - 64]];
      pkte.forEach(([x, y]) => { zeichen += `<g class="ampel" transform="translate(${x} ${y})"><rect x="-3.2" y="-6" width="6.4" height="12" rx="1.6" fill="#16181a"/><circle cy="-2.6" r="1.8" fill="${LG.fgAmpel === 'r' ? '#ff2a1a' : '#2b2d2f'}"/><circle cy="2.6" r="1.8" fill="${LG.fgAmpel === 'g' ? '#3ddc6f' : '#2b2d2f'}"/></g>`; });
    }
    if (LG.polizei) {   // Polizist in der Mitte: Arme seitlich, Mütze mit Schirm in Blickrichtung
      const w = LG.polizei === 'brust' ? 0 : -90;
      const bildP = BI.url && BI.url('draufsicht/polizist');
      if (bildP) zeichen += `<g class="polizei" role="img" aria-label="Polizist" transform="translate(${C} ${C}) rotate(${w}) scale(1.25)"><image href="${bildP}" x="-25" y="-11.3" width="50" height="22.5"/></g>`;
      else zeichen += `<g class="polizei" role="img" aria-label="Polizist" transform="translate(${C} ${C}) rotate(${w})"><circle r="16" fill="rgba(255,255,255,.2)"/>`
        + '<path d="M-14 0H14" stroke="#2d4a7a" stroke-width="3" stroke-linecap="round"/><circle cx="-14.5" r="1.8" fill="#fff"/><circle cx="14.5" r="1.8" fill="#fff"/>'
        + '<ellipse rx="6" ry="3.6" fill="#2d4a7a"/><circle r="3.2" fill="#f4f4f0" stroke="#2d4a7a" stroke-width=".8"/><path d="M-2.6 2.2Q0 5.2 2.6 2.2Z" fill="#1d1f22"/></g>';
    }
    const haeuser = [[10, 10], [200, 10], [10, 200], [200, 200]].map(([x, y]) => `<rect x="${x}" y="${y}" width="90" height="90" rx="3"/>`).join('');
    // Spielertest 29.10.2026: unter der Frage die Regelung in Alltagssprache (Feld Alltag), Schildnummern nicht mehr; Ausschnitt enger = alles größer
    const alltag = def.Alltag || def.alltag || '';
    kr.innerHTML = `<div class="bl-krkarte"><h2>${esc(T.titel || 'Wer fährt zuerst?')}</h2><p class="regel${alltag ? ' alltag' : ''}">${esc(alltag || def.Regelung || def.regelung || '')}</p>`
      + `<svg class="bl-krsvg" viewBox="26 26 248 248" role="group" aria-label="Kreuzung von oben"><rect width="300" height="300" fill="${LG.feldweg ? '#9db574' : '#8fae6a'}"/>`
      + `<g class="haeuser" fill="#d9c7a9" stroke="#b9a68a">${haeuser}</g>${strasse}${extra}${zeichen}${fz.map(fahrzeugSvg).join('')}</svg>`
      + `<p class="anl">${esc(T.anleitung || '')}</p><p class="ergebnis" hidden></p><button class="bl-knopf" type="button" hidden>Weiter</button></div>`;
    kr.hidden = false;
    const gewaehlt = [];
    const fzEls = [...kr.querySelectorAll('.fz')];
    // Wer bei Rot oder auf Zeichen der Polizei wartet, steht nicht in der Reihenfolge: Antippen = Fehler mit kurzer Erklärung (MZ, 28.10.2026)
    const inReihe = new Set([].concat(...(def.reihenfolge || [])).map(x => x.toLowerCase()));
    const anzahl = inReihe.size || fz.length;
    let fehlTipps = 0, ausgewertet = false;
    const waehlen = g => {
      if (ausgewertet || gewaehlt.includes(g.dataset.id) || g.classList.contains('falsch')) return;
      if (inReihe.size && !inReihe.has(g.dataset.id.toLowerCase())) {
        fehlTipps++; g.classList.add('falsch'); KL('fehlalarm'); g.querySelector('.nr text').textContent = '×';
        const f = fz.find(x => x.id === g.dataset.id), anl = kr.querySelector('.anl');
        anl.textContent = /polizei/i.test((f && f.zusatz) || '') ? (T.polizei || '') : (T.rot || '');
        anl.classList.add('warn');
        return;
      }
      gewaehlt.push(g.dataset.id); KL('klick');
      g.classList.add('gewaehlt'); g.querySelector('.nr text').textContent = gewaehlt.length;
      if (gewaehlt.length === anzahl) auswerten();
    };
    fzEls.forEach(g => { g.addEventListener('click', () => waehlen(g)); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') waehlen(g); }); });
    function auswerten() {
      ausgewertet = true;
      // Gruppen (gleichzeitig) in beliebiger Reihenfolge: Position zählt richtig, wenn sie zur Gruppe an dieser Stelle gehört
      const soll = []; (def.reihenfolge || []).forEach(gr => gr.forEach(() => soll.push(gr)));
      let richtig = 0;
      gewaehlt.forEach((id, i) => { if (soll[i] && soll[i].some(x => x.toLowerCase() === id.toLowerCase())) richtig++; });
      const anteil = anzahl ? Math.max(0, richtig - fehlTipps) / anzahl : 0;
      const erg = kr.querySelector('.ergebnis');
      erg.innerHTML = `<b class="${anteil === 1 ? 'gut' : 'schlecht'}">${esc(anteil === 1 ? T.richtig : T.falsch)}</b> ${esc(def.Begruendung || def.begruendung || '')}`;
      erg.hidden = false; kr.querySelector('.anl').hidden = true;
      KL(anteil === 1 ? 'erkannt' : 'fehlalarm');
      // richtige Nummern zeigen und die Teilnehmer in dieser Reihenfolge fahren/gehen lassen (Wartende bleiben stehen)
      let schritt = 0, pos = 0;
      (def.reihenfolge || []).forEach(gr => {
        const nr = ++schritt, bereich = gewaehlt.slice(pos, pos + gr.length).map(x => x.toLowerCase()); pos += gr.length;
        gr.forEach(id => {
          const g = fzEls.find(e => e.dataset.id.toLowerCase() === id.toLowerCase());
          if (!g) return;
          g.querySelector('.nr text').textContent = nr;
          g.classList.toggle('falsch', !bereich.includes(id.toLowerCase()));
          const f = fz.find(x => x.id.toLowerCase() === id.toLowerCase());
          setTimeout(() => fahren(g, weg(f), f.fuss), (ruhig ? 300 : 800) * nr);
        });
      });
      const weiter = kr.querySelector('.bl-knopf');
      weiter.hidden = false;
      weiter.addEventListener('click', () => { kr.hidden = true; fertig({ anteil, gewaehlt: gewaehlt.slice(), fehlTipps }); }, { once: true });
    }
    function fahren(g, pts, fuss) {
      if (ruhig) { g.style.transition = 'opacity .5s'; g.style.opacity = 0.35; return; }
      // Länge entlang der Punkte, dann gleichmäßig mit weichem Anfahren/Bremsen
      const lang = [0]; for (let i = 1; i < pts.length; i++) lang.push(lang[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const gesamt = lang[lang.length - 1] || 1, dauer = fuss ? 1800 : Math.min(2000, 700 + gesamt * 3), t0 = performance.now();
      const bei = s => { let i = 1; while (i < lang.length - 1 && lang[i] < s) i++; const a = pts[i - 1], b = pts[i], u = (s - lang[i - 1]) / Math.max(0.01, lang[i] - lang[i - 1]); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])]; };
      const nr = g.querySelector('.nr');
      const bild = jetzt => {
        const p = Math.min(1, (jetzt - t0) / dauer), e = p * p * (3 - 2 * p), [x, y, w] = bei(e * gesamt);
        const wink = fuss ? 0 : w * 180 / Math.PI + 90;
        g.setAttribute('transform', `translate(${fix(x)} ${fix(y)}) rotate(${fix(wink)})`);
        if (nr) nr.setAttribute('transform', `rotate(${fix(-wink)})${fuss ? ' translate(0 -9)' : ''}`);
        if (p < 1) requestAnimationFrame(bild); else g.style.opacity = fuss ? 0.5 : 0;
      };
      requestAnimationFrame(bild);
    }
  }

  // ---------- Geführte erste Fahrt (Spielertest 29.10.2026): Schalter „Überspringen“ und Bedien-Etikett am Bedienteil ----------
  const einfWeg = el('button', 'bl-einfweg'); einfWeg.type = 'button'; einfWeg.hidden = true;
  const etik = el('div', 'bl-etikett'); etik.hidden = true; etik.setAttribute('aria-hidden', 'true');
  document.body.append(einfWeg, etik);
  let einfFn = null;
  einfWeg.addEventListener('click', e => { e.stopPropagation(); const f = einfFn; einf(null); f && f(); });
  einfWeg.addEventListener('pointerdown', e => e.stopPropagation());
  function einf(o) {
    einfFn = o ? o.ueberspringen : null;
    einfWeg.hidden = !o;
    // in der Kopfzeile links neben den Knöpfen Ton/Vollbild (dort stehen sonst die Punkte) – nichts in der Scheibe verdecken
    const ton = document.getElementById('tonKnopf'), r = ton && ton.getBoundingClientRect();
    einfWeg.style.right = r && r.width ? Math.round(innerWidth - r.left + 8) + 'px' : '';
    if (o) einfWeg.innerHTML = `${esc(o.text)}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l5 5-5 5M11 5l5 5-5 5"/></svg>`;
  }
  let etikText = '';
  function etikett(o) {
    if (!o) { etik.hidden = true; etikText = ''; return; }
    if (o.text !== etikText) { etikText = o.text; etik.textContent = o.text; etik.classList.remove('rein'); void etik.offsetWidth; etik.classList.add('rein'); }
    etik.hidden = false;
    etik.classList.toggle('unten', !!o.unten); etik.classList.toggle('stark', !!o.stark); etik.classList.toggle('mitte', !!o.mitte);
    const w = etik.offsetWidth || 120, x = Math.max(w / 2 + 8, Math.min(innerWidth - w / 2 - 8, o.x));
    etik.style.left = x.toFixed(1) + 'px'; etik.style.top = o.y.toFixed(1) + 'px';
    etik.style.setProperty('--pfeil', (o.x - x).toFixed(1) + 'px');   // Pfeil zeigt weiter auf das Ziel, wenn das Etikett am Rand anstößt
  }

  window.BL_UI = {
    einf, etikett,
    start: startbild, ende: endbild, endeAus() { ende.hidden = true; },
    beimNochmal(fn) { nochmalFn = fn; },
    fahrt(an) { fahrt.hidden = !an; if (!an) { warnBis = 0; fahrt.querySelector('.bl-sb').classList.remove('an'); hinweis(null); } },
    fahrlehrer, hinweis, popup, titel, karte, kreuzung, fahrlehrerSvg,
    fps(t) { fpsAnz.hidden = false; fpsAnz.textContent = t; },
  };
})();
