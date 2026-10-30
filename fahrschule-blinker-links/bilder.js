// „Blinker links“ – Bild-Anschlüsse für Phase 3 (Graphic Artist). Jedes Motiv hat einen festen Platz
// bilder/<gruppe>/<name>.webp. Liegt die Datei dort und steht ihr Schlüssel in VORHANDEN, zeichnen szene.js bzw. schirme.js
// das Bild statt des Code-Platzhalters; sonst bleibt der Platzhalter. VORHANDEN schreibt Material/Skripte/bilder-liste.py
// (nach dem Ablegen einmal laufen lassen) – so lädt das Spiel nie eine fehlende Datei (keine 404-Fehler in der Konsole).
// Dasselbe Skript erzeugt aus ANSCHLUESSE die Liste Material/Bild-Anschluesse.md (Grundlage der Bildaufträge).
//
// Felder je Anschluss: gruppe, name, ansicht (für den Bildauftrag), breite = Breite des Motivs in Metern (danach wird skaliert),
// hoehe = ungefähre Höhe in m, zmin = kleinste übliche Entfernung im Spiel in m (für die Pixelgröße), anker = Punkt im Bild
// (Anteil von Breite/Höhe), der auf dem Boden steht (Standard unten Mitte [0.5, 1]); bei Fahrzeugen zusätzlich
// schild = Lage des leeren weißen Kennzeichenschilds [x, y, breite, höhe] als Anteil des Bildes (der Code setzt „BAG-…“ ein,
// MZ 28.10.2026) und lichter = [[x, y] links, [x, y] rechts] für Brems-/Blink-/Scheinwerferlicht. Werte für schild und
// lichter sind Vorgaben für die Bilder (der Graphic Artist hält sie ein oder der Developer misst sie beim Einbau nach).
(function () {
  'use strict';
  // ANSCHLUESSE-ANFANG (JSON, wird von bilder-liste.py gelesen)
  const ANSCHLUESSE = [
    { "gruppe": "fahrzeuge", "name": "pkw", "ansicht": "Kleinwagen/Kompakter von hinten", "breite": 1.8, "hoehe": 1.45, "zmin": 5, "schild": [0.39, 0.62, 0.22, 0.07], "lichter": [[0.08, 0.45], [0.92, 0.45]] },
    { "gruppe": "fahrzeuge", "name": "kombi", "ansicht": "Kombi von hinten", "breite": 1.85, "hoehe": 1.5, "zmin": 5, "schild": [0.39, 0.62, 0.22, 0.07], "lichter": [[0.07, 0.42], [0.93, 0.42]] },
    { "gruppe": "fahrzeuge", "name": "van", "ansicht": "Transporter/Lieferwagen (Kastenwagen) von hinten", "breite": 2.0, "hoehe": 2.25, "zmin": 6, "schild": [0.4, 0.72, 0.2, 0.05], "lichter": [[0.06, 0.6], [0.94, 0.6]] },
    { "gruppe": "fahrzeuge", "name": "paket", "ansicht": "Paketwagen von hinten (ohne Firmenlogo)", "breite": 2.1, "hoehe": 2.6, "zmin": 6, "schild": [0.4, 0.75, 0.2, 0.045], "lichter": [[0.06, 0.66], [0.94, 0.66]] },
    { "gruppe": "fahrzeuge", "name": "lkw", "ansicht": "Lkw (Sattelzug/Koffer) von hinten", "breite": 2.5, "hoehe": 3.7, "zmin": 8, "schild": [0.41, 0.82, 0.18, 0.03], "lichter": [[0.06, 0.8], [0.94, 0.8]] },
    { "gruppe": "fahrzeuge", "name": "bus", "ansicht": "Linienbus von hinten", "breite": 2.55, "hoehe": 3.1, "zmin": 8, "schild": [0.41, 0.8, 0.18, 0.035], "lichter": [[0.06, 0.74], [0.94, 0.74]] },
    { "gruppe": "fahrzeuge", "name": "schulbus", "ansicht": "Schulbus von hinten (Schild Schulbus)", "breite": 2.55, "hoehe": 3.1, "zmin": 8, "schild": [0.41, 0.8, 0.18, 0.035], "lichter": [[0.06, 0.74], [0.94, 0.74]] },
    { "gruppe": "fahrzeuge", "name": "traktor", "ansicht": "Traktor mit Rundumleuchte von hinten", "breite": 2.4, "hoehe": 2.9, "zmin": 7, "schild": [0.42, 0.62, 0.16, 0.04], "lichter": [[0.08, 0.6], [0.92, 0.6]] },
    { "gruppe": "fahrzeuge", "name": "motorrad", "ansicht": "Motorrad mit Fahrer von hinten", "breite": 0.85, "hoehe": 1.85, "zmin": 5, "schild": [0.38, 0.55, 0.24, 0.06], "lichter": [[0.45, 0.5], [0.55, 0.5]] },
    { "gruppe": "fahrzeuge", "name": "rettung", "ansicht": "Rettungswagen von hinten (Blaulicht aus dem Code)", "breite": 2.1, "hoehe": 2.8, "zmin": 6, "schild": [0.4, 0.78, 0.2, 0.04], "lichter": [[0.06, 0.7], [0.94, 0.7]] },
    { "gruppe": "fahrzeuge", "name": "muell", "ansicht": "Müllfahrzeug von hinten", "breite": 2.5, "hoehe": 3.4, "zmin": 7, "schild": [0.41, 0.82, 0.18, 0.03], "lichter": [[0.06, 0.78], [0.94, 0.78]] },
    { "gruppe": "fahrzeuge", "name": "raeum", "ansicht": "Räumfahrzeug (Winterdienst) von hinten", "breite": 2.5, "hoehe": 3.3, "zmin": 7, "schild": [0.41, 0.82, 0.18, 0.03], "lichter": [[0.06, 0.78], [0.94, 0.78]] },
    { "gruppe": "fahrzeuge", "name": "wohnmobil", "ansicht": "Wohnmobil von hinten", "breite": 2.3, "hoehe": 3.0, "zmin": 7, "schild": [0.41, 0.8, 0.18, 0.035], "lichter": [[0.06, 0.74], [0.94, 0.74]] },
    { "gruppe": "fahrzeuge", "name": "eiswagen", "ansicht": "Eiswagen (Kleintransporter) von hinten", "breite": 2.0, "hoehe": 2.4, "zmin": 6, "schild": [0.4, 0.72, 0.2, 0.05], "lichter": [[0.06, 0.6], [0.94, 0.6]] },
    { "gruppe": "fahrzeuge", "name": "begleit", "ansicht": "Begleitfahrzeug (Kombi) mit Rundumleuchte von hinten", "breite": 1.85, "hoehe": 1.6, "zmin": 8, "schild": [0.39, 0.62, 0.22, 0.07], "lichter": [[0.07, 0.42], [0.93, 0.42]] },
    { "gruppe": "gegenverkehr", "name": "pkw", "ansicht": "Pkw von vorne", "breite": 1.8, "hoehe": 1.45, "zmin": 6, "schild": [0.38, 0.68, 0.24, 0.07], "lichter": [[0.14, 0.5], [0.86, 0.5]] },
    { "gruppe": "gegenverkehr", "name": "van", "ansicht": "Transporter/Lieferwagen von vorne", "breite": 2.0, "hoehe": 2.25, "zmin": 7, "schild": [0.4, 0.78, 0.2, 0.05], "lichter": [[0.12, 0.62], [0.88, 0.62]] },
    { "gruppe": "gegenverkehr", "name": "lkw", "ansicht": "Lkw mit Anhänger von vorne", "breite": 2.5, "hoehe": 3.7, "zmin": 10, "schild": [0.41, 0.86, 0.18, 0.03], "lichter": [[0.1, 0.8], [0.9, 0.8]] },
    { "gruppe": "gegenverkehr", "name": "bus", "ansicht": "Bus/Schulbus von vorne", "breite": 2.55, "hoehe": 3.1, "zmin": 10, "schild": [0.41, 0.86, 0.18, 0.035], "lichter": [[0.1, 0.8], [0.9, 0.8]] },
    { "gruppe": "gegenverkehr", "name": "kombi", "ansicht": "Kombi von vorne", "breite": 1.85, "hoehe": 1.5, "zmin": 6, "schild": [0.38, 0.68, 0.24, 0.07], "lichter": [[0.13, 0.5], [0.87, 0.5]] },
    { "gruppe": "gegenverkehr", "name": "schulbus", "ansicht": "Schulbus von vorne (Schild Schulbus)", "breite": 2.55, "hoehe": 3.1, "zmin": 10, "schild": [0.41, 0.86, 0.18, 0.035], "lichter": [[0.1, 0.8], [0.9, 0.8]] },
    { "gruppe": "gegenverkehr", "name": "traktor", "ansicht": "Traktor von vorne", "breite": 2.4, "hoehe": 2.9, "zmin": 10, "schild": [0.42, 0.7, 0.16, 0.04], "lichter": [[0.15, 0.45], [0.85, 0.45]] },
    { "gruppe": "gegenverkehr", "name": "motorrad", "ansicht": "Motorrad mit Fahrer von vorne", "breite": 0.85, "hoehe": 1.85, "zmin": 8, "lichter": [[0.48, 0.48], [0.52, 0.48]] },
    { "gruppe": "gegenverkehr", "name": "maehdrescher", "ansicht": "Mähdrescher mit Schneidwerk von vorne (überbreit)", "breite": 5.6, "hoehe": 3.9, "zmin": 14, "lichter": [[0.35, 0.3], [0.65, 0.3]] },
    { "gruppe": "gegenverkehr", "name": "begleit", "ansicht": "Begleitfahrzeug (Pkw/Kombi) mit Rundumleuchte von vorne", "breite": 1.85, "hoehe": 1.6, "zmin": 10, "schild": [0.38, 0.68, 0.24, 0.07], "lichter": [[0.14, 0.5], [0.86, 0.5]] },
    { "gruppe": "seitlich", "name": "pkw", "ansicht": "Pkw von der Seite, Front nach links (fährt quer aus einer Seitenstraße)", "breite": 4.3, "hoehe": 1.45, "zmin": 8, "anker": [0.5, 1] },
    { "gruppe": "seitlich", "name": "van", "ansicht": "Transporter von der Seite, Front nach links (setzt aus der Einfahrt zurück – der Code spiegelt beim Rückwärtsfahren)", "breite": 5.4, "hoehe": 2.25, "zmin": 8, "anker": [0.5, 1] },
    { "gruppe": "seitlich", "name": "traktor", "ansicht": "Traktor von der Seite, Front nach links (kommt aus dem Feldweg)", "breite": 4.0, "hoehe": 2.9, "zmin": 10, "anker": [0.5, 1] },
    { "gruppe": "menschen", "name": "fussgaenger", "ansicht": "Mann, gehend, seitlich (blickt nach links)", "breite": 0.7, "hoehe": 1.78, "zmin": 5 },
    { "gruppe": "menschen", "name": "frau", "ansicht": "Frau, gehend, seitlich", "breite": 0.65, "hoehe": 1.68, "zmin": 5 },
    { "gruppe": "menschen", "name": "frau-kinderwagen", "ansicht": "Frau mit Kinderwagen, seitlich", "breite": 1.7, "hoehe": 1.68, "zmin": 5 },
    { "gruppe": "menschen", "name": "kind", "ansicht": "Kind (ca. 8 Jahre), rennend, seitlich", "breite": 0.55, "hoehe": 1.25, "zmin": 4 },
    { "gruppe": "menschen", "name": "kind-ranzen", "ansicht": "Kind mit Schulranzen, gehend, seitlich", "breite": 0.6, "hoehe": 1.25, "zmin": 4 },
    { "gruppe": "menschen", "name": "lotsin", "ansicht": "Schülerlotsin mit Kelle und Warnweste, von vorne", "breite": 0.9, "hoehe": 1.7, "zmin": 6 },
    { "gruppe": "menschen", "name": "rollator", "ansicht": "Ältere Dame mit Rollator, seitlich", "breite": 1.1, "hoehe": 1.62, "zmin": 5 },
    { "gruppe": "menschen", "name": "arbeiter", "ansicht": "Müllwerker in Warnkleidung, gehend, seitlich", "breite": 0.75, "hoehe": 1.8, "zmin": 5 },
    { "gruppe": "menschen", "name": "mann-schirm", "ansicht": "Mann mit tief gehaltenem Regenschirm, eilig, seitlich", "breite": 1.1, "hoehe": 1.9, "zmin": 5 },
    { "gruppe": "menschen", "name": "dunkel", "ansicht": "Fußgänger in dunkler Kleidung, von vorne (Nacht)", "breite": 0.7, "hoehe": 1.8, "zmin": 6 },
    { "gruppe": "menschen", "name": "spaziergaengerinnen", "ansicht": "Spaziergängerin mit Wanderstöcken, von vorne (eine Person; das Spiel stellt zwei nebeneinander)", "breite": 0.75, "hoehe": 1.7, "zmin": 7 },
    { "gruppe": "menschen", "name": "gruppe", "ansicht": "Erwachsener auf dem Heimweg vom Volksfest, gehend, seitlich (eine Person; das Spiel stellt vier zusammen)", "breite": 0.7, "hoehe": 1.8, "zmin": 6 },
    { "gruppe": "menschen", "name": "familie", "ansicht": "Vater, gehend, seitlich (die Kinder kommen aus kind/kind-ranzen)", "breite": 0.7, "hoehe": 1.8, "zmin": 6 },
    { "gruppe": "menschen", "name": "junge-hund", "ansicht": "Junge (ca. 10), gehend, seitlich (Hund kommt aus tiere/hund)", "breite": 0.6, "hoehe": 1.45, "zmin": 6 },
    { "gruppe": "menschen", "name": "panne", "ansicht": "Person in Warnweste am Pannenfahrzeug, seitlich", "breite": 0.7, "hoehe": 1.78, "zmin": 6 },
    { "gruppe": "menschen", "name": "scooter", "ansicht": "Person auf E-Scooter von hinten", "breite": 0.7, "hoehe": 1.9, "zmin": 5 },
    { "gruppe": "menschen", "name": "radler", "ansicht": "Radfahrer von hinten", "breite": 0.75, "hoehe": 1.85, "zmin": 5 },
    { "gruppe": "menschen", "name": "radler-vorne", "ansicht": "Radfahrerin von vorne", "breite": 0.75, "hoehe": 1.85, "zmin": 7 },
    { "gruppe": "menschen", "name": "rennradler", "ansicht": "Rennradler von hinten (Trikot, Helm)", "breite": 0.7, "hoehe": 1.75, "zmin": 6 },
    { "gruppe": "menschen", "name": "kind-rad", "ansicht": "Grundschulkind auf Fahrrad, seitlich/von hinten", "breite": 0.7, "hoehe": 1.4, "zmin": 5 },
    { "gruppe": "tiere", "name": "reh", "ansicht": "Reh, springend, seitlich (blickt nach links)", "breite": 1.5, "hoehe": 1.3, "zmin": 6 },
    { "gruppe": "tiere", "name": "wildschwein", "ansicht": "Wildschwein, laufend, seitlich", "breite": 1.3, "hoehe": 0.85, "zmin": 6 },
    { "gruppe": "tiere", "name": "hund", "ansicht": "Mittelgroßer Hund, laufend, seitlich", "breite": 0.85, "hoehe": 0.65, "zmin": 5 },
    { "gruppe": "tiere", "name": "reiterin", "ansicht": "Pferd mit Reiterin, seitlich/von hinten", "breite": 2.3, "hoehe": 2.6, "zmin": 7 },
    { "gruppe": "cockpit", "name": "armaturen", "ansicht": "Armaturenbrett Fahrersicht, untere Bildhälfte, ohne Lenkrad, ohne Tacho-Zeiger", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "1500 × 1100", "anker": [0.5, 0] },
    { "gruppe": "cockpit", "name": "lenkrad", "ansicht": "Lenkrad mit Händen auf zehn vor zwei, von hinten, freigestellt", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "1000 × 1000", "anker": [0.5, 0.5] },
    { "gruppe": "cockpit", "name": "fuss", "ansicht": "Fuß des Fahrlehrers auf der Zusatzbremse, freigestellt", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "400 × 500", "anker": [0.5, 1] },
    { "gruppe": "fahrlehrer", "name": "neutral", "ansicht": "Fahrlehrer (Mann), Brustbild, Miene neutral, Jacke #00FF00, quadratisch", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "300 × 300", "anker": [0.5, 0.5] },
    { "gruppe": "fahrlehrer", "name": "freut", "ansicht": "Fahrlehrer, Miene freut sich", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "300 × 300", "anker": [0.5, 0.5] },
    { "gruppe": "fahrlehrer", "name": "erschrickt", "ansicht": "Fahrlehrer, Miene erschrickt", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "300 × 300", "anker": [0.5, 0.5] },
    { "gruppe": "draufsicht", "name": "du", "ansicht": "Fahrschulauto von oben (Dach #00FF00, beim Einbau in Kundenfarbe umfärben), Front nach oben", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "120 × 240", "anker": [0.5, 0.5] },
    { "gruppe": "draufsicht", "name": "pkw", "ansicht": "Pkw von oben, Front nach oben", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "120 × 240", "anker": [0.5, 0.5] },
    { "gruppe": "draufsicht", "name": "lkw", "ansicht": "Lkw/Bus von oben, Front nach oben", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "130 × 330", "anker": [0.5, 0.5] },
    { "gruppe": "draufsicht", "name": "rad", "ansicht": "Radfahrer von oben, Front nach oben", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "60 × 180", "anker": [0.5, 0.5] },
    { "gruppe": "draufsicht", "name": "fussgaenger", "ansicht": "Fußgänger von oben (Kopf, Schultern), Blick nach oben – Phase 2b", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "60 × 60", "anker": [0.5, 0.5] },
    { "gruppe": "draufsicht", "name": "polizist", "ansicht": "Polizist von oben, Arme seitlich ausgestreckt (waagerecht), Blick nach unten – Phase 2b", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "180 × 80", "anker": [0.5, 0.5] },
    { "gruppe": "kulisse", "name": "horizont-stadt", "ansicht": "Horizont-Streifen Kleinstadt Niederbayern (Dächer, Kirchturm), unten transparent, nahtlos wiederholbar", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "1600 × 200", "anker": [0, 1] },
    { "gruppe": "kulisse", "name": "horizont-wohngebiet", "ansicht": "Horizont-Streifen Wohngebiet, nahtlos", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "1600 × 200", "anker": [0, 1] },
    { "gruppe": "kulisse", "name": "horizont-land", "ansicht": "Horizont-Streifen flaches Land (Baumreihen, Höfe), nahtlos", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "1600 × 200", "anker": [0, 1] },
    { "gruppe": "kulisse", "name": "horizont-autobahn", "ansicht": "Horizont-Streifen an der Autobahn (Lärmschutz, Wald), nahtlos", "breite": 0, "hoehe": 0, "zmin": 0, "pixel": "1600 × 200", "anker": [0, 1] }
  ];
  // ANSCHLUESSE-ENDE
  // VORHANDEN (schreibt Material/Skripte/bilder-liste.py – nicht von Hand pflegen): alle Dateien unter bilder/ (Anschlüsse, Varianten
  // <name>-2 …, Fassaden, Ränder, Himmel)
  const VORHANDEN = ["baum/birke", "baum/fichte", "baum/hecke", "baum/herbst", "baum/jung", "baum/laub-1", "baum/laub-2", "baum/laub-3", "baum/obst", "baum/pappel", "baum/strauch", "baum/winter", "cockpit/armaturen", "cockpit/fuss-schwebt", "cockpit/fuss-tritt", "cockpit/lenkrad-haende", "draufsicht/bus", "draufsicht/du", "draufsicht/fussgaenger", "draufsicht/fussgaenger-2", "draufsicht/lkw", "draufsicht/motorrad", "draufsicht/pkw", "draufsicht/pkw-2", "draufsicht/pkw-3", "draufsicht/pkw-4", "draufsicht/polizei", "draufsicht/polizist", "draufsicht/rad", "draufsicht/rettung", "draufsicht/traktor", "draufsicht/van", "fahrlehrer/cockpit-haltegriff", "fahrlehrer/ende-daumen", "fahrlehrer/ende-klemmbrett", "fahrlehrer/ende-zeigt", "fahrlehrer/erschrickt", "fahrlehrer/freut", "fahrlehrer/neutral", "fahrlehrer/nickt", "fahrlehrer/seufzt", "fahrlehrer/skeptisch", "fahrlehrer/szene-daumen", "fahrlehrer/szene-haltegriff", "fahrlehrer/szene-klemmbrett", "fahrlehrer/szene-zeigt", "fahrzeuge/begleit", "fahrzeuge/bus", "fahrzeuge/eiswagen", "fahrzeuge/kombi", "fahrzeuge/kombi-2", "fahrzeuge/kombi-3", "fahrzeuge/lkw", "fahrzeuge/motorrad", "fahrzeuge/muell", "fahrzeuge/paket", "fahrzeuge/pkw", "fahrzeuge/pkw-2", "fahrzeuge/pkw-3", "fahrzeuge/pkw-4", "fahrzeuge/pkw-5", "fahrzeuge/polizei", "fahrzeuge/raeum", "fahrzeuge/rettung", "fahrzeuge/schulbus", "fahrzeuge/traktor", "fahrzeuge/traktor-2", "fahrzeuge/van", "fahrzeuge/van-2", "fahrzeuge/wohnmobil", "fassade/stadt-1", "fassade/stadt-1-nacht", "fassade/stadt-2", "fassade/stadt-2-nacht", "fassade/stadt-3", "fassade/stadt-3-nacht", "fassade/stadt-4", "fassade/stadt-4-nacht", "fassade/stadt-cafe", "fassade/stadt-cafe-nacht", "fassade/stadt-haltestelle", "fassade/stadt-haltestelle-nacht", "fassade/stadt-kirche", "fassade/stadt-kirche-nacht", "fassade/stadt-rathaus", "fassade/stadt-rathaus-nacht", "fassade/wohngebiet-bauernhaus", "fassade/wohngebiet-bauernhaus-nacht", "fassade/wohngebiet-doppelhaus", "fassade/wohngebiet-doppelhaus-nacht", "fassade/wohngebiet-efh", "fassade/wohngebiet-efh-nacht", "fassade/wohngebiet-kindergarten", "fassade/wohngebiet-kindergarten-nacht", "fassade/wohngebiet-reihenhaus", "fassade/wohngebiet-reihenhaus-nacht", "fassade/wohngebiet-schule", "fassade/wohngebiet-schule-nacht", "fassade/wohngebiet-spielplatz", "fassade/wohngebiet-spielplatz-nacht", "fassade/wohngebiet-turnhalle", "fassade/wohngebiet-turnhalle-nacht", "gegenverkehr/begleit", "gegenverkehr/bus", "gegenverkehr/eiswagen", "gegenverkehr/kombi", "gegenverkehr/kombi-2", "gegenverkehr/lkw", "gegenverkehr/maehdrescher", "gegenverkehr/motorrad", "gegenverkehr/pkw", "gegenverkehr/pkw-2", "gegenverkehr/pkw-3", "gegenverkehr/pkw-4", "gegenverkehr/polizei", "gegenverkehr/rettung", "gegenverkehr/schulbus", "gegenverkehr/traktor", "gegenverkehr/van", "gegenverkehr/wohnmobil", "hausseite/stadt-1", "hausseite/stadt-1-nacht", "hausseite/stadt-2", "hausseite/stadt-2-nacht", "hausseite/stadt-3", "hausseite/stadt-3-nacht", "hausseite/stadt-4", "hausseite/stadt-4-nacht", "hausseite/stadt-cafe", "hausseite/stadt-cafe-nacht", "hausseite/stadt-haltestelle", "hausseite/stadt-haltestelle-nacht", "hausseite/stadt-kirche", "hausseite/stadt-kirche-nacht", "hausseite/stadt-rathaus", "hausseite/stadt-rathaus-nacht", "hausseite/wohngebiet-bauernhaus", "hausseite/wohngebiet-bauernhaus-nacht", "hausseite/wohngebiet-doppelhaus", "hausseite/wohngebiet-doppelhaus-nacht", "hausseite/wohngebiet-efh", "hausseite/wohngebiet-efh-nacht", "hausseite/wohngebiet-garage", "hausseite/wohngebiet-garage-nacht", "hausseite/wohngebiet-kindergarten", "hausseite/wohngebiet-kindergarten-nacht", "hausseite/wohngebiet-reihenhaus", "hausseite/wohngebiet-reihenhaus-nacht", "hausseite/wohngebiet-schule", "hausseite/wohngebiet-schule-nacht", "hausseite/wohngebiet-turnhalle", "hausseite/wohngebiet-turnhalle-nacht", "himmel/abend", "himmel/klar", "himmel/nacht", "himmel/nebel", "himmel/regen", "himmel/wolkig", "kulisse/horizont-land", "kulisse/horizont-stadt", "kulisse/horizont-wohngebiet", "menschen/arbeiter", "menschen/brieftraegerin", "menschen/frau", "menschen/frau-kinderwagen", "menschen/frau-tasche", "menschen/fussgaenger", "menschen/fussgaenger-2", "menschen/gehstock", "menschen/jogger", "menschen/junge", "menschen/kind", "menschen/kind-rad", "menschen/kind-ranzen", "menschen/kind-ranzen-2", "menschen/lotsin", "menschen/polizist", "menschen/polizist-winkt", "menschen/radler", "menschen/radler-2", "menschen/radler-3", "menschen/radler-4", "menschen/radler-vorne", "menschen/radler-vorne-2", "menschen/reiterin", "menschen/rollator", "menschen/rollstuhl", "menschen/schirm", "menschen/scooter", "menschen/spaziergaengerin", "rand/autobahn-bruecke", "rand/autobahn-laermschutz", "rand/autobahn-parkplatz", "rand/autobahn-rast", "rand/autobahn-tunnel", "rand/autobahn-wald", "rand/autobahn-zaun", "rand/land-getreide", "rand/land-gewerbe", "rand/land-hof", "rand/land-hopfen", "rand/land-kapelle", "rand/land-mais", "rand/land-wald", "seitlich/pkw", "seitlich/pkw-2", "seitlich/pkw-3", "seitlich/traktor", "seitlich/van", "seitlich/van-2", "textur/dach-biber", "textur/dach-blech", "textur/dach-schiefer", "textur/dach-ziegel", "textur/putz-grau", "textur/putz-hell", "textur/putz-ocker", "textur/putz-rosa", "tiere/hund", "tiere/reh", "tiere/reh-2", "tiere/wildschwein", "tunnel/ausblick-nacht", "tunnel/ausblick-tag", "tunnel/decke", "tunnel/wand", "tunnel/wand-nische"];
  // MASSE (schreibt bilder-liste.py aus Material/Skripte/bilder-mass.json, gemessen von bilder-schneiden.py): je Datei px = [Breite, Höhe],
  // b = Breite in m (Fahrzeuge), h = Höhe in m (Menschen, Tiere, Fassaden, Ränder), l = Länge in m (Draufsicht), schild/lichter wie oben,
  // farbe = Mittelfarbe einer Fassade (Seitenwand aus dem Code)
  const MASSE = {"baum/birke":{"h":11.0,"px":[230,280]},"baum/fichte":{"h":15.0,"px":[217,300]},"baum/hecke":{"h":1.7,"px":[320,97]},"baum/herbst":{"h":11.0,"px":[292,300]},"baum/jung":{"h":5.5,"px":[106,220]},"baum/laub-1":{"h":12.0,"px":[293,300]},"baum/laub-2":{"h":12.5,"px":[293,300]},"baum/laub-3":{"h":13.0,"px":[292,300]},"baum/obst":{"h":6.5,"px":[300,221]},"baum/pappel":{"h":18.0,"px":[99,300]},"baum/strauch":{"h":2.4,"px":[220,206]},"baum/winter":{"h":11.0,"px":[300,298]},"cockpit/armaturen":{"haube":[0.032305433186490456,0.16276041666666666],"kombi":[0.2604166666666667,0.24522760646108663],"px":[1300,576]},"cockpit/fuss-schwebt":{"px":[284,420]},"cockpit/fuss-tritt":{"px":[299,420]},"cockpit/lenkrad-haende":{"box":[0,81,1254,1254],"px":[760,712]},"draufsicht/bus":{"l":12.0,"px":[117,340]},"draufsicht/du":{"l":4.3,"px":[104,182]},"draufsicht/fussgaenger":{"l":0.55,"px":[79,76]},"draufsicht/fussgaenger-2":{"l":0.9,"px":[120,93]},"draufsicht/lkw":{"l":10.0,"px":[115,320]},"draufsicht/motorrad":{"l":2.1,"px":[72,140]},"draufsicht/pkw":{"l":3.9,"px":[102,174]},"draufsicht/pkw-2":{"l":4.7,"px":[104,200]},"draufsicht/pkw-3":{"l":4.6,"px":[117,200]},"draufsicht/pkw-4":{"l":4.0,"px":[115,195]},"draufsicht/polizei":{"l":4.8,"px":[113,200]},"draufsicht/polizist":{"l":0.55,"px":[160,72]},"draufsicht/rad":{"l":1.8,"px":[78,140]},"draufsicht/rettung":{"l":6.8,"px":[107,240]},"draufsicht/traktor":{"l":4.6,"px":[149,220]},"draufsicht/van":{"l":5.4,"px":[113,220]},"fahrlehrer/cockpit-haltegriff":{"px":[476,457]},"fahrlehrer/ende-daumen":{"px":[480,447]},"fahrlehrer/ende-klemmbrett":{"px":[463,458]},"fahrlehrer/ende-zeigt":{"px":[489,382]},"fahrlehrer/erschrickt":{"px":[260,260]},"fahrlehrer/freut":{"px":[260,260]},"fahrlehrer/neutral":{"px":[260,260]},"fahrlehrer/nickt":{"px":[260,260]},"fahrlehrer/seufzt":{"px":[260,260]},"fahrlehrer/skeptisch":{"px":[260,260]},"fahrlehrer/szene-daumen":{"px":[480,447]},"fahrlehrer/szene-haltegriff":{"px":[476,457]},"fahrlehrer/szene-klemmbrett":{"px":[463,458]},"fahrlehrer/szene-zeigt":{"px":[489,382]},"fahrzeuge/begleit":{"b":2.0,"lichter":[[0.086,0.652],[0.909,0.634]],"px":[390,420],"schild":[0.3503,0.6029,0.2993,0.0617]},"fahrzeuge/bus":{"b":2.6,"lichter":[[0.073,0.556],[0.924,0.562]],"px":[420,378],"schild":[0.3971,0.7511,0.2077,0.0566]},"fahrzeuge/eiswagen":{"b":2.2,"lichter":[[0.083,0.645],[0.913,0.641]],"px":[332,420],"schild":[0.221,0.7553,0.2291,0.0426]},"fahrzeuge/kombi":{"b":2.0,"lichter":[[0.093,0.449],[0.912,0.431]],"px":[420,345],"schild":[0.3592,0.4578,0.2878,0.0844]},"fahrzeuge/kombi-2":{"b":2.0,"lichter":[[0.09,0.454],[0.912,0.451]],"px":[420,346],"schild":[0.3567,0.4229,0.291,0.0851]},"fahrzeuge/kombi-3":{"b":2.0,"lichter":[[0.073,0.547],[0.915,0.517]],"px":[420,353],"schild":[0.3467,0.4656,0.3044,0.0794]},"fahrzeuge/lkw":{"b":2.6,"lichter":[[0.142,0.773],[0.857,0.773]],"px":[420,412],"schild":[0.3932,0.7569,0.2136,0.0532]},"fahrzeuge/motorrad":{"b":0.85,"lichter":[[0.297,0.548],[0.697,0.542]],"px":[250,413],"schild":[0.376,0.5666,0.22,0.0775]},"fahrzeuge/muell":{"b":2.6,"lichter":[[0.143,0.451],[0.86,0.458]],"px":[420,404],"schild":[0.407,0.1045,0.1991,0.05]},"fahrzeuge/paket":{"b":2.25,"lichter":[[0.118,0.566],[0.88,0.569]],"px":[404,420],"schild":[0.238,0.7182,0.1995,0.0508]},"fahrzeuge/pkw":{"b":1.9,"lichter":[[0.103,0.448],[0.893,0.447]],"px":[420,373],"schild":[0.349,0.67,0.302,0.0831]},"fahrzeuge/pkw-2":{"b":1.9,"lichter":[[0.108,0.569],[0.88,0.538]],"px":[420,370],"schild":[0.3518,0.6709,0.2987,0.0829]},"fahrzeuge/pkw-3":{"b":1.9,"lichter":[[0.102,0.451],[0.897,0.447]],"px":[420,373],"schild":[0.3504,0.6734,0.3013,0.0829]},"fahrzeuge/pkw-4":{"b":2.05,"lichter":[[0.101,0.367],[0.903,0.365]],"px":[420,361],"schild":[0.3562,0.4888,0.2918,0.0848]},"fahrzeuge/pkw-5":{"b":1.9,"lichter":[[0.097,0.474],[0.902,0.466]],"px":[418,383],"schild":[0.3517,0.6762,0.299,0.0731]},"fahrzeuge/polizei":{"b":2.0,"lichter":[[0.105,0.501],[0.892,0.494]],"px":[399,322],"schild":[0.3634,0.4814,0.2757,0.0683]},"fahrzeuge/raeum":{"b":2.6,"lichter":[[0.126,0.482],[0.876,0.479]],"px":[378,420],"schild":[0.1319,0.6854,0.1806,0.05]},"fahrzeuge/rettung":{"b":2.3,"lichter":[[0.155,0.476],[0.838,0.555]],"px":[390,420],"schild":[0.2176,0.7763,0.2176,0.0452]},"fahrzeuge/schulbus":{"b":2.6,"lichter":[[0.134,0.519],[0.837,0.5]],"px":[420,383],"schild":[0.3946,0.7528,0.2087,0.0567]},"fahrzeuge/traktor":{"b":2.5,"lichter":[[0.18,0.465],[0.82,0.465]],"px":[332,420],"schild":[0.42,0.585,0.16,0.045],"schildMalen":true},"fahrzeuge/traktor-2":{"b":2.5,"lichter":[[0.115,0.463],[0.884,0.459]],"px":[376,420],"schild":[0.4247,0.4245,0.1528,0.0503]},"fahrzeuge/van":{"b":2.2,"lichter":[[0.112,0.464],[0.885,0.462]],"px":[404,359],"schild":[0.2351,0.6602,0.2054,0.0613]},"fahrzeuge/van-2":{"b":2.2,"lichter":[[0.083,0.474],[0.916,0.477]],"px":[420,389],"schild":[0.1979,0.6315,0.2542,0.0607]},"fahrzeuge/wohnmobil":{"b":2.4,"lichter":[[0.14,0.767],[0.861,0.768]],"px":[420,395],"schild":[0.416,0.766,0.183,0.041]},"fassade/stadt-1":{"farbe":"#c0a072","h":14.81,"px":[1400,905]},"fassade/stadt-1-nacht":{"h":14.81,"nacht":true,"px":[1400,905]},"fassade/stadt-2":{"farbe":"#997e72","h":13.54,"px":[1400,933]},"fassade/stadt-2-nacht":{"h":13.54,"nacht":true,"px":[1400,933]},"fassade/stadt-3":{"farbe":"#b78d7a","h":13.94,"px":[1400,944]},"fassade/stadt-3-nacht":{"h":13.94,"nacht":true,"px":[1400,944]},"fassade/stadt-4":{"farbe":"#ae7b63","h":13.81,"px":[1400,917]},"fassade/stadt-4-nacht":{"h":13.81,"nacht":true,"px":[1400,917]},"fassade/stadt-cafe":{"farbe":"#b17159","h":13.51,"px":[1400,873]},"fassade/stadt-cafe-nacht":{"h":13.51,"nacht":true,"px":[1400,873]},"fassade/stadt-haltestelle":{"farbe":"#af8674","h":13.92,"px":[1400,864]},"fassade/stadt-haltestelle-nacht":{"h":13.92,"nacht":true,"px":[1400,864]},"fassade/stadt-kirche":{"farbe":"#c7ab90","h":25.21,"px":[1400,922]},"fassade/stadt-kirche-nacht":{"h":25.21,"nacht":true,"px":[1400,922]},"fassade/stadt-rathaus":{"farbe":"#b0865b","h":14.56,"px":[1400,923]},"fassade/stadt-rathaus-nacht":{"h":14.56,"nacht":true,"px":[1400,923]},"fassade/wohngebiet-bauernhaus":{"farbe":"#795842","h":11.58,"px":[1400,893]},"fassade/wohngebiet-bauernhaus-nacht":{"h":11.58,"nacht":true,"px":[1400,893]},"fassade/wohngebiet-doppelhaus":{"farbe":"#b07c64","h":10.8,"px":[1400,846]},"fassade/wohngebiet-doppelhaus-nacht":{"h":10.8,"nacht":true,"px":[1400,846]},"fassade/wohngebiet-efh":{"farbe":"#b7a589","h":12.54,"px":[1400,925]},"fassade/wohngebiet-efh-nacht":{"h":12.54,"nacht":true,"px":[1400,925]},"fassade/wohngebiet-kindergarten":{"farbe":"#cfa386","h":9.48,"px":[1400,655]},"fassade/wohngebiet-kindergarten-nacht":{"h":9.48,"nacht":true,"px":[1400,655]},"fassade/wohngebiet-reihenhaus":{"farbe":"#ba856e","h":11.68,"px":[1400,848]},"fassade/wohngebiet-reihenhaus-nacht":{"h":11.68,"nacht":true,"px":[1400,848]},"fassade/wohngebiet-schule":{"farbe":"#bea999","h":12.81,"px":[1400,890]},"fassade/wohngebiet-schule-nacht":{"h":12.81,"nacht":true,"px":[1400,890]},"fassade/wohngebiet-spielplatz":{"farbe":"#a5825c","h":8.75,"px":[1400,651]},"fassade/wohngebiet-spielplatz-nacht":{"h":8.75,"nacht":true,"px":[1400,651]},"fassade/wohngebiet-turnhalle":{"farbe":"#937669","h":10.5,"px":[1400,888]},"fassade/wohngebiet-turnhalle-nacht":{"h":10.5,"nacht":true,"px":[1400,888]},"gegenverkehr/begleit":{"b":2.0,"lichter":[[0.234,0.59],[0.73,0.603]],"px":[420,409],"schild":[0.3733,0.758,0.2533,0.0571]},"gegenverkehr/bus":{"b":2.6,"lichter":[[0.146,0.698],[0.846,0.723]],"px":[420,396],"schild":[0.3945,0.8233,0.2152,0.0515]},"gegenverkehr/eiswagen":{"b":2.2,"lichter":[[0.116,0.507],[0.88,0.505]],"px":[404,420],"schild":[0.395,0.8242,0.21,0.0527]},"gegenverkehr/kombi":{"b":2.05,"lichter":[[0.142,0.472],[0.845,0.47]],"px":[420,355],"schild":[0.3512,0.6381,0.2975,0.0831]},"gegenverkehr/kombi-2":{"b":2.0,"lichter":[[0.124,0.528],[0.867,0.527]],"px":[420,310],"schild":[0.346,0.6694,0.3,0.0921]},"gegenverkehr/lkw":{"b":2.6,"lichter":[[0.132,0.463],[0.861,0.491]],"px":[409,420],"schild":[0.382,0.8075,0.2361,0.0502]},"gegenverkehr/maehdrescher":{"b":4.2,"lichter":[[0.36,0.3],[0.64,0.3]],"px":[420,375]},"gegenverkehr/motorrad":{"b":0.9,"lichter":[[0.48,0.52],[0.52,0.52]],"px":[417,420]},"gegenverkehr/pkw":{"b":1.9,"lichter":[[0.157,0.565],[0.83,0.558]],"px":[420,357],"schild":[0.3453,0.6931,0.3011,0.0817]},"gegenverkehr/pkw-2":{"b":1.9,"lichter":[[0.165,0.57],[0.833,0.564]],"px":[420,357],"schild":[0.3438,0.6921,0.3082,0.0837]},"gegenverkehr/pkw-3":{"b":1.9,"lichter":[[0.127,0.542],[0.868,0.539]],"px":[420,328],"schild":[0.3488,0.6822,0.2944,0.0853]},"gegenverkehr/pkw-4":{"b":1.9,"lichter":[[0.153,0.553],[0.836,0.56]],"px":[420,355],"schild":[0.3482,0.6985,0.3057,0.0829]},"gegenverkehr/polizei":{"b":2.0,"lichter":[[0.103,0.599],[0.888,0.599]],"px":[420,344],"schild":[0.3584,0.7027,0.281,0.0676]},"gegenverkehr/rettung":{"b":2.3,"lichter":[[0.135,0.556],[0.855,0.561]],"px":[420,408],"schild":[0.3658,0.7751,0.2576,0.0579]},"gegenverkehr/schulbus":{"b":2.6,"lichter":[[0.157,0.703],[0.838,0.701]],"px":[420,392],"schild":[0.386,0.7714,0.232,0.0549]},"gegenverkehr/traktor":{"b":2.5,"lichter":[[0.413,0.779],[0.585,0.79]],"px":[390,420],"schild":[0.4276,0.8166,0.1448,0.049]},"gegenverkehr/van":{"b":2.2,"lichter":[[0.131,0.541],[0.869,0.519]],"px":[410,420],"schild":[0.3797,0.8039,0.2406,0.0517]},"gegenverkehr/wohnmobil":{"b":2.4,"lichter":[[0.171,0.549],[0.819,0.559]],"px":[420,401],"schild":[0.3943,0.7935,0.2094,0.0495]},"hausseite/stadt-1":{"farbe":"#f0b262","px":[760,751]},"hausseite/stadt-1-nacht":{"nacht":true,"px":[760,751]},"hausseite/stadt-2":{"farbe":"#e2765b","px":[760,760]},"hausseite/stadt-2-nacht":{"nacht":true,"px":[760,760]},"hausseite/stadt-3":{"farbe":"#ee9d7f","px":[760,747]},"hausseite/stadt-3-nacht":{"nacht":true,"px":[760,747]},"hausseite/stadt-4":{"farbe":"#c7513d","px":[760,835]},"hausseite/stadt-4-nacht":{"nacht":true,"px":[760,835]},"hausseite/stadt-cafe":{"farbe":"#eacfac","px":[760,859]},"hausseite/stadt-cafe-nacht":{"nacht":true,"px":[760,859]},"hausseite/stadt-haltestelle":{"farbe":"#e2a183","px":[760,902]},"hausseite/stadt-haltestelle-nacht":{"nacht":true,"px":[760,902]},"hausseite/stadt-kirche":{"farbe":"#bc977d","px":[560,384]},"hausseite/stadt-kirche-nacht":{"nacht":true,"px":[560,384]},"hausseite/stadt-rathaus":{"farbe":"#d9ad6b","px":[760,772]},"hausseite/stadt-rathaus-nacht":{"nacht":true,"px":[760,772]},"hausseite/wohngebiet-bauernhaus":{"farbe":"#9e735b","px":[760,452]},"hausseite/wohngebiet-bauernhaus-nacht":{"nacht":true,"px":[760,452]},"hausseite/wohngebiet-doppelhaus":{"farbe":"#dc8668","px":[760,775]},"hausseite/wohngebiet-doppelhaus-nacht":{"nacht":true,"px":[760,775]},"hausseite/wohngebiet-efh":{"farbe":"#c69a78","px":[760,527]},"hausseite/wohngebiet-efh-nacht":{"nacht":true,"px":[760,527]},"hausseite/wohngebiet-garage":{"farbe":"#d2ada7","h":3.98,"px":[760,364]},"hausseite/wohngebiet-garage-nacht":{"h":3.98,"nacht":true,"px":[760,364]},"hausseite/wohngebiet-kindergarten":{"farbe":"#c7a682","px":[760,308]},"hausseite/wohngebiet-kindergarten-nacht":{"nacht":true,"px":[760,308]},"hausseite/wohngebiet-reihenhaus":{"farbe":"#eccd98","px":[760,859]},"hausseite/wohngebiet-reihenhaus-nacht":{"nacht":true,"px":[760,859]},"hausseite/wohngebiet-schule":{"farbe":"#d4c3b2","px":[760,523]},"hausseite/wohngebiet-schule-nacht":{"nacht":true,"px":[760,523]},"hausseite/wohngebiet-turnhalle":{"farbe":"#a18268","px":[760,339]},"hausseite/wohngebiet-turnhalle-nacht":{"nacht":true,"px":[760,339]},"himmel/abend":{"px":[1528,151]},"himmel/klar":{"px":[1528,153]},"himmel/nacht":{"px":[1528,156]},"himmel/nebel":{"px":[1528,115]},"himmel/regen":{"px":[1528,171]},"himmel/wolkig":{"px":[1528,156]},"kulisse/horizont-land":{"px":[1100,112]},"kulisse/horizont-stadt":{"px":[1536,138]},"kulisse/horizont-wohngebiet":{"px":[1536,143]},"menschen/arbeiter":{"h":1.82,"px":[158,400]},"menschen/brieftraegerin":{"h":1.7,"px":[400,335]},"menschen/frau":{"h":1.7,"px":[400,356]},"menschen/frau-kinderwagen":{"h":1.7,"px":[389,400]},"menschen/frau-tasche":{"h":1.7,"px":[253,400]},"menschen/fussgaenger":{"h":1.8,"px":[209,400]},"menschen/fussgaenger-2":{"h":1.82,"px":[250,400]},"menschen/gehstock":{"h":1.76,"px":[158,400]},"menschen/jogger":{"h":1.8,"px":[268,400]},"menschen/junge":{"h":1.42,"px":[224,349]},"menschen/kind":{"h":1.25,"px":[238,335]},"menschen/kind-rad":{"h":1.35,"px":[373,368]},"menschen/kind-ranzen":{"h":1.3,"px":[232,383]},"menschen/kind-ranzen-2":{"h":1.32,"px":[381,389]},"menschen/lotsin":{"h":1.85,"px":[248,400]},"menschen/polizist":{"h":1.85,"px":[400,388]},"menschen/polizist-winkt":{"h":1.85,"px":[141,400]},"menschen/radler":{"h":1.85,"px":[159,400]},"menschen/radler-2":{"h":1.85,"px":[158,400]},"menschen/radler-3":{"h":1.8,"px":[151,400]},"menschen/radler-4":{"h":1.85,"px":[163,400]},"menschen/radler-vorne":{"h":1.85,"px":[184,400]},"menschen/radler-vorne-2":{"h":1.85,"px":[157,400]},"menschen/reiterin":{"h":2.45,"px":[420,350]},"menschen/rollator":{"h":1.62,"px":[333,400]},"menschen/rollstuhl":{"h":1.3,"px":[335,399]},"menschen/schirm":{"h":2.05,"px":[290,400]},"menschen/scooter":{"h":1.95,"px":[141,400]},"menschen/spaziergaengerin":{"h":1.66,"px":[180,400]},"rand/autobahn-bruecke":{"h":9.0,"px":[1100,148]},"rand/autobahn-laermschutz":{"h":4.5,"px":[1100,110]},"rand/autobahn-parkplatz":{"h":8.0,"px":[1100,116]},"rand/autobahn-rast":{"h":9.0,"px":[1100,107]},"rand/autobahn-tunnel":{"h":5.6,"oeffnung":[0.2643,0.1345,0.7357,1.0],"px":[1506,249]},"rand/autobahn-wald":{"h":18.0,"px":[1100,133]},"rand/autobahn-zaun":{"h":2.6,"px":[1100,91]},"rand/land-getreide":{"h":9.0,"px":[1100,167]},"rand/land-gewerbe":{"h":9.0,"px":[1100,149]},"rand/land-hof":{"h":11.0,"px":[1100,153]},"rand/land-hopfen":{"h":7.0,"px":[1100,153]},"rand/land-kapelle":{"h":13.0,"px":[1100,235]},"rand/land-mais":{"h":2.8,"px":[1100,121]},"rand/land-wald":{"h":22.0,"px":[1100,198]},"seitlich/pkw":{"b":3.9,"px":[334,174]},"seitlich/pkw-2":{"b":4.75,"px":[456,187]},"seitlich/pkw-3":{"b":5.0,"px":[448,269]},"seitlich/traktor":{"b":4.3,"px":[440,319]},"seitlich/van":{"b":5.4,"px":[454,225]},"seitlich/van-2":{"b":6.6,"px":[520,235]},"textur/dach-biber":{"px":[236,320]},"textur/dach-blech":{"px":[236,320]},"textur/dach-schiefer":{"px":[236,320]},"textur/dach-ziegel":{"px":[236,320]},"textur/putz-grau":{"px":[239,320]},"textur/putz-hell":{"px":[238,320]},"textur/putz-ocker":{"px":[239,320]},"textur/putz-rosa":{"px":[239,320]},"tiere/hund":{"h":0.68,"px":[260,165]},"tiere/reh":{"h":1.25,"px":[320,238]},"tiere/reh-2":{"h":1.3,"px":[289,300]},"tiere/wildschwein":{"h":0.9,"px":[300,183]},"tunnel/ausblick-nacht":{"px":[730,251],"vp":[0.493,0.637]},"tunnel/ausblick-tag":{"px":[728,251],"vp":[0.498,0.635]},"tunnel/decke":{"l":62.0,"px":[223,1100]},"tunnel/wand":{"h":4.85,"l":26.0,"px":[1100,205]},"tunnel/wand-nische":{"h":4.85,"l":26.0,"px":[1100,205]}};
  // Anschlüsse ohne eigenes Bild, die ein ähnliches Motiv nutzen (Rest bleibt Code-Platzhalter)
  const ALIAS = {
    'gegenverkehr/paket': 'gegenverkehr/van', 'gegenverkehr/raeum': 'gegenverkehr/lkw', 'gegenverkehr/muell': 'gegenverkehr/lkw', 'menschen/dunkel': 'menschen/fussgaenger-2',
    'menschen/gruppe': 'menschen/fussgaenger', 'menschen/familie': 'menschen/fussgaenger-2', 'menschen/panne': 'menschen/arbeiter',
    'menschen/rennradler': 'menschen/radler-2', 'menschen/polizist-seite': 'menschen/polizist-winkt',
    // Phase 4 (Bogen „Menschen 2“): Mann mit Schirm, Spaziergängerin mit Stöcken, Junge (Hund kommt aus tiere/hund), Reiterin
    'menschen/mann-schirm': 'menschen/schirm', 'menschen/spaziergaengerinnen': 'menschen/spaziergaengerin', 'menschen/junge-hund': 'menschen/junge',
    'tiere/reiterin': 'menschen/reiterin',
  };
  // Flächen in #00FF00 (Polo des Fahrlehrers, Dachschild des Fahrschulautos) werden nach dem Laden in die Kundenfarbe umgefärbt
  const UMFAERBEN = /^(fahrlehrer\/|draufsicht\/du$)/;

  // KLEIN (schreibt bilder-liste.py): Bilder mit kleiner Fassung bilder/klein/<schlüssel>.webp (ein Viertel der Breite, bilder-klein.py)
  const KLEIN = ["fassade/stadt-1", "fassade/stadt-1-nacht", "fassade/stadt-2", "fassade/stadt-2-nacht", "fassade/stadt-3", "fassade/stadt-3-nacht", "fassade/stadt-4", "fassade/stadt-4-nacht", "fassade/stadt-cafe", "fassade/stadt-cafe-nacht", "fassade/stadt-haltestelle", "fassade/stadt-haltestelle-nacht", "fassade/stadt-kirche", "fassade/stadt-kirche-nacht", "fassade/stadt-rathaus", "fassade/stadt-rathaus-nacht", "fassade/wohngebiet-bauernhaus", "fassade/wohngebiet-bauernhaus-nacht", "fassade/wohngebiet-doppelhaus", "fassade/wohngebiet-doppelhaus-nacht", "fassade/wohngebiet-efh", "fassade/wohngebiet-efh-nacht", "fassade/wohngebiet-kindergarten", "fassade/wohngebiet-kindergarten-nacht", "fassade/wohngebiet-reihenhaus", "fassade/wohngebiet-reihenhaus-nacht", "fassade/wohngebiet-schule", "fassade/wohngebiet-schule-nacht", "fassade/wohngebiet-spielplatz", "fassade/wohngebiet-spielplatz-nacht", "fassade/wohngebiet-turnhalle", "fassade/wohngebiet-turnhalle-nacht", "hausseite/stadt-1", "hausseite/stadt-1-nacht", "hausseite/stadt-2", "hausseite/stadt-2-nacht", "hausseite/stadt-3", "hausseite/stadt-3-nacht", "hausseite/stadt-4", "hausseite/stadt-4-nacht", "hausseite/stadt-cafe", "hausseite/stadt-cafe-nacht", "hausseite/stadt-haltestelle", "hausseite/stadt-haltestelle-nacht", "hausseite/stadt-kirche", "hausseite/stadt-kirche-nacht", "hausseite/stadt-rathaus", "hausseite/stadt-rathaus-nacht", "hausseite/wohngebiet-bauernhaus", "hausseite/wohngebiet-bauernhaus-nacht", "hausseite/wohngebiet-doppelhaus", "hausseite/wohngebiet-doppelhaus-nacht", "hausseite/wohngebiet-efh", "hausseite/wohngebiet-efh-nacht", "hausseite/wohngebiet-garage", "hausseite/wohngebiet-garage-nacht", "hausseite/wohngebiet-kindergarten", "hausseite/wohngebiet-kindergarten-nacht", "hausseite/wohngebiet-reihenhaus", "hausseite/wohngebiet-reihenhaus-nacht", "hausseite/wohngebiet-schule", "hausseite/wohngebiet-schule-nacht", "hausseite/wohngebiet-turnhalle", "hausseite/wohngebiet-turnhalle-nacht", "rand/autobahn-bruecke", "rand/autobahn-laermschutz", "rand/autobahn-parkplatz", "rand/autobahn-rast", "rand/autobahn-tunnel", "rand/autobahn-wald", "rand/autobahn-zaun", "rand/land-getreide", "rand/land-gewerbe", "rand/land-hof", "rand/land-hopfen", "rand/land-kapelle", "rand/land-mais", "rand/land-wald"];
  const kleinDa = new Set(KLEIN);

  const slots = {};
  ANSCHLUESSE.forEach(a => { slots[a.gruppe + '/' + a.name] = Object.assign({ anker: [0.5, 1] }, a); });
  const da = new Set(VORHANDEN);
  const geladen = {}, farbig = {}, adressen = {}, bereit = {}, frei = {};

  // Ladeplan (Phase-5-Korrektur, Ladegröße): vorab nur, was jede Fahrt sofort braucht (Cockpit, Fahrlehrer-Mienen, Himmel). Alles andere
  // kommt erst bei Bedarf. Vorladen (29.10.2026, MZ: „Häuser bleiben 1400 px, Start und Hänger anders lösen“):
  // – zwei Schlangen: „dringend“ (aktuelle Situation, gerade gezeichnet; bis zu 4 parallel) und „hinten“ (nächste Situationen, schon im
  //   Startbild die ersten zwei bis drei; nacheinander, niedrige Priorität, nur wenn nichts Dringendes lädt);
  // – große Bilder (KLEIN) kommen erst als kleine Fassung (wenige KB), die große folgt; bis sie geladen, entpackt und vorbereitet ist
  //   (szene.js: Nacht-/Regen-/Fern-Fassungen in ruhigen Momenten, BL_BILDER.vorbereiter), zeichnet das Spiel die kleine – lieber kurz
  //   klein als ein Hänger. Der Tausch fällt kaum auf, die Häuser sind dann meist noch weit weg.
  // Startbild B (30.10.2026): szene-klemmbrett = Fahrlehrer auf dem Beifahrersitz im Startbild – sofort und als Erstes laden
  const BASIS = /^(cockpit\/|fahrlehrer\/(neutral|freut|erschrickt|nickt|skeptisch|seufzt|cockpit-haltegriff|szene-klemmbrett)$|himmel\/)/;
  const ERSATZ = /^fahrlehrer\/(szene-(?!klemmbrett$)|ende-zeigt$)/;   // Ersatzfassungen (es gibt ende-*/cockpit-*), nie vorab
  const RANG = k => k === 'fahrlehrer/szene-klemmbrett' ? -1 : /^(cockpit\/|fahrlehrer\/(neutral|freut|erschrickt)$)/.test(k) ? 0 : 1;
  let dringend = VORHANDEN.filter(k => BASIS.test(k)).sort((a, b) => RANG(a) - RANG(b)), hinten = [];
  const angefordert = new Set(dringend);
  let laufend = 0, gestartet = false;
  const PARALLEL = 4;
  // Entpacken (Vorladen 29.10.2026): Bilder als ImageBitmap aus der geladenen Datei – der Browser entpackt sie dabei abseits des
  // Hauptablaufs. Ein <img> wurde trotz decode() beim ersten drawImage im Hauptablauf entpackt (gemessen 15–50 ms je Hausbild).
  // Umzufärbende Bilder (Fahrlehrer, Fahrschulauto) und Browser ohne createImageBitmap: wie bisher über <img>.
  const MIT_BITMAP = typeof createImageBitmap === 'function' && typeof fetch === 'function';
  function laden(k, leise) {
    if (MIT_BITMAP && !UMFAERBEN.test(k)) {
      laufend++;
      geladen[k] = { laedt: true };
      const fehl = () => { geladen[k] = { fehlt: true }; laufend--; fertig(k, geladen[k]); weiter(); };
      fetch('bilder/' + k + '.webp', leise ? { priority: 'low' } : undefined)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(b => createImageBitmap(b))
        .then(bm => {
          // wie ein <img>: szene.js/schirme.js lesen naturalWidth/naturalHeight
          try { Object.defineProperty(bm, 'naturalWidth', { value: bm.width }); Object.defineProperty(bm, 'naturalHeight', { value: bm.height }); } catch (e) { /* alt */ }
          geladen[k] = bm; bereit[k] = true; laufend--; fertig(k, bm); weiter(); }, fehl);
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    if (leise) try { img.fetchPriority = 'low'; } catch (e) { /* alt */ }
    laufend++;
    // erst nach decode() als bereit melden (29.10.2026): große Hausbilder sonst beim ersten Zeichnen im Hauptthread dekodiert (Ruckler)
    const ok = () => { bereit[k] = true; laufend--; fertig(k, img); weiter(); };
    img.onload = () => { if (img.decode) img.decode().then(ok, ok); else ok(); };
    img.onerror = () => { laufend--; fertig(k, img); weiter(); };
    img.src = 'bilder/' + k + '.webp';
    geladen[k] = img;
  }
  function weiter() {
    if (!gestartet) return;
    while (laufend < PARALLEL && dringend.length) { const k = dringend.shift(); if (!geladen[k]) laden(k, false); }
    // Vorladen nacheinander, nur wenn nichts Dringendes läuft (Netz nicht verstopfen)
    while (laufend === 0 && hinten.length && navigator.onLine !== false) { const k = hinten.shift(); if (!geladen[k]) laden(k, true); }
  }
  function fertig(k, img) {
    if (!(img.naturalWidth || img.width)) { frei[k] = true; return; }
    const melden = () => { frei[k] = true; try { dispatchEvent(new CustomEvent('bl-bild', { detail: k })); } catch (e) { /* alt */ } };
    if (UMFAERBEN.test(k) && window.Rahmen && Rahmen.umfaerben) {
      // Adresse für schirme.js (Fahrlehrer, Draufsicht): toBlob packt abseits des Hauptablaufs (Vorladen 29.10.2026: toDataURL kostete
      // je Bild bis ca. 100 ms, 4× gedrosselt mehr – mitten in der Fahrt, wenn die Endbild-Figuren nachluden). Freigabe danach.
      try {
        const c = Rahmen.umfaerben(img);
        if (c.toBlob && window.URL && URL.createObjectURL) {
          c.toBlob(b => { farbig[k] = c; if (b) adressen[k] = URL.createObjectURL(b); else try { adressen[k] = c.toDataURL('image/webp', 0.9); } catch (e) { /* ohne */ } melden(); }, 'image/webp', 0.9);
          return;
        }
        farbig[k] = c; adressen[k] = c.toDataURL('image/webp', 0.9);
      } catch (e) { /* ohne Umfärben */ }
    }
    // Testhilfe #klein (Fotos „erst klein, dann groß“): große Fassungen zurückhalten bis BL_BILDER.freigeben()
    if (HALTEN && !HALTEN_AUS && kleinDa.has(k)) { gehalten.push([k, img]); return; }
    // große Fassung eines Bildes mit kleiner Fassung: erst vorbereiten lassen (szene.js), dann freigeben
    if (kleinDa.has(k) && BL_BILDER.vorbereiter) { try { BL_BILDER.vorbereiter(k, img, melden); return; } catch (e) { /* dann sofort */ } }
    melden();
  }
  const HALTEN = /(^|[#&])klein($|&)/.test(location.hash), gehalten = [];
  function freigeben() { const l = gehalten.splice(0); HALTEN_AUS = true; l.forEach(([k, img]) => fertig(k, img)); return l.length; }
  let HALTEN_AUS = false;
  function starten() { if (gestartet) return; gestartet = true; weiter(); }
  if (document.readyState === 'complete') setTimeout(starten, 30); else addEventListener('load', () => setTimeout(starten, 30));
  // Schlüssel für ein Muster: zuerst die kleinen Fassungen, dann die großen (nur vorhandene, noch nicht geladene)
  function auswahl(muster) {
    const vor = VORHANDEN.filter(k => muster.test(k) && !ERSATZ.test(k));
    return vor.filter(k => kleinDa.has(k) && !geladen['klein/' + k]).map(k => 'klein/' + k).concat(vor.filter(k => !geladen[k]));
  }
  // Bilder nach Muster (RegExp) vorn anstellen (aktuelle Situation)
  function vorrang(muster) {
    const vor = auswahl(muster);
    if (vor.length) { vor.forEach(k => angefordert.add(k)); dringend = vor.concat(dringend.filter(k => !vor.includes(k))); }
    starten(); weiter();
  }
  // Bilder nach Muster im Hintergrund vorladen (nächste Situationen; Startbild) – hinten anstellen, Dringendes bleibt vorn
  function vorladen(muster) {
    const vor = auswahl(muster).filter(k => !hinten.includes(k) && !dringend.includes(k));
    hinten = hinten.concat(vor);
    weiter();   // startet erst nach dem Laden der Seite (starten) – sonst bremst das Vorladen den Aufbau des Startbilds
  }
  // ein einzelnes Bild, das gezeichnet werden soll, aber noch fehlt: sofort vorn anstellen (einmal je Schlüssel; kleine Fassung zuerst)
  function anfordern(k) {
    if (geladen[k] || angefordert.has(k) || !da.has(k) || ERSATZ.test(k)) return;
    angefordert.add(k);
    const l = kleinDa.has(k) && !geladen['klein/' + k] ? ['klein/' + k, k] : [k];
    dringend = l.concat(dringend.filter(x => !l.includes(x)));
    weiter();
  }

  // nutzbar = geladen, entpackt und freigegeben (große Fassung vorbereitet); voll = geladen und entpackt (für die Vorbereitung)
  const gueltig = b => !!b && !!(b.getContext || (b instanceof HTMLImageElement ? b.complete && b.naturalWidth : b.width > 0));   // Leinwand, <img> fertig oder ImageBitmap
  const nutzbar = k => { const b = farbig[k] || geladen[k]; return gueltig(b) && frei[k] && (b.getContext || bereit[k]) ? b : null; };
  const voll = k => { const b = geladen[k]; return bereit[k] && gueltig(b) ? b : null; };
  const klein = k => (kleinDa.has(k) ? nutzbar('klein/' + k) : null);
  const schonDa = k => nutzbar(k) || klein(k);
  const fertigBild = k => { const b = nutzbar(k); if (b) return b; anfordern(k); return klein(k); };
  const echt = k => (da.has(k) ? k : ALIAS[k] && da.has(ALIAS[k]) ? ALIAS[k] : null);
  // Varianten eines Motivs: name, name-2, name-3 … (nur vorhandene Dateien)
  const vCache = {};
  function varianten(k) {
    if (vCache[k]) return vCache[k];
    const l = [], e = echt(k);
    if (e) l.push(e);
    if (e === k) for (let i = 2; da.has(k + '-' + i); i++) l.push(k + '-' + i);
    return (vCache[k] = l);
  }
  // Bild für ein Objekt: feste Variante je Objekt (wahl), sonst die erste, die schon geladen ist
  function waehle(k, wahl) {
    const l = varianten(k);
    if (!l.length) return null;
    let key = l[(wahl || 0) % l.length], img = fertigBild(key);
    if (!img) { key = l.find(x => schonDa(x)); if (!key) return null; img = schonDa(key); }   // nur die gewählte Variante anfordern
    return { key, img, mass: MASSE[key] || null, slot: slots[k] || slots[key] || null };
  }

  window.BL_BILDER = {
    // Platzhalter aus den Musterfirmen-Bildern (Material/Skripte/platzhalter-bauen.py)
    land: 'bilder/platzhalter/land.webp',            // Hintergrund Endbild; Startbild B: Landstraße in der Windschutzscheibe
    ANSCHLUESSE, VORHANDEN, MASSE, KLEIN, geladen, vorrang, vorladen, waehle, varianten,
    // für szene.js (Vorbereiten) und Messungen: große Fassung geladen+entpackt, freigegeben, irgendeine Fassung da; Ladeschlangen
    voll, istBereit: k => !!nutzbar(k), vorhanden: k => !!schonDa(k), hatKlein: k => kleinDa.has(k),
    laedt: () => ({ laufend, dringend: dringend.length, hinten: hinten.length }),
    freigeben,           // Testhilfe #klein
    vorbereiter: null,   // szene.js: (schlüssel, bild, fertig) – Fassungen der großen Bilder vorbereiten, dann fertig() aufrufen
    slot: k => slots[k] || null,
    mass: k => MASSE[k] || null,
    bild: k => { const e = echt(k); return e ? fertigBild(e) : null; },
    // alle vorhandenen Schlüssel mit diesem Anfang (z. B. 'fassade/stadt-'), ohne Nachtfassungen
    liste: anfang => VORHANDEN.filter(k => k.startsWith(anfang) && !/-nacht$/.test(k)),
    // für schirme.js (Fahrlehrer, Draufsicht): Adresse des Bildes (umgefärbt als data-Adresse) oder null
    url: k => { const e = echt(k); if (!e || !fertigBild(e)) return null; return UMFAERBEN.test(e) ? adressen[e] || null : 'bilder/' + e + '.webp'; },
  };
})();
