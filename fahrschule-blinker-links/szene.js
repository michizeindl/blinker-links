// „Blinker links“ – Szene aus Code (Platzhalter bis Phase 3): Fahrersicht mit Perspektiv-Straße, Kulisse je Umgebung
// (Stadt, Wohngebiet, Landstraße, Autobahn), Wetter/Licht (klar, Regen, Nebel, Nacht), Verkehr und Gefahren als
// einfache 3D-Körper, Cockpit (Dach, A-Säulen, Innen- und Außenspiegel, Kombiinstrument, Lenkrad mit Händen,
// Blinkerhebel, Bremspedal), Schulterblick, Hinweis-Pfeile, Fahrlehrer-Fuß.
// Perspektive: Kamera auf Augenhöhe über der Mitte der eigenen Spur; Bildpunkt y = Horizont + f·(Auge − Höhe)/z,
// x = Mitte + f·(x − Kamera + Kurve(z))/z. Kurve(z) = ½·K·z² (K = Krümmung an der aktuellen Stelle).
// Welt (W) und Ablauf stehen in spiel.js; hier wird nur gezeichnet und gemessen (Tipp-Flächen, Lage der Objekte).
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const P2 = Math.PI * 2;
  const SCHRIFT = "'Kanit', 'Segoe UI', Arial, sans-serif";
  const NAH = 2.6;                 // vorderster sichtbarer Straßenpunkt (m) – Motorhaube verdeckt den Rest
  const klemm = (v, a, b) => Math.max(a, Math.min(b, v));
  const misch = (a, b, p) => a + (b - a) * p;
  function zufall(k, salz, saat) { const x = Math.sin(k * 12.9898 + salz * 78.233 + saat * 3.17) * 43758.5453; return x - Math.floor(x); }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function abdunkeln(hex, f) { const [r, g, b] = hexRgb(hex); return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`; }
  function rgba(hex, a) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }

  // ---------- Farben ----------
  const HAUS = ['#e8dfcf', '#d9c7a9', '#efe9df', '#cdbca4', '#e3d3c3', '#d8d2c4', '#c9b49a', '#e9e2d0'];
  const DACH = ['#8b3d2e', '#6b4436', '#5a5f66', '#7a3a2c', '#4f4a48'];
  const AUTO = ['#b9bdc0', '#2f3a4a', '#f2f3f1', '#5f6366', '#8b1e1e', '#1d1f22', '#3c5a7a', '#6d7b5a', '#a39a8a'];
  const FELD = ['#c9b26b', '#7fa24f', '#8a6e4e', '#93ad5c', '#b9a35c', '#6f9447'];
  const HIMMEL = {
    klar: ['#6fa3d6', '#a9c8e4', '#dde8ee'], regen: ['#7d858d', '#9aa2a9', '#b9bfc3'],
    nebel: ['#c3c8cb', '#cdd1d3', '#d6d9da'], nacht: ['#05070c', '#0b1220', '#1a2233'],
    schnee: ['#aeb5bb', '#c4cace', '#d9dde0'], daemmerung: ['#26304a', '#5d5f7c', '#c98f6a'], abend: ['#5f86bd', '#d9ab78', '#f6d49a'],
  };
  // Bild-Anschluss (Phase 3): liegt ein Bild in bilder/<gruppe>/<name>.webp und steht es in BL_BILDER.vorhanden,
  // wird es statt des Code-Platzhalters gezeichnet (Fußpunkt unten Mitte, Breite in Metern aus der Anschlussliste)
  const BI = window.BL_BILDER || {};
  const NEBEL_FARBE = '#d3d7d8';

  // ---------- Layout (Cockpit-Maße und Tipp-Flächen) ----------
  function layout(B, H) {
    const quer = B > H * 1.15;
    // flach = Handy quer (Höhe bis ca. 430 px): Sprechblase neben dem Fahrlehrer, Einblendungen kleiner, Schulterblick nur in der Scheibe
    const L = { B, H, quer, flach: quer && H <= 430 };
    L.armaturen = Math.round(quer ? H * 0.66 : H * 0.6);            // Unterkante der Windschutzscheibe
    L.dach = Math.round(quer ? Math.max(20, H * 0.05) : Math.max(26, H * 0.04));
    L.hz = Math.round(L.dach + (L.armaturen - L.dach) * (quer ? 0.44 : 0.42));
    // Innenspiegel (unter der Anzeige des Rahmens)
    const sw = quer ? Math.min(B * 0.2, 190) : Math.min(B * 0.42, 210), sh = sw * 0.25;
    L.spiegelInnen = { x: B / 2 - sw / 2, y: Math.max(52, L.dach + 18), w: sw, h: sh };
    // Außenspiegel an den Rändern, knapp über dem Armaturenbrett
    const aw = quer ? Math.min(B * 0.09, 92) : Math.min(B * 0.17, 74), ah = aw * 0.68;
    L.spiegelL = { x: 4, y: L.armaturen - ah - (quer ? 8 : 14), w: aw, h: ah };
    L.spiegelR = { x: B - 4 - aw, y: L.spiegelL.y, w: aw, h: ah };
    // Lenkrad (Mitte unten), Kombiinstrument dahinter
    const R = quer ? Math.min(H * 0.34, B * 0.17) : Math.min(B * 0.4, H * 0.19);
    // Phase 4: Lenkrad mit Händen „zehn vor zwei“ etwas weiter ins Bild (Hände gut sichtbar); Kombi bleibt an seiner Stelle
    const cyAlt = H + R * (quer ? 0.3 : 0.2);
    L.lenkrad = { cx: B / 2, cy: H + R * (quer ? 0.3 : 0.03), r: R };   // quer: wie bisher (sonst verdeckt der Kranz den Tacho)
    const kr = quer ? Math.min(H * 0.12, 48) : Math.min(B * 0.15, (H - L.armaturen) * 0.18);
    L.kombi = { cx: B / 2, cy: Math.min(L.armaturen + kr * 1.25 + 8, cyAlt - R - kr * 0.2), r: kr };
    // Spielertest 29.10.2026: quer verdeckte der Lenkradkranz den unteren Teil des Tachos – Lenkrad so weit absenken, dass der Kranz
    // unter dem Kombi beginnt (nur wenn nötig, d. h. bei flachen Querformaten)
    // Kleine Runde 29.10.2026 (Spielertest quer: „km/h“ vom Lenkrad verdeckt): Oberkante des Lenkrad-Bildes liegt 1,144 R über der Mitte
    // (Bild ragt über den Kranz hinaus) – Lenkrad so tief, dass die Einheit unter der Tachozahl frei bleibt
    if (quer) L.lenkrad.cy = Math.max(L.lenkrad.cy, L.kombi.cy + kr + 4 + R, L.kombi.cy + kr * 0.78 + 7 + R * 1.144);
    // Blinkerhebel links, Bremse rechts (jeweils neben dem Lenkrad, gut mit dem Daumen erreichbar)
    const bw = quer ? 104 : Math.min(108, B * 0.29), bh = 46;
    const ky = quer ? L.armaturen + (H - L.armaturen) * 0.38 : L.armaturen + (H - L.armaturen) * 0.3;
    L.blinker = { x: quer ? B / 2 - R - bw - 18 : 10, y: ky, w: bw, h: bh };
    const pw = quer ? 78 : Math.min(78, B * 0.21), ph = quer ? Math.min(96, H - ky - 8) : Math.min(104, (H - L.armaturen) * 0.36);
    L.bremse = { x: quer ? B / 2 + R + 22 : B - pw - 10, y: ky - 4, w: pw, h: ph };
    // Licht (Abblenden/Licht an) links, Warnblinker rechts: hochkant über Blinker bzw. Bremse, quer daneben (Daumen-tauglich)
    const tw = quer ? 62 : Math.min(64, B * 0.18), th = 42;
    if (quer) { L.licht = { x: L.blinker.x - tw - 12, y: ky + 2, w: tw, h: th }; L.warn = { x: L.bremse.x + pw + 12, y: ky + 2, w: tw, h: th }; }
    else { const yk = ky - th - 10; L.licht = { x: 10, y: yk, w: tw, h: th }; L.warn = { x: B - 10 - tw, y: yk, w: tw, h: th }; }
    // Fahrlehrer (Bild oben rechts in der Scheibe, schirme.js) – Platz hier nur vermerkt
    L.fahrlehrer = { x: B - (quer ? 66 : 62), y: L.spiegelInnen.y + 2, r: quer ? 26 : 25 };
    L.scheibe = { y0: L.dach, y1: L.armaturen };
    return L;
  }

  // ---------- Zeichnen ----------
  let L = null, W = null, g = null;
  let mitte = 0, hz = 0, f = 1, kx = 0, K = 0, auge = 1.2;
  let lichter = [], zFern = 300, koerperListe = [];
  const hinten = [];   // nachts: Lichter erst nach der Dunkelheit zeichnen
  const xs = (x, z) => mitte + (x - kx + 0.5 * K * z * z) * f / z;
  const ys = (h, z) => hz + (auge - h) * f / z;
  const mpx = z => f / z;
  // nachts: was im Scheinwerferlicht ist (nah, auf der Straße), bleibt erkennbar
  // (Fernlicht reicht weiter, ohne Licht sieht man kaum etwas)
  const nachtF = z => klemm(1.15 - z / (W.licht === 'fern' ? 120 : W.licht === 'tag' ? 30 : 65), 0.3, 0.85);
  const dunkelHier = () => W.wetter === 'nacht';

  // Kulisse wird je Umgebung/Größe einmal als Silhouette vorbereitet
  const silhouetten = new Map();
  function silhouette(umg, wetter, breite) {
    const k = umg + wetter + Math.round(breite);
    if (silhouetten.has(k)) return silhouetten.get(k);
    const c = document.createElement('canvas'), hoch = 80;
    c.width = Math.round(breite * 2); c.height = hoch;
    const x = c.getContext('2d');
    const nacht = wetter === 'nacht';
    const farbe = nacht ? '#0b0f17' : wetter === 'nebel' ? 'rgba(160,168,170,.55)' : umg === 'autobahn' || umg === 'land' ? '#5f7a63' : '#7c8a86';
    x.fillStyle = farbe;
    let px = 0, n = 0;
    x.beginPath(); x.moveTo(0, hoch);
    while (px < c.width) {
      const r = zufall(n++, 5, umg.length);
      if (umg === 'stadt' || umg === 'wohngebiet') {
        // Dächer und ab und zu ein Kirchturm (Niederbayern)
        const w = 14 + r * 26, h = 10 + zufall(n, 7, 2) * 18;
        x.lineTo(px, hoch - h); x.lineTo(px + w / 2, hoch - h - 7); x.lineTo(px + w, hoch - h);
        if (r > 0.93) { x.lineTo(px + w, hoch - 52); x.lineTo(px + w + 4, hoch - 68); x.lineTo(px + w + 8, hoch - 52); x.lineTo(px + w + 8, hoch - h); px += 8; }
        px += w;
      } else {
        // Baumreihen und Waldränder, flach (keine Berge)
        const w = 6 + r * 14, h = 6 + zufall(n, 3, 4) * (r > 0.7 ? 18 : 9);
        x.quadraticCurveTo(px + w / 2, hoch - h * 1.6, px + w, hoch - h * 0.6);
        px += w;
      }
    }
    x.lineTo(c.width, hoch); x.closePath(); x.fill();
    silhouetten.set(k, c);
    return c;
  }

  // Himmel-Bilder (Bogen „Himmel“): je Wetter ein Streifen, Ausschnitt im Seitenverhältnis der Scheibe, wandert mit der Kurve
  const HIMMEL_BILD = { klar: 'klar', abend: 'abend', daemmerung: 'abend', nacht: 'nacht', nebel: 'nebel', regen: 'regen', schnee: 'nebel' };
  function himmelBild() {
    const name = W.wetter === 'klar' && (W.saat | 0) % 2 ? 'wolkig' : HIMMEL_BILD[W.wetter];
    const hi = name && bild('himmel', name);
    if (!hi) return false;
    const iw = hi.naturalWidth, ih = hi.naturalHeight, zh = hz + 4;
    const sw = Math.min(iw, ih * L.B / zh), rest = iw - sw;
    // hin und her statt Sprung (Streifen ist nicht nahtlos)
    let o = ((-W.kurvenSumme * 220 * sw / L.B + (W.saat || 0) * 97) % (2 * rest + 1) + 2 * rest + 1) % (2 * rest + 1);
    if (o > rest) o = 2 * rest - o;
    g.drawImage(hi, o, 0, sw, ih, 0, 0, L.B, zh);
    if (W.wetter === 'daemmerung') { g.fillStyle = 'rgba(24,30,58,.5)'; g.fillRect(0, 0, L.B, zh); }
    if (W.schnee) { g.fillStyle = 'rgba(225,230,234,.35)'; g.fillRect(0, 0, L.B, zh); }
    return true;
  }
  function himmel() {
    const h = HIMMEL[W.wetter] || HIMMEL.klar;
    const mitBild = himmelBild();
    if (!mitBild) {
      const v = g.createLinearGradient(0, 0, 0, hz + 4);
      v.addColorStop(0, h[0]); v.addColorStop(0.6, h[1]); v.addColorStop(1, h[2]);
      g.fillStyle = v; g.fillRect(0, 0, L.B, hz + 4);
    }
    if (W.wetter === 'klar' && !mitBild) {   // ein paar ruhige Wolken
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = 0; i < 5; i++) {
        const wx = ((zufall(i, 1, W.saat) * 1.6 - 0.3) * L.B - W.s * 0.02 * (i + 1)) % (L.B * 1.6);
        const x = wx < -L.B * 0.3 ? wx + L.B * 1.6 : wx, y = L.dach + 10 + zufall(i, 2, W.saat) * (hz - L.dach) * 0.5;
        const w = 40 + zufall(i, 3, W.saat) * 70;
        g.beginPath(); g.ellipse(x, y, w, w * 0.18, 0, 0, P2); g.fill();
        g.beginPath(); g.ellipse(x + w * 0.3, y - w * 0.08, w * 0.45, w * 0.16, 0, 0, P2); g.fill();
      }
    }
    if (W.wetter === 'nacht' && !mitBild) {   // Mond und Sterne
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 26; i++) g.fillRect(zufall(i, 4, 1) * L.B, L.dach + zufall(i, 5, 1) * (hz - L.dach) * 0.8, 1.2, 1.2);
      g.fillStyle = '#e8e6d8'; g.beginPath(); g.arc(L.B * 0.78, L.dach + (hz - L.dach) * 0.25, 9, 0, P2); g.fill();
    }
    if (W.wetter === 'abend') {   // tief stehende Sonne direkt über der Straße (Gegenlicht)
      const sx = mitte + (W.sonneX || 0) * L.B, sy = hz - 8, r = L.B * 0.05;
      const v = g.createRadialGradient(sx, sy, 0, sx, sy, L.B * 0.6);
      v.addColorStop(0, 'rgba(255,250,225,1)'); v.addColorStop(0.08, 'rgba(255,236,170,.9)'); v.addColorStop(0.35, 'rgba(255,200,120,.35)'); v.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = v; g.fillRect(0, 0, L.B, hz + 4);
      g.fillStyle = '#fffbea'; g.beginPath(); g.arc(sx, sy, r, 0, P2); g.fill();
    }
    // Silhouette am Horizont, verschiebt sich mit der Kurve (Bild-Anschluss kulisse/horizont-<umgebung>)
    const hb = bild('kulisse', 'horizont-' + W.umgebung) || (W.umgebung === 'land' || W.umgebung === 'autobahn' ? bild('kulisse', 'horizont-land') : null);
    if (hb && !dunkelHier()) {
      const hh = L.B * hb.height / hb.width, vs = ((-W.kurvenSumme * 220) % L.B + L.B) % L.B;
      if (W.wetter === 'nebel' || W.schnee || W.wetter === 'regen') g.globalAlpha = W.wetter === 'nebel' ? 0.25 : 0.7;
      g.drawImage(hb, -vs, hz - hh + 2, L.B, hh); g.drawImage(hb, L.B - vs, hz - hh + 2, L.B, hh);
      g.globalAlpha = 1;
      return;
    }
    const sil = silhouette(W.umgebung, W.wetter, L.B);
    const versatz = ((-W.kurvenSumme * 220) % L.B + L.B) % L.B;
    g.drawImage(sil, -versatz, hz - sil.height + 2, sil.width, sil.height);
  }

  // Boden und Straße
  function boden() {
    const umg = W.umgebung, nacht = W.wetter === 'nacht', nass = W.wetter === 'regen' || W.regen || W.schnee, schnee = W.schnee;
    const grund = schnee ? '#dfe4e5' : umg === 'stadt' ? '#8f8c86' : umg === 'wohngebiet' ? '#7d935c' : umg === 'autobahn' ? '#7b8f5a' : '#748f4e';
    g.fillStyle = nacht ? '#0d1110' : grund;
    g.fillRect(0, hz, L.B, L.armaturen - hz + 20);
    // Felder links und rechts (Landstraße, Autobahn): Flächen in verschiedenen Tönen bis zum Horizont
    if ((umg === 'land' || umg === 'autobahn') && !nacht && !schnee) {
      const laenge = 70;
      const k0 = Math.floor(W.s / laenge);
      for (let k = k0 + 6; k >= k0; k--) {
        for (const seite of [-1, 1]) {
          const z1 = k * laenge - W.s, z2 = z1 + laenge;
          if (z2 < NAH) continue;
          const a = Math.max(NAH, z1);
          const innen = seite > 0 ? 5 : -9, aussen = seite * 160;
          const farbe = FELD[Math.floor(zufall(k, seite > 0 ? 11 : 12, W.saat) * FELD.length)];
          g.fillStyle = nass ? abdunkeln(farbe, 0.8) : farbe;
          g.beginPath();
          g.moveTo(xs(innen, a), ys(0, a)); g.lineTo(xs(aussen, a), ys(0, a));
          g.lineTo(xs(aussen, z2), ys(0, z2)); g.lineTo(xs(innen, z2), ys(0, z2)); g.closePath(); g.fill();
        }
      }
    }
    // Straßenbelag: Streifen von fern nach nah (Kurve!)
    const q = strassenQuerschnitt();
    const asphalt = nacht ? '#1b1d21' : nass ? '#44484c' : umg === 'autobahn' ? '#65696d' : '#5b5f63';
    const zs = [];
    for (let z = zFern; z > NAH * 0.98; z /= 1.07) zs.push(z);
    zs.push(NAH * 0.95);
    const band = (x0, x1, farbe) => {
      g.fillStyle = farbe; g.beginPath();
      g.moveTo(xs(x0, zs[0]), ys(0, zs[0]));
      for (const z of zs) g.lineTo(xs(x0, z), ys(0, z));
      for (let i = zs.length - 1; i >= 0; i--) g.lineTo(xs(x1, zs[i]), ys(0, zs[i]));
      g.closePath(); g.fill();
    };
    if (q.gehweg) { band(q.gehweg[0][0], q.gehweg[0][1], nacht ? '#202224' : '#a9a7a1'); band(q.gehweg[1][0], q.gehweg[1][1], nacht ? '#202224' : '#a9a7a1'); }
    if (q.bankett) { band(q.bankett[0][0], q.bankett[0][1], nacht ? '#151613' : '#8b8a73'); band(q.bankett[1][0], q.bankett[1][1], nacht ? '#151613' : '#8b8a73'); }
    if (umg === 'land' && !W.kreis) band(4.6, 6.0, nacht ? '#141516' : nass ? '#6f6c66' : '#8e8a80');   // Radweg (lebende Strecke)
    if (umg === 'autobahn' && !W.kreis) band(W.spuren === 3 ? -21 : -17.4, W.spuren === 3 ? -12.8 : -9.2, asphalt);   // Gegenfahrbahn hinter der Mittelleitplanke
    band(q.links, q.rechts, asphalt);
    if (W.kreis) { band(q.links - 40, q.links - 0.5, nacht ? '#0f1410' : schnee ? '#e6eaeb' : '#7aa057'); band(q.links - 0.5, q.links, nacht ? '#3a3b3c' : '#d2d0c8'); }
    if (q.parken) band(q.parken[0], q.parken[1], nacht ? '#1f2125' : nass ? '#4b4f53' : '#63676b');
    if (nass) {   // nasser Glanz zum Horizont hin
      const gl = g.createLinearGradient(0, hz, 0, L.armaturen);
      gl.addColorStop(0, 'rgba(210,220,230,.35)'); gl.addColorStop(1, 'rgba(210,220,230,0)');
      g.fillStyle = gl; g.fillRect(0, hz, L.B, L.armaturen - hz);
    }
    // Bordsteine
    if (q.bord) for (const x of q.bord) linieDurchgehend(x, 0.18, nacht ? '#3a3b3c' : '#d2d0c8');
    // Flächen der Situation unter den Linien (Einfädelungsstreifen, Splitt, Laub, Pfütze …)
    for (const m of W.markierungen) if (m.unten) markierung(m, asphalt, '#ecece6');
    // Markierungen (Linien enden an Querstraßen: dort setzt markierung() die Lücken)
    const lf = nacht ? 'rgba(235,235,225,.75)' : '#ecece6';
    luecken = W.markierungen.filter(m => m.art === 'querstrasse' || m.art === 'einmuendung' || m.art === 'kreisel' || m.art === 'gleise').map(m => [m.pos - W.s - (m.art === 'kreisel' ? 0 : 0.6), m.pos - W.s + (m.breite || 8) + 0.6]);
    for (const x of q.durchgehend) linieDurchgehend(x, 0.14, lf);
    for (const [x, strich, luecke] of q.gestrichelt) linieGestrichelt(x, 0.14, lf, strich, luecke);
    if (schnee) { g.fillStyle = 'rgba(235,238,240,.55)'; g.fillRect(0, hz, L.B, 3); }
    // Markierungen der Situation (Zebrastreifen, Haltelinie, Querstraße)
    for (const m of W.markierungen) if (!m.unten) markierung(m, asphalt, lf);
  }
  let luecken = [];
  const inLuecke = (z1, z2) => luecken.some(([a, b]) => z2 > a && z1 < b);
  // Querschnitt der Straße je Umgebung (x in m, eigene Spurmitte = 0, rechts positiv)
  function strassenQuerschnitt() {
    // Kreisel: eine Fahrspur ohne Gegenverkehr, links die Mittelinsel, rechts Gehweg
    if (W.kreis) return { links: -2.4, rechts: 3.4, bord: [3.4, -2.4], gehweg: [[3.4, 6.2], [-2.4, -2.4]], durchgehend: [], gestrichelt: [] };
    switch (W.umgebung) {
      case 'stadt': return { links: -5.1, rechts: 3.9, parken: [1.75, 3.9], bord: [3.9, -5.1], gehweg: [[3.9, 6.6], [-7.6, -5.1]], durchgehend: [], gestrichelt: W.einbahn ? [] : [[-1.7, 3, 6]] };
      case 'wohngebiet': return { links: -4.7, rechts: 3.7, parken: [1.6, 3.7], bord: [3.7, -4.7], gehweg: [[3.7, 6.0], [-7.0, -4.7]], durchgehend: [], gestrichelt: [] };
      case 'autobahn': return W.spuren === 3
        ? { links: -9.85, rechts: 4.4, bankett: [[4.4, 5.6], [-11.1, -9.85]], durchgehend: [1.875, -9.375], gestrichelt: [[-1.875, 6, 12], [-5.625, 6, 12]] }
        : { links: -6.1, rechts: 4.4, bankett: [[4.4, 5.6], [-7.4, -6.1]], durchgehend: [1.875, -5.625], gestrichelt: [[-1.875, 6, 12]] };
      default: return { links: -5.6, rechts: 2.4, bankett: [[2.4, 3.6], [-6.8, -5.6]], durchgehend: W.ueberholverbot ? [1.85, -5.25, -1.7] : [1.85, -5.25], gestrichelt: W.ueberholverbot ? [] : [[-1.7, 6, 12]] };
    }
  }
  function linieDurchgehend(x, breite, farbe) {
    g.fillStyle = farbe;
    // Abschnitte ohne Lücken (Querstraßen): je Abschnitt ein Streifen
    const stuecke = [];
    let a = NAH * 0.95;
    for (const [l0, l1] of luecken.slice().sort((p, q) => p[0] - q[0])) { if (l1 <= a) continue; if (l0 > a) stuecke.push([a, Math.min(l0, zFern)]); a = Math.max(a, l1); }
    if (a < zFern) stuecke.push([a, zFern]);
    for (const [z0, z1] of stuecke) {
      if (z1 - z0 < 0.2) continue;
      g.beginPath();
      let erst = true;
      for (let z = z1; z > z0; z /= 1.08) { const p = xs(x - breite / 2, z), y = ys(0, z); if (erst) { g.moveTo(p, y); erst = false; } else g.lineTo(p, y); }
      g.lineTo(xs(x - breite / 2, z0), ys(0, z0));
      for (let z = z0; z < z1; z *= 1.08) g.lineTo(xs(x + breite / 2, z), ys(0, z));
      g.lineTo(xs(x + breite / 2, z1), ys(0, z1));
      g.closePath(); g.fill();
    }
  }
  function linieGestrichelt(x, breite, farbe, strich, luecke) {
    g.fillStyle = farbe;
    const takt = strich + luecke, v = W.s % takt;
    for (let z1 = -v; z1 < zFern; z1 += takt) {
      const a = Math.max(NAH * 0.95, z1), b = z1 + strich;
      if (b < NAH || inLuecke(a, b)) continue;
      g.beginPath();
      g.moveTo(xs(x - breite / 2, a), ys(0, a)); g.lineTo(xs(x + breite / 2, a), ys(0, a));
      g.lineTo(xs(x + breite / 2, b), ys(0, b)); g.lineTo(xs(x - breite / 2, b), ys(0, b)); g.closePath(); g.fill();
    }
  }
  function quadBoden(x0, x1, z0, z1, farbe) {
    z0 = Math.max(NAH * 0.95, z0); if (z1 <= z0) return;
    g.fillStyle = farbe; g.beginPath();
    g.moveTo(xs(x0, z0), ys(0, z0)); g.lineTo(xs(x1, z0), ys(0, z0)); g.lineTo(xs(x1, z1), ys(0, z1)); g.lineTo(xs(x0, z1), ys(0, z1)); g.closePath(); g.fill();
  }
  function markierung(m, asphalt, lf) {
    const z = m.pos - W.s;
    if (z > zFern || z < -12) return;
    const q = strassenQuerschnitt(), nacht = W.wetter === 'nacht';
    if (m.art === 'zebra') {
      for (let x = m.x0 != null ? m.x0 : -4.9; x < (m.x1 != null ? m.x1 : 1.6); x += 1.0) quadBoden(x, x + 0.5, z, z + 3.5, lf);
    } else if (m.art === 'haltelinie') {
      quadBoden(m.x0 != null ? m.x0 : -1.7, m.x1 != null ? m.x1 : 1.75, z, z + 0.5, lf);
    } else if (m.art === 'wartelinie') {   // gestrichelte Linie „Vorfahrt gewähren“
      for (let x = m.x0 != null ? m.x0 : -1.7; x < (m.x1 != null ? m.x1 : 1.75); x += 0.75) quadBoden(x, x + 0.45, z, z + 0.35, lf);
    } else if (m.art === 'querstrasse' || m.art === 'einmuendung') {
      // Einmündende Straße quer (Kreuzung): Belag nach links und/oder rechts, Bordsteine unterbrochen; Linien enden davor
      const br = m.breite || 8, li = m.seiten !== 'rechts', re = m.seiten !== 'links';
      quadBoden(li ? -60 : q.links, re ? 60 : q.rechts, z, z + br, asphalt);
      if (li) quadBoden(-60, q.links, z - 0.3, z, '#c9c7bf');
      if (re) quadBoden(q.rechts, 60, z - 0.3, z, '#c9c7bf');
      if (q.gehweg) {   // Gehweg-Ecken: Gehwege entlang der Querstraße (vorn und hinten), Bordstein zur Querstraße
        const gw = nacht ? '#202224' : '#a9a7a1', bd = nacht ? '#3a3b3c' : '#d2d0c8';
        for (const [s, ok] of [[1, re], [-1, li]]) {
          if (!ok) continue;
          const xa = s > 0 ? q.rechts : q.links, xb = s * 60;
          quadBoden(Math.min(xa, xb), Math.max(xa, xb), z + br, z + br + 2.6, gw); quadBoden(Math.min(xa, xb), Math.max(xa, xb), z + br, z + br + 0.18, bd);
          quadBoden(Math.min(xa, xb), Math.max(xa, xb), z - 2.6, z - 0.3, gw);
        }
      }
      if (m.halt) quadBoden(-1.7, 1.75, z - 1.1, z - 0.6, lf);
      if (m.warte) for (let x = -1.7; x < 1.75; x += 0.75) quadBoden(x, x + 0.45, z - 1.0, z - 0.65, lf);
    } else if (m.art === 'kreisel') {
      // Kreisverkehr: Fahrbahn rund um eine Mittelinsel (Platzhalter von vorn), Wartelinie an der Einfahrt
      const r = 7, mz = z + r + 4;
      quadBoden(-30, 30, z, z + 2 * r + 8, asphalt);
      g.fillStyle = nacht ? '#0f1410' : '#7aa057'; g.beginPath();
      for (let a = 0; a <= P2 + 0.01; a += P2 / 28) { const zz = mz + Math.sin(a) * r; if (zz < NAH) continue; g.lineTo(xs(-1.0 + Math.cos(a) * r, zz), ys(0, zz)); }
      g.closePath(); g.fill();
      g.strokeStyle = '#d6d4cc'; g.lineWidth = 1.5; g.stroke();
      for (let x = -1.7; x < 1.75; x += 0.75) quadBoden(x, x + 0.45, z - 0.6, z - 0.25, lf);
    } else if (m.art === 'gleise') {
      quadBoden(-60, 60, z, z + 4, nacht ? '#141414' : '#77736c');
      for (const dz of [1.2, 2.7]) quadBoden(-60, 60, z + dz, z + dz + 0.12, nacht ? '#3a3a3a' : '#bfc3c6');
      quadBoden(-1.7, 1.75, z - 2.4, z - 1.9, lf);
    } else if (m.art === 'flaeche') {
      // lose oder glatte Fläche auf der Fahrbahn (Platzhalter): Splitt, Erde, Laub, Matsch, Pfütze, Glätte
      const farbe = { splitt: 'rgba(150,140,120,.55)', erde: 'rgba(96,70,44,.6)', laub: 'rgba(170,110,40,.6)', matsch: 'rgba(225,228,230,.85)', pfuetze: 'rgba(120,140,160,.65)', glaette: 'rgba(205,225,240,.35)', wasser: 'rgba(130,150,170,.6)' }[m.stoff] || 'rgba(120,120,120,.4)';
      const x0 = m.x0 != null ? m.x0 : -1.8, x1 = m.x1 != null ? m.x1 : 1.8, len = m.laenge || 20;
      quadBoden(x0, x1, z, z + len, nacht ? 'rgba(30,30,30,.4)' : farbe);
      if (m.stoff === 'splitt' || m.stoff === 'laub' || m.stoff === 'erde') {
        g.fillStyle = m.stoff === 'laub' ? '#c87a2a' : m.stoff === 'erde' ? '#5a3e24' : '#d0c8b4';
        for (let i = 0; i < 70; i++) { const zz = z + zufall(i, 31, m.pos) * len; if (zz < NAH) continue; const s = Math.max(1, mpx(zz) * (m.stoff === 'laub' ? 0.18 : 0.07)); g.fillRect(xs(x0 + zufall(i, 32, m.pos) * (x1 - x0), zz), ys(0, zz) - s / 2, s, s * 0.6); }
      }
      if (m.stoff === 'matsch') { g.fillStyle = 'rgba(160,160,155,.6)'; for (let i = 0; i < 40; i++) { const zz = z + zufall(i, 33, 1) * len; if (zz < NAH) continue; const s = Math.max(1, mpx(zz) * 0.25); g.fillRect(xs(x0 + zufall(i, 34, 1) * (x1 - x0), zz), ys(0, zz) - s / 3, s, s / 3); } }
    } else if (m.art === 'spur') {
      // zusätzlicher Fahrstreifen (Ein-/Ausfädelungsstreifen) neben der Fahrbahn, mit Leitlinie
      const len = m.laenge || 200;
      const kante = m.x0 > 0 ? m.x0 : m.x1;
      quadBoden(m.x0 > 0 ? m.x0 - 0.2 : m.x0, m.x0 > 0 ? m.x1 : m.x1 + 0.2, z, z + len, asphalt);
      for (let zz = z; zz < z + len; zz += 4) { if (zz + 2 < NAH) continue; quadBoden(kante - 0.12, kante + 0.12, zz, zz + 2, lf); }
    }
  }

  // ---------- Kulisse (deterministisch je Abschnitt) ----------
  // keine Bäume/Häuser mitten in Querstraßen, Einmündungen, Kreiseln
  const inKreuzung = p => W.markierungen.some(m => (m.art === 'querstrasse' || m.art === 'einmuendung' || m.art === 'kreisel') && p > m.pos - 5 && p < m.pos + (m.art === 'kreisel' ? 32 : (m.breite || 8) + 5));
  function kulisse(liste) {
    const umg = W.umgebung, einfach = W.einfach;
    const gesperrt = pos => W.sperren.some(([a, b]) => pos > a && pos < b);
    if (umg === 'stadt' || umg === 'wohngebiet') {
      const stadt = umg === 'stadt', abst = stadt ? 14 : 22;
      // gestaltete Fassaden statt Code-Häuser (Phase 3); Code-Häuser nur, solange keine Fassadenbilder da sind
      const fass = fassadenReihen(liste, umg);
      const k0 = Math.floor((W.s - 30) / abst), k1 = Math.floor((W.s + zFern) / abst);
      for (let k = k0; k <= k1; k++) {
        for (const seite of [1, -1]) {
          const r = zufall(k, seite > 0 ? 1 : 2, W.saat), pos = k * abst;
          const x = seite > 0 ? (stadt ? 7.4 : 9.5 + r * 2) : (stadt ? -8.4 : -10.5 - r * 2);
          if (!fass && (stadt || r > 0.25)) liste.push({ typ: 'haus', x, pos, laenge: abst * (stadt ? 0.92 : 0.62), tiefe: 9, hoehe: stadt ? 8 + Math.floor(r * 3) * 3 : 6 + r * 2, farbe: HAUS[Math.floor(r * 97) % HAUS.length], dach: DACH[Math.floor(r * 31) % DACH.length], seite, k });
          if (!fass && !stadt && r < 0.6 && !einfach) liste.push({ typ: 'hecke', x: seite > 0 ? 6.4 : -7.4, pos: pos + 1, laenge: abst - 2, seite });
          if (!(fass && stadt) && r > (stadt ? 0.72 : fass ? 0.82 : 0.45) && (!einfach || r > 0.9) && !inKreuzung(pos + abst * 0.5)) liste.push({ typ: 'baum', x: seite > 0 ? (stadt ? 5.6 : fass ? 5.3 : 7.2) : (stadt ? -6.6 : fass ? -6.3 : -8.2), pos: pos + abst * 0.5, groesse: 0.8 + r * 0.6, k });
          // geparkte Autos am rechten Rand (wo die Situation nichts Eigenes hinstellt)
          if (seite > 0 && zufall(k, 9, W.saat) > (stadt ? 0.45 : 0.6) && !gesperrt(pos)) liste.push(autoGeparkt(k, pos + 3, stadt ? 2.85 : 2.7));
          if (seite < 0 && stadt && zufall(k, 13, W.saat) > 0.8 && !einfach) liste.push(passant(k, pos + 5, -6.2));
        }
        if (k % 3 === 0 && !einfach) liste.push({ typ: 'laterne', x: stadt ? 4.3 : 4.1, pos: k * abst + 6, seite: 1 });
      }
    } else if (umg === 'land') {
      const rand = randReihen(liste, umg);
      const abst = 50, k0 = Math.floor((W.s - 10) / abst), k1 = Math.floor((W.s + zFern) / abst);
      for (let k = k0; k <= k1; k++) {
        const pos = k * abst;
        liste.push({ typ: 'pfosten', x: 2.9, pos, seite: 1 }, { typ: 'pfosten', x: -6.3, pos: pos + 25, seite: -1 });
        const r = zufall(k, 3, W.saat);
        if (r > (einfach ? 0.8 : 0.45)) liste.push({ typ: 'baum', x: 6 + r * 8, pos: pos + 12, groesse: 1 + r * 0.8, k });
        if (zufall(k, 4, W.saat) > 0.55) liste.push({ typ: 'baum', x: -9 - zufall(k, 5, W.saat) * 8, pos: pos + 30, groesse: 1.1 + r * 0.6, k: k + 7 });
        if (!rand && zufall(k, 6, W.saat) > 0.93 && !einfach) liste.push({ typ: 'haus', x: 26, pos: pos + 5, laenge: 16, tiefe: 10, hoehe: 7, farbe: HAUS[k % HAUS.length], dach: DACH[k % DACH.length], seite: 1, k });
      }
    } else if (umg === 'autobahn') {
      randReihen(liste, umg);
      const abst = 40, k0 = Math.floor((W.s - 10) / abst), k1 = Math.floor((W.s + zFern) / abst);
      for (let k = k0; k <= k1; k++) {
        const pos = k * abst, r = zufall(k, 3, W.saat);
        if (r > (einfach ? 0.85 : 0.5)) liste.push({ typ: 'baum', x: 14 + r * 12, pos: pos + 10, groesse: 1.2 + r * 0.6, k });
        if (k % 25 === 0) liste.push({ typ: 'schild', art: 'blau', x: 6.2, pos, seite: 1 });
      }
      liste.push({ typ: 'leitplanke', x: 5.0, seite: 1 }, { typ: 'leitplanke', x: -6.8, seite: -1 });
    }
  }
  // ---------- Häuserzeilen aus gestalteten Fassaden (Phase 3, MZ 28.10.2026) ----------
  // Die Kulissen-Bögen sind in Abschnitte zerlegt (bilder/fassade/<umgebung>-*.webp, Höhe in m in BL_BILDER.MASSE). Je Straßenseite
  // entsteht aus dem Pool eine zufällige, aber feste Reihe (Saat der Situation) mit schmalen Fugen, Durchgängen und Einfahrten;
  // Querstraßen, Einmündungen, Kreisel, Gleise und Fahrzeuge, die aus einer Einfahrt kommen, schneiden die Reihe auf.
  // Fassaden = senkrechte Ebenen parallel zur Fahrtrichtung (Fußlinie auf der Hinterkante des Gehwegs), gezeichnet in schmalen
  // Streifen gleichmäßig in 1/z (≈ gleich breit auf dem Schirm) – so laufen Dach- und Fußlinie zum Fluchtpunkt der Straße.
  // Land/Autobahn: dieselbe Technik für Feld-, Wald-, Hof- und Lärmschutz-Streifen am Rand (RAND_PLAN), Brücken quer darüber.
  const FASSADE_X = { stadt: [6.7, -7.7], wohngebiet: [6.3, -7.3] };
  // je Seite: [Schlüssel, x (m), Wiederholungen [von, bis], Abstand danach (m) [von, bis], Gewicht]
  const RAND_PLAN = {
    land: {
      1: [['rand/land-mais', 13, [2, 4], [25, 70], 3], ['rand/land-getreide', 17, [1, 2], [20, 80], 3], ['rand/land-wald', 24, [1, 3], [30, 90], 2],
        ['rand/land-hof', 21, [1, 1], [40, 120], 2], ['rand/land-hopfen', 14, [2, 3], [30, 90], 2], ['rand/land-kapelle', 16, [1, 1], [60, 150], 1], ['rand/land-gewerbe', 24, [1, 1], [60, 160], 1]],
      '-1': [['rand/land-mais', -16, [2, 4], [25, 70], 3], ['rand/land-getreide', -20, [1, 2], [20, 80], 3], ['rand/land-wald', -28, [1, 3], [30, 90], 3],
        ['rand/land-hof', -26, [1, 1], [40, 120], 2], ['rand/land-hopfen', -18, [2, 3], [30, 90], 1], ['rand/land-kapelle', -20, [1, 1], [60, 150], 1]],
    },
    autobahn: {
      1: [['rand/autobahn-laermschutz', 8.4, [3, 8], [15, 60], 3], ['rand/autobahn-zaun', 8.8, [3, 6], [10, 40], 3], ['rand/autobahn-wald', 17, [1, 2], [20, 80], 3],
        ['rand/autobahn-rast', 38, [1, 1], [80, 200], 1], ['rand/autobahn-parkplatz', 32, [1, 1], [80, 200], 1]],
      '-1': [['rand/autobahn-wald', -28, [1, 2], [20, 90], 3], ['rand/autobahn-zaun', -24, [3, 6], [20, 60], 2]],
    },
  };
  const reihen = new Map();
  function reiheBauen(umg, seite, plan) {
    const key = umg + seite + '|' + W.saat + '|' + (plan ? 'r' : 'f');
    let r = reihen.get(key);
    if (!r) { if (reihen.size > 16) reihen.clear(); r = { teile: [], ende: Math.floor(W.s / 100) * 100 - 300, n: 0, zuletzt: [] }; reihen.set(key, r); }
    const bis = W.s + zFern + 80, salz = (seite > 0 ? 71 : 72) + (plan ? 10 : 0), zz = () => zufall(r.n++, salz, W.saat);
    while (r.ende < bis) {
      if (plan) {
        // Gruppe aus dem Plan nach Gewicht, mit Wiederholung (Lärmschutzwand, Maisfeld …), dann Abstand
        const da = plan.filter(e => BI.mass && BI.mass(e[0]));
        if (!da.length) return null;
        const summe = da.reduce((s, e) => s + e[4], 0);
        let w = zz() * summe, e = da[0];
        for (const x of da) { if ((w -= x[4]) <= 0) { e = x; break; } }
        if (r.zuletzt[0] === e[0] && da.length > 1) e = da[(da.indexOf(e) + 1) % da.length];
        r.zuletzt = [e[0]];
        const ms = BI.mass(e[0]), hoehe = ms.h, laenge = hoehe * ms.px[0] / ms.px[1];
        const wdh = e[2][0] + Math.floor(zz() * (e[2][1] - e[2][0] + 1)), x = e[1] + (Math.abs(e[1]) > 12 ? (zz() - 0.5) * 3 : 0);
        for (let i = 0; i < wdh; i++) { r.teile.push({ key: e[0], pos: r.ende, laenge, hoehe, x, vor: i ? 0 : 9, rand: true }); r.ende += laenge - 0.05; }
        r.ende += e[3][0] + zz() * (e[3][1] - e[3][0]);
      } else {
        const pool = BI.liste ? BI.liste('fassade/' + umg + '-') : [];
        if (!pool.length) return null;
        let i = Math.floor(zz() * pool.length), n = 0;
        while (r.zuletzt.includes(pool[i]) && n++ < 8) i = (i + 1) % pool.length;
        const k = pool[i], ms = BI.mass(k) || { h: 12, px: [3, 2] };
        r.zuletzt.push(k); if (r.zuletzt.length > Math.min(3, pool.length - 1)) r.zuletzt.shift();
        const hoehe = ms.h, laenge = hoehe * ms.px[0] / ms.px[1], rl = zz();
        // vorHoehe = Höhe des Nachbarn davor (Fable 29.10.2026): die Hausecke wird nur gezeichnet, wo sie herausragen kann
        r.teile.push({ key: k, pos: r.ende, laenge, hoehe, farbe: ms.farbe || '#cbbca6', vor: r.luecke == null ? 9 : r.luecke, vorHoehe: r.teile.length ? r.teile[r.teile.length - 1].hoehe : 0 });
        // meist geschlossene Zeile (Innenstadt), sonst Durchgang oder Einfahrt; im Wohngebiet lockerer
        // Fable 29.10.2026: geschlossene Zeile ohne Spalt (vorher 0,15 m – ergab einen Himmelsschlitz zwischen den Häusern)
        r.luecke = umg === 'stadt' ? (rl < 0.55 ? 0 : rl < 0.85 ? 1.2 + rl * 2 : 4 + rl * 3) : (rl < 0.3 ? 1 : 2.5 + rl * 5);
        // Garage/Nebengebäude als gelegentlicher Lückenfüller im Wohngebiet (29.10.2026): in einer Einfahrtslücke, 1,5 m zurückgesetzt;
        // eigener Zufall (zz bleibt unberührt, damit die übrige Reihe gleich bleibt)
        const gm = umg === 'wohngebiet' && r.luecke > 4 && BI.mass('hausseite/wohngebiet-garage');
        if (gm && zufall(r.teile.length, salz + 40, W.saat) < 0.25) {
          const gl = gm.h * gm.px[0] / gm.px[1], vorG = 0.9 + zufall(r.teile.length, salz + 41, W.saat) * 1.2;
          r.teile.push({ key: 'hausseite/wohngebiet-garage', pos: r.ende + laenge + vorG, laenge: gl, hoehe: gm.h, farbe: gm.farbe || '#e3dccd', vor: vorG, vorHoehe: hoehe, dx: 1.5 });
          r.luecke = vorG + gl + 1.2 + zufall(r.teile.length, salz + 42, W.saat) * 2;
        }
        r.ende += laenge + r.luecke;
      }
    }
    while (r.teile.length && r.teile[0].pos + r.teile[0].laenge < W.s - 60) r.teile.shift();
    return r;
  }
  // Lücken je Seite (absolute Positionen): Querstraßen, Einmündungen, Kreisel, Gleise, Brücken, Fahrzeuge aus Einfahrten
  function seitenLuecken(seite) {
    const l = [];
    for (const m of W.markierungen) {
      if (m.art === 'querstrasse' || m.art === 'einmuendung') {
        if ((seite < 0 && m.seiten !== 'rechts') || (seite > 0 && m.seiten !== 'links')) l.push([m.pos - 2.5, m.pos + (m.breite || 8) + 2.5]);
      } else if (m.art === 'kreisel') l.push([m.pos - 4, m.pos + 30]);
      else if (m.art === 'gleise') l.push([m.pos - 3, m.pos + 7]);
    }
    for (const o of W.objekte) {
      if (o._luecke === undefined) o._luecke = (o.typ === 'quer' || o.typ === 'fahrzeug') && Math.abs(o.x) > 4.6 && Math.abs(o.x) < 14 ? [o.pos - 5, o.pos + 6, Math.sign(o.x)] : null;
      if (o._luecke && o._luecke[2] === seite) l.push(o._luecke);
    }
    for (const b of bruecken) l.push([b - 26, b + 14]);
    return l;
  }
  // Teile der Reihe in die Zeichenliste, an Lücken zerschnitten
  function reiheEintragen(liste, r, seite, xFest) {
    const lu = seitenLuecken(seite).sort((a, b) => a[0] - b[0]);
    for (const t of r.teile) {
      let a = t.pos, schnitt = false;
      const b = t.pos + t.laenge;
      if (b < W.s - 2 || a > W.s + zFern) continue;
      const stuecke = [];
      for (const [l0, l1] of lu) { if (l1 <= a || l0 >= b) continue; if (l0 > a) stuecke.push([a, l0, schnitt]); a = Math.max(a, l1); schnitt = true; }
      if (a < b) stuecke.push([a, b, schnitt]);
      for (const [s0, s1, cut] of stuecke) {
        if (s1 - s0 < 1.5) continue;
        liste.push({ typ: 'fassade', teil: t, x: (xFest != null ? xFest : t.x) + seite * (t.dx || 0), pos: s0, laenge: s1 - s0, seite, wandVorn: !t.rand && (cut || t.vor > 0.6) });
      }
    }
  }
  const bruecken = [];
  function fassadenReihen(liste, umg) {
    bruecken.length = 0;
    if (!BI.liste || !BI.liste('fassade/' + umg + '-').length) return false;
    for (const seite of [1, -1]) { const r = reiheBauen(umg, seite, null); if (r) reiheEintragen(liste, r, seite, FASSADE_X[umg][seite > 0 ? 0 : 1]); }
    // Häuser der Querstraße (Phase-3-Korrektur): an jeder Querstraße/Einmündung/jedem Kreisel eine Häuserzeile quer zur Fahrtrichtung
    // hinter dem fernen Gehweg der Querstraße – so öffnet sich die Zeile sichtbar zur Kreuzung (Fassaden blicken zu uns)
    for (const m of W.markierungen) {
      const kr = m.art === 'kreisel', qs = m.art === 'querstrasse' || m.art === 'einmuendung';
      if (!kr && !qs) continue;
      const zq = (kr ? m.pos + 30 : m.pos + (m.breite || 8) + 2.5);
      if (zq - W.s > zFern || zq - W.s < -2) continue;
      for (const seite of [1, -1]) {
        if (qs && ((seite < 0 && m.seiten === 'rechts') || (seite > 0 && m.seiten === 'links'))) continue;
        liste.push({ typ: 'querreihe', pos: zq, seite, x0: FASSADE_X[umg][seite > 0 ? 0 : 1], umg, saat: Math.round(m.pos) * 2 + (seite > 0 ? 1 : 0) });
      }
    }
    return true;
  }
  function randReihen(liste, umg) {
    const plan = RAND_PLAN[umg];
    bruecken.length = 0;
    if (!BI.mass) return false;
    // Autobahn: ab und zu eine Brücke quer über die Fahrbahn (nicht in Bereichen der Situation)
    if (umg === 'autobahn' && BI.mass('rand/autobahn-bruecke')) {
      const k0 = Math.floor((W.s - 40) / 700), k1 = Math.floor((W.s + zFern) / 700);
      for (let k = k0; k <= k1; k++) {
        const pos = k * 700 + 260;
        if (zufall(k, 83, W.saat) > 0.5 && !W.sperren.some(([a, b]) => pos > a - 40 && pos < b + 40)) { bruecken.push(pos); liste.push({ typ: 'bruecke', x: -7.7, pos }); }
      }
    }
    if (!plan) return false;
    let da = false;
    for (const seite of [1, -1]) { const r = reiheBauen(umg, seite, plan[seite]); if (r) { reiheEintragen(liste, r, seite, null); da = true; } }
    return da;
  }
  // Kennzeichen (MZ, 28.10.2026): immer „BAG-“ + ein bis zwei Buchstaben + Leerzeichen + ein bis vier Ziffern, je Fahrzeug neu
  function kennzeichen(zz) {
    const r = zz || Math.random, b = 'ABCDEFGHJKLMNPRSTUVWXYZ', n = 1 + Math.floor(r() * 4);
    let ziffern = String(1 + Math.floor(r() * 9)); for (let i = 1; i < n; i++) ziffern += Math.floor(r() * 10);
    return 'BAG-' + b[Math.floor(r() * b.length)] + (r() < 0.6 ? b[Math.floor(r() * b.length)] : '') + ' ' + ziffern;
  }
  function autoGeparkt(k, pos, x) {
    let s = 0; const zz = () => zufall(k, 40 + s++, W.saat);
    return { kennzeichen: kennzeichen(zz), typ: 'fahrzeug', art: 'pkw', x, pos, farbe: AUTO[Math.floor(zufall(k, 21, W.saat) * AUTO.length)], laenge: 4.3, breite: 1.8, hoehe: 1.45, richtung: 1, geparkt: true,
      _vw: Math.floor(zufall(k, 25, W.saat) * 60) };   // feste Bild-Variante je Platz: die Kulisse wird jedes Bild neu gebaut (sonst Flackern, MZ 29.10.2026)
  }
  const PASSANTEN = ['fussgaenger', 'fussgaenger', 'frau', 'jogger', 'rollator', 'frau-kinderwagen', 'rollstuhl', 'brieftraegerin', 'kind-ranzen', 'frau-tasche', 'gehstock', 'spaziergaengerin', 'junge'];
  function passant(k, pos, x) {
    // Passanten auf dem Gehweg (lebende Strecke): verschiedene gestaltete Figuren, Code-Figur nur ohne Bild
    const figur = PASSANTEN[Math.floor(zufall(k, 24, W.saat) * PASSANTEN.length)];
    return { typ: 'person', figur, x, pos, hoehe: 1.65 + zufall(k, 23, 1) * 0.2, jacke: AUTO[Math.floor(zufall(k, 22, 2) * AUTO.length)], gehen: 0.6, richtung: 1, k, _vw: Math.floor(zufall(k, 26, W.saat) * 60) };
  }

  // ---------- Bild-Anschluss (Phase 3) ----------
  function bild(gruppe, name) { return BI.bild ? BI.bild(gruppe + '/' + name) : null; }
  // nachts abgedunkelte Kopie (einmal je Bild und Stufe, nicht in jedem Bild neu)
  const dunkelCache = new Map();
  let dunkelNr = 0;
  function bildDunkel(img, f) {
    if (!img._dk) img._dk = 'b' + (++dunkelNr);
    const k = img._dk + '@' + f.toFixed(1);
    if (dunkelCache.has(k)) return dunkelCache.get(k);
    const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(4,6,12,${1 - f})`; x.fillRect(0, 0, c.width, c.height);
    dunkelCache.set(k, c); return c;
  }
  // Schlüssel des Anschlusses je Objekt: o.bild oder aus Typ/Art/Blickrichtung abgeleitet (Liste: bilder.js, ANSCHLUESSE)
  function bildSchluessel(o) {
    if (o.bild) return o.bild;
    if (o.typ === 'fahrzeug') return (o.richtung < 0 ? 'gegenverkehr/' : 'fahrzeuge/') + (o.modell || o.art);
    if (o.typ === 'quer') return 'seitlich/' + o.art;
    if (o.typ === 'radler') return 'menschen/radler' + (o.richtung < 0 ? '-vorne' : '');
    if (o.typ === 'person') return 'menschen/' + (o.figur || (o.hoehe < 1.4 ? 'kind' : 'fussgaenger'));
    if (o.typ === 'reh' || o.typ === 'hund' || o.typ === 'wildschwein' || o.typ === 'pferd') return 'tiere/' + (o.typ === 'pferd' ? 'reiterin' : o.typ);
    return null;
  }
  // Kleine Runde 29.10.2026: Kontrast für ferne Verkehrsteilnehmer. Stärke wächst ab 16 m und ist ab 38 m voll.
  // Hinter dem Körper liegen zwei Schattenrisse (je Bild einmal erzeugt, höchstens 96 px, ohne Weichzeichner – shadowBlur kostete
  // im Test bis zu 60 % Bildrate): dunkel und ringsum etwas größer (Saum), hell und etwas nach oben versetzt (Lichtkante von oben).
  // So hebt er sich vor hellem (Himmel, Nebel) wie vor dunklem Grund (Asphalt, Wald, Nacht) ab. Einfache Darstellung: nur der Saum.
  function fernStaerke(z) { return W.fernAlt ? 0 : klemm((z - 16) / 22, 0, 1); }
  const SCHATTENRISS = new WeakMap();
  function schattenriss(img) {
    let r = SCHATTENRISS.get(img); if (r) return r;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, sk = Math.min(1, 96 / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * sk)), h = Math.max(1, Math.round(ih * sk));
    const machen = farbe => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h); x.globalCompositeOperation = 'source-in'; x.fillStyle = farbe; x.fillRect(0, 0, w, h); return c; };
    r = { dunkel: machen('#0b0d0f'), hell: machen('#fffdf6') }; SCHATTENRISS.set(img, r); return r;
  }
  function fernKante(img, st, x0, y0, w, h) {
    if (st <= 0 || w > 170 || h > 170) return;
    const r = schattenriss(img), ga = g.globalAlpha, e = 0.8 + 0.6 * st, nebel = W.wetter === 'nebel', nacht = dunkelHier();
    // Saum in zwei Stufen (außen schwächer) – wirkt weich statt wie ein aufgeklebter Rand
    g.globalAlpha = ga * (nebel ? 0.28 : 0.2) * st;
    for (const f of [1, 0.5]) g.drawImage(r.dunkel, x0 - e * f, y0 - e * f * 0.4, w + 2 * e * f, h + e * f * 1.4);
    if (!W.einfach) { g.globalAlpha = ga * (nacht ? 0.35 : nebel ? 0.4 : 0.65) * st; g.drawImage(r.hell, x0, y0 - e, w, h); }
    g.globalAlpha = ga;
  }
  function bildKoerper(o, z) {
    if (!BI.waehle || z < 1) return false;
    const k = bildSchluessel(o); if (!k) return false;
    // feste Variante je Objekt (pkw, pkw-2, pkw-3 …): einmal gewürfelt, bleibt während der Fahrt gleich
    if (o._vw == null) o._vw = Math.floor(Math.random() * 60);
    const wahl = BI.waehle(k, o._vw);
    if (!wahl) return false;
    const img = wahl.img, ms = wahl.mass || {}, slot = wahl.slot || { anker: [0.5, 1], breite: 1 };
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    // Maßstab: Fahrzeuge nach Breite (b), Menschen/Tiere nach Höhe (h), sonst Breite aus der Anschlussliste
    const m = mpx(z);
    let w, h;
    if (ms.h) { h = ms.h * m; w = h * iw / ih; } else { w = (ms.b || slot.breite || 1) * m; h = w * ih / iw; }
    // Letzte Runde 29.10.2026 (Spielertest: ferne Personen/Radler/Tiere schwer zu entdecken): in der Ferne etwas Mindestgröße
    // (höchstens +35 %) und ein weicher dunkler Saum für mehr Kontrast – ohne Markierung, die die Gefahr verrät
    const fernZiel = /^(menschen|tiere)\//.test(k) && z > 18;
    // Kleine Runde 29.10.2026 (Spielertest: Vorzeichen in der Ferne schwer erkennbar): Mindestgröße etwas höher (Menschen/Tiere bis +50 %,
    // Fahrzeuge ab 25 m bis +20 %) und Licht-/Schattenkante (fernKante) – für ALLE Verkehrsteilnehmer gleich, auch geparkte Autos und
    // Fehlalarm-Ziele, nur nach Entfernung: verrät nicht, was die Gefahr ist. W.fernAlt (nur Test) = Darstellung vorher.
    const fernVerkehr = /^(menschen|tiere|fahrzeuge|gegenverkehr|seitlich)\//.test(k);
    if (W.fernAlt) { if (fernZiel && ms.h) { const min = Math.min(h * 1.35, 12 * (ms.h / 1.8)); if (h < min) { w *= min / h; h = min; } } }
    else if (fernZiel && ms.h) { const min = Math.min(h * 1.5, 14 * (ms.h / 1.8)); if (h < min) { w *= min / h; h = min; } }
    else if (fernVerkehr && z > 25) { const min = Math.min(w * 1.2, 16 * (ms.b || slot.breite || 1.9) / 1.9); if (w < min) { h *= min / w; w = min; } }
    // Seitenansichten blicken im Bild nach links; wer nach rechts geht oder schaut, wird gespiegelt
    // quer: Front im Bild links; wer rückwärts fährt (licht.rueck), zeigt das Heck in Fahrtrichtung
    const spiegeln = o.typ === 'quer' ? (o.vx > 0) !== !!(o.licht && o.licht.rueck) : o.typ !== 'fahrzeug' && (o.vx > 0 || (!o.vx && o.blick > 0)) && slot.spiegeln !== false;
    const anker = slot.anker || [0.5, 1];
    const ax = xs(o.x, z), ay = ys(0, z) - (o.springt ? Math.abs(Math.sin(performance.now() / 140)) * 0.3 * m : 0);
    const x0 = ax - w * anker[0], y0 = ay - h * anker[1];
    const quelle = dunkelHier() ? bildDunkel(img, nachtF(z)) : img;
    g.save();
    if (spiegeln) { g.translate(ax * 2, 0); g.scale(-1, 1); }
    if (W.fernAlt) {
      if (fernZiel) { g.shadowColor = W.wetter === 'nebel' ? 'rgba(18,22,26,.7)' : 'rgba(0,0,0,.5)'; g.shadowBlur = klemm((z - 18) / 14, 1, 2.5); }
      g.drawImage(quelle, x0, y0, w, h);
    } else { if (fernVerkehr) fernKante(img, fernStaerke(z), x0, y0, w, h); g.drawImage(quelle, x0, y0, w, h); }
    g.restore();
    // leeres Kennzeichenschild im Bild: „BAG-…“ aus dem Code (Lage schild = [x, y, b, h] als Anteil des Bildes, je Bild gemessen)
    const schild = o.typ === 'fahrzeug' ? (wahl.mass ? ms.schild : slot.schild) : null;
    if (schild && h * schild[3] > 4) {
      const [sx, sy, sb, sh] = schild, px = x0 + w * sx, py = y0 + h * sy, pw = w * sb, ph = h * sh;
      const nacht = dunkelHier();
      // kein Schild im Bild sichtbar (z. B. Traktor von hinten): weißes Schild mit dunklem Rand aus dem Code
      if (ms.schildMalen) { g.fillStyle = nacht ? '#5a5c60' : '#f4f4f0'; g.strokeStyle = '#222'; g.lineWidth = Math.max(0.6, ph * 0.08); g.fillRect(px, py, pw, ph); g.strokeRect(px, py, pw, ph); }
      // Euro-Feld links (blau), Schrift schwarz, mittig im Rest; nachts gedämpft wie das Bild
      g.fillStyle = nacht ? '#0b1430' : '#1f3f9a'; g.fillRect(px + pw * 0.015, py + ph * 0.1, pw * 0.1, ph * 0.8);
      g.fillStyle = nacht ? '#3a3a36' : '#161616'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const kz = o.kennzeichen || (o.kennzeichen = kennzeichen());
      if (pw / ph < 2.6) {   // hohes Schild (Motorrad): zweizeilig „BAG-K“ / „417“
        const [o1, o2] = kz.split(' ');
        g.font = `600 ${ph * 0.38}px ${SCHRIFT}`;
        g.fillText(o1, px + pw * 0.56, py + ph * 0.3, pw * 0.82); g.fillText(o2 || '', px + pw * 0.56, py + ph * 0.72, pw * 0.82);
      } else { g.font = `600 ${ph * 0.74}px ${SCHRIFT}`; g.fillText(kz, px + pw * 0.56, py + ph * 0.54, pw * 0.82); }
    }
    if (o.rundum) rundum(ax, y0, m, o.rundum);
    // Lichter im Bild (lichter = [[x, y] links, [x, y] rechts], je Bild gemessen): Bremse, Blinker, Warnblinker, Scheinwerfer
    const lich = o.typ === 'fahrzeug' ? (ms.lichter || slot.lichter) : null;
    if (lich && o.licht) {
      const takt = window.BL_TAKT ? window.BL_TAKT.an() : true;
      lich.forEach(([lx, ly], i) => {
        const px = x0 + w * lx, py = y0 + h * ly, sei = i === 0 ? 'links' : 'rechts';
        if (o.licht.brems || (dunkelHier() && o.richtung > 0)) lichter.push({ x: px, y: py, r: w * 0.03, farbe: '#ff2a1a', schein: w * (o.licht.brems ? 0.12 : 0.06) });
        if ((o.licht.warn || o.licht.blink === sei) && takt) lichter.push({ x: px, y: py, r: w * 0.03, farbe: '#ffb21e', schein: w * 0.12 });
        if (o.richtung < 0 && (dunkelHier() || o.fernlicht)) lichter.push({ x: px, y: py, r: w * 0.04, farbe: '#fffbe8', schein: w * (o.fernlicht ? 0.5 : 0.2), nebel: o.fernlicht });
      });
    }
    o._box = [x0, y0, x0 + w, y0 + h];
    return true;
  }

  // ---------- Körper zeichnen ----------
  const LANG = { haus: 1, hecke: 1, gelaender: 1, fassade: 1 };   // Sortierung nach dem fernen Ende
  const BLEIBT_SICHTBAR = { fassade: 1, querreihe: 1, bruecke: 1,  fahrzeug: 1, zug: 1, augen: 1, lichtschein: 1, anzeige: 1, portal: 1, schild: 1, ampel: 1, haus: 1, baum: 1, leitplanke: 1, pfosten: 1, laterne: 1, hecke: 1, gelaender: 1, bake: 1, windsack: 1 };
  const NEBEL_SCHEMEN = { fahrzeug: 1, quer: 1, person: 1, radler: 1, reh: 1, hund: 1, wildschwein: 1, pferd: 1, schild: 1, ampel: 1, ball: 1 };
  function sichtAlpha(z, o) {
    const s = W.sichtWeite || W.sicht || 400;
    if (W.wetter === 'nebel') {
      const a = klemm(1.5 - z / (W.sicht || 70), 0, 1);   // letzte Runde: etwas früher erkennbar (vorher 1,35)
      // Kleine Runde 29.10.2026: Verkehrsteilnehmer und Schilder im Nebel nie ganz unsichtbar, solange sie nah genug sind (bis 2,3 × Sicht
      // höchstens 20 % Deckkraft) – für alle gleich, Nebel bleibt Nebel. Ausnahme: Rundumleuchte (eigenes Vorzeichen, siehe koerper).
      if (W.fernAlt || !o || !NEBEL_SCHEMEN[o.typ] || o.rundum) return a;
      return Math.max(a, 0.2 * klemm((2.3 - z / (W.sicht || 70)) / 0.8, 0, 1));
    }
    if (s >= 250 || (o && BLEIBT_SICHTBAR[o.typ])) return 1;
    return klemm(1.35 - z / (s * (W.licht === 'fern' ? 1.6 : 1)), 0, 1);
  }
  // senkrechte Fläche entlang der Straße (x fest, von z1 bis z2, Höhe h0..h1)
  function seitenFlaeche(x, z1, z2, h0, h1) {
    g.beginPath();
    g.moveTo(xs(x, z1), ys(h0, z1)); g.lineTo(xs(x, z2), ys(h0, z2)); g.lineTo(xs(x, z2), ys(h1, z2)); g.lineTo(xs(x, z1), ys(h1, z1)); g.closePath();
  }
  // senkrechte Fläche quer zur Straße (z fest, von x0 bis x1)
  function querFlaeche(x0, x1, z, h0, h1) {
    const a = xs(x0, z), b = xs(x1, z), y0 = ys(h0, z), y1 = ys(h1, z);
    g.beginPath(); g.rect(Math.min(a, b), y1, Math.abs(b - a), y0 - y1);
  }

  function haus(o, z) {
    const z1 = Math.max(0.9, z), z2 = z + o.laenge;
    if (z2 < 1) return;
    const nacht = W.wetter === 'nacht';
    const innen = o.x, aussen = o.x + o.seite * o.tiefe;
    // Fassade zur Straße
    g.fillStyle = nacht ? abdunkeln(o.farbe, 0.16) : abdunkeln(o.farbe, 0.92);
    seitenFlaeche(innen, z1, z2, 0, o.hoehe); g.fill();
    // Sockel
    g.fillStyle = nacht ? '#0e0f10' : 'rgba(0,0,0,.12)';
    seitenFlaeche(innen, z1, z2, 0, 0.6); g.fill();
    // Fenster (nur wenn groß genug)
    if (mpx(z2) * 1.1 > 2.2 || mpx(z1) > 6) {
      const stockwerke = Math.max(1, Math.floor(o.hoehe / 2.9));
      for (let st = 0; st < stockwerke; st++) {
        const h0 = 1.0 + st * 2.9, h1 = h0 + 1.35;
        for (let zz = z + 1.2; zz < z2 - 1; zz += 2.6) {
          if (zz + 1.1 < 1) continue;
          const licht = nacht && zufall(o.k * 7 + st, zz | 0, 3) > 0.6;
          g.fillStyle = licht ? '#e9c879' : nacht ? '#07090c' : 'rgba(58,72,84,.82)';
          seitenFlaeche(innen, Math.max(0.9, zz), zz + 1.1, h0, h1); g.fill();
        }
      }
    }
    // Dach (schräg nach hinten)
    const first = o.x + o.seite * o.tiefe * 0.5, dh = o.hoehe + 3;
    g.fillStyle = nacht ? '#08090a' : o.dach;
    g.beginPath();
    g.moveTo(xs(innen, z1), ys(o.hoehe, z1)); g.lineTo(xs(innen, z2), ys(o.hoehe, z2));
    g.lineTo(xs(first, z2), ys(dh, z2)); g.lineTo(xs(first, z1), ys(dh, z1)); g.closePath(); g.fill();
    // Giebel zur Kamera (wenn das Haus vor uns beginnt)
    if (z > 1) {
      g.fillStyle = nacht ? abdunkeln(o.farbe, 0.12) : abdunkeln(o.farbe, 0.78);
      g.beginPath();
      g.moveTo(xs(innen, z), ys(0, z)); g.lineTo(xs(innen, z), ys(o.hoehe, z)); g.lineTo(xs(first, z), ys(dh, z));
      g.lineTo(xs(aussen, z), ys(o.hoehe, z)); g.lineTo(xs(aussen, z), ys(0, z)); g.closePath(); g.fill();
    }
  }
  // Fassade/Randstreifen als Ebene parallel zur Straße (siehe kulisse): Streifen gleichmäßig in 1/z, Bildspalte linear in z
  // Fassadenbild passend zu Nacht/Regen/Schnee
  function fassadenBild(key, rand) {
    const img0 = BI.bild && BI.bild(key);
    if (!img0) return null;
    if (dunkelHier()) return (!rand && BI.bild(key + '-nacht')) || bildDunkel(img0, rand ? 0.1 : 0.22);
    if (W.wetter === 'regen' || W.regen) return bildDunkel(img0, 0.82);
    if (W.schnee) return bildDunkel(img0, 0.88);
    return img0;
  }
  // Häuserzeile der Querstraße: Fassaden nebeneinander in einer Ebene quer zur Fahrtrichtung (z fest), vom Eck nach außen
  function querreihe(o, z) {
    if (z < 1.5) return;
    const pool = BI.liste ? BI.liste('fassade/' + o.umg + '-') : [];
    if (!pool.length) return;
    const nebel = W.wetter === 'nebel';
    if (nebel) g.globalAlpha = sichtAlpha(z);
    let x = o.x0, n = 0;
    const unten = ys(0, z);
    while (Math.abs(x) < 80 && n < 9) {
      const k = pool[Math.floor(zufall(n, 91, o.saat) * pool.length)], ms = BI.mass(k) || { h: 12, px: [3, 2] }, img = fassadenBild(k, false);
      const breit = ms.h * ms.px[0] / ms.px[1], x2 = x + o.seite * breit;
      const a = xs(x, z), b = xs(x2, z), oben = ys(ms.h, z);
      if (Math.max(a, b) > -4 && Math.min(a, b) < L.B + 4) {
        if (img) g.drawImage(img, Math.min(a, b) - 0.4, oben, Math.abs(b - a) + 0.8, unten - oben);
        else { g.fillStyle = abdunkeln(ms.farbe || '#cbbca6', 0.8); g.fillRect(Math.min(a, b), ys(ms.h * 0.7, z), Math.abs(b - a), unten - ys(ms.h * 0.7, z)); }
      }
      x = x2 + o.seite * (zufall(n, 92, o.saat) < 0.6 ? 0.1 : 1.5 + zufall(n, 93, o.saat) * 2); n++;
    }
    // Sockelschatten auf dem Gehweg
    g.fillStyle = 'rgba(0,0,0,.14)'; querFlaeche(o.x0, o.x0 + o.seite * 80, z, 0, 0.35); g.fill();
    if (nebel) g.globalAlpha = 1;
  }
  // ---------- Häuser mit Tiefe (29.10.2026, Auftrag-Developer-Fassaden.md; Basis Fassaden-Vergleich Fable) ----------
  // Die Fassaden sind flache Ansichten. An jedem vorderen Ende, das herausragen kann (Lücke, Schnitt an Querstraße, höher als der
  // Nachbar davor), zeichnet hausecke() die Stirnseite des Hauses als Fläche quer zur Straße: eigene Seitenansicht (Bögen
  // fassaden-seite-*) oder Code-Körper aus Texturen (Bogen fassaden-texturen). Die nähere Fassade überdeckt später, was verdeckt wäre.
  // GEBAEUDE je Fassadenbild: traufe/first = Trauf-/Firsthöhe der Vorderansicht (Anteil der Bildhöhe); L/R = vorderes Ende links bzw.
  // rechts im Bild (linke Straßenseite zeigt das linke Bildende vorn, rechte Straßenseite das rechte), überschreibt traufe/first.
  // Je Ende: seite = Seitenansicht hausseite/<name> (Maße in SEITE) oder Code-Körper: lage 'giebel' (Giebeldreieck zur Kamera),
  // 'walm' (Walmfläche läuft nach hinten), 'laengs' (Traufseite, Dachfläche bis zum First in der Hausmitte), 'flach' (Flachdach, Mauer);
  // farbe = Putzfarbe dieses Endes, wenn die Seitenansicht eines anderen Hauses umgefärbt wird (Fenster, Gesimse bleiben),
  // putz = Wandfarbe der Code-Körper (Textur putz-hell eingefärbt), dach = Dachtextur (biber, ziegel, schiefer, blech), lang = Anteil der Bildlänge des
  // vorderen Hauses (laengs), tiefe = Haustiefe in m (sonst aus der Seitenansicht bzw. HAUS_TIEFE). null = kein Gebäude.
  // Farben der Code-Wände: Median der Vorderansicht am jeweiligen Ende gemessen (bilder/fassade, 29.10.2026), leicht geglättet.
  const GEBAEUDE = {
    'stadt-1': { traufe: 0.70, first: 0.96, L: { seite: 'stadt-1' }, R: { seite: 'stadt-cafe', farbe: '#dcd2c4', first: 0.98 } },
    'stadt-2': { traufe: 0.70, first: 0.97, L: { seite: 'stadt-2' }, R: { lage: 'flach', traufe: 0.71, putz: '#cfcfcf' } },
    'stadt-3': { traufe: 0.72, first: 0.98, L: { seite: 'stadt-3' }, R: { seite: 'stadt-2', farbe: '#b8ad9c', first: 1 } },
    'stadt-4': { traufe: 0.72, first: 0.99, L: { seite: 'stadt-4' }, R: { seite: 'stadt-haltestelle', farbe: '#d6d0c8', traufe: 0.70, first: 0.97 } },
    'stadt-cafe': { traufe: 0.70, first: 0.95, L: { seite: 'stadt-4', farbe: '#b76d5a', first: 0.92 }, R: { seite: 'stadt-cafe', first: 1 } },
    'stadt-haltestelle': { traufe: 0.70, first: 0.96, L: { seite: 'stadt-haltestelle' }, R: { seite: 'stadt-rathaus', farbe: '#d9c9a8', traufe: 0.68, first: 0.92 } },
    // Kirche: die Vorderansicht zeigt schon die Langseite – an den Enden steht nur die Friedhofsmauer (Seitenansicht Langhaus passt dort nicht)
    'stadt-kirche': { traufe: 0.12, first: 0.12, lage: 'flach', putz: '#cfc3a6', mauer: true },
    'stadt-rathaus': { traufe: 0.62, first: 0.80, seite: 'stadt-rathaus' },
    'wohngebiet-bauernhaus': { traufe: 0.60, first: 1, L: { seite: 'wohngebiet-bauernhaus', lage: 'laengs', lang: 0.8 }, R: { lage: 'laengs', traufe: 0.42, first: 0.62, putz: '#6b5238', dach: 'ziegel', lang: 0.25, tiefe: 7 } },
    'wohngebiet-doppelhaus': { traufe: 0.72, first: 0.97, L: { seite: 'wohngebiet-doppelhaus' }, R: { seite: 'wohngebiet-doppelhaus', farbe: '#ddd5c8' } },
    'wohngebiet-efh': { traufe: 0.53, L: { seite: 'wohngebiet-efh', lage: 'laengs', first: 0.97, lang: 0.48 }, R: { seite: 'wohngebiet-efh', farbe: '#e0dad0', lage: 'laengs', first: 0.93, lang: 0.42 } },
    'wohngebiet-kindergarten': { traufe: 0.63, first: 0.95, seite: 'wohngebiet-kindergarten', lage: 'laengs', lang: 0.36 },
    'wohngebiet-reihenhaus': { traufe: 0.72, first: 0.97, L: { seite: 'wohngebiet-reihenhaus' }, R: { seite: 'wohngebiet-reihenhaus', farbe: '#c4b8a6' } },
    'wohngebiet-schule': { traufe: 0.72, first: 0.93, seite: 'wohngebiet-schule' },
    'wohngebiet-spielplatz': null, 'wohngebiet-turnhalle': { traufe: 0.80, first: 0.97, seite: 'wohngebiet-turnhalle', lage: 'laengs', lang: 0.5, dach: 'blech' },
    // Garage/Nebengebäude (Lückenfüller im Wohngebiet, reiheBauen): Traufseite zur Straße, Giebel an den Enden
    'wohngebiet-garage': { traufe: 0.66, first: 1, lage: 'giebel', putz: '#e3dccd', dach: 'ziegel', tiefe: 6 },
  };
  // Seitenansichten (bilder/hausseite, am Bild gemessen 29.10.2026): wl/wr = Wandkanten (Anteil der Bildbreite, ohne Fallrohr/Überstand),
  // traufe/first = Traufe/First (Anteil der Bildhöhe von unten), dach 'flach' = Giebel liegt in der Wandebene, 'tief' = Dachteil des Bildes
  // läuft nach hinten (Walm, Traufseite), vorn = Bildkante zur Straße, ohneDach = Bild endet an der Traufe (Turnhalle: Pultdach im Bild,
  // Vorderansicht flaches Satteldach → Dach aus dem Code mit Textur dach).
  const SEITE = {
    'stadt-1': { wl: 0.07, wr: 0.90, traufe: 0.635, first: 0.98, dach: 'flach' },
    'stadt-2': { wl: 0.06, wr: 0.91, traufe: 0.635, first: 0.99, dach: 'flach' },
    'stadt-3': { wl: 0.13, wr: 0.91, traufe: 0.665, first: 0.99, dach: 'flach', vorn: 'r' },   // Erker links → nach hinten
    'stadt-4': { wl: 0.07, wr: 0.92, traufe: 0.775, first: 0.98, dach: 'tief' },
    'stadt-cafe': { wl: 0.05, wr: 0.94, traufe: 0.655, first: 0.97, dach: 'flach' },
    'stadt-haltestelle': { wl: 0.05, wr: 0.94, traufe: 0.655, first: 0.95, dach: 'flach' },
    'stadt-rathaus': { wl: 0.04, wr: 0.95, traufe: 0.665, first: 0.94, dach: 'tief' },
    'wohngebiet-bauernhaus': { wl: 0.09, wr: 0.90, traufe: 0.66, first: 0.92, dach: 'tief' },
    'wohngebiet-doppelhaus': { wl: 0.07, wr: 0.93, traufe: 0.555, first: 1, dach: 'flach' },
    'wohngebiet-efh': { wl: 0.05, wr: 0.94, traufe: 0.67, first: 0.93, dach: 'tief' },
    'wohngebiet-kindergarten': { wl: 0.04, wr: 0.955, traufe: 0.66, first: 1, dach: 'tief' },
    'wohngebiet-reihenhaus': { wl: 0.07, wr: 0.93, traufe: 0.60, first: 1, dach: 'flach' },
    'wohngebiet-schule': { wl: 0.04, wr: 0.955, traufe: 0.73, first: 0.99, dach: 'tief' },
    'wohngebiet-turnhalle': { wl: 0.0, wr: 0.97, traufe: 1, first: 1, ohneDach: true, vorn: 'r' },
  };
  const HAUS_TIEFE = 10;   // Haustiefe der Code-Körper (m)
  const DACH_KANTE = { biber: '#6e3326', ziegel: '#5a3424', schiefer: '#33363b', blech: '#55585c' };
  // Hilfsbilder (je einmal erzeugt): gespiegelt, Brandwand-Fassung, eingefärbter Putz, gekachelte Dachfläche
  const spiegelCache = new WeakMap(), brandCache = new WeakMap(), putzCache = new Map(), dachCache = new Map();
  function gespiegelt(img) {
    let c = spiegelCache.get(img);
    if (c) return c;
    c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(img, 0, 0);
    spiegelCache.set(img, c); return c;
  }
  // eingefärbter Putz (Textur putz-hell × Farbe × Helligkeit f) als Muster
  function putzMuster(farbe, f) {
    const k = farbe + '@' + f.toFixed(2);
    let p = putzCache.get(k);
    if (p) return p;
    const tex = BI.bild && BI.bild('textur/putz-hell');
    if (!tex) return null;
    const c = document.createElement('canvas'); c.width = tex.naturalWidth || tex.width; c.height = tex.naturalHeight || tex.height;
    const x = c.getContext('2d'); x.drawImage(tex, 0, 0);
    const [r, gg, b] = hexRgb(farbe), k8 = v => Math.round(Math.min(255, v * f * 1.08));
    x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgb(${k8(r)},${k8(gg)},${k8(b)})`; x.fillRect(0, 0, c.width, c.height);
    p = { c, muster: g.createPattern(c, 'repeat') };
    putzCache.set(k, p); return p;
  }
  // aktuellen Pfad mit Putz füllen, Kachel = 3 m breit in Entfernung z
  function putzFuellen(farbe, f, z, x0, y0) {
    const p = putzMuster(farbe, f);
    if (!p || !p.muster || !p.muster.setTransform) { g.fillStyle = abdunkeln(farbe, f); g.fill(); return; }
    const s = mpx(z) * 3 / p.c.width;
    p.muster.setTransform(new DOMMatrix([s, 0, 0, s, x0, y0]));
    g.fillStyle = p.muster; g.fill();
  }
  // Dachfläche: 8 Kacheln breit, 4 hoch (unten mit Traufkante/Rinne; Biberschwanz dann ca. 0,25 m), abgedunkelt mit f
  function dachBild(dach, f) {
    const k = dach + '@' + f.toFixed(2);
    let c = dachCache.get(k);
    if (c) return c;
    const tex = BI.bild && BI.bild('textur/dach-' + dach);
    if (!tex) return null;
    const tw = tex.naturalWidth || tex.width, th = tex.naturalHeight || tex.height, w = 96, h = Math.round(w * th / tw), ohne = 0.86, ho = Math.round(h * ohne);   // unten 14 % = Rinne
    c = document.createElement('canvas'); c.width = 8 * w; c.height = h + 3 * ho;
    const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      x.drawImage(tex, i * w, c.height - h, w, h);
      for (let j = 0; j < 3; j++) x.drawImage(tex, 0, 0, tw, th * ohne, i * w, c.height - h - (j + 1) * ho, w, ho + 1);
    }
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(4,6,12,${(1 - f).toFixed(2)})`; x.fillRect(0, 0, c.width, c.height);
    dachCache.set(k, c); return c;
  }
  // mittlere Putzfarbe der Wand einer Seitenansicht (Median im Wandbereich unter der Traufe, jeder 3. Punkt) – einmal je Bild
  const wandCache = new WeakMap();
  function wandMittel(img, S) {
    let m = wandCache.get(img);
    if (m) return m;
    m = [200, 190, 170];
    try {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, w, h).data, y0 = Math.round((1 - S.traufe) * h + 0.1 * h), y1 = Math.round(h * 0.85);
      const werte = [[], [], []];
      for (let y = y0; y < y1; y += 3) for (let i = Math.round(S.wl * w) + 4; i < S.wr * w - 4; i += 3) { const k = (y * w + i) * 4; if (d[k + 3] > 200) for (let j = 0; j < 3; j++) werte[j].push(d[k + j]); }
      if (werte[0].length) m = werte.map(l => { l.sort((p, q) => p - q); return l[l.length >> 1]; });   // Median: Fenster stören nicht
    } catch (e) { /* Bild nicht lesbar */ }
    wandCache.set(img, m); return m;
  }
  // Seitenansicht eines anderen Hauses umfärben (Putz → farbe; Fenster, Gesimse, Dach bleiben): Punkte nahe der Putzfarbe werden um den
  // Farbabstand verschoben (voll bis 30, weich bis 120 Abstand); nachts Zielfarbe wie die Nachtfassung (× 0,2/0,22/0,3) – einmal je Bild und Farbe
  const umfCache = new WeakMap();
  function umgefaerbt(img, S, farbe, nacht) {
    let mp = umfCache.get(img);
    if (!mp) umfCache.set(img, mp = new Map());
    let c = mp.get(farbe);
    if (c) return c;
    c = img;
    try {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const bild = x.getImageData(0, 0, w, h), d = bild.data, m = wandMittel(img, S), zu = hexRgb(farbe).map((v, j) => (nacht ? v * [0.2, 0.22, 0.3][j] : v));
      const dv = [zu[0] - m[0], zu[1] - m[1], zu[2] - m[2]];
      for (let k = 0; k < d.length; k += 4) {
        if (d[k + 3] < 20) continue;
        const ab = Math.abs(d[k] - m[0]) + Math.abs(d[k + 1] - m[1]) + Math.abs(d[k + 2] - m[2]), wt = klemm(1 - (ab - 30) / 90, 0, 1);
        if (wt > 0) { d[k] += wt * dv[0]; d[k + 1] += wt * dv[1]; d[k + 2] += wt * dv[2]; }
      }
      x.putImageData(bild, 0, 0); c = cv;
    } catch (e) { /* Bild nicht lesbar: unverändert */ }
    mp.set(farbe, c); return c;
  }
  // Seitenansicht als Brandwand: Wand unter der Traufe = Putz in der Mittelfarbe der Ansicht (keine Fenster), Giebel/Dach aus dem Bild
  function brandFassung(img, S, farbe) {
    let c = brandCache.get(img);
    if (c) return c;
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, p = putzMuster(farbe, 1);
    if (!p) return img;
    c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const e = Math.round((1 - S.traufe) * h), m = x.createPattern(p.c, 'repeat'), s = w * 0.35 / p.c.width;
    if (m.setTransform) m.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = m;
    x.fillRect(Math.round(S.wl * w) + 2, e + 2, Math.round((S.wr - S.wl) * w) - 4, Math.round(h * 0.93) - e);
    brandCache.set(img, c); return c;
  }
  // Bildstück (Spalten sx0..sx1, Zeilen sy0..sy1 des Originals) zwischen den Weltpunkten X0 (Spalte sx0) und X1 (Spalte sx1) in
  // Entfernung z zeichnen; liegt X1 auf dem Bildschirm links von X0, kommt die gespiegelte Fassung
  function quer(img, sx0, sx1, sy0, sy1, X0, X1, z, yo, yu) {
    const a = xs(X0, z), b = xs(X1, z), iw = img.naturalWidth || img.width;
    if (Math.max(a, b) < -2 || Math.min(a, b) > L.B + 2 || yu - yo < 0.3) return;
    if (a <= b) g.drawImage(img, sx0, sy0, sx1 - sx0, sy1 - sy0, a - 0.3, yo, b - a + 0.6, yu - yo);
    else g.drawImage(gespiegelt(img), iw - sx1, sy0, sx1 - sx0, sy1 - sy0, b - 0.3, yo, a - b + 0.6, yu - yo);
  }
  // Dachfläche nach hinten in waagerechten Streifen: Bildzeilen syE (Traufe, v = 0) bis syF (v = 1); je v Höhe h0→h1,
  // Entfernung z0→z1, Weltbreite xl0..xr0 (v = 0) nach xl1..xr1 (v = 1); Spalten sx0..sx1 liegen auf xl..xr
  function dachStreifen(img, sx0, sx1, syE, syF, xl0, xr0, xl1, xr1, h0, h1, z0, z1) {
    const yE = ys(h0, z0), yF = ys(h1, z1);
    if (yE - yF < 0.5) return;
    const n = klemm(Math.ceil((yE - yF) / 9), 1, W.einfach ? 2 : z0 > 40 ? 3 : 8);   // Bildrate: höchstens 8 Streifen, in der Ferne 3
    for (let i = 0; i < n; i++) {
      const v0 = i / n, v1 = (i + 1) / n, vm = (v0 + v1) / 2, zm = z0 + (z1 - z0) * vm;
      const yu = ys(h0 + (h1 - h0) * v0, z0 + (z1 - z0) * v0), yo = ys(h0 + (h1 - h0) * v1, z0 + (z1 - z0) * v1);
      const s0 = syE + (syF - syE) * v1, s1 = syE + (syF - syE) * v0;
      quer(img, sx0, sx1, s0, Math.max(s0 + 0.5, s1), xl0 + (xl1 - xl0) * vm, xr0 + (xr1 - xr0) * vm, zm, yo, yu + 0.6);
    }
  }
  function hausecke(o, t, z, nacht, nebel) {
    if (z < 1.2) return;
    const G = GEBAEUDE[t.key.slice(t.key.indexOf('/') + 1)];
    if (G === null) return;
    const E = Object.assign({ traufe: 0.72 }, G || {}, (o.seite > 0 ? (G || {}).R : (G || {}).L) || {});
    // ganz nah (wir fahren gerade vorbei) weich ausblenden
    const nah = klemm((z - 1.6) / 3.4, 0, 1);
    if (nah <= 0) return;
    const h = t.hoehe, hT = h * E.traufe, hF = Math.max(hT, h * (E.first || 1)), sg = o.seite;
    const nass = W.wetter === 'regen' || W.regen, f = nacht ? 0.7 : nass ? 0.6 : W.schnee ? 0.62 : 0.72;   // Schattenseite
    const brand = !o.wandVorn;   // geschlossene Zeile: nur über dem niedrigeren Nachbarn sichtbar → Brandwand ohne Fenster
    const unten = ys(0, z), yT = ys(hT, z), m = mpx(z), kante = klemm(m * 0.3, 1, 10);
    g.globalAlpha = (nebel ? sichtAlpha(z) : 1) * nah;
    const S = E.seite && SEITE[E.seite];
    let img0 = S ? BI.bild('hausseite/' + E.seite) : null;
    if (img0 && nacht) img0 = BI.bild('hausseite/' + E.seite + '-nacht') || bildDunkel(img0, 0.22);
    let tiefe = E.tiefe || HAUS_TIEFE, xl = o.x, xr = o.x + sg * tiefe;   // Wand von der Straßenkante (xl) nach hinten (xr)
    if (S && img0) {
      const iw = img0.naturalWidth || img0.width, ih = img0.naturalHeight || img0.height;
      if (E.farbe) img0 = umgefaerbt(img0, S, E.farbe, nacht);
      const wm = wandMittel(img0, S), wf = '#' + wm.map(v => Math.round(klemm(v, 0, 255)).toString(16).padStart(2, '0')).join('');
      const quelle = bildDunkel(brand ? brandFassung(img0, S, wf) : img0, f);
      const eRow = (1 - S.traufe) * ih, fRow = (1 - S.first) * ih, wallPx = (S.wr - S.wl) * iw, kW = hT / Math.max(1, ih - eRow);
      tiefe = E.tiefe || klemm(wallPx * kW, 6, 14);
      const kx = tiefe / wallPx, uS = S.vorn === 'r' ? S.wr * iw : S.wl * iw, d = S.vorn === 'r' ? -1 : 1;
      const X = u => o.x + sg * (u - uS) * d * kx;
      xr = o.x + sg * tiefe;
      quer(quelle, 0, iw, eRow, ih, X(0), X(iw), z, yT, unten);
      if (!S.ohneDach && eRow > 2) {
        const kR = (hF - hT) / Math.max(1, eRow - fRow), hOben = hT + eRow * kR;   // Zeilen über dem First (Kamin) im selben Maßstab
        if (S.dach === 'flach' || W.einfach || z > 70) quer(quelle, 0, iw, 0, eRow + 0.5, X(0), X(iw), z, ys(hOben, z), yT + 0.5);
        else {
          const rueck = E.lage === 'laengs' ? Math.min(9, t.laenge * (E.lang || 0.45) / 2) : tiefe * 0.45, vO = eRow / Math.max(1, eRow - fRow);
          dachStreifen(quelle, 0, iw, eRow, 0, X(0), X(iw), X(0), X(iw), hT, hOben, z, z + rueck * vO);
        }
      }
    } else {
      // Code-Körper: Wand aus eingefärbtem Putz
      const a = xs(xl, z), b = xs(xr, z), x0 = Math.min(a, b), w = Math.abs(b - a);
      if (w < 2 || x0 > L.B + 2 || x0 + w < -2) { g.globalAlpha = 1; return; }
      g.beginPath(); g.rect(x0 - 0.3, yT, w + 0.6, unten - yT); putzFuellen(E.putz || t.farbe || '#cbbca6', nacht ? 0.2 : f * 1.05, z, a, yT);
      g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x0 - 0.3, ys(0.5, z), w + 0.6, unten - ys(0.5, z));   // Sockel
      if (E.mauer) { g.fillStyle = nacht ? '#2a2a28' : '#9a9384'; g.fillRect(x0 - 0.3, yT - kante * 0.4, w + 0.6, kante * 0.9); }   // Mauerabdeckung
    }
    // Dach aus dem Code (Code-Körper, Turnhalle): Giebel, Walm, Traufseite, Flachdach
    if (!(S && img0) || S.ohneDach) {
      const lage = E.lage || 'giebel', dach = E.dach || 'biber', kf = nacht ? 0.25 : f * 1.15, rand = 0.35;
      const xm = (xl + xr) / 2, yF = ys(hF, z), a = xs(xl, z), b = xs(xr, z);
      const dbild = lage === 'laengs' || lage === 'walm' ? dachBild(dach, kf) : null;
      if (lage === 'giebel' && hF > hT + 0.3) {
        g.beginPath(); g.moveTo(a, yT + 0.5); g.lineTo(xs(xm, z), yF); g.lineTo(b, yT + 0.5); g.closePath();
        putzFuellen(E.putz || t.farbe || '#cbbca6', nacht ? 0.2 : f * 1.05, z, a, yT);
        g.strokeStyle = nacht ? '#141518' : abdunkeln(DACH_KANTE[dach] || '#6e3326', Math.min(1, f * 1.2)); g.lineWidth = kante * 1.3; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(xs(xl - sg * rand, z), ys(hT - 0.25, z)); g.lineTo(xs(xm, z), ys(hF + 0.12, z)); g.lineTo(xs(xr + sg * rand, z), ys(hT - 0.25, z)); g.stroke();
      } else if (dbild && hF > hT + 0.3) {
        const dw = dbild.width, dh = dbild.height, z0 = Math.max(1.05, z - 0.4);
        if (lage === 'laengs') {
          const rueck = Math.min(9, t.laenge * (E.lang || 0.45) / 2);
          dachStreifen(dbild, 0, dw, dh, 0, xl - sg * rand, xr + sg * rand, xl - sg * rand, xr + sg * rand, hT - 0.15, hF, z0, z + rueck);
        } else {   // Walm: Fläche verjüngt sich zum First
          dachStreifen(dbild, 0, dw, dh, 0, xl - sg * rand, xr + sg * rand, xm - sg * 0.6, xm + sg * 0.6, hT - 0.15, hF, z0, z + tiefe * 0.45);
        }
      } else if (lage === 'flach' && !E.mauer) {
        g.fillStyle = nacht ? '#1a1b1e' : abdunkeln(E.putz || '#cfcfcf', f * 0.8); g.fillRect(Math.min(a, b) - 0.3, yT - kante * 0.3, Math.abs(b - a) + 0.6, kante * 1.1);   // Attika
      }
    }
    if (!W.einfach) {
      // Traufschatten unter dem Dachüberstand und leichter Lichtsaum an der Hauskante zur Straße (tags)
      const a = xs(xl, z), b = xs(xr, z);
      if (!E.mauer && E.lage !== 'flach') { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(Math.min(a, b) - 0.3, yT, Math.abs(b - a) + 0.6, Math.max(1, m * 0.35)); }
      if (!nacht) { g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(a - 0.5, yT, 1, unten - yT); }
    }
    g.globalAlpha = 1;
  }
  function fassade(o, z) {
    const t = o.teil, z1 = Math.max(1.0, z), z2 = Math.min(zFern, z + o.laenge);
    if (z2 <= z1 + 0.05) return;
    const img0 = BI.bild && BI.bild(t.key);
    if (!img0) {   // Bild noch nicht geladen: schlichter Code-Körper in Größe und Mittelfarbe der Fassade
      if (!t.rand) haus({ x: o.x, seite: o.seite, tiefe: 9, hoehe: Math.min(11, t.hoehe * 0.7), laenge: o.laenge, farbe: t.farbe, dach: '#7a3a2c', k: 3 }, z);
      return;
    }
    const nacht = dunkelHier();
    let img = img0;
    if (nacht) img = (!t.rand && BI.bild(t.key + '-nacht')) || bildDunkel(img0, t.rand ? 0.1 : 0.22);
    else if (W.wetter === 'regen' || W.regen) img = bildDunkel(img0, 0.82);
    else if (W.schnee) img = bildDunkel(img0, 0.88);
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const p0 = o.pos - t.pos, nebel = W.wetter === 'nebel';
    // Hausecke zuerst (Vergleich Fable 29.10.2026): an jedem vorderen Ende, das herausragen kann (Lücke, Schnitt an Querstraße,
    // höher als der Nachbar davor) – die nähere Fassade überdeckt, was verdeckt wäre; so bleibt die Brandwand über niedrigeren
    // Nachbarn stehen und keine Scheibe steht frei. In geschlossener Zeile hinter einem gleich hohen Nachbarn entfällt sie (Zeichenzeit).
    if (!t.rand && (o.wandVorn || t.hoehe > (t.vorHoehe || 0) + 0.3)) hausecke(o, t, z, nacht, nebel);
    const xA = xs(o.x, z1), xB = xs(o.x, z2);
    const fein = W.einfach ? 10 : 4.5;   // Streifenbreite in px (Bildrate: 4× gedrosselte CPU 42 → einfach 48 Bilder/s)
    const n = Math.max(1, Math.min(W.einfach ? 40 : 150, Math.ceil(Math.abs(xA - xB) / fein)));
    const s1 = 1 / z1, s2 = 1 / z2;
    let Xa = xA, za = z1;
    for (let i = 1; i <= n; i++) {
      const zb = 1 / (s1 + (s2 - s1) * i / n), Xb = xs(o.x, zb);
      if (Math.max(Xa, Xb) >= -2 && Math.min(Xa, Xb) <= L.B + 2) {
        const ua = (p0 + za - z) / t.laenge, ub = (p0 + zb - z) / t.laenge;
        // rechte Seite: Bild links = fernes Ende; linke Seite: Bild links = vorderes Ende
        const qa = o.seite > 0 ? 1 - ub : ua, qb = o.seite > 0 ? 1 - ua : ub;
        const zm = (za + zb) / 2, oben = ys(t.hoehe, zm), unten = ys(0, zm);
        if (nebel) g.globalAlpha = sichtAlpha(zm);
        g.drawImage(img, Math.max(0, qa * iw), 0, Math.max(0.5, (qb - qa) * iw), ih, Math.min(Xa, Xb) - 0.35, oben, Math.abs(Xb - Xa) + 0.7, unten - oben);
      }
      Xa = Xb; za = zb;
    }
    if (nebel) g.globalAlpha = 1;
    // Fußschatten auf dem Gehweg entlang der Zeile (Vergleich Fable 29.10.2026): das Haus steht auf dem Boden statt davor zu schweben
    if (!t.rand && !W.einfach && !nacht && z1 < 80) quadBoden(Math.min(o.x, o.x - o.seite * 0.7), Math.max(o.x, o.x - o.seite * 0.7), z1, z2, 'rgba(0,0,0,.13)');
  }
  // Brücke quer über die Autobahn (Bogen Autobahn 1): Ebene quer zur Fahrtrichtung, Öffnung mittig über beiden Fahrbahnen
  function bruecke(o, z) {
    const img = BI.bild && BI.bild('rand/autobahn-bruecke'), ms = BI.mass && BI.mass('rand/autobahn-bruecke');
    if (!img || !ms || z < 1.5) return;
    const lang = ms.h * ms.px[0] / ms.px[1];
    const a = xs(o.x - lang / 2, z), b = xs(o.x + lang / 2, z), oben = ys(ms.h, z), unten = ys(0, z);
    g.drawImage(dunkelHier() ? bildDunkel(img, 0.12) : (W.wetter === 'regen' ? bildDunkel(img, 0.82) : img), a, oben, b - a, unten - oben);
  }
  function hecke(o, z) {
    const z1 = Math.max(0.9, z), z2 = z + o.laenge;
    if (z2 < 1) return;
    const hh = o.hoehe || 1.1;
    g.fillStyle = W.wetter === 'nacht' ? '#060a07' : (o.farbe || '#55703d');
    seitenFlaeche(o.x, z1, z2, 0, hh); g.fill();
    g.fillStyle = W.wetter === 'nacht' ? '#0a0f0b' : (o.oben || '#6a8a4b');
    seitenFlaeche(o.x, z1, z2, hh * 0.78, hh); g.fill();
    if (o.antippbar) o._box = [Math.min(xs(o.x, z1), xs(o.x, Math.min(z2, zFern))) - 10, ys(hh, Math.min(z2, 60)), Math.max(xs(o.x, z1), xs(o.x, Math.min(z2, 60))) + 10, ys(0, z1)];
  }
  // Laubbaum als vorab gezeichnetes Bild (Phase-3-Korrektur: statt Comic-Kreisen viele kleine Blattbüschel mit Licht und Schatten,
  // lichte Krone, verzweigter Stamm); drei Formen, einmal erzeugt
  const baumBilder = [];
  function baumBild(nr) {
    if (baumBilder[nr]) return baumBilder[nr];
    const c = document.createElement('canvas'); c.width = 160; c.height = 240;
    const x = c.getContext('2d'), rnd = (i, s) => zufall(i, 140 + s, nr + 3);
    // Stamm mit zwei Ästen
    x.strokeStyle = '#4a3c2e'; x.lineCap = 'round';
    x.lineWidth = 9; x.beginPath(); x.moveTo(80, 240); x.lineTo(79, 150); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.moveTo(79, 165); x.quadraticCurveTo(60, 140, 48, 110); x.moveTo(80, 158); x.quadraticCurveTo(100, 130, 112, 104); x.stroke();
    // Krone: Büschel in drei Helligkeiten, oben links heller (Licht), unten rechts dunkler
    const breit = [62, 54, 68][nr], hoch = [78, 92, 70][nr], cy = 98;
    const farben = [['#2f4a24', '#3b5a2b', '#4c6d35'], ['#557a3c', '#62874a', '#6e9450'], ['#7fa25c', '#91b36a', '#a3c27a']];
    for (let stufe = 0; stufe < 3; stufe++) {
      for (let i = 0; i < 560; i++) {
        const w = rnd(i + stufe * 600, 1) * Math.PI * 2, rr = Math.sqrt(rnd(i + stufe * 600, 2));
        let px = 80 + Math.cos(w) * breit * rr, py = cy + Math.sin(w) * hoch * 0.62 * rr;
        if (stufe > 0) { px -= 8 * stufe; py -= 10 * stufe; if (Math.hypot((px - 72) / breit, (py - cy + 10) / (hoch * 0.6)) > 0.95) continue; }
        if (rnd(i + stufe * 300, 5) < 0.06 && stufe === 0) continue;   // Lücken in der Krone
        x.fillStyle = farben[stufe][Math.floor(rnd(i + stufe * 300, 3) * 3)];
        x.beginPath(); x.ellipse(px, py, 2.5 + rnd(i, 4) * 3.5, 2 + rnd(i, 6) * 3, w, 0, Math.PI * 2); x.fill();
      }
    }
    return (baumBilder[nr] = c);
  }
  // Phase 4: gestaltete Bäume (Bögen „Bäume 1/2“) als Pool je Umgebung; Schnee = Winterbaum (+ Fichte), Laub auf der Fahrbahn = Herbst.
  // Höhe in m aus bilder-mass.json (h), je Objekt fest gewählt; Code-Baum nur, solange das Bild noch nicht geladen ist.
  const BAUM_POOL = {
    land: ['fichte', 'pappel', 'laub-1', 'laub-3', 'birke', 'obst', 'laub-1', 'fichte'],
    autobahn: ['fichte', 'pappel', 'laub-1', 'laub-3', 'birke', 'fichte'],
    wohngebiet: ['strauch', 'hecke', 'jung', 'laub-2', 'birke', 'obst', 'strauch'],
    stadt: ['jung', 'laub-1', 'laub-2', 'jung'],
  };
  function baumArt(o) {
    const laub = W.markierungen && W.markierungen.some(m => m.stoff === 'laub');
    const pool = W.schnee ? ['winter', 'winter', 'fichte'] : laub ? ['herbst', 'herbst', 'laub-3'] : (BAUM_POOL[W.umgebung] || BAUM_POOL.land);
    return pool[Math.floor(zufall(o.k || 0, 77, W.saat + (o.x > 0 ? 1 : 2)) * pool.length)];
  }
  function baum(o, z) {
    if (z < 1.2) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z), s = o.groesse;
    const nacht = W.wetter === 'nacht';
    const art = baumArt(o), bi = bild('baum', art), ms = bi && BI.mass && BI.mass('baum/' + art);
    if (bi && ms && ms.h) {
      const hoehe = ms.h * (0.8 + 0.3 * ((s * 7) % 1)) * m, breite = hoehe * bi.naturalWidth / bi.naturalHeight;
      const img = nacht ? bildDunkel(bi, 0.12) : (W.wetter === 'regen' || W.regen || W.wetter === 'nebel') ? bildDunkel(bi, 0.82) : bi;
      g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(x, y, breite * 0.3, Math.max(1, breite * 0.04), 0, 0, P2); g.fill();
      g.drawImage(img, x - breite / 2, y - hoehe, breite, hoehe);
      return;
    }
    const hoehe = 7.2 * s * m, breite = hoehe * 160 / 240;
    let img = baumBild((o.k || 0) % 3);
    if (nacht) img = bildDunkel(img, 0.12); else if (W.wetter === 'regen' || W.regen || W.wetter === 'nebel') img = bildDunkel(img, 0.82);
    // weicher Schatten am Boden
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, y, breite * 0.32, Math.max(1, breite * 0.05), 0, 0, P2); g.fill();
    g.drawImage(img, x - breite / 2, y - hoehe, breite, hoehe);
  }
  function laterne(o, z) {
    if (z < 1.2) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z);
    g.strokeStyle = W.wetter === 'nacht' ? '#15171a' : '#5b6065'; g.lineWidth = Math.max(1, 0.14 * m);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, ys(6, z)); g.lineTo(xs(o.x - 1.4, z), ys(6.1, z)); g.stroke();
    if (W.wetter === 'nacht') lichter.push({ x: xs(o.x - 1.4, z), y: ys(5.9, z), r: Math.max(2, 0.5 * m), farbe: '#ffe2a8', schein: 6 * m });
  }
  function pfosten(o, z) {
    if (z < 1.2) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z), w = Math.max(1, 0.12 * m), h = 1.0 * m;
    const nacht = W.wetter === 'nacht';
    g.fillStyle = nacht ? '#3a3c3e' : '#f1f1ec'; g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = '#111'; g.fillRect(x - w / 2, y - h * 0.82, w, h * 0.22);
    if (nacht && z < 90) lichter.push({ x, y: y - h * 0.72, r: Math.max(1, 0.06 * m), farbe: o.seite > 0 ? '#ff9f2e' : '#f4f4f4', schein: 0.5 * m, pfosten: true });
  }
  function leitplanke(o) {
    const nacht = W.wetter === 'nacht';
    g.fillStyle = nacht ? '#1d1f22' : '#a8adb1';
    // Tunnel (29.10.2026): im Tunnel keine Leitplanke (lief sonst von außen sichtbar durch die Öffnung bis zur Ausfahrt)
    const T = W.tunnelLage, stuecke = T ? [[NAH * 0.95, T.a - W.s], [T.e - W.s, zFern]] : [[NAH * 0.95, zFern]];
    for (const [za, zb] of stuecke) {
      const z0 = Math.max(NAH * 0.95, za), z1 = Math.min(zFern, zb);
      if (z1 <= z0 + 0.1) continue;
      g.beginPath();
      let erst = true;
      for (let z = z1; z > z0; z /= 1.07) { const p = xs(o.x, z), y = ys(0.75, z); if (erst) { g.moveTo(p, y); erst = false; } else g.lineTo(p, y); }
      g.lineTo(xs(o.x, z0), ys(0.75, z0)); g.lineTo(xs(o.x, z0), ys(0.45, z0));
      for (let z = z0 * 1.07; z < z1; z *= 1.07) g.lineTo(xs(o.x, z), ys(0.45, z));
      g.lineTo(xs(o.x, z1), ys(0.45, z1));
      g.closePath(); g.fill();
    }
  }

  // Fahrzeug als einfacher Körper: Heck (oder Front) zur Kamera, sichtbare Seite, Fenster, Räder, Lichter
  function fahrzeug(o, z) {
    if (z + o.laenge < 0.8) return;
    if (o.art === 'motorrad') return motorrad(o, z);
    const nacht = W.wetter === 'nacht';
    const zn = Math.max(0.9, z), zf = z + o.laenge;
    const links = o.x - o.breite / 2, rechts = o.x + o.breite / 2;
    const rel = o.x - kx;
    const art = o.art, H = o.hoehe;
    const pkwForm = ['pkw', 'van', 'paket', 'eiswagen', 'rettung', 'begleit', 'sportwagen'].includes(art), busForm = ['bus', 'schulbus', 'wohnmobil'].includes(art);
    const koerper = nacht ? abdunkeln(o.farbe, nachtF(z) * 0.8) : o.farbe, seite = nacht ? abdunkeln(o.farbe, nachtF(z) * 0.6) : abdunkeln(o.farbe, 0.8);
    const glas = nacht ? '#05070a' : 'rgba(40,52,62,.92)';
    const unten = pkwForm ? 0.22 : 0.45;
    // Schatten
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.beginPath(); g.moveTo(xs(links - 0.1, zn), ys(0, zn)); g.lineTo(xs(rechts + 0.1, zn), ys(0, zn)); g.lineTo(xs(rechts + 0.1, zf), ys(0, zf)); g.lineTo(xs(links - 0.1, zf), ys(0, zf)); g.closePath(); g.fill();
    // sichtbare Seite
    const sx = rel > 0.3 ? links : rel < -0.3 ? rechts : null;
    if (sx != null) {
      g.fillStyle = seite; seitenFlaeche(sx, zn, zf, unten, H * (pkwForm ? 0.62 : 1)); g.fill();
      if (pkwForm) {   // Kabine schmaler, mit Fenstern
        const k0 = z + o.laenge * (o.richtung > 0 ? 0.28 : 0.2), k1 = z + o.laenge * (o.richtung > 0 ? 0.8 : 0.72);
        g.fillStyle = glas; seitenFlaeche(sx, Math.max(0.9, k0), k1, H * 0.62, H * 0.95); g.fill();
      } else if (busForm) {
        g.fillStyle = glas; seitenFlaeche(sx, zn, zf - 0.6, H * 0.5, H * 0.86); g.fill();
      }
      // Räder
      g.fillStyle = '#111316';
      for (const rz of [z + 0.8, z + o.laenge - 0.9]) {
        if (rz < 1) continue;
        const m = mpx(rz), r = (art === 'pkw' ? 0.33 : 0.5) * m;
        g.beginPath(); g.ellipse(xs(sx, rz), ys(r / m, rz), r * 0.42, r, 0, 0, P2); g.fill();
      }
    }
    if (z < 0.9) return;   // Heck schon hinter der Kamera
    const m = mpx(z), x0 = xs(links, z), x1 = xs(rechts, z), w = x1 - x0;
    const y0 = ys(unten, z), yH = ys(H, z), yb = ys(0, z);
    // Räder unten am Heck
    g.fillStyle = '#121417';
    g.fillRect(x0 + w * 0.06, ys(0.62, z), w * 0.16, yb - ys(0.62, z)); g.fillRect(x1 - w * 0.22, ys(0.62, z), w * 0.16, yb - ys(0.62, z));
    if (art === 'traktor') return traktorHeck(o, z, x0, x1, yb, m, nacht);
    // Heck-/Frontfläche
    g.fillStyle = koerper;
    if (pkwForm) {
      g.beginPath();
      const sch = w * 0.12, yS = ys(H * 0.62, z);
      g.moveTo(x0, y0); g.lineTo(x0, yS); g.lineTo(x0 + sch, yH); g.lineTo(x1 - sch, yH); g.lineTo(x1, yS); g.lineTo(x1, y0); g.closePath(); g.fill();
      // Heckscheibe / Frontscheibe
      g.fillStyle = glas;
      g.beginPath(); g.moveTo(x0 + w * 0.08, ys(H * 0.66, z)); g.lineTo(x0 + sch + w * 0.04, ys(H * 0.94, z)); g.lineTo(x1 - sch - w * 0.04, ys(H * 0.94, z)); g.lineTo(x1 - w * 0.08, ys(H * 0.66, z)); g.closePath(); g.fill();
      if (o.insasse && !nacht) {   // Kopf im Auto (Vorzeichen „Tür geht auf“)
        g.fillStyle = '#2a2420'; g.beginPath(); g.arc(x0 + w * 0.3, ys(H * 0.8, z), Math.max(1.5, 0.12 * m), 0, P2); g.fill();
      }
      if (!nacht) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x0 + w * 0.1, ys(H * 0.92, z), w * 0.3, Math.max(1, 0.03 * m)); }
    } else {
      g.fillRect(x0, yH, w, y0 - yH);
      if (busForm || (o.richtung < 0 && !pkwForm && art !== 'traktor')) { g.fillStyle = glas; g.fillRect(x0 + w * 0.08, ys(H * 0.88, z), w * 0.84, ys(H * 0.55, z) - ys(H * 0.88, z)); }
      if (art === 'lkw') { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = Math.max(1, 0.03 * m); g.beginPath(); g.moveTo(x0 + w / 2, yH); g.lineTo(x0 + w / 2, y0); g.stroke(); }
    }
    // Stoßfänger
    g.fillStyle = nacht ? '#050505' : 'rgba(20,22,25,.85)';
    g.fillRect(x0, ys(unten + 0.25, z), w, ys(unten, z) - ys(unten + 0.25, z));
    // Kennzeichen (BAG-…, nur angedeutet)
    const kw = 0.52 * m, kh = 0.11 * m;
    if (kw > 4) { g.fillStyle = nacht ? '#3a3a36' : '#f1f1ea'; g.fillRect((x0 + x1) / 2 - kw / 2, ys(unten + 0.3, z) - kh, kw, kh); if (kw > 26) { g.fillStyle = '#222'; g.font = `600 ${kh * 0.8}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.kennzeichen || (o.kennzeichen = kennzeichen()), (x0 + x1) / 2, ys(unten + 0.3, z) - kh / 2); } }
    // Lichter
    const lh = pkwForm ? H * 0.55 : H * 0.25;
    const lw = Math.max(1.5, 0.22 * m), lhh = Math.max(1.2, 0.1 * m), ly = ys(lh, z);
    const t = performance.now() / 1000;
    const takt = window.BL_TAKT ? window.BL_TAKT.an() : Math.floor(t * 3) % 2 === 0;
    if (o.richtung > 0) {
      const brems = o.licht && o.licht.brems, warn = o.licht && o.licht.warn && takt;
      const rueck = o.licht && o.licht.rueck;
      const rot = brems ? '#ff2a1a' : nacht ? '#a3160e' : '#8e1a14';
      for (const [lx, sei] of [[x0 + w * 0.03, 'l'], [x1 - w * 0.03 - lw, 'r']]) {
        const blink = warn || (o.licht && o.licht.blink === (sei === 'l' ? 'links' : 'rechts') && takt);
        g.fillStyle = rot; g.fillRect(lx, ly, lw, lhh);
        if (blink) { g.fillStyle = '#ffb21e'; g.fillRect(lx + (sei === 'l' ? 0 : lw * 0.4), ly + lhh * 0.55, lw * 0.6, lhh * 0.45); lichter.push({ x: lx + lw / 2, y: ly + lhh * 0.7, r: lw * 0.5, farbe: '#ffb21e', schein: lw * 3 }); }
        if (brems || nacht) lichter.push({ x: lx + lw / 2, y: ly + lhh / 2, r: lw * 0.45, farbe: '#ff2a1a', schein: brems ? lw * 3 : lw * 1.6 });
        if (rueck) { g.fillStyle = '#f5f7ff'; g.fillRect(lx + lw * 0.2, ly + lhh, lw * 0.6, lhh * 0.6); lichter.push({ x: lx + lw / 2, y: ly + lhh * 1.3, r: lw * 0.4, farbe: '#ffffff', schein: lw * 2.5 }); }
      }
    } else {
      // Scheinwerfer (Gegenverkehr)
      for (const lx of [x0 + w * 0.06, x1 - w * 0.06 - lw]) {
        g.fillStyle = nacht || o.fernlicht ? '#fffbe8' : '#e4e8ea'; g.fillRect(lx, ly, lw, lhh);
        if (nacht || o.fernlicht || (o.licht && o.licht.an)) lichter.push({ x: lx + lw / 2, y: ly + lhh / 2, r: lw * 0.6, farbe: '#fffbe8', schein: lw * (o.fernlicht ? 12 : 5), nebel: o.fernlicht });
      }
    }
    // Zusätze: Rundumleuchte (orange/blau), Rettungswagen-Streifen, Vorbau (Mähdrescher), Warnblinker beim Gegenverkehr
    if (o.rundum) rundum((x0 + x1) / 2, yH, m, o.rundum);
    if (o.art === 'rettung' && !nacht) { g.fillStyle = '#d8352a'; g.fillRect(x0, ys(H * 0.42, z), w, Math.max(1, 0.18 * m)); }
    if (o.vorbau) { g.fillStyle = nacht ? '#202020' : (o.vorbauFarbe || '#c9a227'); g.fillRect(xs(o.x - o.vorbau / 2, z), ys(1.4, z), xs(o.x + o.vorbau / 2, z) - xs(o.x - o.vorbau / 2, z), ys(0.5, z) - ys(1.4, z)); }
    if (o.richtung < 0 && o.licht && o.licht.warn && takt) for (const lx of [x0, x1 - lw]) { g.fillStyle = '#ffb21e'; g.fillRect(lx, ly - lhh, lw, lhh); lichter.push({ x: lx + lw / 2, y: ly - lhh / 2, r: lw * 0.5, farbe: '#ffb21e', schein: lw * 3 }); }
    // Tür (geht auf: Fläche ragt in die Fahrbahn)
    if (o.tuer > 0.02) {
      const tz = z + o.laenge * 0.42, tl = 1.0, wink = o.tuer * 1.1;
      const tx0 = links, tx1 = links - Math.sin(wink) * tl, tz1 = tz - Math.cos(wink) * tl;
      if (tz1 > 0.9) {
        g.fillStyle = abdunkeln(o.farbe, nacht ? 0.3 : 0.95);
        g.beginPath(); g.moveTo(xs(tx0, tz), ys(0.3, tz)); g.lineTo(xs(tx1, tz1), ys(0.3, tz1)); g.lineTo(xs(tx1, tz1), ys(1.25, tz1)); g.lineTo(xs(tx0, tz), ys(1.25, tz)); g.closePath(); g.fill();
        g.fillStyle = glas; g.beginPath(); g.moveTo(xs(tx0, tz), ys(0.9, tz)); g.lineTo(xs(tx1, tz1), ys(0.9, tz1)); g.lineTo(xs(tx1, tz1), ys(1.2, tz1)); g.lineTo(xs(tx0, tz), ys(1.2, tz)); g.closePath(); g.fill();
      }
    }
    o._box = [Math.min(x0, xs(links, zf)), yH, Math.max(x1, xs(rechts, zf)), yb];
  }
  // Fahrzeug von der Seite (fährt quer zur Fahrbahn, z. B. aus einer Seitenstraße oder Einfahrt); Bild-Anschluss seitlich/<art>
  function fahrzeugQuer(o, z) {
    if (z < 1) return;
    const m = mpx(z), nacht = dunkelHier(), x0 = xs(o.x - o.laenge / 2, z), x1 = xs(o.x + o.laenge / 2, z), y = ys(0, z), H = o.hoehe;
    const farbe = nacht ? abdunkeln(o.farbe, nachtF(z) * 0.8) : o.farbe;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x0, y - 0.05 * m, x1 - x0, 0.1 * m);
    g.fillStyle = farbe; g.beginPath(); g.roundRect(x0, ys(H * (o.art === 'traktor' ? 0.9 : 0.6), z), x1 - x0, y - ys(H * 0.6, z) - 0.25 * m, 0.15 * m); g.fill();
    const vorn = o.vx < 0 ? x0 : x1, s = o.vx < 0 ? 1 : -1;
    if (o.art === 'traktor') { g.fillRect(vorn + s * (x1 - x0) * 0.45 - 0.6 * m, ys(H, z), 1.2 * m, ys(0.9, z) - ys(H, z)); g.fillStyle = nacht ? '#05070a' : 'rgba(40,52,62,.85)'; g.fillRect(vorn + s * (x1 - x0) * 0.45 - 0.45 * m, ys(H * 0.95, z), 0.9 * m, 0.7 * m); }
    else { g.beginPath(); g.moveTo(vorn + s * (x1 - x0) * 0.25, ys(H * 0.6, z)); g.lineTo(vorn + s * (x1 - x0) * 0.35, ys(H, z)); g.lineTo(vorn + s * (x1 - x0) * 0.85, ys(H, z)); g.lineTo(vorn + s * (x1 - x0) * 0.95, ys(H * 0.6, z)); g.fill(); g.fillStyle = nacht ? '#05070a' : 'rgba(40,52,62,.85)'; g.fillRect(vorn + s * (x1 - x0) * 0.38 - (s < 0 ? (x1 - x0) * 0.42 : 0), ys(H * 0.94, z), (x1 - x0) * 0.42, ys(H * 0.64, z) - ys(H * 0.94, z)); }
    g.fillStyle = '#111316';
    const rr = (o.art === 'traktor' ? 0.7 : 0.33) * m;
    for (const f of [0.18, 0.82]) { g.beginPath(); g.arc(x0 + (x1 - x0) * f, y - rr, rr, 0, P2); g.fill(); }
    if (o.licht && o.licht.rueck) { g.fillStyle = '#f5f7ff'; const hx = o.vx < 0 ? x1 : x0; g.fillRect(hx - 0.1 * m, ys(H * 0.5, z), 0.2 * m, 0.12 * m); lichter.push({ x: hx, y: ys(H * 0.48, z), r: 0.08 * m, farbe: '#ffffff', schein: 0.6 * m }); }
    if (o.rundum) rundum(vorn + s * (x1 - x0) * 0.45, ys(H, z), m, o.rundum);
    if (nacht || (o.licht && o.licht.an)) lichter.push({ x: vorn, y: ys(H * 0.45, z), r: 0.1 * m, farbe: '#fffbe8', schein: 1.5 * m });
    o._box = [Math.min(x0, x1), ys(H, z), Math.max(x0, x1), y];
  }
  function traktorHeck(o, z, x0, x1, yb, m, nacht) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    // große Hinterräder
    g.fillStyle = '#141414';
    const rr = 0.78 * m;
    g.fillRect(x0 - w * 0.05, yb - rr * 2, w * 0.26, rr * 2); g.fillRect(x1 - w * 0.21, yb - rr * 2, w * 0.26, rr * 2);
    // Kabine
    g.fillStyle = nacht ? '#2a0b08' : '#a8322a';
    g.fillRect(cx - w * 0.28, ys(2.5, z), w * 0.56, ys(1.0, z) - ys(2.5, z));
    g.fillStyle = nacht ? '#040506' : 'rgba(40,52,62,.85)';
    g.fillRect(cx - w * 0.22, ys(2.4, z), w * 0.44, ys(1.4, z) - ys(2.4, z));
    g.fillStyle = '#222'; g.fillRect(cx - w * 0.3, ys(2.62, z), w * 0.6, ys(2.5, z) - ys(2.62, z));
    // Rundumleuchte
    const t = performance.now() / 1000, an = 0.5 + 0.5 * Math.sin(t * 9);
    const bx = cx + w * 0.2, by = ys(2.75, z);
    g.fillStyle = `rgba(255,${140 + an * 60},20,${0.6 + an * 0.4})`; g.fillRect(bx - 0.08 * m, by, 0.16 * m, 0.12 * m);
    lichter.push({ x: bx, y: by + 0.06 * m, r: Math.max(1.5, 0.08 * m), farbe: '#ffa21e', schein: (1.2 + an * 2.5) * m, nebel: true });
    // Rücklichter
    for (const lx of [x0 + w * 0.02, x1 - w * 0.08]) { g.fillStyle = '#9a1a12'; g.fillRect(lx, ys(0.9, z), w * 0.06, 0.1 * m); if (nacht || W.wetter === 'nebel') lichter.push({ x: lx + w * 0.03, y: ys(0.85, z), r: 0.06 * m, farbe: '#ff2a1a', schein: 0.6 * m }); }
    o._box = [x0 - w * 0.05, ys(2.8, z), x1 + w * 0.05, yb];
  }

  function person(o, z) {
    if (z < 1) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z), h = o.hoehe * m;
    const t = performance.now() / 1000, sw = o.gehen ? Math.sin(t * 8 * o.gehen + (o.k || 0)) * 0.22 : 0;
    const nacht = W.wetter === 'nacht';
    const b = 0.42 * m * (o.hoehe / 1.7);
    const dunkel = c => nacht ? abdunkeln(c, nachtF(z)) : c;
    // Schatten
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, b * 0.7, b * 0.16, 0, 0, P2); g.fill();
    // Beine
    g.strokeStyle = dunkel('#2b3340'); g.lineWidth = Math.max(1, b * 0.28); g.lineCap = 'round';
    const hu = y - h * 0.48;
    g.beginPath(); g.moveTo(x - b * 0.12, hu); g.lineTo(x - b * 0.12 + sw * h * 0.35, y - b * 0.05);
    g.moveTo(x + b * 0.12, hu); g.lineTo(x + b * 0.12 - sw * h * 0.35, y - b * 0.05); g.stroke();
    // Körper
    g.fillStyle = dunkel(o.jacke || '#3c5a7a');
    g.beginPath(); g.roundRect(x - b * 0.5, y - h * 0.84, b, h * 0.4, b * 0.25); g.fill();
    if (o.ranzen) { g.fillStyle = dunkel(o.ranzen); g.beginPath(); g.roundRect(x - b * 0.42, y - h * 0.8, b * 0.84, h * 0.24, b * 0.15); g.fill(); }
    // Arme
    g.strokeStyle = dunkel(o.jacke || '#3c5a7a'); g.lineWidth = Math.max(1, b * 0.22);
    g.beginPath(); g.moveTo(x - b * 0.48, y - h * 0.78); g.lineTo(x - b * 0.55 - sw * h * 0.2, y - h * 0.52);
    g.moveTo(x + b * 0.48, y - h * 0.78); g.lineTo(x + b * 0.55 + sw * h * 0.2, y - h * 0.52); g.stroke();
    // Kopf
    g.fillStyle = dunkel('#e2b996'); g.beginPath(); g.arc(x, y - h * 0.91, b * 0.32, 0, P2); g.fill();
    g.fillStyle = dunkel(o.haar || '#4a3426'); g.beginPath(); g.arc(x, y - h * 0.93, b * 0.33, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    if (nacht && o.reflektor) lichter.push({ x, y: y - h * 0.6, r: b * 0.2, farbe: '#e8f0ff', schein: b * 0.8 });
    // Zubehör: Warnweste, Kelle (Schülerlotse), Schirm, Kinderwagen, Rollator, E-Scooter
    if (o.weste) { g.fillStyle = dunkel(o.weste); g.fillRect(x - b * 0.45, y - h * 0.8, b * 0.9, h * 0.08); g.fillRect(x - b * 0.45, y - h * 0.62, b * 0.9, h * 0.06); }
    if (o.kelle) { g.strokeStyle = dunkel('#ddd'); g.lineWidth = Math.max(1, b * 0.08); g.beginPath(); g.moveTo(x + b * 0.55, y - h * 0.55); g.lineTo(x + b * 0.9, y - h * 0.95); g.stroke(); g.fillStyle = dunkel('#c8241b'); g.beginPath(); g.arc(x + b * 0.95, y - h * 1.0, b * 0.22, 0, P2); g.fill(); g.fillStyle = WEISS; g.beginPath(); g.arc(x + b * 0.95, y - h * 1.0, b * 0.13, 0, P2); g.fill(); }
    if (o.schirm) { g.fillStyle = dunkel(o.schirm); g.beginPath(); g.ellipse(x, y - h * 1.0, b * 1.0, b * 0.45, 0, Math.PI, 0); g.fill(); }
    const s = o.vx < 0 ? -1 : 1;
    if (o.wagen) { const wx = x + s * b * 1.1; g.fillStyle = dunkel('#3a4a5a'); g.beginPath(); g.roundRect(wx - b * 0.45, y - h * 0.6, b * 0.9, h * 0.32, b * 0.2); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(wx - b * 0.3, y - b * 0.1, b * 0.12, 0, P2); g.arc(wx + b * 0.3, y - b * 0.1, b * 0.12, 0, P2); g.fill(); }
    if (o.rollator) { const wx = x + s * b * 0.8; g.strokeStyle = dunkel('#8a9097'); g.lineWidth = Math.max(1, b * 0.08); g.strokeRect(wx - b * 0.35, y - h * 0.5, b * 0.7, h * 0.5); }
    if (o.roller) { g.strokeStyle = '#222'; g.lineWidth = Math.max(1, b * 0.1); g.beginPath(); g.moveTo(x - b * 0.4, y); g.lineTo(x + b * 0.4, y); g.moveTo(x, y); g.lineTo(x, y - h * 0.62); g.stroke(); }
    o._box = [x - b * (o.wagen ? 1.6 : 0.7), y - h * (o.schirm || o.kelle ? 1.1 : 1), x + b * (o.wagen ? 1.6 : 0.7), y];
  }
  function ball(o, z) {
    if (z < 1) return;
    const m = mpx(z), x = xs(o.x, z), r = (o.r || 0.12) * m, y = ys(0, z) - r;   // o.r: Einführung größer (MZ, 29.10.2026)
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + r, r, r * 0.25, 0, 0, P2); g.fill();
    g.fillStyle = W.wetter === 'nacht' ? '#401010' : '#d8352a'; g.beginPath(); g.arc(x, y, r, 0, P2); g.fill();
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.arc(x, y, r, o.dreh || 0, (o.dreh || 0) + 1.2); g.lineTo(x, y); g.fill();
    g.beginPath(); g.arc(x, y, r, (o.dreh || 0) + Math.PI, (o.dreh || 0) + Math.PI + 1.2); g.lineTo(x, y); g.fill();
    o._box = [x - r * 2, y - r * 2, x + r * 2, y + r * 2];
  }
  function reh(o, z) {
    if (z < 1) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z), d = o.blick || 1;
    const t = performance.now() / 1000, spr = o.springt ? Math.abs(Math.sin(t * 7)) * 0.35 * m : 0;
    const nacht = W.wetter === 'nacht';
    const fell = nacht ? abdunkeln('#8a5a34', nachtF(z)) : '#8a5a34';
    g.save(); g.translate(x, y - spr); g.scale(d, 1);
    g.strokeStyle = fell; g.lineWidth = Math.max(1, 0.07 * m); g.lineCap = 'round';
    g.beginPath(); g.moveTo(-0.4 * m, -0.5 * m); g.lineTo(-0.45 * m, 0); g.moveTo(-0.25 * m, -0.5 * m); g.lineTo(-0.2 * m, 0);
    g.moveTo(0.35 * m, -0.5 * m); g.lineTo(0.42 * m, 0); g.moveTo(0.22 * m, -0.5 * m); g.lineTo(0.18 * m, 0); g.stroke();
    g.fillStyle = fell; g.beginPath(); g.ellipse(0, -0.65 * m, 0.55 * m, 0.22 * m, 0, 0, P2); g.fill();
    g.beginPath(); g.moveTo(0.38 * m, -0.75 * m); g.lineTo(0.55 * m, -1.15 * m); g.lineTo(0.68 * m, -1.1 * m); g.lineTo(0.52 * m, -0.68 * m); g.fill();
    g.beginPath(); g.ellipse(0.66 * m, -1.17 * m, 0.16 * m, 0.08 * m, 0.3, 0, P2); g.fill();
    g.fillStyle = '#f1ece2'; g.beginPath(); g.arc(-0.55 * m, -0.7 * m, 0.07 * m, 0, P2); g.fill();
    g.restore();
    // Augen reflektieren im Scheinwerferlicht (nachts das erste, was man sieht)
    if (nacht) lichter.push({ x: x + d * 0.7 * m, y: y - 1.18 * m - spr, r: Math.max(1.6, 0.05 * m), farbe: '#e8fff0', schein: 0.5 * m + 5 });
    o._box = [x - 0.8 * m, y - 1.3 * m - spr, x + 0.8 * m, y];
  }
  function radler(o, z) {
    if (z < 1) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z), t = performance.now() / 1000;
    const nacht = W.wetter === 'nacht', tritt = Math.sin(t * 6 + (o.k || 0)) * 0.12 * m;
    const front = o.richtung < 0;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 0.35 * m, 0.08 * m, 0, 0, P2); g.fill();
    g.strokeStyle = '#151515'; g.lineWidth = Math.max(1, 0.06 * m);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 0.68 * m); g.stroke();
    g.strokeStyle = nacht ? '#202020' : '#2b3340'; g.lineWidth = Math.max(1, 0.1 * m); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 0.1 * m, y - 0.85 * m); g.lineTo(x - 0.1 * m, y - 0.4 * m + tritt); g.moveTo(x + 0.1 * m, y - 0.85 * m); g.lineTo(x + 0.1 * m, y - 0.4 * m - tritt); g.stroke();
    g.fillStyle = nacht ? abdunkeln(o.jacke || '#d9822b', 0.35) : (o.jacke || '#d9822b');
    g.beginPath(); g.roundRect(x - 0.22 * m, y - 1.45 * m, 0.44 * m, 0.62 * m, 0.1 * m); g.fill();
    g.fillStyle = nacht ? '#333' : '#e2b996'; g.beginPath(); g.arc(x, y - 1.6 * m, 0.13 * m, 0, P2); g.fill();
    g.fillStyle = o.helm || '#f0f0f0'; g.beginPath(); g.arc(x, y - 1.64 * m, 0.14 * m, Math.PI, 0); g.fill();
    g.fillStyle = front ? '#fffbe8' : '#c4180f'; g.fillRect(x - 0.05 * m, y - (front ? 0.95 : 0.8) * m, 0.1 * m, 0.06 * m);
    if (nacht && !o.ohneLicht) lichter.push({ x, y: y - 0.78 * m, r: 0.05 * m, farbe: front ? '#fffbe8' : '#ff2a1a', schein: 0.4 * m });
    else if (nacht && Math.sin(t * 5 + (o.k || 0)) > 0.55) lichter.push({ x: x + tritt * 0.4, y: y - 0.35 * m, r: Math.max(1, 0.04 * m), farbe: '#ffb21e', schein: 0.3 * m + 2 });   // Pedalreflektoren
    o._box = [x - 0.4 * m, y - 1.8 * m, x + 0.4 * m, y];
  }
  // Verkehrszeichen (frei gestaltet nach StVO-Vorbild)
  function schild(o, z) {
    if (z < 1.2) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z), nacht = W.wetter === 'nacht';
    const hoch = o.hoch || (o.art === 'blau' ? 4.5 : 2.3);
    let gr = (o.groesse || (o.art === 'blau' ? 2.2 : 0.65)) * m;
    // Kleine Runde 29.10.2026: ferne Schilder etwas größer (höchstens +30 %, Ziel ca. 12 px; alle Schilder gleich)
    const fernS = o.art === 'blau' || o.portal ? 0 : fernStaerke(z);
    if (fernS > 0) gr = Math.max(gr, Math.min(gr * 1.3, 12));
    g.fillStyle = nacht ? '#1a1b1c' : '#8d9296';
    if (o.art !== 'blau' && !o.portal) g.fillRect(x - Math.max(0.5, 0.04 * m), ys(hoch, z), Math.max(1, 0.08 * m), y - ys(hoch, z));
    else { g.fillRect(x - gr * 0.4, ys(hoch - 1, z), Math.max(1, 0.1 * m), y - ys(hoch - 1, z)); g.fillRect(x + gr * 0.4, ys(hoch - 1, z), Math.max(1, 0.1 * m), y - ys(hoch - 1, z)); }
    if (o.zusatz && gr > 6) {   // Zusatzzeichen unter dem Schild
      g.fillStyle = nacht ? '#4a4a48' : '#f4f4ef'; g.fillRect(x - gr * 0.5, ys(hoch, z) + gr * 0.06, gr, gr * 0.36);
      g.strokeStyle = '#222'; g.lineWidth = Math.max(0.5, gr * 0.02); g.strokeRect(x - gr * 0.5, ys(hoch, z) + gr * 0.06, gr, gr * 0.36);
      g.fillStyle = '#111'; g.font = `600 ${gr * 0.15}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.zusatz, x, ys(hoch, z) + gr * 0.24);
      const zy = ys(hoch, z) + gr * 0.24;
      if (o.knick) {   // Zusatzzeichen abknickende Vorfahrt: dicke Linie knickt ab, dünne geht geradeaus
        const s = o.knick === 'links' ? -1 : 1; g.strokeStyle = '#111'; g.lineCap = 'round';
        g.lineWidth = Math.max(0.6, gr * 0.025); g.beginPath(); g.moveTo(x, zy - gr * 0.13); g.lineTo(x, zy + gr * 0.13); g.stroke();
        g.lineWidth = Math.max(1, gr * 0.06); g.beginPath(); g.moveTo(x, zy + gr * 0.13); g.lineTo(x, zy); g.lineTo(x + s * gr * 0.3, zy); g.stroke();
      }
      if (o.zusatzRad) {   // Zusatzzeichen Radverkehr (Fahrrad-Sinnbild)
        g.strokeStyle = '#111'; g.lineWidth = Math.max(0.6, gr * 0.025);
        g.beginPath(); g.arc(x - gr * 0.12, zy + gr * 0.04, gr * 0.07, 0, P2); g.moveTo(x + gr * 0.19, zy + gr * 0.04); g.arc(x + gr * 0.12, zy + gr * 0.04, gr * 0.07, 0, P2); g.stroke();
        g.beginPath(); g.moveTo(x - gr * 0.12, zy + gr * 0.04); g.lineTo(x - gr * 0.02, zy - gr * 0.07); g.lineTo(x + gr * 0.12, zy + gr * 0.04); g.stroke();
      }
    }
    const cy = ys(hoch, z) - gr / 2, d = nacht ? 0.45 : 1;
    g.save(); g.globalAlpha *= d > 0.5 ? 1 : 0.85;
    if (schildNeu(o, x, cy, gr, m)) { /* Phase-2-Schilder */ } else
    if (o.art === 'tempo30' || o.art === 'tempo50') {
      g.fillStyle = '#c8241b'; g.beginPath(); g.arc(x, cy, gr / 2, 0, P2); g.fill();
      g.fillStyle = '#f7f7f2'; g.beginPath(); g.arc(x, cy, gr * 0.39, 0, P2); g.fill();
      g.fillStyle = '#111'; g.font = `600 ${gr * 0.42}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.art === 'tempo30' ? '30' : '50', x, cy + gr * 0.03);
      if (o.zone) { g.fillStyle = '#f7f7f2'; g.fillRect(x - gr * 0.5, cy + gr * 0.55, gr, gr * 0.32); g.fillStyle = '#111'; g.font = `600 ${gr * 0.2}px ${SCHRIFT}`; g.fillText('ZONE', x, cy + gr * 0.71); }
    } else if (o.art === 'wild' || o.art === 'kinder' || o.art === 'stau') {
      g.fillStyle = '#c8241b'; g.beginPath(); g.moveTo(x, cy - gr * 0.55); g.lineTo(x + gr * 0.58, cy + gr * 0.45); g.lineTo(x - gr * 0.58, cy + gr * 0.45); g.closePath(); g.fill();
      g.fillStyle = '#f7f7f2'; g.beginPath(); g.moveTo(x, cy - gr * 0.36); g.lineTo(x + gr * 0.42, cy + gr * 0.35); g.lineTo(x - gr * 0.42, cy + gr * 0.35); g.closePath(); g.fill();
      g.fillStyle = '#111';
      if (o.art === 'wild') { g.beginPath(); g.ellipse(x - gr * 0.02, cy + gr * 0.12, gr * 0.16, gr * 0.06, -0.5, 0, P2); g.fill(); g.fillRect(x + gr * 0.08, cy - gr * 0.08, gr * 0.05, gr * 0.14); }
      else if (o.art === 'kinder') { g.beginPath(); g.arc(x - gr * 0.08, cy - gr * 0.02, gr * 0.05, 0, P2); g.arc(x + gr * 0.1, cy + gr * 0.04, gr * 0.045, 0, P2); g.fill(); g.fillRect(x - gr * 0.12, cy + gr * 0.03, gr * 0.08, gr * 0.2); g.fillRect(x + gr * 0.06, cy + gr * 0.08, gr * 0.07, gr * 0.17); }
      else { for (let i = 0; i < 3; i++) g.fillRect(x - gr * 0.16 + i * gr * 0.12, cy + gr * 0.02 - i * gr * 0.05, gr * 0.09, gr * 0.12); }
    } else if (o.art === 'zebra') {
      g.fillStyle = '#1f5fae'; g.fillRect(x - gr / 2, cy - gr / 2, gr, gr);
      g.fillStyle = '#f7f7f2'; g.beginPath(); g.moveTo(x, cy - gr * 0.38); g.lineTo(x + gr * 0.4, cy + gr * 0.34); g.lineTo(x - gr * 0.4, cy + gr * 0.34); g.closePath(); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(x, cy - gr * 0.08, gr * 0.05, 0, P2); g.fill(); g.fillRect(x - gr * 0.04, cy - gr * 0.03, gr * 0.08, gr * 0.2);
    } else if (o.art === 'haltestelle') {
      g.fillStyle = '#f2c500'; g.beginPath(); g.arc(x, cy, gr / 2, 0, P2); g.fill();
      g.fillStyle = '#1b7a3a'; g.beginPath(); g.arc(x, cy, gr * 0.38, 0, P2); g.fill();
      g.fillStyle = '#f2c500'; g.font = `600 ${gr * 0.48}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', x, cy + gr * 0.03);
    } else if (o.art === 'blau') {
      g.fillStyle = nacht ? '#0b2142' : '#1d4f9a'; g.fillRect(x - gr * 0.55, cy - gr * 0.3, gr * 1.1, gr * 0.6);
      g.strokeStyle = '#f2f2f2'; g.lineWidth = Math.max(1, 0.05 * m); g.strokeRect(x - gr * 0.5, cy - gr * 0.25, gr, gr * 0.5);
      g.fillStyle = '#f2f2f2'; g.font = `600 ${gr * 0.13}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Musterstadt  12 km', x, cy);
    }
    g.restore();
    if (nacht && z < 70) lichter.push({ x, y: cy, r: gr * 0.35, farbe: 'rgba(255,255,255,.35)', schein: gr * 0.5 });
    o._box = [x - gr * 0.7, cy - gr * 0.7, x + gr * 0.7, cy + gr * 0.7];
  }

  // ---------- Phase 2: weitere Verkehrszeichen (frei gestaltet nach StVO-Vorbild, im Code statt gemalt) ----------
  const ROT = '#c8241b', BLAU = '#1d4f9a', WEISS = '#f7f7f2';
  function dreieck(x, cy, gr, unten) {
    const s = unten ? -1 : 1;
    g.fillStyle = ROT; g.beginPath(); g.moveTo(x, cy - s * gr * 0.55); g.lineTo(x + gr * 0.58, cy + s * gr * 0.45); g.lineTo(x - gr * 0.58, cy + s * gr * 0.45); g.closePath(); g.fill();
    g.fillStyle = WEISS; g.beginPath(); g.moveTo(x, cy - s * gr * 0.36); g.lineTo(x + gr * 0.42, cy + s * gr * 0.35); g.lineTo(x - gr * 0.42, cy + s * gr * 0.35); g.closePath(); g.fill();
  }
  function ring(x, cy, gr) { g.fillStyle = ROT; g.beginPath(); g.arc(x, cy, gr / 2, 0, P2); g.fill(); g.fillStyle = WEISS; g.beginPath(); g.arc(x, cy, gr * 0.39, 0, P2); g.fill(); }
  function text(t, x, y, px, farbe, gewicht) { g.fillStyle = farbe || '#111'; g.font = `${gewicht || 600} ${px}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); }
  function schildNeu(o, x, cy, gr) {
    const a = o.art;
    const symbol = { splitt: () => { g.fillStyle = '#111'; for (let i = 0; i < 6; i++) g.fillRect(x - gr * 0.18 + (i % 3) * gr * 0.13, cy + gr * 0.04 + Math.floor(i / 3) * gr * 0.1, gr * 0.06, gr * 0.06); },
      schleuder: () => { g.strokeStyle = '#111'; g.lineWidth = Math.max(1, gr * 0.04); g.beginPath(); g.moveTo(x - gr * 0.16, cy + gr * 0.25); g.bezierCurveTo(x - gr * 0.25, cy, x + gr * 0.25, cy + gr * 0.12, x + gr * 0.12, cy - gr * 0.08); g.stroke(); },
      glaette: () => { g.strokeStyle = '#111'; g.lineWidth = Math.max(1, gr * 0.035); for (let i = 0; i < 3; i++) { const w = i * Math.PI / 3; g.beginPath(); g.moveTo(x - Math.cos(w) * gr * 0.15, cy + gr * 0.1 - Math.sin(w) * gr * 0.15); g.lineTo(x + Math.cos(w) * gr * 0.15, cy + gr * 0.1 + Math.sin(w) * gr * 0.15); g.stroke(); } },
      wind: () => { g.fillStyle = '#111'; g.fillRect(x - gr * 0.2, cy - gr * 0.02, gr * 0.04, gr * 0.3); g.beginPath(); g.moveTo(x - gr * 0.16, cy - gr * 0.02); g.lineTo(x + gr * 0.2, cy + gr * 0.04); g.lineTo(x + gr * 0.2, cy + gr * 0.1); g.lineTo(x - gr * 0.16, cy + gr * 0.12); g.fill(); },
      baustelle: () => { g.fillStyle = '#111'; g.beginPath(); g.arc(x - gr * 0.04, cy - gr * 0.04, gr * 0.05, 0, P2); g.fill(); g.fillRect(x - gr * 0.1, cy + gr * 0.02, gr * 0.1, gr * 0.16); g.fillRect(x - gr * 0.2, cy + gr * 0.22, gr * 0.42, gr * 0.05); },
      bahn: () => { g.fillStyle = '#111'; g.fillRect(x - gr * 0.22, cy, gr * 0.44, gr * 0.17); g.fillRect(x - gr * 0.15, cy - gr * 0.08, gr * 0.12, gr * 0.08); },
      gefahr: () => { g.fillStyle = '#111'; g.fillRect(x - gr * 0.03, cy - gr * 0.12, gr * 0.06, gr * 0.22); g.fillRect(x - gr * 0.03, cy + gr * 0.15, gr * 0.06, gr * 0.06); },
      stau: () => { g.fillStyle = '#111'; for (let i = 0; i < 3; i++) g.fillRect(x - gr * 0.16 + i * gr * 0.12, cy + gr * 0.02 - i * gr * 0.05, gr * 0.09, gr * 0.12); },
    };
    if (symbol[a]) { dreieck(x, cy, gr); symbol[a](); return true; }
    if (a === 'tempo') { ring(x, cy, gr); text(String(o.zahl || 30), x, cy + gr * 0.03, gr * (String(o.zahl).length > 2 ? 0.34 : 0.42)); if (o.zone) { g.fillStyle = WEISS; g.fillRect(x - gr * 0.5, cy + gr * 0.55, gr, gr * 0.32); text('ZONE', x, cy + gr * 0.71, gr * 0.2); } return true; }
    if (a === 'vorfahrt-gewaehren') { dreieck(x, cy, gr, true); return true; }
    if (a === 'halt') {   // Z 206 Halt. Vorfahrt gewähren (Achteck)
      g.fillStyle = WEISS; g.beginPath(); for (let i = 0; i < 8; i++) { const w = Math.PI / 8 + i * Math.PI / 4; g.lineTo(x + Math.cos(w) * gr * 0.52, cy + Math.sin(w) * gr * 0.52); } g.fill();
      g.fillStyle = ROT; g.beginPath(); for (let i = 0; i < 8; i++) { const w = Math.PI / 8 + i * Math.PI / 4; g.lineTo(x + Math.cos(w) * gr * 0.46, cy + Math.sin(w) * gr * 0.46); } g.fill();
      text('STOP', x, cy + gr * 0.01, gr * 0.24, WEISS, 700); return true;
    }
    if (a === 'ueberholverbot' || a === 'vorrang-gegen' || a === 'breite') {
      ring(x, cy, gr);
      if (a === 'ueberholverbot') { g.fillStyle = ROT; g.fillRect(x + gr * 0.04, cy - gr * 0.08, gr * 0.18, gr * 0.14); g.fillStyle = '#111'; g.fillRect(x - gr * 0.22, cy - gr * 0.08, gr * 0.18, gr * 0.14); }
      else if (a === 'breite') text((o.zahl || 2) + ' m', x, cy, gr * 0.26);
      else { g.fillStyle = ROT; g.fillRect(x + gr * 0.06, cy - gr * 0.2, gr * 0.06, gr * 0.34); g.fillStyle = '#111'; g.fillRect(x - gr * 0.12, cy - gr * 0.14, gr * 0.06, gr * 0.34); }
      return true;
    }
    if (a === 'kreisel') { g.fillStyle = BLAU; g.beginPath(); g.arc(x, cy, gr / 2, 0, P2); g.fill(); g.strokeStyle = WEISS; g.lineWidth = Math.max(1, gr * 0.06); g.beginPath(); g.arc(x, cy, gr * 0.22, 0.3, P2 - 0.3); g.stroke(); return true; }
    if (a === 'vorfahrtstrasse') { g.save(); g.translate(x, cy); g.rotate(Math.PI / 4); g.fillStyle = WEISS; g.fillRect(-gr * 0.36, -gr * 0.36, gr * 0.72, gr * 0.72); g.fillStyle = '#f2c500'; g.fillRect(-gr * 0.26, -gr * 0.26, gr * 0.52, gr * 0.52); g.restore(); return true; }
    if (a === 'andreaskreuz') {
      g.save(); g.translate(x, cy); g.lineWidth = gr * 0.14;
      for (const w of [0.7, -0.7]) { g.rotate(w); g.strokeStyle = WEISS; g.beginPath(); g.moveTo(-gr * 0.55, 0); g.lineTo(gr * 0.55, 0); g.stroke(); g.strokeStyle = ROT; g.setLineDash([gr * 0.14, gr * 0.14]); g.beginPath(); g.moveTo(-gr * 0.55, 0); g.lineTo(gr * 0.55, 0); g.stroke(); g.setLineDash([]); g.rotate(-w); }
      g.restore();
      const an = o.blink && Math.floor(performance.now() / 450) % 2 === 0;
      g.fillStyle = '#111'; g.fillRect(x - gr * 0.16, cy + gr * 0.55, gr * 0.32, gr * 0.3);
      g.fillStyle = an ? '#ff2a1a' : '#4a1410'; g.beginPath(); g.arc(x, cy + gr * 0.7, gr * 0.1, 0, P2); g.fill();
      if (an) lichter.push({ x, y: cy + gr * 0.7, r: gr * 0.1, farbe: '#ff2a1a', schein: gr * 0.8 });
      return true;
    }
    const rechteck = (farbe, w, h) => { g.fillStyle = farbe; g.fillRect(x - gr * w / 2, cy - gr * h / 2, gr * w, gr * h); g.strokeStyle = WEISS; g.lineWidth = Math.max(0.5, gr * 0.03); g.strokeRect(x - gr * w / 2 + gr * 0.04, cy - gr * h / 2 + gr * 0.04, gr * (w - 0.08), gr * (h - 0.08)); };
    if (a === 'ortstafel') { g.fillStyle = '#f2c500'; g.fillRect(x - gr * 0.75, cy - gr * 0.32, gr * 1.5, gr * 0.64); g.strokeStyle = '#111'; g.lineWidth = Math.max(0.5, gr * 0.03); g.strokeRect(x - gr * 0.7, cy - gr * 0.27, gr * 1.4, gr * 0.54); text(o.text || 'Musterstadt', x, cy, gr * 0.22); if (o.ende) { g.strokeStyle = ROT; g.lineWidth = Math.max(1, gr * 0.07); g.beginPath(); g.moveTo(x - gr * 0.66, cy + gr * 0.24); g.lineTo(x + gr * 0.66, cy - gr * 0.24); g.stroke(); } return true; }
    if (a === 'tafel') { rechteck(o.farbe || BLAU, o.w || 1.6, o.h || 0.7); text(o.text || '', x, cy, gr * (o.px || 0.16), WEISS); return true; }
    if (a === 'einbahn') { rechteck(BLAU, 1.1, 0.42); g.fillStyle = WEISS; g.beginPath(); g.moveTo(x - gr * 0.38, cy - gr * 0.05); g.lineTo(x + gr * 0.2, cy - gr * 0.05); g.lineTo(x + gr * 0.2, cy - gr * 0.13); g.lineTo(x + gr * 0.42, cy); g.lineTo(x + gr * 0.2, cy + gr * 0.13); g.lineTo(x + gr * 0.2, cy + gr * 0.05); g.lineTo(x - gr * 0.38, cy + gr * 0.05); g.fill(); return true; }
    if (a === 'spielstrasse' || a === 'fahrradstrasse' || a === 'tunnel' || a === 'fahrstreifenende') {
      rechteck(BLAU, a === 'spielstrasse' ? 1.2 : 0.9, 0.9);
      g.fillStyle = WEISS; g.strokeStyle = WEISS; g.lineWidth = Math.max(1, gr * 0.05);
      if (a === 'spielstrasse') { g.beginPath(); g.arc(x - gr * 0.3, cy - gr * 0.08, gr * 0.06, 0, P2); g.arc(x + gr * 0.05, cy - gr * 0.12, gr * 0.07, 0, P2); g.fill(); g.fillRect(x - gr * 0.34, cy - gr * 0.02, gr * 0.08, gr * 0.22); g.fillRect(x + gr * 0.01, cy - gr * 0.05, gr * 0.09, gr * 0.27); g.fillRect(x + gr * 0.22, cy + gr * 0.02, gr * 0.22, gr * 0.12); }
      else if (a === 'fahrradstrasse') { g.beginPath(); g.arc(x - gr * 0.17, cy + gr * 0.1, gr * 0.12, 0, P2); g.arc(x + gr * 0.17, cy + gr * 0.1, gr * 0.12, 0, P2); g.stroke(); g.beginPath(); g.moveTo(x - gr * 0.17, cy + gr * 0.1); g.lineTo(x, cy - gr * 0.1); g.lineTo(x + gr * 0.17, cy + gr * 0.1); g.stroke(); }
      else if (a === 'tunnel') { g.beginPath(); g.arc(x, cy + gr * 0.22, gr * 0.28, Math.PI, 0); g.lineTo(x + gr * 0.28, cy + gr * 0.3); g.lineTo(x - gr * 0.28, cy + gr * 0.3); g.fill(); g.fillStyle = BLAU; g.beginPath(); g.arc(x, cy + gr * 0.26, gr * 0.17, Math.PI, 0); g.fill(); }
      else { g.fillRect(x - gr * 0.2, cy - gr * 0.3, gr * 0.08, gr * 0.6); g.beginPath(); g.moveTo(x + gr * 0.16, cy + gr * 0.3); g.lineTo(x + gr * 0.16, cy - gr * 0.05); g.lineTo(x - gr * 0.02, cy - gr * 0.25); g.stroke(); }
      return true;
    }
    if (a === 'bake') {   // Bake (rot-weiß gestreift), z. B. vor Bahnübergang oder Baustelle
      g.fillStyle = WEISS; g.fillRect(x - gr * 0.12, cy - gr * 0.5, gr * 0.24, gr * 1.6);
      g.fillStyle = ROT; for (let i = 0; i < (o.streifen || 3); i++) g.fillRect(x - gr * 0.12, cy - gr * 0.4 + i * gr * 0.45, gr * 0.24, gr * 0.18);
      return true;
    }
    return false;
  }

  // ---------- Phase 2: weitere Körper (Code-Platzhalter, je mit Bild-Anschluss) ----------
  function rundum(x, y, m, farbe) {
    const t = performance.now() / 1000, an = 0.5 + 0.5 * Math.sin(t * (farbe === 'blau' ? 14 : 9));
    const c = farbe === 'blau' ? '#3f7bff' : '#ffa21e';
    g.fillStyle = c; g.globalAlpha = 0.6 + an * 0.4; g.fillRect(x - 0.1 * m, y - 0.12 * m, 0.2 * m, 0.12 * m); g.globalAlpha = 1;
    lichter.push({ x, y: y - 0.06 * m, r: Math.max(1.5, 0.08 * m), farbe: c, schein: (1 + an * 2.5) * m, nebel: true });
  }
  function motorrad(o, z) {
    if (z < 0.9) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z), nacht = dunkelHier(), front = o.richtung < 0;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 0.45 * m, 0.08 * m, 0, 0, P2); g.fill();
    g.fillStyle = '#121314'; g.fillRect(x - 0.08 * m, y - 0.66 * m, 0.16 * m, 0.66 * m);
    g.fillStyle = nacht ? '#1d1d1d' : (o.farbe || '#2a2d33'); g.beginPath(); g.roundRect(x - 0.32 * m, y - 1.0 * m, 0.64 * m, 0.38 * m, 0.08 * m); g.fill();
    g.fillStyle = nacht ? '#222' : (o.jacke || '#1f2328'); g.beginPath(); g.roundRect(x - 0.24 * m, y - 1.55 * m, 0.48 * m, 0.62 * m, 0.12 * m); g.fill();
    g.fillStyle = nacht ? '#333' : (o.helm || '#d8352a'); g.beginPath(); g.arc(x, y - 1.68 * m, 0.16 * m, 0, P2); g.fill();
    g.fillStyle = front ? '#fffbe8' : '#ff2a1a'; g.fillRect(x - 0.07 * m, y - 0.95 * m, 0.14 * m, 0.08 * m);
    if (front || nacht) lichter.push({ x, y: y - 0.9 * m, r: Math.max(1, 0.08 * m), farbe: front ? '#fffbe8' : '#ff2a1a', schein: (front ? 1.6 : 0.6) * m + 3 });
    o._box = [x - 0.4 * m, y - 1.9 * m, x + 0.4 * m, y];
  }
  function tier(o, z) {
    if (z < 1) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z), nacht = dunkelHier(), t = performance.now() / 1000;
    const lauf = o.vx ? Math.sin(t * 12 + (o.k || 0)) * 0.08 * m : 0, d = o.blick || (o.vx < 0 ? -1 : 1);
    const fell = nacht ? abdunkeln(o.fell || '#6b4a2b', nachtF(z)) : (o.fell || '#6b4a2b');
    const l = o.typ === 'wildschwein' ? 1.2 : o.typ === 'pferd' ? 2.2 : 0.75, h = o.typ === 'wildschwein' ? 0.75 : o.typ === 'pferd' ? 1.6 : 0.55;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, l * 0.55 * m, 0.08 * m, 0, 0, P2); g.fill();
    g.strokeStyle = fell; g.lineWidth = Math.max(1, (o.typ === 'pferd' ? 0.1 : 0.07) * m); g.lineCap = 'round';
    g.beginPath(); for (const fx of [-0.35, -0.22, 0.25, 0.38]) { g.moveTo(x + fx * l * m, y - h * 0.55 * m); g.lineTo(x + fx * l * m + (fx > 0 ? lauf : -lauf), y); } g.stroke();
    g.fillStyle = fell; g.beginPath(); g.ellipse(x, y - h * 0.68 * m, l * 0.5 * m, h * 0.26 * m, 0, 0, P2); g.fill();
    // Kopf
    const kx = x + d * l * 0.5 * m, ky = y - h * (o.typ === 'pferd' ? 1.0 : 0.72) * m;
    g.beginPath(); g.ellipse(kx, ky, (o.typ === 'pferd' ? 0.28 : 0.2) * m, (o.typ === 'pferd' ? 0.15 : 0.12) * m, d * 0.5, 0, P2); g.fill();
    if (o.typ === 'pferd') {   // Reiterin
      g.fillStyle = nacht ? '#222' : (o.jacke || '#2f63c6'); g.beginPath(); g.roundRect(x - 0.2 * m, y - 2.25 * m, 0.4 * m, 0.6 * m, 0.1 * m); g.fill();
      g.fillStyle = nacht ? '#333' : '#1d1f22'; g.beginPath(); g.arc(x, y - 2.38 * m, 0.14 * m, 0, P2); g.fill();
      if (o.scheut) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1, 0.03 * m); g.beginPath(); g.arc(kx, ky - 0.3 * m, 0.15 * m, 0, P2); g.stroke(); }
    }
    if (o.typ === 'hund') { g.beginPath(); g.moveTo(x - d * l * 0.5 * m, y - h * 0.75 * m); g.lineTo(x - d * l * 0.75 * m, y - h * 1.05 * m); g.stroke(); }
    if (nacht || o.augen) lichter.push({ x: kx + d * 0.08 * m, y: ky - 0.03 * m, r: Math.max(1.4, 0.04 * m), farbe: '#e8fff0', schein: 0.4 * m + 4 });
    o._box = [x - l * 0.7 * m, y - (o.typ === 'pferd' ? 2.6 : h * 1.2) * m, x + l * 0.7 * m, y];
  }
  function ampel(o, z) {
    if (z < 1.2) return;
    const m = mpx(z), x = xs(o.x, z), y = ys(0, z), nacht = dunkelHier(), fuss = o.fuss;
    const hoehe = fuss ? 2.4 : 3.4, bw = 0.34 * m, bh = (fuss ? 0.62 : 0.9) * m, by = ys(hoehe, z);
    g.fillStyle = nacht ? '#1a1b1c' : '#5b6065'; g.fillRect(x - Math.max(0.5, 0.05 * m), by, Math.max(1, 0.1 * m), y - by);
    // Kontrastblende (dunkle Tafel mit hellem Rand) hinter dem Signalkasten – gut sichtbar wie an echten Ampeln
    if (!fuss) { const kb = 0.66 * m, kh = bh + 0.2 * m; g.fillStyle = nacht ? '#0c0d0e' : '#1d1f21'; g.beginPath(); g.roundRect(x - kb / 2, by - bh - 0.1 * m, kb, kh, 0.06 * m); g.fill(); g.strokeStyle = nacht ? '#3b3d40' : '#e9e9e4'; g.lineWidth = Math.max(0.8, 0.045 * m); g.stroke(); }
    g.fillStyle = '#16181a'; g.beginPath(); g.roundRect(x - bw / 2, by - bh, bw, bh, 0.05 * m); g.fill();
    const zust = o.zustand || 'gruen';
    const lampen = fuss ? [['rot', '#ff2a1a'], ['gruen', '#3ddc6f']] : [['rot', '#ff2a1a'], ['gelb', '#ffb21e'], ['gruen', '#3ddc6f']];
    lampen.forEach(([n, c], i) => {
      const an = zust === n || (zust === 'rotgelb' && (n === 'rot' || n === 'gelb')) || (zust === 'aus' ? false : false);
      const ly = by - bh + bh * (i + 0.5) / lampen.length;
      g.fillStyle = an ? c : '#2b2d2f'; g.beginPath(); g.arc(x, ly, bw * 0.3, 0, P2); g.fill();
      if (an) lichter.push({ x, y: ly, r: bw * 0.3, farbe: c, schein: bw * 1.6, nebel: true });
    });
    o._box = [x - bw * 1.2, by - bh - 0.2 * m, x + bw * 1.2, by + 0.3 * m];
  }
  function einfach3d(o, z) {
    // einfache Gegenstände: Ast, Reifenstück, Windsack, Mülltonne, Warndreieck, Baustellenbake, Zug, Tunnelportal, Lichtschein, Geländer
    const m = mpx(Math.max(z, 1)), x = xs(o.x, Math.max(z, 1)), y = ys(0, Math.max(z, 1)), nacht = dunkelHier();
    if (o.typ === 'ast') {
      if (z < 1) return;
      g.strokeStyle = nacht ? '#1b140e' : '#5a4228'; g.lineWidth = Math.max(2, 0.25 * m); g.lineCap = 'round';
      g.beginPath(); g.moveTo(xs(o.x - 1.6, z), ys(0.15, z)); g.lineTo(xs(o.x + 1.4, z + 0.6), ys(0.2, z + 0.6)); g.stroke();
      g.lineWidth = Math.max(1, 0.08 * m); g.beginPath(); g.moveTo(xs(o.x - 0.4, z + 0.2), ys(0.2, z + 0.2)); g.lineTo(xs(o.x - 0.2, z), ys(0.8, z)); g.moveTo(xs(o.x + 0.5, z + 0.4), ys(0.2, z + 0.4)); g.lineTo(xs(o.x + 0.9, z + 0.3), ys(0.7, z + 0.3)); g.stroke();
      g.fillStyle = nacht ? '#0d140d' : '#4f6e35'; g.beginPath(); g.arc(xs(o.x - 0.2, z), ys(0.85, z), 0.3 * m, 0, P2); g.arc(xs(o.x + 0.9, z + 0.3), ys(0.75, z + 0.3), 0.25 * m, 0, P2); g.fill();
      o._box = [xs(o.x - 1.7, z), ys(1.1, z), xs(o.x + 1.5, z), y];
    } else if (o.typ === 'reifen') {
      if (z < 1) return;
      g.fillStyle = '#121212'; g.beginPath(); g.ellipse(x, y - 0.12 * m, 0.7 * m, 0.16 * m, 0.1, 0, P2); g.fill();
      g.fillStyle = '#2a2a2a'; g.fillRect(x - 0.5 * m, y - 0.2 * m, 0.6 * m, 0.08 * m);
      o._box = [x - 0.8 * m, y - 0.35 * m, x + 0.8 * m, y];
    } else if (o.typ === 'windsack') {
      if (z < 1.2) return;
      g.fillStyle = '#6b7075'; g.fillRect(x - 0.04 * m, ys(4, z), Math.max(1, 0.08 * m), y - ys(4, z));
      const t = performance.now() / 1000, fl = Math.sin(t * 9) * 0.05 * m;
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? WEISS : '#e5531a'; g.fillRect(x - (i + 1) * 0.3 * m, ys(3.95, z) + fl * i - 0.11 * m + i * 0.01 * m, 0.3 * m, 0.22 * m - i * 0.02 * m); }
      o._box = [x - 1.3 * m, ys(4.3, z), x + 0.2 * m, ys(3.6, z)];
    } else if (o.typ === 'tonne') {
      if (z < 1) return;
      g.fillStyle = o.farbe || '#2b2f33'; g.fillRect(x - 0.3 * m, ys(1.05, z), 0.6 * m, 1.05 * m);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 0.32 * m, ys(1.08, z), 0.64 * m, 0.08 * m);
    } else if (o.typ === 'warndreieck') {
      if (z < 1) return;
      g.fillStyle = ROT; g.beginPath(); g.moveTo(x, y - 0.6 * m); g.lineTo(x + 0.35 * m, y); g.lineTo(x - 0.35 * m, y); g.closePath(); g.fill();
      g.fillStyle = WEISS; g.beginPath(); g.moveTo(x, y - 0.42 * m); g.lineTo(x + 0.22 * m, y - 0.06 * m); g.lineTo(x - 0.22 * m, y - 0.06 * m); g.closePath(); g.fill();
      o._box = [x - 0.4 * m, y - 0.7 * m, x + 0.4 * m, y];
    } else if (o.typ === 'bake') {
      if (z < 1) return;
      g.fillStyle = WEISS; g.fillRect(x - 0.12 * m, y - 1.0 * m, 0.24 * m, 1.0 * m);
      g.fillStyle = ROT; for (let i = 0; i < 3; i++) g.fillRect(x - 0.12 * m, y - (0.95 - i * 0.33) * m, 0.24 * m, 0.14 * m);
      if (nacht) lichter.push({ x, y: y - 1.05 * m, r: 0.06 * m, farbe: '#ffb21e', schein: 0.5 * m });
      o._box = [x - 0.2 * m, y - 1.05 * m, x + 0.2 * m, y];
    } else if (o.typ === 'zug') {
      // Zug quer zur Fahrbahn (fährt über den Bahnübergang)
      if (z < 1) return;
      g.fillStyle = nacht ? '#1d2228' : (o.farbe || '#c9302a');
      querFlaeche(o.x - o.laenge / 2, o.x + o.laenge / 2, z + 2, 0.5, 3.8); g.fill();
      g.fillStyle = nacht ? '#e9c879' : 'rgba(40,52,62,.85)';
      for (let xx = o.x - o.laenge / 2 + 1; xx < o.x + o.laenge / 2 - 2; xx += 2.6) { querFlaeche(xx, xx + 1.6, z + 2, 2.2, 3.2); g.fill(); }
      o._box = [xs(o.x - o.laenge / 2, z + 2), ys(3.8, z + 2), xs(o.x + o.laenge / 2, z + 2), ys(0, z + 2)];
    } else if (o.typ === 'portal') {
      // Tunnelportal: gestaltetes Bild (Bogen kulisse-autobahn-1, letzte Runde 29.10.2026); ohne Bild Wand mit dunkler Öffnung (Code)
      if (z < 1.2) return;
      const timg = BI.bild && BI.bild('rand/autobahn-tunnel'), tms = BI.mass && BI.mass('rand/autobahn-tunnel');
      if (timg && tms) {
        const lang = tms.h * tms.px[0] / tms.px[1], mx = (o.x || 0) + TUNNEL.mitte;
        const a = xs(mx - lang / 2, z), b = xs(mx + lang / 2, z), oben = ys(tms.h, z), unten = ys(0, z);
        // Tunnel innen (29.10.2026): Öffnung im Bild durchsichtig – dahinter der Tunnel in echter Perspektive (Wände, Decke, Ausfahrt)
        if (tms.oeffnung && W.tunnelLage) tunnelDurchsicht(z);
        g.drawImage(dunkelHier() ? bildDunkel(timg, 0.12) : (W.wetter === 'regen' ? bildDunkel(timg, 0.82) : timg), a, oben, b - a, unten - oben);
        o._box = [xs(TUNNEL.xl, z), ys(TUNNEL.h, z), xs(TUNNEL.xr, z), ys(0, z)];
        return;
      }
      g.fillStyle = nacht ? '#202224' : '#9fa3a1'; querFlaeche(-30, 30, z, 0, 9); g.fill();
      g.fillStyle = '#0c0d0e'; g.beginPath(); g.moveTo(xs(-6.2, z), ys(0, z)); g.lineTo(xs(-6.2, z), ys(4.8, z)); g.quadraticCurveTo(xs(-1, z), ys(7.4, z), xs(4.2, z), ys(4.8, z)); g.lineTo(xs(4.2, z), ys(0, z)); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,220,150,.5)'; for (let i = 0; i < 4; i++) { const zz = z + 6 + i * 12; g.fillRect(xs(-5.6, zz), ys(4.6, zz), Math.max(1, 0.4 * mpx(zz)), Math.max(1, 0.1 * mpx(zz))); }
      o._box = [xs(-6.2, z), ys(6.5, z), xs(4.2, z), ys(0, z)];
    } else if (o.typ === 'lichtschein') {
      // Lichtschein hinter einer Kurve (Vorzeichen Gegenverkehr nachts)
      const sx = xs(o.x, Math.max(z, 1)), sy = ys(1.5, Math.max(z, 1)), r = (o.staerke || 1) * L.B * 0.22;
      lichter.push({ x: sx, y: sy, r: 0, farbe: 'rgba(255,248,215,.55)', schein: r, nebel: true });
      o._box = [sx - r * 0.35, sy - r * 0.35, sx + r * 0.35, sy + r * 0.35];
    } else if (o.typ === 'augen') {
      // Augenpaare im Scheinwerferlicht (Wild am Waldrand nachts)
      if (z < 1) return;
      for (let i = 0; i < (o.anzahl || 3); i++) { const xx = xs(o.x + i * 0.9, z + i * 0.7), yy = ys(0.6, z + i * 0.7); lichter.push({ x: xx - 0.05 * m, y: yy, r: Math.max(1.2, 0.035 * m), farbe: '#e8fff0', schein: 4 }, { x: xx + 0.05 * m, y: yy, r: Math.max(1.2, 0.035 * m), farbe: '#e8fff0', schein: 4 }); }
      o._box = [x - 0.4 * m, ys(1, z), xs(o.x + (o.anzahl || 3) * 0.9, z) + 0.4 * m, y];
    } else if (o.typ === 'gelaender') {
      // Brückengeländer (seitlich, über die ganze Länge)
      const z1 = Math.max(0.9, z), z2 = z + o.laenge;
      if (z2 < 1) return;
      g.fillStyle = nacht ? '#1a1c1e' : '#a7adb2'; seitenFlaeche(o.x, z1, z2, 0.95, 1.1); g.fill();
      g.fillStyle = nacht ? '#141516' : '#8c9297'; seitenFlaeche(o.x, z1, z2, 0, 0.25); g.fill();
      for (let zz = Math.ceil(z1); zz < z2; zz += 2.5) { const p = xs(o.x, zz); g.fillRect(p - 0.5, ys(1.1, zz), Math.max(1, 0.05 * mpx(zz)), ys(0.2, zz) - ys(1.1, zz)); }
    } else if (o.typ === 'schlagloch') {
      if (z < 1) return;
      g.fillStyle = nacht ? '#050505' : '#2b2a28'; g.beginPath(); g.ellipse(x, y, 0.5 * m, 0.12 * m, 0, 0, P2); g.fill();
      o._box = [x - 0.6 * m, y - 0.3 * m, x + 0.6 * m, y + 0.1 * m];
    } else if (o.typ === 'staub') {
      if (z < 1) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(190,165,120,${0.28 - i * 0.03})`; g.beginPath(); g.ellipse(x + Math.sin(t + i) * 0.4 * m - i * 0.5 * m, y - (1 + i * 0.4) * m, (1.4 + i * 0.3) * m, (0.8 + i * 0.15) * m, 0, 0, P2); g.fill(); }
      o._box = [x - 3 * m, y - 3.2 * m, x + 1.5 * m, y];
    } else if (o.typ === 'zone') {
      // unsichtbare Tippfläche über einem Stück Fahrbahn (z. B. freie Spur, Matschwall, Wasser in den Spurrillen)
      const z0 = Math.max(NAH, z), z1 = z + (o.laenge || 30);
      if (z1 <= z0) { o._box = null; return; }
      const xa = [xs(o.x0, z0), xs(o.x1, z0), xs(o.x0, z1), xs(o.x1, z1)];
      o._box = [Math.min(...xa), ys(o.h || 0.8, z1), Math.max(...xa), ys(0, z0)];
    } else if (o.typ === 'quer') {
      fahrzeugQuer(o, z);
    } else if (o.typ === 'anzeige') {
      o._box = null;   // wird im Cockpit gezeichnet (Radio)
    }
  }

  function koerper(o) {
    const z = o.pos - W.s;
    if (o.typ !== 'leitplanke' && (z > zFern || z + (o.laenge || 0) < 0.8)) { o._box = null; return; }
    if (o.versteckt) { o._box = null; return; }
    const a = sichtAlpha(Math.max(z, 1), o);
    if (a <= 0.01) {
      o._box = null;
      // Im Nebel sieht man die Rundumleuchte des Traktors schon vor dem Traktor (Vorzeichen)
      if (o.art === 'traktor' && z < (W.sicht || 70) * 2.6) {
        const t = performance.now() / 1000, an = 0.5 + 0.5 * Math.sin(t * 9), m = mpx(z), x = xs(o.x + 0.5, z), y = ys(2.75, z);
        const st = klemm(1.6 - z / ((W.sicht || 70) * 2.6) * 1.2, 0.15, 1);
        lichter.push({ x, y, r: Math.max(1.2, 0.08 * m), farbe: `rgba(255,170,40,${(0.35 + an * 0.5) * st})`, schein: (2 + an * 3) * m + 6, nebel: true });
        o._box = [x - 14, y - 14, x + 14, y + 14];
      }
      return;
    }
    if (a < 1) { g.save(); g.globalAlpha = a; }
    if (bildKoerper(o, z)) { if (a < 1) g.restore(); return; }
    switch (o.typ) {
      case 'haus': haus(o, z); break;
      case 'fassade': fassade(o, z); break;
      case 'querreihe': querreihe(o, z); break;
      case 'bruecke': bruecke(o, z); break;
      case 'hecke': hecke(o, z); break;
      case 'baum': baum(o, z); break;
      case 'laterne': laterne(o, z); break;
      case 'pfosten': pfosten(o, z); break;
      case 'leitplanke': leitplanke(o); break;
      case 'fahrzeug': fahrzeug(o, z); break;
      case 'person': person(o, z); break;
      case 'ball': ball(o, z); break;
      case 'reh': reh(o, z); break;
      case 'radler': radler(o, z); break;
      case 'schild': schild(o, z); break;
      case 'hund': case 'wildschwein': case 'pferd': tier(o, z); break;
      case 'ampel': ampel(o, z); break;
      default: einfach3d(o, z);
    }
    if (a < 1) g.restore();
  }

  // ---------- Tunnel (letzte Runde 29.10.2026, Tunnel innen 29.10.2026) ----------
  // Öffnung = durchsichtige Fläche im Portal-Bild (MASSE oeffnung, bilder-schneiden.py): 15,97 m breit (Mitte 1 m links der
  // Fahrbahnmitte), 4,85 m hoch. Innen (Bogen tunnel-innen): Wand- und Deckenbild perspektivisch in Streifen (wie die Fassaden),
  // Kachel Wand 26 m (Leuchten im Bild alle ca. 5 m – keine Code-Lampen mehr), Decke 62 m (Leuchtenreihe in der Mitte), Notrufnische
  // nur in jeder dritten (rechts) bzw. vierten (links) Wandkachel; Ausfahrt = Ausblick-Bild (Tag/Nacht), Fluchtpunkt auf dem Horizont,
  // Lichtsaum am Rand, Blendung in den letzten 28 m und kurz danach. Schwache Geräte (W.einfach): Wände/Decke/Lampen aus Code wie
  // bisher, Ausblick-Bild bleibt. W.tunnelLage = { a, e } (vorlagen.js). Von außen zeichnet das Portal den Tunnel durch die Öffnung
  // (tunnelDurchsicht), ab 1,2 m vor der Einfahrt nachtUndLichter (tunnelInnen).
  const TUNNEL = { mitte: -1, xl: -8.98, xr: 6.98, h: 4.85, lampe: 12, blendVor: 28, blendNach: 22, gemessen: false };
  function tunnelMasse() {
    if (TUNNEL.gemessen || !BI.mass) return;
    const ms = BI.mass('rand/autobahn-tunnel');
    if (!ms || !ms.oeffnung) return;
    const lang = ms.h * ms.px[0] / ms.px[1], x0 = TUNNEL.mitte - lang / 2;
    TUNNEL.xl = x0 + ms.oeffnung[0] * lang; TUNNEL.xr = x0 + ms.oeffnung[2] * lang; TUNNEL.h = ms.h * (1 - ms.oeffnung[1]);
    TUNNEL.gemessen = true;
  }
  // Lichtsaum der Ausfahrt (einmal vorbereitet, als 9-teiliges Bild gezeichnet – Saumbreite in Bildpunkten, nicht im Verhältnis
  // zur Öffnung): außen RO Bildpunkte weiß-warmer Schein auf Wand/Decke/Fahrbahn, innen RI Bildpunkte Überstrahlung der Kante
  const SAUM = { RO: 24, RI: 12, c: null };
  function saumBild() {
    if (SAUM.c) return SAUM.c;
    const { RO, RI } = SAUM, R = RO + RI, n = 2 * R + 1, c = document.createElement('canvas'); c.width = n; c.height = n;
    const x = c.getContext('2d'), id = x.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) {
      // Abstand zur Kante der Öffnung (Öffnung beginnt bei RO): außen positiv, innen negativ
      const ax = Math.max(RO - i, i - (n - 1 - RO), 0), ay = Math.max(RO - y, y - (n - 1 - RO), 0);
      let a;
      if (ax > 0 || ay > 0) a = 0.8 * Math.pow(Math.max(0, 1 - Math.hypot(ax, ay) / RO), 2.4);
      else { const din = Math.min(i - RO, n - 1 - RO - i, y - RO, n - 1 - RO - y) / RI; a = 0.8 * Math.pow(Math.max(0, 1 - din), 2.2); }
      const k = (y * n + i) * 4; id.data[k] = 255; id.data[k + 1] = 251; id.data[k + 2] = 238; id.data[k + 3] = Math.round(a * 255);
    }
    x.putImageData(id, 0, 0);
    return (SAUM.c = c);
  }
  function saumZeichnen(a, y1, b, y0) {
    const sb = saumBild(), R = SAUM.RO + SAUM.RI, sc = klemm((b - a) / 300, 0.4, 1.6), e = R * sc, ro = SAUM.RO * sc;
    const X = [a - ro, a - ro + e, b + ro - e, b + ro], Y = [y1 - ro, y1 - ro + e, y0 + ro - e, y0 + ro], S = [0, R, R + 1, 2 * R + 1];
    if (X[2] < X[1] || Y[2] < Y[1]) { g.drawImage(sb, X[0], Y[0], X[3] - X[0], Y[3] - Y[0]); return; }
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
      if (r === 1 && q === 1) continue;   // Mitte frei
      g.drawImage(sb, S[q], S[r], S[q + 1] - S[q], S[r + 1] - S[r], X[q], Y[r], X[q + 1] - X[q], Y[r + 1] - Y[r]);
    }
  }
  // Notrufnische nur in einzelnen Wandkacheln (rechts jede dritte, links jede vierte, versetzt je Fahrt)
  const tunnelNische = (n, seite) => seite > 0 ? (n + (W.saat | 0)) % 3 === 1 : (n + (W.saat | 0)) % 4 === 3;
  // Wand als Bild: Ebene x fest, Streifen gleichmäßig in 1/z, Bildspalte linear in z, Kachel ms.l Meter (links: Bild rechts = fern,
  // rechts: Bild links = fern – wie fassade())
  function tunnelWandBild(x, seite, z0, z1, T, wand, nische, ms, hell) {
    // nur den sichtbaren Teil der Wand zeichnen (sonst viele Streifen außerhalb der Scheibe)
    const rand = seite < 0 ? -2 : L.B + 2, nenner = rand - mitte;
    if (Math.abs(nenner) > 1 && (x - kx) / nenner > 0) z0 = Math.max(z0, 0.85 * (x - kx) * f / nenner);   // 15 % Reserve für Kurven
    if (z1 <= z0 + 0.05) return;
    const lw = ms.l, h = TUNNEL.h, iw = wand.width || wand.naturalWidth, ih = wand.height || wand.naturalHeight;
    const n = Math.max(1, Math.min(90, Math.ceil(Math.abs(xs(x, z0) - xs(x, z1)) / 6)));   // 6-px-Streifen (Bildrate bei 4× Drosselung)
    const s1 = 1 / z0, s2 = 1 / z1;
    const stueck = (za, zb, kachel) => {
      const img = tunnelNische(kachel, seite) ? nische : wand;
      const ua = (W.s + za - T.a) / lw - kachel, ub = (W.s + zb - T.a) / lw - kachel;
      const qa = seite > 0 ? 1 - ub : ua, qb = seite > 0 ? 1 - ua : ub;
      const Xa = xs(x, za), Xb = xs(x, zb), zm = (za + zb) / 2, oben = ys(h, zm), unten = ys(0, zm);
      g.drawImage(hell(img), Math.max(0, qa * iw), 0, Math.max(0.5, (qb - qa) * iw), ih, Math.min(Xa, Xb) - 0.35, oben, Math.abs(Xb - Xa) + 0.7, unten - oben);
    };
    let za = z0;
    for (let i = 1; i <= n; i++) {
      const zb = 1 / (s1 + (s2 - s1) * i / n);
      const ka = Math.floor((W.s + za - T.a) / lw), kb = Math.floor((W.s + zb - T.a) / lw);
      if (kb > ka) { const zc = T.a + kb * lw - W.s; stueck(za, zc, ka); stueck(zc, zb, kb); } else stueck(za, zb, ka);
      za = zb;
    }
  }
  // Decke als Bild (waagerechte Ebene in Höhe h): Bänder gleichmäßig in der Bildhöhe, Bildzeile linear in z (Bild-y = längs)
  function tunnelDeckeBild(z0, z1, T, img, ms, hell) {
    const h = TUNNEL.h, lw = ms.l, iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    const yA = Math.max(ys(h, z0), -2), yB = ys(h, z1);
    if (yB <= yA + 0.5) return;
    const zVon = y => (h - auge) * f / (hz - y);
    const n = Math.max(1, Math.min(70, Math.ceil((yB - yA) / 5)));
    const quelle = hell(img);
    const stueck = (za, zb, kachel) => {
      const ua = (W.s + za - T.a) / lw - kachel, ub = (W.s + zb - T.a) / lw - kachel;
      const ya = ys(h, za), yb = ys(h, zb), xa = xs(TUNNEL.xl - 0.4, za), xb = xs(TUNNEL.xr + 0.4, za);   // etwas über die Wände hinaus (siehe Clip)
      g.drawImage(quelle, 0, ua * ih, iw, Math.max(0.5, (ub - ua) * ih), xa, ya - 0.3, xb - xa, yb - ya + 0.6);
    };
    let za = Math.max(z0, zVon(yA));
    for (let i = 1; i <= n; i++) {
      const zb = Math.min(z1, zVon(yA + (yB - yA) * i / n));
      if (zb <= za) continue;
      const ka = Math.floor((W.s + za - T.a) / lw), kb = Math.floor((W.s + zb - T.a) / lw);
      if (kb > ka) { const zc = T.a + kb * lw - W.s; stueck(za, zc, ka); stueck(zc, zb, kb); } else stueck(za, zb, ka);
      za = zb;
    }
  }
  // Leuchten der Decke scharf nachzeichnen (das Deckenbild ist quer nur 223 px breit und wird nah stark vergrößert): Lage im Bild
  // gemessen (Bogen tunnel-innen, Decke): Mitten längs bei 8,7/26,6/41,4/58,5/73,9/91,1 % der Kachel, Länge 3,2 %, quer Mitte 51,6 %, 0,72 m breit
  const DECKE_LEUCHTEN = [0.087, 0.266, 0.414, 0.585, 0.739, 0.911];
  function tunnelDeckenLeuchten(z0, z1, T, ms) {
    const h = TUNNEL.h - 0.02, lw = ms.l, xm = TUNNEL.xl + 0.516 * (TUNNEL.xr - TUNNEL.xl), hl = 0.016 * lw, hb = 0.36;
    const k0 = Math.floor((W.s + z0 - T.a) / lw), k1 = Math.floor((W.s + Math.min(z1, 160) - T.a) / lw);
    for (let k = k1; k >= k0; k--) for (let j = DECKE_LEUCHTEN.length - 1; j >= 0; j--) {
      const zm = T.a + (k + DECKE_LEUCHTEN[j]) * lw - W.s, za = zm - hl, zb = zm + hl;
      if (za < Math.max(z0, 1.5) || zb > z1) continue;
      const ya = ys(h, za), yb = ys(h, zb);
      if (yb < -4) continue;
      const al = klemm(1.25 - zm / 150, 0.35, 1), m = f / zm;
      if (!W.einfach && m > 6) {
        const sch = g.createRadialGradient(xs(xm, zm), (ya + yb) / 2, 0, xs(xm, zm), (ya + yb) / 2, 1.4 * m);
        sch.addColorStop(0, `rgba(255,220,160,${0.32 * al})`); sch.addColorStop(1, 'rgba(255,220,160,0)');
        g.fillStyle = sch; g.fillRect(xs(xm, zm) - 1.4 * m, (ya + yb) / 2 - 1.4 * m, 2.8 * m, 2.8 * m);
      }
      g.fillStyle = `rgba(255,240,208,${al})`;
      g.beginPath(); g.moveTo(xs(xm - hb, za), ya); g.lineTo(xs(xm + hb, za), ya); g.lineTo(xs(xm + hb, zb), Math.max(yb, ya + 0.8)); g.lineTo(xs(xm - hb, zb), Math.max(yb, ya + 0.8)); g.closePath(); g.fill();
    }
  }
  // Ausfahrt: Ausblick-Bild in der Öffnung (Fluchtpunkt des Bildes auf dem Horizont, so groß, dass es die Öffnung füllt – wächst
  // beim Näherkommen mit der Öffnung); ohne Bild der bisherige Farbverlauf. Gibt die Öffnung [a, oben, b, unten] zurück.
  function tunnelAusfahrt(z1) {
    const { xl, xr, h } = TUNNEL, nacht = dunkelHier();
    const a = xs(xl, z1), b = xs(xr, z1), y0 = ys(0, z1), y1 = ys(h, z1);
    const name = nacht ? 'ausblick-nacht' : 'ausblick-tag', img = bild('tunnel', name), ms = BI.mass && BI.mass('tunnel/' + name);
    if (img && ms && ms.vp) {
      const iw = img.naturalWidth, ih = img.naturalHeight, [px, py] = ms.vp;
      const vx = mitte + 0.5 * K * z1 * f, vy = hz;   // Fluchtpunkt der Straße in dieser Tiefe (mit Kurve)
      const s = 1.03 * Math.max((vx - a) / (px * iw), (b - vx) / ((1 - px) * iw), (vy - y1) / (py * ih), (y0 - vy) / ((1 - py) * ih), 0.01);
      const dx = vx - px * iw * s, dy = vy - py * ih * s;
      // nachts gibt es keine Blendung, die den Wechsel zur echten Szene verdeckt: in den letzten 32–10 m blendet das Bild aus,
      // durch die Öffnung sieht man dann die Straße dahinter (tunnelInnen spart die Öffnung beim Abdunkeln aus)
      const al = nacht && W.tunnelLage ? klemm((W.tunnelLage.e - W.s - 10) / 22, 0, 1) : 1;
      if (al > 0.01) { g.globalAlpha = al; g.drawImage(img, (a - dx) / s, (y1 - dy) / s, (b - a) / s, (y0 - y1) / s, a, y1, b - a, y0 - y1); g.globalAlpha = 1; }
    } else {
      // Tageslicht: Himmel oben, Bäume/Wiese, Fahrbahn unten – hell, aber nicht weiß (nachts dunkelblau)
      const lg = g.createLinearGradient(0, y1, 0, y0);
      const st = nacht ? ['#2a3142', '#1c2230', '#151a24', '#121418'] : ['#f1f5f7', '#dce5e2', '#aebd9f', '#8f9590'];
      lg.addColorStop(0, st[0]); lg.addColorStop(0.5, st[1]); lg.addColorStop(0.72, st[2]); lg.addColorStop(1, st[3]);
      g.globalAlpha = 0.93; g.fillStyle = lg; g.fillRect(a, y1, b - a, y0 - y1); g.globalAlpha = 1;
    }
    return [a, y1, b, y0];
  }
  // Tunnelraum von zA bis zur Ausfahrt: Ausfahrt, Decke, Wände (Bild oder Code), Schleier (Augen an Tageslicht/Tunnellicht gewöhnt –
  // nicht über der Ausfahrt), Lichtsaum und Schein der Ausfahrt. schleier = Deckkraft der Abdunkelung (0 = keine).
  function tunnelRaum(zA, schleier) {
    tunnelMasse();
    const T = W.tunnelLage, { xl, xr, h } = TUNNEL;
    const z0 = Math.max(1, zA), z1 = Math.min(zFern, T.e - W.s);
    if (z1 <= z0 + 0.5) return;
    const nacht = dunkelHier();
    // Ausfahrt zuerst (Wände/Decke decken die Ränder sauber ab)
    const off = z1 < zFern - 1 ? tunnelAusfahrt(z1) : null;
    // Boden zwischen Fahrbahnrand und Wand (draußen Bankett/Gras): im Tunnel Asphalt
    const qs = strassenQuerschnitt();
    g.fillStyle = nacht ? '#1e2022' : '#2f3133';
    for (const [p0, p1] of [[xl, qs.links], [qs.rechts, xr]]) {
      if (p1 <= p0) continue;
      g.beginPath(); g.moveTo(xs(p0, z0), ys(0, z0)); g.lineTo(xs(p0, z1), ys(0, z1)); g.lineTo(xs(p1, z1), ys(0, z1)); g.lineTo(xs(p1, z0), ys(0, z0)); g.closePath(); g.fill();
    }
    const wand = !W.einfach && bild('tunnel', 'wand'), nische = wand && bild('tunnel', 'wand-nische'), decke = wand && bild('tunnel', 'decke');
    const wms = BI.mass && BI.mass('tunnel/wand'), dms = BI.mass && BI.mass('tunnel/decke');
    if (wand && nische && decke && wms && dms) {
      // Tunnellicht: Bilder leicht abgedunkelt (warmes Kunstlicht, dunkler als draußen am Tag)
      const hell = img => bildDunkel(img, 0.8);
      // Decke und Wände je an der echten Kante abschneiden (Streifen sind Rechtecke – sonst Treppenkanten an der Wandoberkante)
      // (Decke 0,4 m über die Wände hinaus – die Wand deckt das ab, so bleibt an der Kante keine Lücke mit Himmel)
      g.save(); g.beginPath(); g.moveTo(xs(xl - 0.4, z0), ys(h, z0)); g.lineTo(xs(xl - 0.4, z1), ys(h, z1)); g.lineTo(xs(xr + 0.4, z1), ys(h, z1)); g.lineTo(xs(xr + 0.4, z0), ys(h, z0)); g.closePath(); g.clip();
      tunnelDeckeBild(z0, z1, T, decke, dms, hell);
      tunnelDeckenLeuchten(z0, z1, T, dms);
      g.restore();
      for (const [x, seite] of [[xl, -1], [xr, 1]]) {
        g.save(); seitenFlaeche(x, z0, z1, 0, h); g.clip();
        tunnelWandBild(x, seite, z0, z1, T, wand, nische, wms, hell);
        g.restore();
      }
    } else {
      // Code-Tunnel (schwache Geräte oder Bilder noch nicht geladen): Decke, Wände mit Sockel, Lampen alle 12 m
      const dg = g.createLinearGradient(0, ys(h, z0 + 2), 0, ys(h, z1));
      dg.addColorStop(0, '#1b1c1e'); dg.addColorStop(1, '#2c2d2f');
      g.fillStyle = dg;
      g.beginPath(); g.moveTo(xs(xl, z0), ys(h, z0)); g.lineTo(xs(xl, z1), ys(h, z1)); g.lineTo(xs(xr, z1), ys(h, z1)); g.lineTo(xs(xr, z0), ys(h, z0)); g.closePath(); g.fill();
      for (const x of [xl, xr]) {
        g.fillStyle = '#3a3c3d'; seitenFlaeche(x, z0, z1, 0, h); g.fill();
        g.fillStyle = 'rgba(0,0,0,.28)'; seitenFlaeche(x, z0, z1, h * 0.62, h); g.fill();
        g.fillStyle = '#56585a'; seitenFlaeche(x, z0, z1, 0, 0.95); g.fill();
        g.fillStyle = '#6c6e6e'; seitenFlaeche(x, z0, z1, 0.95, 1.05); g.fill();
      }
      const n0 = Math.ceil((W.s + z0 - T.a) / TUNNEL.lampe), n1 = Math.floor((W.s + z1 - T.a) / TUNNEL.lampe);
      for (let n = Math.min(n1, n0 + 40); n >= n0; n--) {
        const z = T.a + n * TUNNEL.lampe - W.s;
        if (z < z0 || z > z1) continue;
        const m = f / z, al = klemm(1.3 - z / 260, 0.25, 1);
        for (const x of [xl + 0.25, xr - 0.25]) {
          const lx = xs(x, z), ly = ys(h - 0.35, z), w = Math.max(1.5, 1.2 * m), hh = Math.max(1, 0.12 * m);
          if (!W.einfach) {
            const sch = g.createRadialGradient(lx, ly, 0, lx, ly, Math.max(4, 1.6 * m));
            sch.addColorStop(0, `rgba(255,214,150,${0.35 * al})`); sch.addColorStop(1, 'rgba(255,214,150,0)');
            g.fillStyle = sch; g.fillRect(lx - 1.6 * m, ly - 1.6 * m, 3.2 * m, 3.2 * m);
          }
          g.fillStyle = `rgba(255,236,196,${al})`; g.fillRect(lx - w / 2, ly - hh / 2, w, hh);
        }
      }
    }
    // Schleier über Wänden, Decke und Fahrbahn – die Ausfahrt bleibt hell (ausgespart)
    if (schleier > 0.01) {
      g.fillStyle = `rgba(6,7,9,${schleier})`;
      g.beginPath(); g.rect(0, 0, L.B, L.armaturen + 4);
      if (off) g.rect(off[0], off[1], off[2] - off[0], off[3] - off[1]);
      g.fill('evenodd');
    }
    if (off && !nacht) {
      // Schein der Ausfahrt auf Wänden, Decke und Fahrbahn (Stirnseite), dann Lichtsaum um die Öffnung (überstrahlt die Kanten)
      const [a, y1, b, y0] = off, mx = (a + b) / 2, my = (y0 + y1) / 2, rr = Math.max(30, (b - a) * 1.25);
      // Tageslicht fällt durch die Öffnung auf Fahrbahn und Decke (letzte ca. 35 m), weich zur Kamera hin auslaufend
      const zs = Math.max(z0, z1 - 35, z1 * 0.45);
      for (const [hh, st] of [[0, 0.42], [h, 0.28]]) {
        const ya = ys(hh, z1), yb = ys(hh, zs), lin = g.createLinearGradient(0, ya, 0, yb);
        lin.addColorStop(0, `rgba(255,250,236,${st})`); lin.addColorStop(1, 'rgba(255,250,236,0)');
        g.fillStyle = lin; g.beginPath(); g.moveTo(xs(xl, z1), ya); g.lineTo(xs(xr, z1), ya); g.lineTo(xs(xr, zs), yb); g.lineTo(xs(xl, zs), yb); g.closePath(); g.fill();
      }
      const halo = g.createRadialGradient(mx, my, 0, mx, my, rr);
      halo.addColorStop(0, 'rgba(255,250,236,.34)'); halo.addColorStop(1, 'rgba(255,250,236,0)');
      g.fillStyle = halo; g.fillRect(mx - rr, my - rr, rr * 2, rr * 2);
      saumZeichnen(a, y1, b, y0);
    }
  }
  // von außen: der Tunnel durch die Öffnung des Portals (z = Entfernung zum Portal); vor der Einfahrt wirkt das Innere dunkler
  // (Augen ans Tageslicht gewöhnt), nachts heller als die Umgebung
  function tunnelDurchsicht(z) {
    tunnelMasse();
    const T = W.tunnelLage, { xl, xr, h } = TUNNEL;
    if (!T || T.e - W.s <= z) return;
    const a = xs(xl, z), b = xs(xr, z), oben = ys(h, z), unten = ys(0, z);
    if (b < 0 || a > L.B || unten < 0) return;
    g.save();
    g.beginPath(); g.rect(a, oben, b - a, unten - oben); g.clip();
    // Fahrbahn im Tunnel: nah am Portal so dunkel wie innen (tunnelInnen), weiter weg heller – kein Sprung beim Einfahren
    const fern = klemm((z - 1.2) / 40, 0, 1);
    g.fillStyle = `rgba(6,7,9,${0.62 * (1 - fern)})`; g.fillRect(a, oben, b - a, unten - oben);
    tunnelRaum(z, dunkelHier() ? 0.06 : 0.3 + 0.28 * fern);
    tunnelVerkehr(z);
    g.restore();
    // Schatten des Portals auf der Fahrbahn davor (ca. 2 m), damit die Kante am Tunnelmund weich ist
    if (!dunkelHier() && z > 3) {
      const yb = ys(0, z - 2), sg = g.createLinearGradient(0, unten, 0, yb);
      sg.addColorStop(0, `rgba(6,7,9,${0.3 * (1 - fern)})`); sg.addColorStop(1, 'rgba(6,7,9,0)');
      g.fillStyle = sg; g.beginPath(); g.moveTo(a, unten); g.lineTo(b, unten); g.lineTo(xs(xr, z - 2), yb); g.lineTo(xs(xl, z - 2), yb); g.closePath(); g.fill();
    }
  }
  // Verkehr im Tunnel: Wände/Decke/Ausfahrt werden nach den Körpern gezeichnet und würden Fahrzeuge im Tunnel überdecken – darum
  // Fahrzeuge, Radler und Personen zwischen Einfahrt und Ausfahrt (ab zMin) danach noch einmal zeichnen, etwas abgedunkelt
  const IM_TUNNEL = { fahrzeug: 1, quer: 1, radler: 1, person: 1 };
  function tunnelVerkehr(zMin) {
    const T = W.tunnelLage;
    let an = false;
    for (const o of koerperListe) {
      if (!IM_TUNNEL[o.typ] || o.versteckt || o.pos < T.a || o.pos > T.e || (o.x || 0) < TUNNEL.xl + 0.5 || (o.x || 0) > TUNNEL.xr - 0.5) continue;   // nur in der Röhre (Gegenfahrbahn liegt hinter der Wand)
      const z = o.pos - W.s;
      if (z < zMin || z > zFern) continue;
      if (!an) { g.save(); if (!dunkelHier()) g.filter = 'brightness(0.72)'; an = true; }
      koerper(o);
    }
    if (an) g.restore();
  }
  // Blendung beim Ausfahren (Tag): letzte 28 m heller werdend, danach rasch zurück. Bewegung reduziert: nur weiche Aufhellung.
  function tunnelBlendung(zE, off) {
    if (dunkelHier()) return;
    const p = zE > 0 ? 1 - zE / TUNNEL.blendVor : 1 - (-zE) / TUNNEL.blendNach;
    if (p <= 0) return;
    const w = p * p * (3 - 2 * p);   // weich (smoothstep)
    if (W.ruhig) {
      g.fillStyle = `rgba(255,252,242,${0.34 * w})`; g.fillRect(0, 0, L.B, L.armaturen + 4);
      return;
    }
    // Überstrahlung von der Öffnung aus (beim Ausfahren über die ganze Scheibe), dazu leichte Gesamtaufhellung
    const mx = off ? (off[0] + off[2]) / 2 : mitte, my = off ? (off[1] + off[3]) / 2 : hz, r = Math.max(L.B, L.armaturen) * (0.35 + 0.9 * w);
    const v = g.createRadialGradient(mx, my, 0, mx, my, r);
    v.addColorStop(0, `rgba(255,253,245,${0.55 * w})`); v.addColorStop(0.55, `rgba(255,251,238,${0.3 * w})`); v.addColorStop(1, `rgba(255,250,236,${0.1 * w})`);
    g.fillStyle = v; g.fillRect(0, 0, L.B, L.armaturen + 4);
  }
  function tunnelInnen() {
    const T = W.tunnelLage, d = T ? W.s - T.a : -9;
    if (!T) { g.fillStyle = `rgba(6,7,9,${0.82 * W.tunnel})`; g.fillRect(0, 0, L.B, L.armaturen + 4); return; }
    if (d <= -1.2) return;   // davor zeichnet das Portal den Tunnel durch die Öffnung
    tunnelMasse();
    const zE = T.e - W.s;
    if (zE <= 0.5) { if (zE > -TUNNEL.blendNach) tunnelBlendung(zE, null); return; }   // ausgefahren: nur noch die abklingende Blendung
    // Grund dunkel (Fahrbahn im Tunnel, Lücken), darüber der Tunnelraum
    // (die Öffnung der Ausfahrt bleibt ausgespart – nachts sieht man dort zuletzt die echte Straße, siehe tunnelAusfahrt)
    g.fillStyle = 'rgba(6,7,9,.62)'; g.beginPath(); g.rect(0, 0, L.B, L.armaturen + 4);
    if (zE < zFern - 1) { const { xl, xr, h } = TUNNEL, a = xs(xl, zE), b = xs(xr, zE), y1 = ys(h, zE), y0 = ys(0, zE); g.rect(a, y1, b - a, y0 - y1); }
    g.fill('evenodd');
    g.save(); g.beginPath(); g.rect(0, 0, L.B, L.armaturen + 4); g.clip();
    tunnelRaum(Math.max(1, T.a - W.s), dunkelHier() ? 0.06 : 0.3);
    tunnelVerkehr(1);
    g.restore();
    if (zE < TUNNEL.blendVor) {
      const { xl, xr, h } = TUNNEL;
      tunnelBlendung(zE, [xs(xl, zE), ys(h, zE), xs(xr, zE), ys(0, zE)]);
    }
  }

  // ---------- Licht, Wetter ----------
  function nachtUndLichter() {
    const nacht = W.wetter === 'nacht';
    if (nacht) {
      // Scheinwerferkegel: hell auf der Straße vor uns, außen dunkel
      const cx = mitte, cy = misch(hz, L.armaturen, 0.3);
      const v = g.createRadialGradient(cx, cy, (L.armaturen - hz) * 0.3, cx, cy + (L.armaturen - hz) * 0.2, Math.max(L.B, L.armaturen) * 0.8);
      v.addColorStop(0, 'rgba(4,6,12,0)'); v.addColorStop(0.5, 'rgba(4,6,12,.4)'); v.addColorStop(1, 'rgba(4,6,12,.8)');
      g.fillStyle = v; g.fillRect(0, hz - 30, L.B, L.armaturen - hz + 60);
      const kegel = g.createLinearGradient(0, hz, 0, L.armaturen);
      kegel.addColorStop(0, 'rgba(255,240,200,0)'); kegel.addColorStop(1, 'rgba(255,240,200,.1)');
      g.fillStyle = kegel;
      const fern = W.licht === 'fern' ? 1 : 0;
      g.beginPath(); g.moveTo(mitte - L.B * 0.05, hz + 6 - fern * 4); g.lineTo(mitte + L.B * 0.05, hz + 6 - fern * 4); g.lineTo(mitte + L.B * 0.7, L.armaturen); g.lineTo(mitte - L.B * 0.7, L.armaturen); g.closePath(); g.fill();
      if (fern) { const k2 = g.createRadialGradient(mitte, hz + 10, 0, mitte, hz + 10, L.B * 0.5); k2.addColorStop(0, 'rgba(255,245,215,.16)'); k2.addColorStop(1, 'rgba(255,245,215,0)'); g.fillStyle = k2; g.fillRect(0, hz - 40, L.B, L.armaturen - hz + 40); }
    }
    if (W.wetter === 'daemmerung') { g.fillStyle = 'rgba(18,22,40,.38)'; g.fillRect(0, L.dach, L.B, L.armaturen - L.dach); }
    if (W.tunnel > 0 || W.tunnelLage) tunnelInnen();   // tunnelLage: auch die Blendung nach der Ausfahrt
    if (W.wetter === 'nebel') {
      const v = g.createLinearGradient(0, L.dach, 0, L.armaturen);
      v.addColorStop(0, rgba(NEBEL_FARBE, 0.55)); v.addColorStop((hz - L.dach) / (L.armaturen - L.dach), rgba(NEBEL_FARBE, 0.82)); v.addColorStop(1, rgba(NEBEL_FARBE, 0.15));
      g.fillStyle = v; g.fillRect(0, L.dach, L.B, L.armaturen - L.dach);
    }
    // Lichter (nach der Dunkelheit, damit sie leuchten)
    for (const l of lichter) {
      if (l.schein > 2 && !W.einfach) {
        const v = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.schein);
        v.addColorStop(0, l.farbe.startsWith('rgba') ? l.farbe : rgba(l.farbe, nacht || l.nebel ? 0.55 : 0.35)); v.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = v; g.beginPath(); g.arc(l.x, l.y, l.schein, 0, P2); g.fill();
      }
      if (nacht || l.nebel || W.wetter === 'nebel' || W.wetter === 'daemmerung') { g.fillStyle = l.farbe; g.beginPath(); g.arc(l.x, l.y, Math.max(0.8, l.r), 0, P2); g.fill(); }
    }
    // Blendung (Gegenverkehr mit Fernlicht, tiefe Sonne): helle Fläche um die Lichtquelle
    const bl = W.blendung;
    if (bl && bl.st > 0.02) {
      const bx = bl.x != null ? bl.x : mitte, by = bl.y != null ? bl.y : hz;
      const v = g.createRadialGradient(bx, by, 0, bx, by, L.B * (0.3 + bl.st * 0.6));
      v.addColorStop(0, `rgba(255,252,235,${0.95 * bl.st})`); v.addColorStop(0.4, `rgba(255,248,220,${0.55 * bl.st})`); v.addColorStop(1, 'rgba(255,248,220,0)');
      g.fillStyle = v; g.fillRect(0, L.dach, L.B, L.armaturen - L.dach);
    }
  }
  // Schnee: Flocken fallen vor der Scheibe
  const flocken = [];
  function schneefall(dt) {
    while (flocken.length < (W.einfach ? 30 : 90)) flocken.push({ x: Math.random(), y: Math.random(), r: 0.8 + Math.random() * 2, v: 0.15 + Math.random() * 0.25 });
    g.fillStyle = 'rgba(250,250,252,.85)';
    for (const f of flocken) {
      f.y += dt * f.v * (1 + W.v / 25); f.x += dt * (f.x - 0.5) * W.v / 60;
      if (f.y > 1 || f.x < 0 || f.x > 1) { f.y = 0; f.x = 0.2 + Math.random() * 0.6; }
      g.beginPath(); g.arc(f.x * L.B, L.dach + f.y * (L.armaturen - L.dach), f.r * (0.6 + f.y), 0, P2); g.fill();
    }
  }
  // Scheibe: beschlagen (von unten), Schmutzwasser (Schlieren) – W.beschlag, W.schmutz 0–1
  function scheibeOverlay() {
    const A = L.armaturen, D0 = L.dach;
    if (W.beschlag > 0.01) {
      const v = g.createLinearGradient(0, A, 0, D0);
      v.addColorStop(0, `rgba(222,228,232,${0.92 * W.beschlag})`); v.addColorStop(Math.min(0.95, 0.25 + W.beschlag * 0.6), `rgba(222,228,232,${0.75 * W.beschlag})`); v.addColorStop(1, 'rgba(222,228,232,0)');
      g.fillStyle = v; g.fillRect(0, D0, L.B, A - D0);
    }
    if (W.schmutz > 0.01) {
      g.fillStyle = `rgba(92,78,58,${0.7 * W.schmutz})`;
      for (let i = 0; i < 9; i++) { const x = zufall(i, 51, 3) * L.B, y = D0 + (0.2 + zufall(i, 52, 3) * 0.7) * (A - D0), r = L.B * (0.12 + zufall(i, 53, 3) * 0.14); g.beginPath(); g.ellipse(x, y, r, r * 0.55, zufall(i, 54, 3), 0, P2); g.fill(); }
    }
  }
  // Regentropfen auf der Scheibe (nicht im einfachen Modus) und Scheibenwischer
  const tropfen = [];
  function regen(dt) {
    const t = performance.now() / 1000, periode = 1.7, dauer = 1.1;
    const p = (t % periode), w = p < dauer ? Math.sin(p / dauer * Math.PI) : 0;   // 0 = unten, 1 = oben
    const winkel = 0.12 + w * 1.25;
    const achsen = [[0.28, 0.5], [0.66, 0.46]];
    if (!W.einfach) {
      while (tropfen.length < 70) tropfen.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.2, a: 0 });
      const yo = L.dach, yu = L.armaturen;
      for (const d of tropfen) {
        d.a = Math.min(1, d.a + dt * 0.8);
        d.y += dt * 0.004 * d.r;
        const px = d.x * L.B, py = yo + d.y * (yu - yo);
        // vom Wischer erfasst?
        for (const [ax, l] of achsen) {
          const dx = px - ax * L.B, dy = (yu + 6) - py, rr = Math.hypot(dx, dy), wk = Math.atan2(dy, dx);
          if (rr < L.B * l && p < dauer && wk < winkel && wk > winkel - 0.25) { d.a = 0; d.x = Math.random(); d.y = Math.random(); }
        }
        if (d.y > 1) { d.y = 0; d.a = 0; }
        if (d.a < 0.05) continue;
        g.fillStyle = `rgba(220,230,240,${0.35 * d.a})`; g.beginPath(); g.ellipse(px, py, d.r, d.r * 1.25, 0, 0, P2); g.fill();
        g.fillStyle = `rgba(255,255,255,${0.5 * d.a})`; g.beginPath(); g.arc(px - d.r * 0.3, py - d.r * 0.4, d.r * 0.35, 0, P2); g.fill();
      }
    }
    g.strokeStyle = '#0d0e10'; g.lineCap = 'round';
    for (const [ax, l] of achsen) {
      const x0 = ax * L.B, y0 = L.armaturen + 6, len = L.B * l;
      g.lineWidth = Math.max(3, L.B * 0.008);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(winkel) * len, y0 - Math.sin(winkel) * len); g.stroke();
    }
  }

  // ---------- Cockpit ----------
  let cockpitBild = null, cockpitKey = '', duesen = null;   // duesen: Bildschirmlage der vier Lüftungsdüsen im Armaturen-Bild
  function cockpitStatisch(dpr) {
    const armBild = bild('cockpit', 'armaturen');
    const key = L.B + 'x' + L.H + '@' + dpr + (R_.farben.haupt) + (armBild ? 'b' : '');
    if (cockpitBild && cockpitKey === key) return cockpitBild;
    const c = document.createElement('canvas'); c.width = Math.round(L.B * dpr); c.height = Math.round(L.H * dpr);
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const B = L.B, H = L.H, A = L.armaturen;
    duesen = null;
    // Motorhaube in Kundenfarbe (Fahrschulauto)
    const haube = x.createLinearGradient(0, A - H * 0.05, 0, A + 10);
    haube.addColorStop(0, R_.toenen ? R_.toenen(R_.farben.haupt, 0.15) : R_.farben.haupt); haube.addColorStop(1, abdunkeln(R_.farben.haupt, 0.55));
    x.fillStyle = haube;
    x.beginPath(); x.moveTo(-10, A + 10); x.lineTo(-10, A - H * 0.012); x.quadraticCurveTo(B / 2, A - H * 0.045, B + 10, A - H * 0.012); x.lineTo(B + 10, A + 10); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.12)';
    x.beginPath(); x.moveTo(B * 0.2, A - H * 0.022); x.quadraticCurveTo(B / 2, A - H * 0.04, B * 0.8, A - H * 0.022); x.quadraticCurveTo(B / 2, A - H * 0.032, B * 0.2, A - H * 0.022); x.fill();
    // Armaturenbrett
    // Phase 4: Bild cockpit/armaturen (Bogen „Armaturenbrett“). Die Kombi-Haube des Bildes sitzt um den Code-Tacho (L.kombi), Maßstab nach
    // dem Tacho (Haube ca. 2,6 Radien breit), höchstens so groß, dass die Haube nur knapp über die Scheibenunterkante ragt; Ränder
    // (quer) mit der gestreckten Randspalte ergänzt. Tacho, Kontrollleuchten und Tasten bleiben Code und liegen darauf.
    const brett = x.createLinearGradient(0, A, 0, H);
    brett.addColorStop(0, '#2b2e32'); brett.addColorStop(0.18, '#1c1e21'); brett.addColorStop(1, '#121315');
    if (armBild) {
      const ms = (BI.mass && BI.mass('cockpit/armaturen')) || {}, kb = ms.kombi || [0.26, 0.245], hb = ms.haube || [0.032, 0.163];
      const iw = armBild.naturalWidth, ih = armBild.naturalHeight, kk = L.kombi;
      const s = Math.min(kk.r * 2.6 / (hb[1] * iw), (kk.cy - A + 22) / ((kb[1] - hb[0]) * ih));
      const w = iw * s, h = ih * s, x0 = kk.cx - kb[0] * w, y0 = kk.cy - kb[1] * h;
      const oben = y0 + 0.07 * h;   // Oberkante des Bretts neben der Haube
      x.fillStyle = brett; x.fillRect(-5, oben + 14, B + 10, H - oben);
      if (x0 > 0) x.drawImage(armBild, 0, 0, 4, ih, -1, y0, x0 + 2, h);
      if (x0 + w < B) x.drawImage(armBild, iw - 4, 0, 4, ih, x0 + w - 1, y0, B - x0 - w + 2, h);
      x.drawImage(armBild, x0, y0, w, h);
      // Lüftungsdüsen der Mittelkonsole im Bild (gemessen 28.10.2026: x 47,5–67,5 %, y 8–48,5 % des Bildes)
      duesen = { x0: x0 + 0.475 * w, x1: x0 + 0.675 * w, y0: y0 + 0.08 * h, y1: y0 + 0.485 * h };
    } else {
      x.fillStyle = brett;
      x.beginPath(); x.moveTo(-5, A + 4); x.quadraticCurveTo(B / 2, A - 14, B + 5, A + 4); x.lineTo(B + 5, H + 5); x.lineTo(-5, H + 5); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(-5, A + 4); x.quadraticCurveTo(B / 2, A - 14, B + 5, A + 4); x.stroke();
      // Lüftungsdüsen
      x.fillStyle = '#0c0d0f';
      if (L.quer || A + 34 < L.licht.y) for (const px of L.quer ? [0.3, 0.7] : [0.08, 0.92]) { if (L.quer && px > 0.5 && B * px + 22 > L.warn.x && B * px - 22 < L.warn.x + L.warn.w) continue; x.beginPath(); x.roundRect(B * px - 22, A + 18, 44, 14, 5); x.fill(); }
      // Gehäuse Kombiinstrument
      const k = L.kombi;
      x.fillStyle = '#0b0c0d';
      x.beginPath(); x.ellipse(k.cx, k.cy - k.r * 0.05, k.r * 2.5, k.r * 1.3, 0, Math.PI, 0); x.lineTo(k.cx + k.r * 2.5, k.cy + k.r * 1.2); x.lineTo(k.cx - k.r * 2.5, k.cy + k.r * 1.2); x.closePath(); x.fill();
    }
    // Dachhimmel und A-Säulen
    x.fillStyle = '#26282b';
    x.beginPath(); x.moveTo(-5, -5); x.lineTo(B + 5, -5); x.lineTo(B + 5, L.dach); x.quadraticCurveTo(B / 2, L.dach + 14, -5, L.dach); x.closePath(); x.fill();
    const saeule = L.quer ? B * 0.045 : B * 0.07;
    x.fillStyle = '#1f2124';
    x.beginPath(); x.moveTo(-5, L.dach - 2); x.lineTo(saeule, L.dach); x.lineTo(saeule * 0.25, A); x.lineTo(-5, A + 4); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(B + 5, L.dach - 2); x.lineTo(B - saeule, L.dach); x.lineTo(B - saeule * 0.25, A); x.lineTo(B + 5, A + 4); x.closePath(); x.fill();
    // Halter Innenspiegel
    const sp = L.spiegelInnen;
    x.fillStyle = '#16171a'; x.fillRect(B / 2 - 4, L.dach, 8, sp.y - L.dach + 2);
    cockpitBild = c; cockpitKey = key;
    return c;
  }

  // Spiegel (Phase-3-Korrektur): zeigt die Szene hinter dem Auto – Himmel-Bild, Gehwege, Häuserzeilen bzw. Feld-/Waldrand, Bäume,
  // Fahrzeuge hinter uns als Bild von vorne (gespiegelt). Vereinfacht: feste Fassaden je Seite, laufen mit der Fahrt nach hinten weg.
  function spiegelInhalt(r, art) {
    g.save();
    g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, r.h * 0.35); g.clip();
    const h = HIMMEL[W.wetter] || HIMMEL.klar, nacht = dunkelHier(), umg = W.umgebung, stadtArt = umg === 'stadt' || umg === 'wohngebiet';
    const hzS = r.y + r.h * 0.42;
    const hi = bild('himmel', W.wetter === 'klar' && (W.saat | 0) % 2 ? 'wolkig' : HIMMEL_BILD[W.wetter]);
    if (hi) g.drawImage(hi, hi.naturalWidth * 0.3, 0, hi.naturalWidth * 0.4, hi.naturalHeight, r.x, r.y, r.w, hzS - r.y + 2);
    else { g.fillStyle = h[1]; g.fillRect(r.x, r.y, r.w, r.h); }
    if (W.wetter === 'daemmerung') { g.fillStyle = 'rgba(24,30,58,.5)'; g.fillRect(r.x, r.y, r.w, hzS - r.y); }
    g.fillStyle = nacht ? '#0b0d0c' : W.schnee ? '#dfe4e6' : stadtArt ? '#9a978f' : '#748f4e'; g.fillRect(r.x, hzS, r.w, r.h);
    // eigene Fahrtrichtung zeigt in der Mitte nach hinten; Spiegelbild: links bleibt links
    const fx = art === 'innen' ? r.x + r.w / 2 : art === 'links' ? r.x + r.w * 0.85 : r.x + r.w * 0.15;
    const sicht = art === 'innen' ? 0 : art === 'links' ? -2.6 : 2.6;   // seitliche Blickrichtung der Außenspiegel (m)
    const fs = r.w * (art === 'innen' ? 0.9 : 1.6);
    const px = (x, dz) => fx + (x - kx - sicht) * fs / Math.max(1, dz);
    const py = (hgt, dz) => hzS + (1.2 - hgt) * fs * 0.5 / Math.max(1, dz);
    const quad = (x0, x1, d0, d1, farbe) => { g.fillStyle = farbe; g.beginPath(); g.moveTo(px(x0, d1), py(0, d1)); g.lineTo(px(x1, d1), py(0, d1)); g.lineTo(px(x1, d0), py(0, d0)); g.lineTo(px(x0, d0), py(0, d0)); g.closePath(); g.fill(); };
    const q = strassenQuerschnitt();
    // Boden: Gehweg/Bankett, Fahrbahn
    if (q.gehweg) { quad(q.gehweg[0][0], 30, 2, 220, nacht ? '#202224' : '#a9a7a1'); quad(-30, q.gehweg[1][1], 2, 220, nacht ? '#202224' : '#a9a7a1'); }
    quad(q.links, q.rechts, 2, 220, nacht ? '#1b1d21' : W.regen || W.wetter === 'regen' ? '#44484c' : '#5b5f63');
    g.fillStyle = 'rgba(236,236,230,.8)';
    for (let d = 4 + (W.s % 12); d < 120; d += 12) g.fillRect(px(-1.75, d) - 0.5, py(0, d + 4), 1, Math.max(0.5, py(0, d) - py(0, d + 4)));
    // Seitenränder: Häuserzeilen (Fassadenbilder) bzw. Feld-/Waldstreifen, in wenigen Streifen perspektivisch
    const seiteRand = (x, key, hoehe, rand) => {
      const img = rand ? (BI.bild && BI.bild(key) && (nacht ? bildDunkel(BI.bild(key), 0.12) : BI.bild(key))) : fassadenBild(key, false);
      if (!img) return;
      const ms = BI.mass(key) || { h: hoehe, px: [3, 2] }, lang = ms.h * ms.px[0] / ms.px[1], iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const versatz = ((W.s % lang) + lang) % lang;
      const n = 14;
      for (let i = 0; i < n; i++) {
        const d0 = 2 * Math.pow(60, i / n), d1 = 2 * Math.pow(60, (i + 1) / n);
        const u0 = ((d0 + versatz) % lang) / lang, u1 = u0 + (d1 - d0) / lang;
        const xa = px(x, d0), xb = px(x, d1), top = py(ms.h, (d0 + d1) / 2), bot = py(0, (d0 + d1) / 2);
        const qa = x > 0 ? u0 : 1 - Math.min(1, u1), qb = x > 0 ? Math.min(1, u1) : 1 - u0;
        if (qb - qa > 0.002) g.drawImage(img, qa * iw, 0, (qb - qa) * iw, ih, Math.min(xa, xb) - 0.3, top, Math.abs(xb - xa) + 0.6, bot - top);
      }
    };
    if (stadtArt && BI.liste) {
      const pool = BI.liste('fassade/' + umg + '-');
      if (pool.length) { const s = W.saat | 0; seiteRand(FASSADE_X[umg][0], pool[s % pool.length], 12, false); seiteRand(FASSADE_X[umg][1], pool[(s + 3) % pool.length], 12, false); }
    } else if (umg === 'land' || umg === 'autobahn') {
      const plan = RAND_PLAN[umg];
      if (plan && BI.mass) for (const sk of ['1', '-1']) { const e = plan[sk].find(e => BI.mass(e[0])); if (e) seiteRand(e[1], e[0], 8, true); }
    }
    // Fahrzeuge hinter uns: Bild von vorne (Gegenverkehr-Bogen), im Spiegel seitenverkehrt
    for (const o of W.hinten) {
      if (o.dz < 3.2) continue;   // toter Winkel: weder Innen- noch Außenspiegel zeigen es
      if (art === 'innen' && Math.abs(o.x - kx) / o.dz > 0.5) continue;
      const gr = { rad: [0.6, 1.7], motorrad: [0.8, 1.6], lkw: [2.5, 3.6], rettung: [2.1, 2.7] }[o.art] || [1.8, 1.45];
      const w = gr[0] * fs / o.dz, hh = gr[1] * fs * 0.5 / o.dz;
      const cx = px(o.x, o.dz), by = py(0, o.dz);
      if (o._vw == null) o._vw = Math.floor(Math.random() * 60);
      const wahl = o.art !== 'rad' && BI.waehle && BI.waehle('gegenverkehr/' + (o.art === 'polizei' ? 'polizei' : o.art), o._vw);
      if (wahl) {
        const ms = wahl.mass || {}, iw = wahl.img.naturalWidth, ih = wahl.img.naturalHeight, bw = (ms.b || gr[0]) * fs / o.dz, hb = bw * ih / iw * 0.5;
        g.save(); g.translate(cx, 0); g.scale(-1, 1);
        g.drawImage(nacht ? bildDunkel(wahl.img, 0.25) : wahl.img, -bw / 2, by - hb, bw, hb);
        g.restore();
        if (nacht) { g.fillStyle = '#fffbe8'; g.fillRect(cx - bw * 0.42, by - hb * 0.45, bw * 0.16, Math.max(1, hb * 0.08)); g.fillRect(cx + bw * 0.26, by - hb * 0.45, bw * 0.16, Math.max(1, hb * 0.08)); }
      } else {
        g.fillStyle = nacht ? '#222' : o.farbe || '#888';
        g.fillRect(cx - w / 2, by - hh, w, hh);
        g.fillStyle = nacht ? '#fffbe8' : 'rgba(40,52,62,.9)';
        if (o.art !== 'rad' && o.art !== 'motorrad') { g.fillRect(cx - w * 0.38, by - hh * 0.92, w * 0.76, hh * 0.35); g.fillStyle = '#fffbe8'; g.fillRect(cx - w * 0.45, by - hh * 0.4, w * 0.18, hh * 0.12); g.fillRect(cx + w * 0.27, by - hh * 0.4, w * 0.18, hh * 0.12); }
        else if (o.art === 'motorrad') { g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(cx, by - hh * 0.55, Math.max(1.2, w * 0.18), 0, P2); g.fill(); }
      }
      if (o.blau && Math.floor(performance.now() / 160) % 2 === 0) { g.fillStyle = '#3f7bff'; g.beginPath(); g.arc(cx - w * 0.25, by - hh * 1.02, Math.max(1.5, w * 0.12), 0, P2); g.arc(cx + w * 0.25, by - hh * 1.02, Math.max(1.5, w * 0.12), 0, P2); g.fill(); }
      if (o.lichthupe && Math.floor(performance.now() / 220) % 2 === 0) { g.fillStyle = 'rgba(255,255,240,.9)'; g.beginPath(); g.arc(cx, by - hh * 0.4, Math.max(2, w * 0.5), 0, P2); g.fill(); }
      if (o.blink === 'links' && window.BL_TAKT && window.BL_TAKT.an()) { g.fillStyle = '#ffb21e'; g.fillRect(cx - w * 0.5, by - hh * 0.45, w * 0.16, hh * 0.14); }
    }
    if (W.wetter === 'nebel') { g.fillStyle = 'rgba(200,204,206,.55)'; g.fillRect(r.x, r.y, r.w, r.h); }
    g.restore();
  }

  // Phase-5-Korrektur (768 × 1024): liegt die Warnblinker-Taste hochkant auf den Lüftungsdüsen des Armaturen-Bildes, rückt sie unter die
  // Bremse (Mittelkonsole), sofern dort Platz ist; sonst links neben die Düsen. L.warn ist dasselbe Objekt wie in spiel.js (Tippfläche).
  function warnPlatz() {
    if (!duesen || L.quer || L._warnPlatz === cockpitKey) return;
    L._warnPlatz = cockpitKey;
    const w = L.warn, d = duesen, b = L.bremse;
    const schnitt = r => Math.min(r.x + r.w, d.x1) - Math.max(r.x, d.x0) > 4 && Math.min(r.y + r.h, d.y1) - Math.max(r.y, d.y0) > 4;
    if (!w._orig) w._orig = { x: w.x, y: w.y };
    w.x = w._orig.x; w.y = w._orig.y;
    if (!schnitt(w)) return;
    // unter der Bremse nur, wenn dort weder Lenkradkranz noch Hände liegen (rechts außerhalb des Kranzes oder über ihm)
    const l = L.lenkrad, ux = b.x + (b.w - w.w) / 2, uy = b.y + b.h + 10;
    if (uy + w.h <= L.H - 8 && (ux >= l.cx + l.r * 1.02 || uy + w.h <= l.cy - l.r - 4)) { w.x = ux; w.y = uy; return; }
    if (d.x0 - w.w - 8 > L.kombi.cx + L.kombi.r * 1.9) w.x = d.x0 - w.w - 8;   // sonst links neben die Düsen (oder bleibt, wo sie war)
  }
  function cockpit(dpr) {
    g.drawImage(cockpitStatisch(dpr), 0, 0, L.B, L.H);
    warnPlatz();
    const t = performance.now();
    // Innenspiegel
    const sp = L.spiegelInnen;
    g.fillStyle = '#121315'; g.beginPath(); g.roundRect(sp.x - 4, sp.y - 4, sp.w + 8, sp.h + 8, sp.h * 0.45); g.fill();
    spiegelInhalt(sp, 'innen');
    glanzSpiegel(sp, W.spiegel.innen);
    // Außenspiegel
    for (const [r, art] of [[L.spiegelL, 'links'], [L.spiegelR, 'rechts']]) {
      g.fillStyle = '#1b1d20'; g.beginPath(); g.roundRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 8); g.fill();
      spiegelInhalt(r, art);
      glanzSpiegel(r, W.spiegel[art]);
    }
    // Doppelbremse: Fahrlehrer lehnt herein (sitzt im Auto, verdeckt also den rechten Außenspiegel)
    if (W.fuss > 0) fahrlehrerBeifahrer();
    // Kombiinstrument: Tacho, Blinker-Kontrollleuchten
    const k = L.kombi, kmh = W.v * 3.6;
    g.fillStyle = '#050607'; g.beginPath(); g.arc(k.cx, k.cy, k.r, 0, P2); g.fill();
    g.strokeStyle = '#2d3236'; g.lineWidth = 2; g.stroke();
    const max = W.tachoMax || 200;
    for (let v = 0; v <= max; v += 10) {
      const a = (135 + 270 * v / max) * Math.PI / 180, gross = v % 50 === 0;
      g.strokeStyle = v <= kmh ? '#e8efe9' : '#59605c'; g.lineWidth = gross ? 1.6 : 0.8;
      g.beginPath(); g.moveTo(k.cx + Math.cos(a) * k.r * (gross ? 0.74 : 0.8), k.cy + Math.sin(a) * k.r * (gross ? 0.74 : 0.8)); g.lineTo(k.cx + Math.cos(a) * k.r * 0.9, k.cy + Math.sin(a) * k.r * 0.9); g.stroke();
    }
    const a = (135 + 270 * Math.min(kmh, max) / max) * Math.PI / 180;
    g.strokeStyle = '#ff5a2a'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(k.cx, k.cy); g.lineTo(k.cx + Math.cos(a) * k.r * 0.84, k.cy + Math.sin(a) * k.r * 0.84); g.stroke();
    g.fillStyle = '#16191b'; g.beginPath(); g.arc(k.cx, k.cy, k.r * 0.3, 0, P2); g.fill();
    g.fillStyle = '#fff'; g.font = `600 ${Math.max(11, k.r * 0.34)}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(Math.round(kmh), k.cx, k.cy + k.r * 0.55);
    g.fillStyle = '#8e9893'; g.font = `400 ${Math.max(8, k.r * 0.16)}px ${SCHRIFT}`; g.fillText('km/h', k.cx, k.cy + k.r * 0.78);
    const hell = W.blinker || W.warn ? window.BL_TAKT.hell() : 0;
    for (const s of [-1, 1]) {
      const an = W.warn || W.blinker === (s < 0 ? 'links' : 'rechts') ? hell : 0;
      const bx = k.cx + s * k.r * 1.45, by = k.cy - k.r * 0.55;
      g.save(); g.translate(bx, by); g.scale(-s * k.r / 34 * 0.55, k.r / 34 * 0.55);
      g.fillStyle = an > 0.05 ? `rgba(61,220,111,${0.25 + an * 0.75})` : '#1f2a23';
      if (an > 0.05) { g.shadowColor = 'rgba(61,220,111,.9)'; g.shadowBlur = 10 * an; }
      g.beginPath(); g.moveTo(-17, 0); g.lineTo(-3, -12); g.lineTo(-3, -5); g.lineTo(15, -5); g.lineTo(15, 5); g.lineTo(-3, 5); g.lineTo(-3, 12); g.closePath(); g.fill();
      g.restore();
    }
    // Kontrollleuchten Licht: Fernlicht (blau), Abblendlicht (grün), Nebelschlussleuchte (orange)
    const kl = (sym, farbe, sx) => { g.save(); g.translate(k.cx + sx * k.r * 1.45, k.cy + k.r * 0.25); g.fillStyle = farbe; g.strokeStyle = farbe; g.lineWidth = 1.6;
      g.beginPath(); g.ellipse(-2, 0, 5, 6, 0, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill();
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(5, i * 3.6); g.lineTo(12, i * 3.6 + (sym === 'abblend' ? 2.5 : 0)); g.stroke(); }
      if (sym === 'nebel') { g.beginPath(); g.moveTo(14, -6); g.lineTo(14, 6); g.stroke(); }
      g.restore(); };
    if (W.licht === 'fern') kl('fern', '#4b8dff', -1); else if (W.licht === 'abblend') kl('abblend', '#3ddc6f', -1);
    if (W.nebelschluss) kl('nebel', '#ff9a1a', 1);
    // Blinkerhebel (links): zwei Felder ◀ ▶, aktives Feld leuchtet im Takt
    blinkerHebel(hell);
    lichtTaste(); warnTaste(hell);
    radio();
    // Lenkrad mit Händen
    lenkrad();
    // Bremspedal (rechts) – halten
    bremse();
    // Doppelbremse: Fuß des Fahrlehrers
    if (W.fuss > 0) fahrlehrerFuss();
  }
  function glanzSpiegel(r, seit) {
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h * 0.4, [r.h * 0.35, r.h * 0.35, 0, 0]); g.fill();
    if (seit != null && seit < 1.0) {
      const a = 1 - seit;
      g.strokeStyle = `rgba(61,220,111,${a})`; g.lineWidth = 3;
      g.beginPath(); g.roundRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, r.h * 0.45); g.stroke();
    }
  }
  function blinkerHebel(hell) {
    const b = L.blinker, r = 12;
    // Hebel vom Lenkrad zum Bedienfeld
    g.strokeStyle = '#26292d'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(L.lenkrad.cx - L.lenkrad.r * 0.18, L.lenkrad.cy - L.lenkrad.r * 0.78); g.lineTo(b.x + b.w * 0.9, b.y + b.h / 2); g.stroke();
    g.fillStyle = '#1c1e21'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, r); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.stroke();
    for (const s of [-1, 1]) {
      const an = W.blinker === (s < 0 ? 'links' : 'rechts');
      const cx = b.x + b.w * (s < 0 ? 0.27 : 0.73), cy = b.y + b.h / 2;
      if (an) { g.fillStyle = `rgba(61,220,111,${0.12 + 0.3 * hell})`; g.beginPath(); g.roundRect(b.x + (s < 0 ? 3 : b.w / 2), b.y + 3, b.w / 2 - 3, b.h - 6, r - 3); g.fill(); }
      g.save(); g.translate(cx, cy); g.scale(-s * 0.62, 0.62);
      g.fillStyle = an ? `rgba(61,220,111,${0.4 + 0.6 * hell})` : '#c9d0cc';
      g.beginPath(); g.moveTo(-17, 0); g.lineTo(-3, -12); g.lineTo(-3, -5); g.lineTo(15, -5); g.lineTo(15, 5); g.lineTo(-3, 5); g.lineTo(-3, 12); g.closePath(); g.fill();
      g.restore();
    }
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(b.x + b.w / 2 - 0.5, b.y + 8, 1, b.h - 16);
    g.fillStyle = '#8e9893'; g.font = `400 10px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText('Blinker', b.x + b.w / 2, b.y + b.h + 3);
  }
  // Licht-Taste (Abblenden / Licht an / Fernlicht) – Beschriftung je nach Zustand
  function lichtTaste() {
    const b = L.licht; if (!b) return;
    const fern = W.licht === 'fern', aus = W.licht === 'tag' || !W.licht;
    g.fillStyle = '#1c1e21'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 10); g.fill();
    g.strokeStyle = fern ? 'rgba(75,141,255,.8)' : 'rgba(255,255,255,.12)'; g.lineWidth = fern ? 1.6 : 1; g.stroke();
    g.save(); g.translate(b.x + b.w / 2 - 6, b.y + 14); const c = fern ? '#4b8dff' : W.licht === 'abblend' ? '#3ddc6f' : '#c9d0cc';
    g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath(); g.ellipse(-2, 0, 5, 6, 0, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill();
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(5, i * 3.6); g.lineTo(12, i * 3.6 + (fern ? 0 : 2.5)); g.stroke(); }
    g.restore();
    g.fillStyle = '#c9d0cc'; g.font = `500 ${b.w < 60 ? 9 : 10}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(fern ? 'Abblenden' : aus ? 'Licht an' : 'Fernlicht', b.x + b.w / 2, b.y + b.h - 10);
  }
  // Warnblinker-Taste (rotes Dreieck, leuchtet im Takt)
  function warnTaste(hell) {
    const b = L.warn; if (!b) return;
    const an = !!W.warn;
    g.fillStyle = an ? `rgba(200,40,20,${0.25 + 0.35 * hell})` : '#1c1e21'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 10); g.fill();
    g.strokeStyle = an ? 'rgba(255,120,90,.9)' : 'rgba(255,255,255,.12)'; g.lineWidth = an ? 1.6 : 1; g.stroke();
    const cx = b.x + b.w / 2, cy = b.y + 15;
    g.strokeStyle = an && hell > 0.4 ? '#ff6a4a' : '#e0451f'; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx, cy - 8); g.lineTo(cx + 9, cy + 7); g.lineTo(cx - 9, cy + 7); g.closePath(); g.stroke();
    g.fillStyle = '#c9d0cc'; g.font = `500 ${b.w < 60 ? 9 : 10}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('Warnblinker', b.x + b.w / 2, b.y + b.h - 10);
  }
  // Radio-Anzeige (Verkehrsfunk) oben im Armaturenbrett – antippbar wie ein Objekt (W.anzeige = { text, an })
  function radio() {
    const a = W.anzeige; if (!a || !a.an) return;
    const w = Math.min(L.B * 0.62, 260), h = 34, x = L.B / 2 - w / 2, y = L.armaturen - h - 8;
    g.fillStyle = 'rgba(10,14,18,.88)'; g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill();
    g.strokeStyle = a.warn ? '#ffb21e' : 'rgba(120,200,255,.6)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = a.warn ? '#ffd27a' : '#b8e2ff'; g.font = `500 ${L.B < 360 ? 11 : 12}px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(a.text || 'Verkehrsfunk', L.B / 2, y + h / 2, w - 12);
    if (a.obj) a.obj._box = [x, y, x + w, y + h];
  }
  function lenkrad() {
    const l = L.lenkrad, R = l.r;
    // Phase 4: Bogen „Lenkrad mit Händen“ (zehn vor zwei): Kranzmitte bei 51,0 % / 46,4 % des Bildes, Kranz-Mitte-Radius 38 % der
    // Bildbreite (Außenkante 40,5 %, per Kreis-Anpassung gemessen 28.10.2026); vorher Bogen „Lenkrad“ (50,6 % / 45,2 % / 39 %)
    const lh = bild('cockpit', 'lenkrad-haende');
    if (lh) { g.save(); g.translate(l.cx, l.cy); g.rotate(W.lenk || 0); const w = R / 0.38, h = w * lh.naturalHeight / lh.naturalWidth; g.drawImage(lh, -w * 0.51, -h * 0.464, w, h); g.restore(); return; }
    const lb = bild('cockpit', 'lenkrad');
    if (lb) { g.save(); g.translate(l.cx, l.cy); g.rotate(W.lenk || 0); const w = R / 0.39, h = w * lb.naturalHeight / lb.naturalWidth; g.drawImage(lb, -w * 0.506, -h * 0.452, w, h); g.restore(); return; }
    g.save(); g.translate(l.cx, l.cy); g.rotate(W.lenk || 0);
    // Speichen und Nabe
    g.strokeStyle = '#1a1c1f'; g.lineWidth = R * 0.11; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(-R * 0.92, -R * 0.05); g.lineTo(-R * 0.25, -R * 0.12); g.moveTo(R * 0.92, -R * 0.05); g.lineTo(R * 0.25, -R * 0.12); g.stroke();
    g.fillStyle = '#17191c'; g.beginPath(); g.ellipse(0, -R * 0.12, R * 0.3, R * 0.24, 0, 0, P2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.ellipse(0, -R * 0.2, R * 0.22, R * 0.1, 0, 0, P2); g.fill();
    // Kranz
    const v = g.createLinearGradient(0, -R, 0, R * 0.2);
    v.addColorStop(0, '#34373b'); v.addColorStop(0.5, '#141518'); v.addColorStop(1, '#0d0e10');
    g.strokeStyle = v; g.lineWidth = R * 0.13;
    g.beginPath(); g.arc(0, 0, R, 0, P2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = R * 0.025;
    g.beginPath(); g.arc(0, 0, R * 1.03, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    // Hände auf „zehn vor zwei“ mit Ärmeln
    for (const s of [-1, 1]) {
      const wnk = s < 0 ? Math.PI * 1.16 : Math.PI * 1.84, hx = Math.cos(wnk) * R, hy = Math.sin(wnk) * R;
      g.strokeStyle = '#2c3440'; g.lineWidth = R * 0.26; g.lineCap = 'round';
      g.beginPath(); g.moveTo(hx + s * R * 0.12, hy + R * 0.16); g.lineTo(hx + s * R * 0.55, hy + R * 0.95); g.stroke();
      g.fillStyle = '#d9ab86';
      g.beginPath(); g.ellipse(hx, hy, R * 0.12, R * 0.15, s * 0.5, 0, P2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(hx + s * R * 0.03, hy + R * 0.05, R * 0.09, R * 0.07, s * 0.5, 0, P2); g.fill();
    }
    g.restore();
  }
  function bremse() {
    const b = L.bremse, an = W.bremse;
    g.save(); g.translate(0, an ? 3 : 0);
    g.fillStyle = an ? '#0f1012' : '#1c1e21'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 12); g.fill();
    g.strokeStyle = an ? 'rgba(255,90,42,.9)' : 'rgba(255,255,255,.12)'; g.lineWidth = an ? 2 : 1; g.stroke();
    g.fillStyle = an ? '#3a3d42' : '#2a2d31';
    g.beginPath(); g.roundRect(b.x + b.w * 0.18, b.y + 10, b.w * 0.64, b.h - 34, 6); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2;
    for (let y = b.y + 16; y < b.y + b.h - 30; y += 6) { g.beginPath(); g.moveTo(b.x + b.w * 0.24, y); g.lineTo(b.x + b.w * 0.76, y); g.stroke(); }
    g.fillStyle = an ? '#ffb39a' : '#c9d0cc'; g.font = `600 11px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('Bremse', b.x + b.w / 2, b.y + b.h - 13);
    g.restore();
  }
  // Phase-5-Korrektur: Doppelbremse ruhig eingebettet – der Fahrlehrer lehnt vom Beifahrerrand in die Scheibe (rechts teils außerhalb,
  // unten vom Armaturenbrett abgeschnitten), sein Fuß auf der Zusatzbremse als runder Ausschnitt links daneben, ebenfalls in der Scheibe.
  // Beides bleibt über dem Armaturenbrett: Bedienteile, Lenkradhände und Tacho werden nie verdeckt (alle Formate, auch flach quer).
  function doppelLage() {
    const B = L.B, A = L.armaturen, scheibe = A - L.dach;
    const sz = BI.waehle && (BI.waehle('fahrlehrer/cockpit-haltegriff', 0) || BI.waehle('fahrlehrer/szene-haltegriff', 0));
    const iw = sz ? sz.img.naturalWidth || sz.img.width : 476, ih = sz ? sz.img.naturalHeight || sz.img.height : 457;
    const sh = Math.min(scheibe * (L.flach ? 0.6 : L.quer ? 0.5 : 0.4), 210), sw = sh * iw / ih;
    const fx = B - sw * 0.8, d = Math.round(Math.min(L.flach ? 78 : 104, B * 0.27, scheibe * 0.36));
    const kx = Math.max(d / 2 + 8, fx - d * 0.2), ky = A - d / 2 - 10;
    return { sz, sh, sw, fx, fy: A - sh + 4, d, kx, ky };
  }
  function fahrlehrerBeifahrer() {
    const p = W.fuss; if (!(p > 0)) return;
    const lg = doppelLage(); if (!lg.sz) return;
    const rein = W.ruhig ? 0 : (1 - Math.min(1, (1 - p) * 6)) * 24;
    g.save(); g.globalAlpha = Math.min(1, p * 3);
    g.beginPath(); g.rect(0, 0, L.B, L.armaturen); g.clip();
    g.drawImage(lg.sz.img, lg.fx + rein, lg.fy, lg.sw, lg.sh);
    g.restore();
  }
  function fahrlehrerFuss() {
    // Pedal auf der Beifahrerseite mit Schuh, der kräftig drauftritt (W.fuss: 1 → 0)
    const p = W.fuss, B = L.B, H = L.H;
    const fbNeu = bild('cockpit', !W.ruhig && p > 0.9 ? 'fuss-schwebt' : 'fuss-tritt') || bild('cockpit', 'fuss-tritt');
    if (fbNeu) {
      // runder Ausschnitt (Ring wie beim Fahrlehrer-Bild oben rechts), Schuh und Pedal füllen ihn
      const lg = doppelLage(), r = lg.d / 2, rein = W.ruhig ? 0 : (1 - Math.min(1, (1 - p) * 6));
      g.save(); g.globalAlpha = Math.min(1, p * 3);
      g.translate(lg.kx, lg.ky); if (rein) g.scale(1 - rein * 0.12, 1 - rein * 0.12);
      g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r + 4, 0, P2); g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = R_.farben.haupt; g.beginPath(); g.arc(0, 0, r + 4, 0, P2); g.arc(0, 0, r + 1.5, 0, P2, true); g.fill();
      g.beginPath(); g.arc(0, 0, r, 0, P2); g.clip();
      const bg = g.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r * 1.1); bg.addColorStop(0, '#4a4f55'); bg.addColorStop(1, '#202226');
      g.fillStyle = bg; g.fillRect(-r, -r, 2 * r, 2 * r);
      const h = lg.d * 1.25, w = h * fbNeu.naturalWidth / fbNeu.naturalHeight;
      g.drawImage(fbNeu, -w * 0.5, -h * 0.5 + lg.d * 0.02, w, h);
      g.restore();
      return;
    }
    const x = B - (L.quer ? B * 0.12 : B * 0.22), y = H - (L.quer ? H * 0.2 : H * 0.12);
    const tritt = Math.min(1, (1 - p) * 4) * 14;
    // Phase 4: Bogen „Fuß“ – erst schwebt der Fuß über der Zusatzbremse (kurz), dann tritt er (bei reduced-motion gleich treten)
    const schwebt = !W.ruhig && p > 0.9;
    const fb = bild('cockpit', schwebt ? 'fuss-schwebt' : 'fuss-tritt') || bild('cockpit', 'fuss-tritt') || bild('cockpit', 'fuss');
    const neuFuss = !!(bild('cockpit', 'fuss-tritt'));
    if (fb) {
      // Fahrlehrer hält sich erschrocken am Haltegriff fest (Szenenbogen) und tritt die Zusatzbremse (Bogen „Spiegel und Zusatzbremse“, Motiv 5)
      g.save(); g.globalAlpha = Math.min(1, p * 3);
      const sz = BI.waehle && (BI.waehle('fahrlehrer/cockpit-haltegriff', 0) || BI.waehle('fahrlehrer/szene-haltegriff', 0));   // unten weich auslaufend
      if (sz) {
        const sw = Math.min(L.quer ? 210 : 190, B * (L.quer ? 0.26 : 0.5)), sh = sw * (sz.img.height || sz.img.naturalHeight) / (sz.img.width || sz.img.naturalWidth);
        const rein = W.ruhig ? 0 : (1 - Math.min(1, (1 - p) * 6)) * 30;
        g.drawImage(sz.img, B - sw + 6 + rein, L.armaturen - sh + 10, sw, sh);
      }
      if (neuFuss) {
        const w = Math.min(L.quer ? 150 : 150, B * 0.4, (H - L.armaturen) * 0.62), h = w * fb.naturalHeight / fb.naturalWidth;
        g.drawImage(fb, x - w * 0.55, H - h + 6 + (schwebt ? -10 : 0), w, h); g.restore(); return;
      }
      const w = Math.min(L.quer ? 190 : 170, B * 0.44), h = w * fb.naturalHeight / fb.naturalWidth;
      g.drawImage(fb, x - w / 2, y + 30 - h + tritt * 0.6, w, h); g.restore(); return;
    }
    g.save(); g.globalAlpha = Math.min(1, p * 3);
    g.fillStyle = 'rgba(200,40,20,.18)'; g.beginPath(); g.arc(x, y, 70, 0, P2); g.fill();
    g.fillStyle = '#3a3d42'; g.beginPath(); g.roundRect(x - 26, y + 6, 52, 30, 6); g.fill();
    g.fillStyle = '#1d1a18';
    g.beginPath(); g.ellipse(x + 2, y - 8 + tritt, 34, 15, -0.25, 0, P2); g.fill();
    g.fillStyle = '#3d4a5c'; g.fillRect(x + 6, y - 70 + tritt, 26, 58);
    g.restore();
  }

  // Schulterblick: Blick durch das hintere Seitenfenster (W.schulter = { seite, p 0–1–0 })
  function schulterblick() {
    const sb = W.schulter;
    if (!sb || sb.p <= 0.01) return;
    const links = sb.seite === 'links', p = sb.p;
    const breite = L.B * (L.quer ? 0.48 : 0.74), x0 = links ? -breite * (1 - p) : L.B - breite * p;
    g.save();
    g.translate(x0, 0);
    // flach quer: nur die Scheibe dreht weg, das Armaturenbrett mit allen Bedienteilen bleibt sichtbar
    const y0 = L.dach + 6, h = L.armaturen - L.dach + (L.flach ? -24 : 30);
    g.fillStyle = '#1e2023'; g.fillRect(0, 0, breite, L.flach ? L.armaturen + 2 : L.H);
    // Fenster
    const fx = breite * 0.1, fy = y0 + h * 0.12, fw = breite * 0.8, fh = h * 0.62;
    g.save(); g.beginPath(); g.roundRect(fx, fy, fw, fh, 18); g.clip();
    const hm = HIMMEL[W.wetter] || HIMMEL.klar;
    const v = g.createLinearGradient(0, fy, 0, fy + fh); v.addColorStop(0, hm[0]); v.addColorStop(0.55, hm[2]); v.addColorStop(0.551, W.wetter === 'nacht' ? '#15171a' : '#5b5f63'); v.addColorStop(1, W.wetter === 'nacht' ? '#101113' : '#4f5357');
    g.fillStyle = v; g.fillRect(fx, fy, fw, fh);
    // Nachbarspur nach hinten
    g.fillStyle = 'rgba(236,236,230,.8)';
    for (let i = 0; i < 6; i++) { const yy = fy + fh * (0.6 + i * 0.08); g.fillRect(links ? fx + fw * (0.15 + i * 0.13) : fx + fw * (0.85 - i * 0.13) - 18, yy, 18, 3); }
    // was im toten Winkel ist
    const wer = W.hinten.find(o => o.dz > -4 && o.dz < 18 && (links ? o.x < kx - 1 : o.x > kx + 1));
    if (wer) {
      const s = klemm(1.3 - Math.max(0, wer.dz) / 14, 0.35, 1.3), cx = fx + fw * (links ? 0.45 : 0.55), by = fy + fh * 0.96;
      if (wer.art === 'rad') {
        g.fillStyle = '#151515'; g.beginPath(); g.arc(cx - 40 * s, by - 26 * s, 26 * s, 0, P2); g.arc(cx + 40 * s, by - 26 * s, 26 * s, 0, P2); g.fill();
        g.fillStyle = W.wetter === 'nacht' ? '#333' : '#d9822b'; g.beginPath(); g.roundRect(cx - 18 * s, by - 120 * s, 40 * s, 62 * s, 10 * s); g.fill();
        g.fillStyle = '#e2b996'; g.beginPath(); g.arc(cx + 6 * s, by - 136 * s, 13 * s, 0, P2); g.fill();
        g.fillStyle = '#f0f0f0'; g.beginPath(); g.arc(cx + 6 * s, by - 140 * s, 14 * s, Math.PI, 0); g.fill();
      } else {
        g.fillStyle = W.wetter === 'nacht' ? '#222' : wer.farbe || '#3c5a7a';
        g.beginPath(); g.roundRect(cx - 120 * s, by - 70 * s, 240 * s, 62 * s, 16 * s); g.fill();
        g.beginPath(); g.roundRect(cx - 70 * s, by - 112 * s, 150 * s, 50 * s, 18 * s); g.fill();
        g.fillStyle = 'rgba(40,52,62,.9)'; g.beginPath(); g.roundRect(cx - 60 * s, by - 104 * s, 130 * s, 36 * s, 12 * s); g.fill();
        g.fillStyle = '#111'; g.beginPath(); g.arc(cx - 70 * s, by - 8 * s, 22 * s, 0, P2); g.arc(cx + 80 * s, by - 8 * s, 22 * s, 0, P2); g.fill();
      }
    }
    g.restore();
    g.strokeStyle = '#33363a'; g.lineWidth = 8; g.beginPath(); g.roundRect(fx, fy, fw, fh, 18); g.stroke();
    // Kopfstütze und Gurt als Rahmen
    g.fillStyle = '#2b2d31'; g.beginPath(); g.roundRect(links ? fx + fw - 30 : fx - 20, fy + fh * 0.55, 50, 70, 14); g.fill();
    // Beschriftung erst, wenn das Fenster fast ganz drin ist (sonst Textfetzen am Rand)
    g.globalAlpha = klemm((p - 0.75) / 0.25, 0, 1);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `500 13px ${SCHRIFT}`; g.textAlign = 'center'; g.textBaseline = 'top';
    if (g.globalAlpha > 0) g.fillText('Schulterblick ' + (links ? 'links' : 'rechts'), fx + fw / 2, fy + fh + (L.flach ? 6 : 10));
    g.restore();
  }

  // Hinweis-Pfeile (Fahrstunde): pulsierender Ring um das nächste Bedienteil, beim Schulterblick ein Wisch-Zeichen
  function hilfe() {
    const h = W.hilfe, t = performance.now() / 1000, puls = W.ruhig ? 0.7 : 0.5 + 0.5 * Math.sin(t * 5);
    // Einführung (Spielertest 29.10.2026): Ring um eine Gefahr (Objekt mit _box), mindestens 44 px
    const ob = W.hilfeObj && W.hilfeObj._box;
    if (ob) {
      const cx = (ob[0] + ob[2]) / 2, cy = (ob[1] + ob[3]) / 2, rr = Math.max(26, Math.max(ob[2] - ob[0], ob[3] - ob[1]) * 0.75) + puls * 6;
      g.save(); g.strokeStyle = `rgba(255,208,20,${0.55 + puls * 0.45})`; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, rr, 0, P2); g.stroke(); g.restore();
    }
    if (!h) return;
    let r = null;
    if (h === 'spiegel') r = L.spiegelInnen;
    else if (h === 'blinkerL' || h === 'blinkerR') { const b = L.blinker; r = { x: b.x + (h === 'blinkerL' ? 0 : b.w / 2), y: b.y, w: b.w / 2, h: b.h }; }
    else if (h === 'bremse') r = L.bremse;
    else if (h === 'warn') r = L.warn;
    else if (h === 'doppel') r = doppelKasten(L);
    else if (h === 'abblenden') r = L.licht;
    else if (h === 'spiegelL') r = L.spiegelL;
    else if (h === 'spiegelR') r = L.spiegelR;
    else if (h === 'lenkenL' || h === 'lenkenR') { const l = L.lenkrad, s = h === 'lenkenL' ? -1 : 1; r = { x: l.cx + s * l.r * 0.85 - 30, y: Math.min(l.cy - l.r * 0.65, L.H - 34) - 30, w: 60, h: 60, rund: true }; }
    g.save();
    if (r) {
      g.strokeStyle = `rgba(255,208,20,${0.5 + puls * 0.5})`; g.lineWidth = 3;
      const e = 6 + puls * 5;
      g.beginPath(); g.roundRect(r.x - e, r.y - e, r.w + 2 * e, r.h + 2 * e, r.rund ? 40 : 14); g.stroke();
    }
    if (h === 'schulterL' || h === 'schulterR') {
      const s = h === 'schulterL' ? -1 : 1, y = misch(L.dach, L.armaturen, 0.62), p = (t * 0.9) % 1;
      const x = L.B / 2 + s * (p * L.B * 0.28);
      g.globalAlpha = W.ruhig ? 0.85 : 1 - p * 0.6;
      g.fillStyle = 'rgba(20,22,25,.55)'; g.beginPath(); g.roundRect(L.B / 2 - 92, y - 24, 184, 48, 24); g.fill();
      g.fillStyle = '#ffd014'; g.beginPath(); g.arc(x, y, 9, 0, P2); g.fill();
      g.strokeStyle = '#ffd014'; g.lineWidth = 3; g.beginPath(); g.moveTo(L.B / 2 + s * 10, y); g.lineTo(L.B / 2 + s * 80, y); g.lineTo(L.B / 2 + s * 70, y - 8); g.moveTo(L.B / 2 + s * 80, y); g.lineTo(L.B / 2 + s * 70, y + 8); g.stroke();
    }
    g.restore();
  }

  // Doppelbremsen-Anzeige (drei Pedale unter der Kopfzeile)
  // Letzte Runde 29.10.2026: darunter kleiner Hinweis DB_ZAEHLER („3 = Fahrt vorbei“) – Kasten zweizeilig
  const dbHinweis = () => { const r = window.BL_TEXTE && window.BL_TEXTE.rahmen && window.BL_TEXTE.rahmen.DB_ZAEHLER; return (r && r.Text) || '3 = Fahrt vorbei'; };
  function doppelKasten(L) { const w = 136, h = 34; return { x: L.quer ? 10 : L.B / 2 - w / 2, y: L.quer ? L.armaturen + 12 : L.kombi.cy + L.kombi.r + 10, w, h }; }
  function doppelAnzeige() {
    // „Doppelbremse“ mit drei Punkten links im Armaturenbrett (rot = schon gebremst)
    if (!W.zeigeDoppel) return;
    const dk = doppelKasten(L), w = dk.w, h = dk.h, x0 = dk.x, y0 = dk.y;
    // Kleine Runde 29.10.2026: Warnung nach der vorletzten Doppelbremse – Kasten leuchtet ca. 3s sanft rot auf (ein-/ausblenden,
    // dazwischen weicher Puls; reduced-motion ohne Puls)
    const wn = W.dbWarn || 0;
    if (wn > 0) {
      const huelle = Math.min(1, (3.2 - wn) / 0.35, wn / 0.6), puls = W.ruhig ? 1 : 0.6 + 0.4 * Math.sin(performance.now() / 1000 * Math.PI * 2 / 1.1);
      const a = Math.max(0, huelle) * puls;
      g.save(); g.shadowColor = `rgba(224,69,31,${0.9 * a})`; g.shadowBlur = 16 * a;
      g.fillStyle = `rgba(224,69,31,${0.32 * a})`; g.beginPath(); g.roundRect(x0 - 3, y0 - 3, w + 6, h + 6, 13); g.fill();
      g.restore();
      g.strokeStyle = `rgba(255,140,110,${0.85 * a})`; g.lineWidth = 1.6; g.beginPath(); g.roundRect(x0 - 2, y0 - 2, w + 4, h + 4, 12.5); g.stroke();
    }
    g.fillStyle = 'rgba(16,18,20,.6)'; g.beginPath(); g.roundRect(x0, y0, w, h, 11); g.fill();
    g.fillStyle = '#e6ebe8'; g.font = `500 11px ${SCHRIFT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('Doppelbremse', x0 + 10, y0 + 11.5);
    g.fillStyle = 'rgba(230,235,232,.78)'; g.font = `400 10.5px ${SCHRIFT}`; g.textAlign = 'center';
    g.fillText(dbHinweis(), x0 + w / 2, y0 + 25.5);
    for (let i = 0; i < 3; i++) {
      const an = i < W.doppel, cx = x0 + w - 37 + i * 12.5, cy = y0 + 11;
      g.fillStyle = an ? '#e0451f' : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(cx, cy, 4.6, 0, P2); g.fill();
      g.strokeStyle = an ? '#ffd0c2' : 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.stroke();
    }
  }

  // ---------- Hauptfunktion ----------
  // Abbiegen (Phase 2b): beim Wechsel auf die neue Straße das letzte Bild festhalten und kurz weiterschwenkend ausblenden
  let schnapp = null, schnappT = 0, schnappSeite = 0;
  function abbiegenUeberblenden(dt) {
    if (W.drehWechsel) {
      W.drehWechsel = false;
      const c = g.canvas;
      try {
        if (!schnapp) schnapp = document.createElement('canvas');
        schnapp.width = c.width; schnapp.height = c.height; schnapp.getContext('2d').drawImage(c, 0, 0);
        schnappT = 1; schnappSeite = W.dreh ? W.dreh.seite : 0;
      } catch (e) { schnappT = 0; }
    }
  }
  function ueberblendungZeichnen(dt) {
    if (schnappT <= 0 || !schnapp) return;
    schnappT = Math.max(0, schnappT - (dt || 0.016) / (W.ruhig ? 0.6 : 0.4));
    const k = g.canvas.width / L.B;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = schnappT * schnappT * (3 - 2 * schnappT);
    g.drawImage(schnapp, -schnappSeite * L.B * (W.ruhig ? 0.1 : 0.3) * (1 - schnappT) * k, 0);
    g.restore();
  }
  function zeichne(ctx, welt, lay, dt, dpr) {
    g = ctx; W = welt; L = lay;
    abbiegenUeberblenden(dt);
    auge = W.auge || 1.2;
    kx = W.kx; K = W.kurve || 0;
    const ruck = W.ruhig ? 0 : W.ruck || 0;
    const wack = ruck > 0 ? Math.sin(performance.now() / 22) * 7 * ruck : 0;
    mitte = L.B / 2 + (W.gier || 0);
    hz = L.hz + (W.nicken || 0) + wack * 0.6;
    f = Math.max((L.armaturen + 8 - L.hz) * NAH / auge, L.B * 0.85);
    zFern = W.umgebung === 'autobahn' ? 420 : W.umgebung === 'land' ? 340 : 200;
    lichter = [];
    g.save();
    if (wack) g.translate(wack * 0.4, 0);
    g.save(); g.beginPath(); g.rect(0, 0, L.B, L.armaturen + 4); g.clip();
    himmel();
    boden();
    const liste = [];
    kulisse(liste);
    // im Kreisel: Mittelinsel links, außen nur Gehweg und Bäume in größerem Abstand (Häuserzeile der Straße passt nicht in den Kreis)
    if (W.kreis) { liste.length = 0; const k0 = Math.floor(W.s / 9); for (let k = k0; k < k0 + 8; k++) if (zufall(k, 21, W.saat) > 0.35) liste.push({ typ: 'baum', x: 12 + zufall(k, 22, W.saat) * 8, pos: k * 9, groesse: 0.9 + zufall(k, 23, W.saat) * 0.5, k }); }
    if (W.rand) for (const o of W.rand) liste.push(o);
    for (const o of W.objekte) liste.push(o);
    for (const s of W.schilder) liste.push(s);
    // Leitplanken zuerst (durchgehend), sonst nach Entfernung (bei Häusern zählt das ferne Ende)
    liste.sort((a, b) => (a.typ === 'leitplanke' ? 1e9 : b.typ === 'leitplanke' ? -1e9 : (b.pos + (LANG[b.typ] ? b.laenge : 0)) - (a.pos + (LANG[a.typ] ? a.laenge : 0))));
    koerperListe = liste;
    for (const o of liste) koerper(o);
    nachtUndLichter();
    if (W.schnee) schneefall(dt);
    if (W.wetter === 'regen' || W.regen || W.wischer) regen(dt);
    scheibeOverlay();
    ueberblendungZeichnen(dt);
    g.restore();
    cockpit(dpr);
    schulterblick();
    hilfe();
    doppelAnzeige();
    if (W.blitz > 0) { g.fillStyle = `rgba(200,40,20,${0.28 * W.blitz})`; g.fillRect(0, 0, L.B, L.H); }
    g.restore();
  }

  // Bildschirmlage eines Weltpunkts (für Tipp-Prüfung und Hinweise)
  function bildpunkt(x, pos, h) { const z = pos - W.s; return z > 0.5 ? [xs(x, z), ys(h || 0, z)] : null; }

  window.BL_SZENE = { layout, zeichne, bildpunkt, NAH, AUTO, kennzeichen, doppelKasten };
})();
