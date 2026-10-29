// Kundendaten der Sammlung „Blinker links“ (Baukasten A4 Fahrschule) – nur diese Datei und die Logos in diesem Ordner
// ändern sich pro Kunde. Startseite und Spiel laden beide genau diese Datei (keine Kopie im Spielordner).
// Musterfirma „Fahrschule Muster“, Musterstadt (alles erfunden, MZ 24./28.10.2026).
(function () {
  'use strict';
  // Adressen der Logos gelten ab diesem Ordner – egal, ob die Startseite oder das Spiel (eine Ebene tiefer) lädt
  var basis = 'kunde/';
  try { if (document.currentScript && document.currentScript.src) basis = new URL('.', document.currentScript.src).href; } catch (e) { /* alter Browser */ }

  window.KUNDE = {
    firma: 'Fahrschule Muster',
    // Kurzname für den Seitentitel im Browser-Tab („Blinker links – Fahrschule Muster“)
    kurzname: 'Fahrschule Muster',

    // Logos (SVG, unverändert aus Material/Bilder/Musterfirmen/a4-fahrschule). Das Logo steht überall LINKS (MZ, 28.10.2026),
    // nie auf einem Schild zusammen mit dem Spielnamen. Gruppen id="zeichen" (Ampel) und id="schriftzug" nutzt das Intro.
    logo: basis + 'logo-quer.svg',
    logoAufHell: basis + 'logo-quer.svg',
    logoHoch: basis + 'logo-hoch.svg',
    zeichen: basis + 'zeichen.svg',

    // Farben: haupt = Kundenfarbe (Schilder, Titel, App-Icon, Knöpfe). Blinker-Orange, Kontrollleuchten-Grün und das
    // Gelb des Bands sind feste Farben der Sammlung (start/start.css, fahrschule-blinker-links/blinker.css).
    farben: { haupt: '#1E7A3E', akzent: '#ffd014', dunkel: '#16181a', hell: '#ffffff' },

    // Kontaktdaten im Footer der Startseite (MZ, 28.10.2026). Nichts davon ist verlinkt oder anklickbar.
    // Telefon: Film-Rufnummer der Bundesnetzagentur (klingelt bei niemandem); Internetadresse ohne „www.“ (MZ).
    kontakt: ['Fahrschule Muster', 'Bahnhofstraße 8', '94999 Musterstadt'],
    telefon: 'Tel. 089 99998 150',
    web: 'fahrschule-muster.de',
    // Datenschutz/Impressum: nur unterstrichen (Musterfirma). Ein echter Kunde trägt hier später seine Adressen ein.
    rechtliches: [{ text: 'Datenschutz', link: '' }, { text: 'Impressum', link: '' }],

    // Schalter im Endbild (Baustein 20) – bei der Musterfirma nur Optik (link leer = nicht anklickbar).
    // Ein echter Kunde trägt z. B. seine Anmeldeseite bzw. Stellenanzeige ein: { text: '…', link: 'https://…' }.
    schalter: [
      { text: 'Bereit für die echte Prüfung?', link: '' },
      { text: 'Fahrlehrer/in werden?', link: '' },
    ],

    // Ort der Spielwelt (Ziel-Schild im Endbild „Ziel – Musterstadt“)
    ort: 'Musterstadt',

    // Texte überschreiben (optional): { titel, frage, anleitung }
    texte: {},
  };
})();
