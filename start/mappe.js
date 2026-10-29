// Führerscheinmappe (Phase 2b, Baustein 17): gesammelte Situationskarten der Startseite „Blinker links“.
// Eine Karte ist gesammelt, wenn die Situation einmal sauber gemeistert wurde (spiel.js → Statistik „karten“ in start/basis.js).
// Texte: start/karten.js (erzeugt von Material/Skripte/texte-bauen.py), wird erst beim Öffnen geladen.
// Öffnen: Knopf unter „Go“, Kartenzähler im Kombi-Instrument oder Adresse #mappe (Weg aus dem Endbild).
(function () {
  'use strict';
  const B = window.BL_BASIS, esc = B.esc, ruhig = B.ruhig();
  const GEBIETE = ['Innenstadt', '30er/Schule', 'Landstraße', 'Autobahn', 'Nacht/Wetter'];
  const knopf = document.getElementById('mappeKnopf'), mini = document.getElementById('statKartenKnopf');
  const box = document.createElement('section');
  box.className = 'mappe'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Führerscheinmappe');
  document.body.append(box);
  let geladen = null;
  function laden() {
    if (window.BL_KARTEN) return Promise.resolve(window.BL_KARTEN);
    if (!geladen) geladen = new Promise((ok, nein) => { const s = document.createElement('script'); s.src = 'start/karten.js'; s.onload = () => ok(window.BL_KARTEN || {}); s.onerror = nein; document.head.append(s); });
    return geladen;
  }
  // Bilder der Mappe (Bogen „Führerscheinmappe“, Phase 3): Leder (#00FF00 → Kundenfarbe) als Kopf, Stempel am Zähler.
  // Erst beim Öffnen geladen – die Startseite selbst lädt keine Spielbilder.
  let bilderDa = null;
  function bild(src) { return new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }); }
  function umfaerben(img) {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    const h = ((window.KUNDE && KUNDE.farben && KUNDE.farben.haupt) || '#1E7A3E').replace('#', ''), n = parseInt(h, 16);
    const kr = n >> 16 & 255, kg = n >> 8 & 255, kb = n & 255;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2];
      if (g < 60 || g < r * 1.3 || g < b * 1.3) continue;
      // Helligkeit des Grüns = Licht und Schatten des Leders, Weißanteil = Glanz
      const f = Math.min(1.35, g / 205), w = Math.min(r, b) / 255;
      p[i] = Math.min(255, kr * f + (255 - kr * f) * w); p[i + 1] = Math.min(255, kg * f + (255 - kg * f) * w); p[i + 2] = Math.min(255, kb * f + (255 - kb * f) * w);
    }
    x.putImageData(d, 0, 0);
    return c.toDataURL('image/webp', 0.85);
  }
  function bilderLaden() {
    if (!bilderDa) bilderDa = Promise.all([bild('start/mappe/zu.webp'), bild('start/mappe/stempel.webp')]).then(([zu, st]) => ({ leder: zu ? umfaerben(zu) : null, stempel: st ? st.src : null })).catch(() => ({}));
    return bilderDa;
  }
  function bilderEinsetzen() {
    bilderLaden().then(b => {
      const kopf = box.querySelector('.m-kopf');
      if (!kopf) return;
      if (b.leder) { kopf.style.setProperty('--leder', `url(${b.leder})`); kopf.classList.add('leder'); }
      if (b.stempel && !kopf.querySelector('.m-stempel')) kopf.querySelector('.m-zahl').insertAdjacentHTML('beforebegin', `<img class="m-stempel" src="${b.stempel}" alt="">`);
    });
  }
  function zaehlen() {
    const n = B.statistik().karten.filter(k => /^S\d+$/.test(k)).length;
    if (knopf) knopf.querySelector('b').textContent = n + '/100';
    return n;
  }
  function oeffnen() {
    laden().then(K => {
      const gesammelt = new Set(B.statistik().karten);
      const ids = Object.keys(K).sort();
      const n = ids.filter(i => gesammelt.has(i)).length;
      let nr = 0;
      const gruppen = GEBIETE.map(g => {
        const liste = ids.filter(i => K[i].g === g);
        if (!liste.length) return '';
        const hat = liste.filter(i => gesammelt.has(i)).length;
        return `<section class="m-gebiet"><h3>${esc(g)} <span>${hat}/${liste.length}</span></h3><div class="m-karten">` + liste.map(i => {
          const k = K[i], an = gesammelt.has(i), v = Math.min(nr++, 30) * 25;
          return an
            ? `<button class="m-karte" type="button" style="animation-delay:${v}ms" aria-expanded="false"><span class="vorn"><b>${esc(k.t)}</b><span>${esc(k.m)}</span></span>`
              + `<span class="hinten"><b>${esc(k.t)}</b><span>${esc(k.e)}</span><i>${esc(k.r)}</i></span></button>`
            : `<div class="m-karte zu" style="animation-delay:${v}ms" aria-disabled="true"><span class="vorn"><b>${esc(k.t)}</b><span class="verdeckt" aria-hidden="true"><i></i><i></i><i></i></span></span></div>`;
        }).join('') + '</div></section>';
      }).join('');
      box.innerHTML = `<div class="m-kopf"><button class="m-zu" type="button" aria-label="Mappe schließen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>`
        + `<h2>Führerscheinmappe</h2><span class="m-zahl"><b>${n}</b>/100</span></div><div class="m-balken"><i style="width:${n}%"></i></div><div class="m-inhalt">${gruppen}</div>`;
      box.querySelector('.m-zu').addEventListener('click', schliessen);
      bilderEinsetzen();
      box.querySelectorAll('button.m-karte').forEach(b => b.addEventListener('click', () => { const auf = b.classList.toggle('auf'); b.setAttribute('aria-expanded', auf ? 'true' : 'false'); }));
      box.hidden = false;
      document.documentElement.classList.add('mappe-offen');
      requestAnimationFrame(() => box.classList.add('rein'));
      box.querySelector('.m-zu').focus({ preventScroll: true });
    }).catch(() => {});
  }
  function schliessen() {
    box.classList.remove('rein');
    document.documentElement.classList.remove('mappe-offen');
    setTimeout(() => { box.hidden = true; box.innerHTML = ''; }, ruhig ? 120 : 260);
    if (location.hash === '#mappe') history.replaceState(null, '', location.pathname + location.search);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) schliessen(); });
  if (knopf) knopf.addEventListener('click', oeffnen);
  if (mini) mini.addEventListener('click', oeffnen);
  zaehlen();
  if (/^#mappe\b/.test(location.hash)) oeffnen();
  window.BL_MAPPE = { oeffnen, schliessen };
})();
