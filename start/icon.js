// App-Icon „Blinker links“ (Variante 1 „Blinker“, MZ 28.10.2026) – Maße an EINER Stelle für das Icon-Skript
// (Material/Skripte/icons-bauen.js) und das Intro der Startseite (start/intro.js).
// Raster 100 × 100: Fläche in Kundenfarbe (Verlauf), weißes Ampel-Zeichen mittig rechts, links davon der orange
// Blinkerpfeil mit sanftem Schein. Alles Wichtige liegt im Kreis mit Radius 40 (Schutzzone maskable/rund).
(function (wurzel) {
  'use strict';
  const PFEIL = 'M1 13 15 1v7h18v10H15v7z';           // gleiche Form wie Cockpit- und Titel-Pfeil (34 × 26)
  const M = {
    pfeil: { x: 11.5, y: 50 - 13 * 0.78, s: 0.78 },    // linke obere Ecke + Maßstab des 34×26-Pfeils
    schein: { cx: 11.5 + 17 * 0.78, cy: 50, r: 21 },
    zeichen: { cx: 58, cy: 50, h: 58 },                // Mitte und Höhe des Ampel-Zeichens (Seitenverhältnis aus der viewBox)
  };

  function hexRgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mischen(hex, ziel, f) { const a = hexRgb(hex), b = hexRgb(ziel); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join(''); }

  // Zeichen aus einer SVG-Datei lesen: viewBox + alle Pfade (Füllung wird weiß gesetzt)
  function zeichenLesen(svg) {
    const vb = /viewBox="([^"]+)"/.exec(svg);
    const pfade = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(m => m[1]);
    if (!vb || !pfade.length) return null;
    const [x, y, w, h] = vb[1].trim().split(/[\s,]+/).map(Number);
    return { x, y, w, h, pfade };
  }

  // Ampel-Zeichen als <g> im 100er Raster (Mitte cx/cy, Höhe h)
  function zeichenGruppe(z, farbe, extra) {
    const s = M.zeichen.h / z.h, w = z.w * s;
    const tx = M.zeichen.cx - w / 2 - z.x * s, ty = M.zeichen.cy - M.zeichen.h / 2 - z.y * s;
    return `<g ${extra || ''} transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(5)})">` +
      z.pfade.map(d => `<path fill="${farbe}" fill-rule="evenodd" d="${d}"/>`).join('') + '</g>';
  }

  function pfeilGruppe(id) {
    const p = M.pfeil;
    return `<g transform="translate(${p.x} ${p.y.toFixed(3)}) scale(${p.s})">` +
      `<path d="${PFEIL}" fill="#ff9a1a" stroke="#ff9a1a" stroke-width="2" stroke-linejoin="round" filter="url(#${id}g)"/>` +
      `<path d="${PFEIL}" fill="url(#${id}l)" stroke="url(#${id}l)" stroke-width="1.6" stroke-linejoin="round"/></g>`;
  }

  // Ganzes Icon als SVG (512er Ausgabe). rx = Eckenradius in Prozent (Browser-Tab), sonst eckig (Android/iOS runden selbst)
  function iconSvg(farbe, zeichen, rx, id) {
    id = id || 'bl';
    const hell = mischen(farbe, '#ffffff', 0.1), dunkel = mischen(farbe, '#000000', 0.33);
    const r = rx ? ` rx="${rx}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512"><defs>` +
      `<radialGradient id="${id}f" cx="50%" cy="28%" r="80%"><stop offset="0" stop-color="${hell}"/><stop offset=".55" stop-color="${farbe}"/><stop offset="1" stop-color="${dunkel}"/></radialGradient>` +
      `<radialGradient id="${id}s"><stop offset="0" stop-color="#ffb23a" stop-opacity=".55"/><stop offset=".45" stop-color="#ff9a1a" stop-opacity=".22"/><stop offset="1" stop-color="#ff9a1a" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset=".5" stop-color="#ffab2e"/><stop offset="1" stop-color="#ff8a00"/></linearGradient>` +
      `<filter id="${id}g" x="-60%" y="-80%" width="220%" height="260%"><feGaussianBlur stdDeviation="2.6"/></filter>` +
      `<filter id="${id}d" x="-30%" y="-20%" width="160%" height="140%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#06260f" flood-opacity=".35"/></filter>` +
      `</defs><rect width="100" height="100"${r} fill="url(#${id}f)"/>` +
      `<circle cx="${M.schein.cx.toFixed(2)}" cy="${M.schein.cy}" r="${M.schein.r}" fill="url(#${id}s)"/>` +
      pfeilGruppe(id) + zeichenGruppe(zeichen, '#fff', `filter="url(#${id}d)"`) + '</svg>';
  }

  const API = { M, PFEIL, iconSvg, zeichenLesen, zeichenGruppe, pfeilGruppe, mischen };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else wurzel.BL_ICON = API;
})(typeof window !== 'undefined' ? window : this);
