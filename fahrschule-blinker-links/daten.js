// „Blinker links“ – alle einstellbaren Werte und die Zuordnung der 100 Situationen zu den Vorlagen (Phase 2a).
// Texte kommen aus texte.js (erzeugt von Material/Skripte/texte-bauen.py aus Material/Texte/blinker-*-entwurf.md).
// Bilder später nur in bilder/<gruppe>/<name>.webp (bilder.js), sonst Code-Platzhalter.
(function () {
  'use strict';

  // ---------- Punkte (MZ bestätigt 28.10.2026) ----------
  // Je Situation höchstens 100: Gefahr erkannt 50 (nach Reaktionszeit) + Handgriffe/Vorfahrt/Tempo 30 + Ahnen-Bonus 20.
  // Hat eine Situation nicht alle Teile, wird auf 100 hochgerechnet (normieren), damit zehn Situationen genau 1.000 ergeben.
  // Fehlalarm und Doppelbremse ziehen direkt von der Summe ab. Wer durchfährt, bekommt mindestens 1 Punkt.
  const PUNKTE = {
    erkannt: 50, handgriffe: 30, ahnen: 20,
    fehlalarm: -10, doppelbremse: -150, abbruchBei: 3,   // dritte Doppelbremse = Abbruch mit 0 Punkten
    normieren: true,
    // Reaktion: bis „voll“ Sekunden die vollen 50, danach linear bis zum Ende des Zeitfensters auf „min“
    reaktion: { voll: 0.7, min: 12 },
    // Handgriffe (Phase 1, Spurwechsel): Spiegel 6, Blinker 8, Schulterblick 8, Lenken 4, Reihenfolge 4
    schritte: { spiegel: 6, blinker: 8, schulter: 8, lenken: 4, reihenfolge: 4 },
    // Gewichte je Handgriff (Phase 2a): die Handgriffe einer Situation teilen sich die 30 Punkte im Verhältnis dieser Gewichte
    gewichte: { spiegel: 6, blinker: 8, schulter: 8, lenken: 4, warn: 8, abblenden: 10, reihenfolge: 4 },
    // Tempo-Aufgabe (Summe 30): Ziel erreicht 20 (bis +3 km/h), halb bei +10 km/h; ruhig gebremst 10
    tempo: { ziel: 20, sanft: 10, toleranz: 3, halbBis: 10 },
    // Karte für die Führerscheinmappe: Situation ohne Doppelbremse und mit mindestens diesem Anteil der Punkte
    karteAb: 0.5,
  };

  // ---------- Stufen (je eigener Bestwert; Freischaltung siehe start/basis.js) ----------
  // tempo = Anteil der zulässigen Geschwindigkeit des Gebiets, fenster = Sekunden zum Reagieren (bis der Fahrlehrer bremsen muss),
  // anfahrt = Sekunden ruhiges Fahren vor jeder Aufgabe, hilfen: 'immer' (Hinweis-Pfeile sofort), 'spaet' (nach 3s), 'nie';
  // (Spielertest 29.10.2026: anfahrt 14/12/12 → 11/10/10, kürzere Leerstrecken)
  // verkehr = Faktor für Gegenverkehr. Situationen: Feld „Stufe“ = ab welcher Stufe (höhere Stufen nutzen auch die niedrigeren)
  const STUFEN = {
    fahrstunde: { name: 'Fahrstunde', tempo: 0.8, fenster: 2.6, anfahrt: 11, hilfen: 'immer', verkehr: 1 },
    uebung: { name: 'Übungsfahrt', tempo: 0.92, fenster: 2.2, anfahrt: 10, hilfen: 'nie', verkehr: 1.3 },
    pruefung: { name: 'Prüfungsfahrt', tempo: 1.0, fenster: 1.9, anfahrt: 10, hilfen: 'nie', verkehr: 1.8 },
  };

  // ---------- Gebiete (Tempo in km/h vor dem Stufen-Faktor; umgebung = Code-Kulisse in szene.js) ----------
  const GEBIETE = {
    innenstadt: { name: 'Innenstadt', kmh: 50, umgebung: 'stadt' },
    schule: { name: '30er/Schule', kmh: 30, umgebung: 'wohngebiet' },
    land: { name: 'Landstraße', kmh: 80, umgebung: 'land' },
    autobahn: { name: 'Autobahn', kmh: 110, umgebung: 'autobahn' },
    nacht: { name: 'Nacht/Wetter', kmh: 70, umgebung: 'land' },
  };

  // ---------- Prüfungsprotokoll: fünf Fahrkompetenzbereiche (OPFEP) und Zuordnung der Aufgaben-Teile ----------
  const BEREICHE = ['Verkehrsbeobachtung', 'Fahrzeugpositionierung', 'Geschwindigkeitsanpassung', 'Kommunikation', 'Fahrzeugbedienung'];
  // Teil → Bereich. „situation“ = der Bereich, den die Situation selbst nennt (Feld Bereich)
  const ZUORDNUNG = {
    erkannt: 'situation', ahnen: 'Verkehrsbeobachtung', fehlalarm: 'Verkehrsbeobachtung',
    spiegel: 'Verkehrsbeobachtung', schulter: 'Verkehrsbeobachtung', blinker: 'Kommunikation',
    lenken: 'Fahrzeugpositionierung', reihenfolge: 'Fahrzeugbedienung', warn: 'Kommunikation', abblenden: 'Fahrzeugbedienung',
    tempoZiel: 'Geschwindigkeitsanpassung', tempoSanft: 'Fahrzeugbedienung', vorfahrt: 'Verkehrsbeobachtung',
  };
  // Gewicht für die Fehlerliste im Endbild (die drei wichtigsten Fehler der Fahrt)
  const FEHLERGEWICHT = { doppelbremse: 5, verpasst: 4, schulter: 3, spiegel: 2, blinker: 2.5, lenken: 1, tempo: 2.5, reihenfolge: 1.5, spaet: 1.2, vorfahrt: 3, fehlalarm: 0.6, warn: 2.5, abblenden: 2.5,
    abstand: 4, licht: 4 };
  // Fehlerart je Situation (29.10.2026, Tipp-Arten „abstand“/„licht“): „Gefahr übersehen“ (verpasst) bzw. „zu schnell“ (tempo) zählt in diesen
  // Situationen fachlich als Abstands- bzw. Lichtfehler – Fehlertext bleibt, nur die Art (Tipp im Endbild) wechselt.
  const FEHLERART_SITUATION = {
    S001: 'abstand', S031: 'abstand', S044: 'abstand', S045: 'abstand', S067: 'abstand', S070: 'abstand', S090: 'abstand',
    S079: 'licht', S086: 'licht', S093: 'licht',   // S098 (Nebelschlussleuchte aus) nicht: beide Licht-Tipps sagen „Licht an“
  };

  // ---------- Fahrzeuge (Gerüst für spätere Klassen: Roller, Motorrad, Traktor …) ----------
  const FAHRZEUGE = {
    auto: { name: 'Pkw', klasse: 'B', cockpit: 'pkw', augenhoehe: 1.2, bremsMax: 7.5, komfort: 4.5, anfahren: 2.4, motorbremse: 0.6,
      handgriffe: ['spiegel', 'blinker', 'schulter', 'lenken', 'warn', 'abblenden'] },
  };

  // ---------- Bewertungen (MZ, 28.10.2026: Reihe 6) ----------
  const BEWERTUNGEN = [[900, 'Prüfungsreif'], [800, 'Grüne Welle'], [700, 'Fahrlehrer nickt'], [550, 'Noch ein paar Fahrstunden'], [0, 'Fahrlehrer braucht eine Pause']];

  // ---------- Rahmentexte (Ersatz, falls texte.js fehlt) ----------
  const TEXTE = {
    titel: 'Blinker links',
    frage: 'Bereit für deine Fahrt?',
    anleitung: {
      fahrstunde: 'Tippe jede Gefahr rechtzeitig an – Spiegel, Blinker, Schulterblick. Zu spät? Dann bremst dein Fahrlehrer mit.',
      uebung: 'Tippe jede Gefahr rechtzeitig an – Spiegel, Blinker, Schulterblick. Zu spät? Dann bremst dein Fahrlehrer mit.',
      pruefung: 'Tippe jede Gefahr rechtzeitig an – Spiegel, Blinker, Schulterblick. Zu spät? Dann bremst dein Fahrlehrer mit.',
    },
    abbruch: 'Dreimal Doppelbremse – die Fahrt ist für heute beendet.',
    abbruchBand: 'Fahrt abgebrochen',
  };

  // ---------- Tempo-Faustwerte (km/h) für die Tempo-Aufgaben – Stellschrauben, prüft der Text Writer (Phase 2b) ----------
  const FAUST = { splitt: 50, erde: 50, laub: 40, glaette: 40, aquaplaning: 60, seitenwind: 100, spielstrasse: 7 };   // Erde 60 → 50, Spielstraße 10 → 7 (Faustwert-Prüfung, MZ 28.10.2026)

  // ---------- Wetter-Physik (Phase 2b, Baustein 9) ----------
  // haftung = Faktor auf die Bremsverzögerung des Autos (FAHRZEUGE.auto.bremsMax 7,5 m/s² ≈ Haftung 0,76 auf trockenem Asphalt);
  // sicht = Meter, bis zu denen Dinge voll erkennbar sind (danach blendet szene.js sie aus: ab 0,35×, weg bei 1,35× sicht).
  // Hergeleitet aus Haftbeiwerten (trocken 0,8, nass 0,5–0,6, Schnee 0,2–0,3, Eis 0,1) und fürs Spiel lesbar gestaucht.
  // Fair: Gefahren starten mit dem längeren Bremsweg entsprechend früher (Reaktionsfenster je Stufe bleibt), und bei kurzer Sicht
  // fährt das Auto höchstens so schnell, dass Reaktionsfenster + Bremsweg in die Sicht passen („auf Sicht fahren“, § 3 StVO).
  const WETTER = {
    klar: { haftung: 1.0, sicht: 400 }, abend: { haftung: 1.0, sicht: 300 }, daemmerung: { haftung: 1.0, sicht: 160 },
    regen: { haftung: 0.7, sicht: 180 }, niesel: { haftung: 0.8, sicht: 220 }, nebel: { haftung: 0.85, sicht: 45 },   // Nebel-Sicht 62 → 45 m (MZ 28.10.2026)
    nacht: { haftung: 1.0, sicht: 95 }, nachtregen: { haftung: 0.7, sicht: 75 }, schnee: { haftung: 0.35, sicht: 120 },
    blendung: { haftung: 1.0, sicht: 70 },
  };
  // Flächen auf der Fahrbahn (markierung art 'flaeche', stoff): Faktor zusätzlich zum Wetter, solange das Auto darauf fährt
  const FLAECHE = { laub: 0.5, splitt: 0.6, erde: 0.55, matsch: 0.4, glaette: 0.25, wasser: 0.2, pfuetze: 0.75 };

  // ---------- Situationen: Zuordnung ID → Vorlage + Parameter (Phase 2a) ----------
  // Die Texte (Titel, Vorzeichen, Gefahr, Handgriffe, Bereich, Fehlertext, Regel, Stufe, Gebiet) kommen aus texte.js
  // (Material/Texte/blinker-situationen-entwurf.md), hier steht nur der Ablauf: [vorlage, { parameter }] (vorlagen.js).
  // Allgemeine Parameter: umgebung (stadt|wohngebiet|land|autobahn), wetter (klar|regen|niesel|nebel|nacht|nachtregen|schnee|
  // daemmerung|abend), kmh (Tempo des Gebiets überschreiben), licht (fern|abblend|tag), spuren (3 = dreispurige Autobahn).
  // Tempo-Werte für Faustregeln (Splitt, Erde, Laub, Glätte, Aquaplaning, Seitenwind) sind Vorschläge – MZ/Text Writer prüfen.
  const ABLAEUFE = {
    // Innenstadt
    S001: ['tuer'],
    S002: ['querer', { wer: 'frau-kinderwagen', zebra: true, vz: 'stehen', tempo: 1.1 }],
    S003: ['querer', { wer: 'fussgaenger', von: 'links', zebra: true, einbahn: true, deckung: { art: 'van', x: -3.4, dz: -7 }, vz: 'deckung', x0: -5.6 }],
    S004: ['abbiegen', { modus: 'radweg' }],
    S005: ['einscherer', { modus: 'haltestelle' }],
    S006: ['anfahren'],
    S007: ['hindernis', { modus: 'schmutz' }],
    S008: ['spurwechsel', { modus: 'hindernis', hindernis: 'paket' }],
    S009: ['halt', { modus: 'ampel' }],
    S010: ['abbiegen', { modus: 'quer', figuren: ['fussgaenger', 'frau', 'kind-ranzen'] }],
    S011: ['abbiegen', { modus: 'gegen', kx: -1.0 }],
    S012: ['gegen', { modus: 'einbahn' }],
    S013: ['einscherer', { modus: 'schlagloch' }],
    S014: ['einscherer', { modus: 'rueckwaerts' }],
    S015: ['vorne', { art: 'kombi', aktion: 'parken', vz: 'langsamer', abstand: 30 }],
    S016: ['spurwechsel', { modus: 'stadtring' }],
    S017: ['rettung', { modus: 'stadt' }],
    S018: ['halt', { modus: 'kreisel' }],
    S019: ['abbiegen', { modus: 'quer', figuren: ['junge-hund', 'hund'], kreisel: true }],
    S020: ['halt', { modus: 'stau' }],
    // 30er/Schule
    S021: ['querer', { wer: 'kind', vz: 'ball', parker: true }],
    S022: ['bus'],
    S023: ['vorne', { art: 'bus', aktion: 'haltestelle', vz: 'haltestelle', abstand: 30, vFaktor: 0.9 }],
    S024: ['querer', { wer: 'kind-ranzen', anzahl: 3, zebra: true, vz: 'lotsin', tempo: 1.4 }],
    S025: ['tempo', { vorher: 45, limit: 30, schild: { art: 'tempo', zahl: 30, zone: true }, beidseitig: true }],
    S026: ['einscherer', { modus: 'seitenstrasse' }],
    S027: ['einscherer', { modus: 'gehweg' }],
    S028: ['tempo', { vorher: 30, limit: FAUST.spielstrasse, danach: FAUST.spielstrasse, schild: { art: 'spielstrasse', groesse: 0.8 }, vz: 'schild', gefahr: 'kinder', kinderDz: 24 }],
    S029: ['anfahren'],
    S030: ['querer', { wer: 'kind', von: 'links', deckung: { art: 'eiswagen', x: 2.85, dz: -8 }, vz: 'deckung', tempo: 2.8 }],
    S031: ['gegen', { modus: 'eng' }],
    S032: ['abbiegen', { modus: 'gehweg', kmh: 20 }],
    S033: ['querer', { wer: 'rollator', parker: true, vz: 'stehen', x0: 2.4 }],
    S034: ['querer', { wer: 'arbeiter', deckung: { art: 'muell', x: 2.5, dz: -10, rundum: 'orange' }, vz: 'deckung', x0: 2.6, tempo: 1.6, tonnen: true }],
    S035: ['vorne', { art: 'radler', x: 0.4, v: 4.5, abstand: 60, radler: [[1.3, 0.4]], schild: { art: 'fahrradstrasse', dz: 30, zusatz: ' ' }, vz: 'schild', folgen: 4 }],
    S036: ['halt', { modus: 'schulampel' }],
    S037: ['abbiegen', { modus: 'quer', figuren: ['familie', 'kind', 'kind-ranzen'] }],
    S038: ['halt', { modus: 'engstelle' }],
    S039: ['querer', { wer: 'hund', vz: 'herrchen', tempo: 4.5 }],
    S040: ['querer', { wer: 'kind-ranzen', anzahl: 2, von: 'links', deckung: { art: 'schulbus', x: -2.9, dz: -14, richtung: -1, warn: true }, vz: 'deckung', x0: -2.9, ahnenV: 2.2, ohneGegen: true }],
    // Landstraße
    S041: ['gegen', { modus: 'kurve' }],
    S042: ['vorne', { art: 'traktor', aktion: 'abbiegenLinks', vz: 'langsamer', v: 8, abstand: 90, rundum: 'orange' }],
    S043: ['querer', { wer: 'reh', vz: { schild: 'wild', dz: -110, x: 3.4 }, x0: 6.4, tempo: 4.2, wetter: 'daemmerung' }],
    S044: ['rad-ueberholen'],
    S045: ['vorne', { art: 'begleit', rundum: 'orange', v: 8, abstand: 70, vz: 'fahrzeug', folgen: 4, folgeAbstand: 10,
      radler: [[0.4, 6], [1.3, 6], [0.4, 8.5], [1.3, 8.5], [0.4, 11], [1.3, 11], [0.4, 13.5], [1.3, 13.5]] }],
    S046: ['einscherer', { modus: 'feldweg' }],
    S047: ['tempo', { vorher: 80, limit: FAUST.erde, vz: { schild: 'schleuder', dz: -80 }, flaeche: { stoff: 'erde', laenge: 50 }, gefahr: 'flaeche' }],
    S048: ['tempo', { vorher: 100, limit: 50, danach: 50, schild: { art: 'ortstafel', groesse: 1.3, hoch: 2.2 }, vz: 'gleich' }],
    S049: ['vorne', { art: 'van', v: 15, abstand: 60, schild: { art: 'ueberholverbot', dz: 90 }, gefahrSchild: true, ueberholverbot: true, folgen: 5 }],
    S050: ['halt', { modus: 'bahn' }],
    S051: ['gegen', { modus: 'anhaenger' }],
    S052: ['abbiegen', { modus: 'motorrad', kx: -0.9 }],
    S053: ['abbiegen', { modus: 'zeichen' }],
    S054: ['gegen', { modus: 'maehdrescher' }],
    S055: ['gegen', { modus: 'rand' }],
    S056: ['einscherer', { modus: 'pferd' }],
    S057: ['halt', { modus: 'baustelle' }],
    S058: ['gegen', { modus: 'ueberholer' }],
    S059: ['querer', { wer: 'kind-ranzen', vz: 'kinderGegen', gegenBus: true, tempo: 2.6 }],
    S060: ['tempo', { vorher: 80, limit: FAUST.splitt, vz: { schild: 'splitt', dz: -70 }, flaeche: { stoff: 'splitt', laenge: 60 }, gefahr: 'flaeche' }],
    // Autobahn
    S061: ['spurwechsel', { modus: 'einfaedeln' }],
    S062: ['spurwechsel', { modus: 'ausfahrt' }],
    S063: ['stauende'],
    S064: ['rettung', { modus: 'gasse', spuren: 3 }],
    S065: ['einscherer', { modus: 'lkw' }],
    S066: ['ueberholen', { art: 'wohnmobil', v: 25 }],
    S067: ['spiegel', { modus: 'zurueck' }],
    S068: ['spurwechsel', { modus: 'reissverschluss' }],
    S069: ['vorne', { art: 'lkw', kx: -3.75, x: 0, vFaktor: 0.82, abstand: 50, schwanken: true, baken: true, schild: { art: 'breite', zahl: 2, dz: 60, x: -3.75, hoch: 5.0 }, vz: 'schild', folgen: 4, weg: 'schneller' }],
    S070: ['vorne', { art: 'kombi', aktion: 'naeher', vz: 'naeher', abstand: 45, vFaktor: 1.0 }],
    S071: ['spurwechsel', { modus: 'falschfahrer' }],
    S072: ['tempo', { vorher: 130, limit: FAUST.seitenwind, schild: { art: 'wind' }, vz: 'windsack', bruecke: true, gefahr: 'scheibe', wind: true }],
    S073: ['spurwechsel', { modus: 'panne' }],
    S074: ['spiegel', { modus: 'draengler' }],
    S075: ['einscherer', { modus: 'kolonne' }],
    S076: ['einscherer', { modus: 'einfaedler' }],
    S077: ['tempo', { vorher: 130, limit: 100, danach: 100, schild: { art: 'tempo', zahl: 100, zusatz: 'bei Nässe' }, beidseitig: true, vz: 'scheibe', wetter: 'niesel' }],
    S078: ['hindernis', { modus: 'reifen' }],
    S079: ['licht', { modus: 'tunnel' }],
    S080: ['spurwechsel', { modus: 'mitte' }],
    // Nacht/Wetter
    S081: ['gegen', { modus: 'fernlicht', umgebung: 'land', kmh: 80, licht: 'fern' }],
    S082: ['gegen', { modus: 'dunkel', umgebung: 'stadt', kmh: 50, wetter: 'nachtregen' }],
    S083: ['vorne', { art: 'radler', ohneLicht: true, x: 1.3, v: 4.5, abstand: 110, vz: 'gleich', folgen: 3 }],
    S084: ['vorne', { art: 'traktor', rundum: 'orange', v: 7, abstand: 'weit', vz: 'gleich', wetter: 'nebel', folgen: 3.5 }],
    S085: ['tempo', { vorher: 90, limit: FAUST.aquaplaning, flaeche: { stoff: 'wasser', x0: -1.4, x1: 1.4, laenge: 30 }, vz: 'flaeche', gefahr: 'scheibe', aquaplaning: true, wetter: 'regen' }],
    S086: ['vorne', { aktion: 'bremst', vz: 'blink', abstand: 34, wetter: 'regen' }],
    S087: ['tempo', { vorher: 80, limit: FAUST.glaette, schild: { art: 'glaette' }, vz: 'anzeige', bruecke: true, wetter: 'klar' }],
    S088: ['querer', { wer: 'fussgaenger', vz: 'sonne', wetter: 'abend', einmuendung: true }],
    S089: ['vorne', { art: 'radler', x: 1.4, v: 4, abstand: 90, vz: 'scheibe', beschlag: true, folgen: 2.5, wetter: 'klar' }],
    S090: ['vorne', { art: 'raeum', rundum: 'orange', v: 11, abstand: 'weit', vz: 'gleich', wetter: 'schnee', folgen: 4 }],
    S091: ['querer', { wer: 'wildschwein', anzahl: 3, vz: 'augen', x0: 5.5, tempo: 3.0, hand: true, licht: 'fern' }],
    S092: ['vorne', { art: 'pkw', vFaktor: 0.7, abstand: 200, vz: 'fahrzeug', abblenden: true, nurBis: true, gefahrAb: 95, folgen: 3, licht: 'fern' }],
    S093: ['licht', { modus: 'daemmerung', wetter: 'daemmerung' }],
    S094: ['tempo', { vorher: 70, limit: FAUST.laub, flaeche: { stoff: 'laub', laenge: 60 }, vz: 'baeume', gefahr: 'flaeche', kurve: 'links', wetter: 'klar' }],
    S095: ['spurwechsel', { modus: 'hindernis', hindernis: 'ast', gegenArt: 'van', wetter: 'regen' }],
    S096: ['querer', { wer: 'mann-schirm', parker: true, vz: 'stehen', umgebung: 'stadt', kmh: 50, wetter: 'nachtregen', x0: 4.6, tempo: 1.8 }],
    S097: ['querer', { wer: 'gruppe', anzahl: 4, einer: true, zurueck: true, vz: 'stehen', laengs: 0.9, umgebung: 'wohngebiet', kmh: 50, x0: 4.4 }],
    S098: ['spiegel', { modus: 'nebel', wetter: 'nebel' }],
    S099: ['spurwechsel', { modus: 'matsch', umgebung: 'autobahn', kmh: 110, wetter: 'schnee' }],
    S100: ['gegen', { modus: 'blendung', kmh: 80 }],
  };

  // ---------- Vorfahrt-Kreuzungen (Ersatz, falls texte.js fehlt; sonst KR01–KR24 des Text Writers) ----------
  // Format wie blinker-kreuzungen-entwurf.md: DU kommt immer von Süden; von = n/o/s/w, wohin = geradeaus/links/rechts aus
  // Sicht des Fahrers; reihenfolge = Gruppen (gleichzeitig) nacheinander. Phase 2a spielt nur Kreuzungen ohne Schilder/Ampeln.
  const KREUZUNGEN = [
    { id: 'KR02', Titel: 'Drei an der Kreuzung', Regelung: 'keine Schilder, keine Ampel', Stufe: '1',
      fahrzeuge: [{ id: 'DU', art: 'Fahrschulauto', von: 's', wohin: 'geradeaus' }, { id: 'PKW', art: 'Pkw', von: 'w', wohin: 'geradeaus' }, { id: 'RAD', art: 'Radler', von: 'o', wohin: 'geradeaus' }],
      reihenfolge: [['RAD'], ['DU'], ['PKW']],
      Begruendung: 'Der Radler hat rechts von sich niemanden und fährt zuerst. Dann bist du dran, denn der Pkw hat dich rechts von sich und wartet.',
      Regel: '§ 8 Abs. 1 StVO' },
  ];

  // ---------- Kreuzungen in der Draufsicht (Phase 2b): Form, Schilder, Ampeln, Polizei je Zufahrt ----------
  // Zufahrten n/o/s/w (DU kommt immer von s). form: 'kreuzung' | 'einmuendung' (ohne = fehlender Arm) | 'kreisel'.
  // schild: Zeichen je Zufahrt ('205' Vorfahrt gewähren, '206' Halt, '301' Vorfahrt, '306' Vorfahrtstraße, '215' Kreisverkehr,
  //   '325.2' Ende verkehrsberuhigter Bereich; knick = Verlauf der abknickenden Vorfahrt fürs Zusatzzeichen 1002, z. B. 'sw').
  // ampel: 'g' Grün, 'r' Rot, 'aus' dunkel; pfeilL = grüner Pfeil nach links; gruenpfeil = Grünpfeil-Schild an der Zufahrt;
  // fg: Arm, den die Fußgänger queren (mit Fußgängerampel fgAmpel); radweg: Arm mit Radweg rechts; feldweg: Arm als Feldweg;
  // polizei: 'brust' (DU sieht die Brust, Arme zeigen nach Westen/Osten) | 'seite' (DU sieht ihn von der Seite, Arme nach Norden/Süden).
  const VS = { s: '205', n: '205', o: '306', w: '306' }, VF = { s: '306', n: '306', o: '205', w: '205' };
  const AMPEL_SN = { s: 'g', n: 'g', o: 'r', w: 'r' }, AMPEL_OW = { s: 'r', n: 'r', o: 'g', w: 'g' };
  const KREUZ_LAGE = {
    KR03: { form: 'einmuendung', ohne: 'n', schild: { s: '206', o: '306', w: '306' } },
    KR04: { schild: VS }, KR05: { schild: VF },
    KR06: { ampel: AMPEL_SN, fg: 'w', fgAmpel: 'g' },
    KR07: { ampel: AMPEL_SN, radweg: 's', fg: 'o', fgAmpel: 'g' },
    KR09: { schild: { s: '306', w: '306', n: '205', o: '205' }, knick: 'sw' },
    KR10: { ampel: { s: 'aus', n: 'aus', o: 'aus', w: 'aus' }, schild: VS },
    KR11: { schild: VF },
    KR12: { ampel: AMPEL_OW, gruenpfeil: 's', fg: 's', fgAmpel: 'g' },
    KR13: { form: 'kreisel', schild: { s: '215', n: '215', o: '215', w: '215' }, kreis: { PKW: 135 } },
    KR14: { form: 'einmuendung', ohne: 'n', schild: { s: '325.2' } },
    KR15: { form: 'einmuendung', ohne: 'w', feldweg: 'o' },
    KR16: { ampel: AMPEL_SN },
    KR17: { ampel: { s: 'g', n: 'r', o: 'r', w: 'r' }, pfeilL: 's' },
    KR18: { form: 'einmuendung', ohne: 'n', schild: { s: '205', o: '306', w: '306' } },
    KR19: { ampel: AMPEL_SN, polizei: 'brust' },
    KR20: { ampel: AMPEL_OW, polizei: 'seite' },
    KR21: { schild: VS, polizei: 'seite' },
    KR24: { schild: VS },
  };

  // ---------- Zufallsrouten (Phase 2b, Baustein 16) ----------
  // Eine Fahrt = zusammenhängende Route durch Musterstadt: die Situationen werden nach Strecken-Abschnitten sortiert
  // (Reihenfolge je Route), Nacht/Wetter-Situationen gehören zu dem Abschnitt, in dem sie spielen (umgebung), und liegen als
  // Überlagerung darauf. merken = so viele zuletzt gespielte Situationen/Kreuzungen werden gemieden (localStorage).
  const ROUTE = {
    routen: [
      ['innenstadt', 'schule', 'land', 'autobahn'],     // Stadt → Autobahn
      ['autobahn', 'land', 'schule', 'innenstadt'],     // Heimweg
      ['schule', 'innenstadt', 'land', 'autobahn'],
      ['land', 'autobahn', 'land', 'innenstadt'],
      ['innenstadt', 'land', 'autobahn', 'schule'],
    ],
    situationen: 9, kreuzungen: 1, nachtMin: 1, merken: 45, merkenKreuzung: 10,
  };

  // ---------- Lebende Strecke (Phase 2b, Baustein 15): Randobjekte je Umgebung ----------
  // takt = Sekunden zwischen zwei neuen Randobjekten (Zufall ±50 %), einfach = Faktor für schwache Handys (weniger Objekte).
  // Alle laufen parallel zur Straße oder weg von ihr, mit Abstand zur Fahrbahn – nie wie eine Gefahr.
  const RAND = {
    stadt: { takt: 2.2, arten: ['passant', 'passant', 'passant-paar', 'lieferwagen', 'bus-gegen', 'passant', 'gegen-mix', 'gegen-mix', 'kontrolle'] },
    wohngebiet: { takt: 2.6, arten: ['kinder-zaun', 'passant', 'schulbus-gegen', 'kinder-zaun', 'passant', 'gegen-mix'] },
    land: { takt: 3.0, arten: ['traktor-feld', 'radler-radweg', 'rehe-wald', 'baustelle', 'radler-radweg', 'traktor-feld', 'gegen-mix', 'gegen-mix', 'reiterin', 'kontrolle'] },
    autobahn: { takt: 2.4, arten: ['lkw-kolonne', 'gegen-autobahn', 'gegen-autobahn', 'lkw-kolonne'] },
    nacht: { takt: 3.4, arten: ['fenster', 'gegen-licht', 'fenster'] },
    einfach: 0.35,
  };

  // ---------- Fahrlehrer-Sprüche (Ersatz; Pool von 66 kommt vom Text Writer über texte.js) ----------
  const SPRUECHE = {
    start: ['Ganz entspannt. Ich bremse nur, wenn es sein muss.', 'Spiegel passt, Sitz passt – dann los.'],
    lob: ['Sauber gesehen.', 'So mag ich das.'],
    geahnt: ['Gut mitgedacht – das war vorausschauend.'],
    fehlalarm: ['Da war nichts. Augen auf, aber ruhig bleiben.'],
    handgriff: ['Schulterblick nicht vergessen – der tote Winkel ist tückisch.'],
    doppelbremse: ['Puh. Mein Fuß war schneller.', 'Das war knapp – ich hatte den Fuß schon unten.'],
    abbruch: ['Für heute reicht es. Wir üben das in Ruhe nochmal.'],
    pruefung: ['Prüfung ist auch nur Autofahren. Atmen nicht vergessen.'],
    wetter: ['Bei Nässe doppelt so viel Abstand, ja?'],
    warten: ['Noch nicht – da kommt noch jemand.'],
  };

  window.BL_DATEN = { FAUST, WETTER, FLAECHE, KREUZ_LAGE, ROUTE, RAND, PUNKTE, STUFEN, GEBIETE, BEREICHE, ZUORDNUNG, FEHLERGEWICHT, FEHLERART_SITUATION, FAHRZEUGE, BEWERTUNGEN, TEXTE, ABLAEUFE, KREUZUNGEN, SPRUECHE };
})();
