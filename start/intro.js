// Intro der Startseite „Blinker links“ – A „Der Blinker setzt sich“ + Zeiger-Schwung (MZ-Wahl 28.10.2026), ca. 3,0s, ohne Ton,
// nur beim ersten Öffnen je Sitzung (Kopf-Skript in index.html setzt html.intro), Tippen/Taste überspringt.
//   0–0,6s   grüne Fläche, App-Icon mittig, oranger Pfeil blinkt zweimal
//   0,6–1,4s Ampel-Zeichen gleitet nach oben links an seinen Platz im Logo, Schriftzug blendet ein;
//            oranger Pfeil rutscht vor den Titel, das Titel-Schild „Blinker links“ fährt von rechts herein
//   1,4–2,2s grüne Fläche zieht sich nach oben zurück, gibt die Scheibe frei, Armaturenbrett fährt von unten herein
//   2,2–3,0s Tachozeiger schwingt von 0 auf den Bestwert, der Cockpit-Pfeil übernimmt das Blinken
// Am Ende ist das Logo vollständig und unverändert (Kundenfarbe). reduced-motion: Icon kurz still, dann weiche Überblendung.
// Ablauf als Funktion der Zeit bild(t): Testhilfe #intro=1.4 zeigt ein Standbild (läuft nicht weiter).
(function () {
  'use strict';
  const html = document.documentElement;
  if (!html.classList.contains('intro')) return;
  const B = window.BL_BASIS, I = window.BL_ICON, K = B.K, S = window.BL_START, $ = s => document.querySelector(s);
  const FARBE = (K.farben && K.farben.haupt) || '#1E7A3E';
  const SCHLUESSEL = 'mg:intro:blinker-links:' + (K.firma || '');
  const standbild = (/[#&]intro=([\d.]+)/.exec(location.hash) || [])[1];
  const ruhig = B.ruhig();
  const DAUER = ruhig ? 1.6 : 3.0;

  // ---------- Bühne ----------
  const buehne = document.createElement('div');
  buehne.className = 'introbuehne';
  buehne.setAttribute('aria-hidden', 'true');
  const hell = I.mischen(FARBE, '#ffffff', 0.1), dunkel = I.mischen(FARBE, '#000000', 0.3);
  buehne.innerHTML =
    `<div class="flaeche" style="background:radial-gradient(circle at 50% 38%, ${hell}, ${FARBE} 55%, ${dunkel})"></div>` +
    `<svg class="icon" viewBox="0 0 100 100"><defs>` +
    `<radialGradient id="ibf" cx="50%" cy="28%" r="80%"><stop offset="0" stop-color="${hell}"/><stop offset=".55" stop-color="${FARBE}"/><stop offset="1" stop-color="${I.mischen(FARBE, '#000000', 0.33)}"/></radialGradient>` +
    `<radialGradient id="ibs"><stop offset="0" stop-color="#ffb23a" stop-opacity=".55"/><stop offset=".45" stop-color="#ff9a1a" stop-opacity=".22"/><stop offset="1" stop-color="#ff9a1a" stop-opacity="0"/></radialGradient>` +
    `<filter id="ibd" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".3"/></filter></defs>` +
    `<rect class="kachel" width="100" height="100" rx="22" fill="url(#ibf)" filter="url(#ibd)"/>` +
    `<circle class="schein" cx="${I.M.schein.cx}" cy="${I.M.schein.cy}" r="${I.M.schein.r}" fill="url(#ibs)"/></svg>` +
    '';
  // Phase-5-Korrektur: die Flieger (Pfeil, Ampel-Zeichen) liegen in einer eigenen Ebene über Titel und Logo (z-index 70) –
  // in der Bühne (z-index 50) verschwand der Pfeil hinter dem Titel-Schild (z-index 60), sobald er dort ankam (QA: Foto 1,3s)
  const flug = document.createElement('div');
  flug.className = 'introflieger';
  flug.setAttribute('aria-hidden', 'true');
  flug.innerHTML =
    `<svg class="flieger pfeil" viewBox="-1 -1 36 28"><defs><linearGradient id="ibl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset=".5" stop-color="#ffab2e"/><stop offset="1" stop-color="#ff8a00"/></linearGradient>` +
    `<filter id="ibg" x="-60%" y="-80%" width="220%" height="260%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>` +
    `<path class="glimm" d="${I.PFEIL}" fill="#ff9a1a" stroke="#ff9a1a" stroke-width="2" stroke-linejoin="round" filter="url(#ibg)"/>` +
    `<path d="${I.PFEIL}" fill="url(#ibl)" stroke="url(#ibl)" stroke-width="1.6" stroke-linejoin="round"/></svg>` +
    `<svg class="flieger zeichen" viewBox="0 0 49.3 100"></svg>`;
  document.body.append(buehne, flug);
  const flaeche = buehne.querySelector('.flaeche'), icon = buehne.querySelector('.icon'), kachel = buehne.querySelector('.kachel'), schein = buehne.querySelector('.schein');
  const fPfeil = flug.querySelector('.flieger.pfeil'), fZeichen = flug.querySelector('.flieger.zeichen');

  // Zeichen aus kunde/zeichen.svg (weiß) – fehlt es, fliegt nichts, das Logo blendet nur ein
  let zeichenBox = { x: 0, y: 0, w: 49.3, h: 100 };
  fetch(K.zeichen).then(r => r.ok ? r.text() : Promise.reject()).then(t => {
    const z = I.zeichenLesen(t);
    if (!z || /<script/i.test(t)) return;
    zeichenBox = z;
    fZeichen.setAttribute('viewBox', `${z.x} ${z.y} ${z.w} ${z.h}`);
    fZeichen.innerHTML = z.pfade.map(d => `<path fill="#fff" fill-rule="evenodd" d="${d}"/>`).join('');
  }).catch(() => {});

  // ---------- Hilfen ----------
  const klemm = v => Math.max(0, Math.min(1, v));
  const ab = (t, a, b) => klemm((t - a) / (b - a));
  const weich = p => p * p * (3 - 2 * p);
  const ausEase = p => 1 - Math.pow(1 - p, 3);
  const einAus = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const misch = (a, b, p) => a + (b - a) * p;
  const kasten = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };

  const logo = $('#logo'), titel = $('#titel'), titelPfeil = $('#titelPfeil'), slogan = $('#slogan'), scheibe = $('#scheibe'), brett = $('#brett');
  let logoSvg = null, logoZeichen = null, logoSchrift = null;
  const teile = [logo, titel, titelPfeil, slogan, scheibe, brett];

  function bild(t) {
    const W = innerWidth, H = innerHeight;
    // Icon mittig (Kantenlänge wie ein großes App-Icon)
    const n = Math.min(W * 0.46, H * 0.3, 220), ix = (W - n) / 2, iy = (H - n) / 2 - H * 0.04;
    const ik = n / 100;
    icon.style.width = icon.style.height = n + 'px';
    icon.style.transform = `translate(${ix}px, ${iy}px)`;

    if (ruhig) return bildRuhig(t, n, ix, iy, ik);

    // Kachel des Icons löst sich in der Fläche auf (0,6–0,9s)
    const kachelWeg = ab(t, 0.6, 0.95);
    kachel.style.opacity = 1 - kachelWeg;
    // Blinken: zweimal an/aus in 0–0,6s, danach an
    const blink = t < 0.6 ? ((t % 0.3) < 0.17 ? 1 : 0.18) : 1;
    schein.style.opacity = (1 - kachelWeg) * blink;
    // Grüne Fläche zieht sich nach oben zurück (1,4–2,2s)
    const rueck = einAus(ab(t, 1.4, 2.2));
    const unten = H * (1 - rueck);
    buehne.style.clipPath = `inset(0 0 ${(H - unten).toFixed(1)}px 0)`;
    buehne.style.pointerEvents = 'auto';

    // ---- Ampel-Zeichen: Icon → Logo (0,6–1,4s)
    const zs = I.M.zeichen.h * ik, zsw = zs * zeichenBox.w / zeichenBox.h;
    const vonZ = { x: ix + I.M.zeichen.cx * ik - zsw / 2, y: iy + I.M.zeichen.cy * ik - zs / 2, w: zsw, h: zs };
    const zielZ = logoZeichen ? kasten(logoZeichen) : null;
    const pz = einAus(ab(t, 0.6, 1.4));
    let z = vonZ;
    if (zielZ && zielZ.w > 0) z = { x: misch(vonZ.x, zielZ.x, pz), y: misch(vonZ.y, zielZ.y, pz) - Math.sin(pz * Math.PI) * H * 0.04, w: misch(vonZ.w, zielZ.w, pz), h: misch(vonZ.h, zielZ.h, pz) };
    fZeichen.style.width = z.w + 'px'; fZeichen.style.height = z.h + 'px';
    fZeichen.style.transform = `translate(${z.x}px, ${z.y}px)`;
    const gelandet = t >= 1.4 && zielZ;
    fZeichen.style.opacity = gelandet ? 0 : 1;
    logo.style.opacity = 1;
    if (logoZeichen) logoZeichen.style.opacity = gelandet ? 1 : 0;
    if (logoSchrift) logoSchrift.style.opacity = weich(ab(t, 0.9, 1.4));
    if (!logoZeichen) logo.style.opacity = weich(ab(t, 0.9, 1.4));
    // Logo weiß auf der grünen Fläche, Kundenfarbe sobald die Fläche den Kopf freigibt (≈ 2,0s)
    html.classList.toggle('intro-logo-weiss', t < 1.95);

    // ---- Titel-Schild fährt von rechts herein (0,8–1,4s)
    const ps = ausEase(ab(t, 0.8, 1.4));
    titel.style.opacity = ab(t, 0.8, 0.9);
    titel.style.transform = `translateX(${((1 - ps) * W * 0.9).toFixed(1)}px)`;

    // ---- Oranger Pfeil: Icon → vor den Titel (0,7–1,35s)
    const vonP = { x: ix + I.M.pfeil.x * ik, y: iy + I.M.pfeil.y * ik, w: 34 * I.M.pfeil.s * ik, h: 26 * I.M.pfeil.s * ik };
    const zp = kasten(titelPfeil);
    const pp = einAus(ab(t, 0.7, 1.35));
    // viewBox des Fliegers hat 1 Einheit Rand (−1…35): Zielkasten entsprechend
    const p = { x: misch(vonP.x, zp.x, pp), y: misch(vonP.y, zp.y, pp) + Math.sin(pp * Math.PI) * H * 0.03, w: misch(vonP.w * 36 / 34, zp.w, pp), h: misch(vonP.h * 28 / 26, zp.h, pp) };
    fPfeil.style.width = p.w + 'px'; fPfeil.style.height = p.h + 'px';
    fPfeil.style.transform = `translate(${p.x}px, ${p.y}px)`;
    fPfeil.style.opacity = t < 1.35 ? (t < 0.6 ? blink : 1) : 0;
    fPfeil.querySelector('.glimm').style.opacity = 1 - pp;
    titelPfeil.style.opacity = t < 1.35 ? 0 : 1;

    // ---- Scheibe frei, Armaturenbrett von unten (1,4–2,2s), Unterzeile blendet ein
    scheibe.style.opacity = t < 1.4 ? 0 : 1;
    const pb = ausEase(ab(t, 1.45, 2.2));
    brett.style.opacity = t < 1.45 ? 0 : 1;
    brett.style.transform = `translateY(${((1 - pb) * H * 0.6).toFixed(1)}px)`;
    slogan.style.opacity = weich(ab(t, 1.9, 2.3));

    // ---- Tachozeiger 0 → Bestwert (2,2–3,0s), Cockpit-Pfeil übernimmt (ab 2,6s)
    const pt = ab(t, 2.2, 3.0), e = ausEase(pt);
    S.tachoStellen(S.gesamt * (e + Math.sin(pt * Math.PI) * 0.04 * (1 - pt)));
    if (t >= 2.6) S.blinkenAn();
  }

  function bildRuhig(t, n, ix, iy, ik) {
    // Icon kurz still (0–0,6s), dann weiche Überblendung (0,6–1,6s) – keine Flüge
    const p = weich(ab(t, 0.6, 1.6));
    const zs = I.M.zeichen.h * ik, zsw = zs * zeichenBox.w / zeichenBox.h;
    fZeichen.style.width = zsw + 'px'; fZeichen.style.height = zs + 'px';
    fZeichen.style.transform = `translate(${ix + I.M.zeichen.cx * ik - zsw / 2}px, ${iy + I.M.zeichen.cy * ik - zs / 2}px)`;
    const pw = 34 * I.M.pfeil.s * ik * 36 / 34, ph = 26 * I.M.pfeil.s * ik * 28 / 26;
    fPfeil.style.width = pw + 'px'; fPfeil.style.height = ph + 'px';
    fPfeil.style.transform = `translate(${ix + I.M.pfeil.x * ik}px, ${iy + I.M.pfeil.y * ik}px)`;
    buehne.style.opacity = flug.style.opacity = 1 - p;
    buehne.style.pointerEvents = p >= 1 ? 'none' : 'auto';
    teile.forEach(el => { el.style.opacity = p; el.style.transform = 'none'; });
    S.tachoStellen(S.gesamt * p);
    if (p > 0.5) S.blinkenAn();
  }

  // ---------- Ablauf ----------
  let t0 = null, fertig = false, uebersprungen = false;
  function ende(weichAus) {
    if (fertig) return;
    fertig = true;
    try { sessionStorage.setItem(SCHLUESSEL, '1'); } catch (e) { /* egal */ }
    const aufraeumen = () => {
      buehne.remove(); flug.remove();
      html.classList.remove('intro', 'intro-logo-weiss');
      teile.forEach(el => { el.style.removeProperty('opacity'); el.style.removeProperty('transform'); el.style.removeProperty('transition'); });
      if (logoZeichen) logoZeichen.style.removeProperty('opacity');
      if (logoSchrift) logoSchrift.style.removeProperty('opacity');
      S.tachoStellen(S.gesamt); S.blinkenAn();
    };
    if (!weichAus) return aufraeumen();
    // Überspringen ohne Sprung: Bühne ausblenden, noch nicht Gezeigtes gestaffelt einblenden
    buehne.style.transition = flug.style.transition = 'opacity .35s ease'; buehne.style.opacity = flug.style.opacity = 0; buehne.style.pointerEvents = 'none';
    html.classList.remove('intro-logo-weiss');
    teile.forEach((el, i) => {
      el.style.transition = `opacity .4s ease ${i * 0.05}s, transform .45s ease ${i * 0.05}s`;
      el.style.opacity = 1; el.style.transform = 'none';
    });
    if (logoZeichen) { logoZeichen.style.transition = 'opacity .3s'; logoZeichen.style.opacity = 1; }
    if (logoSchrift) { logoSchrift.style.transition = 'opacity .3s'; logoSchrift.style.opacity = 1; }
    S.tachoSchwung(700);
    setTimeout(aufraeumen, 750);
  }
  function schleife(jetzt) {
    if (fertig) return;
    if (t0 == null) t0 = jetzt;
    const t = (jetzt - t0) / 1000;
    bild(Math.min(t, DAUER));
    if (t >= DAUER) return ende(false);
    requestAnimationFrame(schleife);
  }
  function ueberspringen() { if (!fertig && !standbild && !uebersprungen) { uebersprungen = true; ende(true); } }
  buehne.addEventListener('pointerdown', ueberspringen);
  addEventListener('keydown', ueberspringen);

  // auf das Logo höchstens 0,6s warten, sonst ohne starten
  const warten = new Promise(ok => setTimeout(ok, 600));
  Promise.race([window.BL_LOGO || Promise.resolve(null), warten]).then(svg => {
    logoSvg = svg || logo.querySelector('svg');
    if (logoSvg) { logoZeichen = logoSvg.querySelector('#zeichen'); logoSchrift = logoSvg.querySelector('#schriftzug'); }
    if (standbild != null) { bild(+standbild); return; }
    requestAnimationFrame(schleife);
  });
  bild(0);
})();
