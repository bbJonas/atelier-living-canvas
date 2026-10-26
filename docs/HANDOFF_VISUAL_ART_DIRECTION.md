# Atelier Living Canvas — Projektübergabe / Visual-Art-Forschung

**Stand:** 26. Oktober 2026  
**Repository:** https://github.com/bbJonas/atelier-living-canvas  
**Eigenständiges Experiment; perspektivisch Bestandteil von Atelier**  
**Primärer Auftrag für den nächsten Agenten:** KÜNSTLERISCHE NEUENTWICKLUNG DER VISUALISIERUNGEN

> **Einstieg in einem Satz:** Die technische v0.1-Basis funktioniert und die Dark-Mode-Arbeitsoberfläche gefällt dem Auftraggeber sehr gut; die bisherigen generativen Kunststile überzeugen ihn noch nicht. Bewahre die funktionierenden Grundlagen und entwickle mehrere substanziell bessere visuelle Ansätze aus denselben Agenten-Ereignisdaten. Keine vorschnelle Festlegung auf den bisherigen Stil.

## 1. Vision und Kontext

Atelier ist als hochwertige Steuerungs- und Arbeitsumgebung für autonome KI-Arbeit gedacht, nicht als Sammlung von Chats. Living Canvas ist ein separates Forschungslabor für eine besondere Perspektive darauf: **Während KI-Agenten tatsächlich arbeiten, entsteht ein fortlaufend wachsendes, künstlerisch interessantes Bild, dessen Dynamik aus ihrem Arbeitsrhythmus, ihren Werkzeugaufrufen, ihren Dateiänderungen, ihren Subagenten und den beobachtbaren Übergaben entsteht.**

Es soll sich anfühlen, als beobachte man die Entstehung eines Werkes oder einer Komposition — nicht wie ein generisches Dashboard mit dekorativer Ladeanimation.

Zwei Aspekte sollen gemeinsam sichtbar werden:

1. **Zeit / Rhythmus:** Wann entsteht Aktivität, wann Ruhe? Welche wiederkehrenden Sequenzen, Überlagerungen, Unterbrechungen, Kooperationen und Arbeitsphasen lassen sich aus tatsächlichen Zeitstempeln, Eventtypen und beobachtbaren Dauern erkennen?
2. **Projekt / dauerhafte Entstehung:** Dateien, Verzeichnisse, wiederholte Änderungen und Agentenbeziehungen erzeugen über den Arbeitslauf eine sich entwickelnde, bleibende Komposition. Ein neues Modul erweitert das Werk; eine Überarbeitung kann einen bestehenden Bereich verändern.

**Wichtige Präzisierung:** Keine naiven Symbolzuordnungen wie „Tool Call = Hammer“, „Denken = Gehirn“. Ebenso wenig eine endlose generische Punktewolke, bei der unabhängig vom Arbeitsgeschehen nur der Zufall animiert wird. Gesucht sind echte, interessante *visuelle Sprachen*.

Das fertige Bild soll gleichzeitig schön, abwechslungsreich, unverwechselbar und in seiner Entwicklung nachvollziehbar sein. Der Nutzer soll 20–40 Minuten gerne zuschauen können und einen intuitiven Eindruck bekommen, ob das Projekt wächst, parallele Arbeit passiert, viele Aufrufe in kurzen Abständen laufen oder Ruhe herrscht. Es muss **nicht** jedes einzelne Event als Label sichtbar werden.

## 2. Nutzerfeedback und Prioritäten

Explizites Feedback nach erster Ansicht der v0.1:

- **Positiv:** Die Anwendung bzw. Übersicht ist sehr schick. Die bestehende Dark-Mode-Oberfläche gefällt ausdrücklich. Die eigenständige Experimentier-App ist der richtige Weg.
- **Noch unzureichend:** Die **Kunstrichtung** / der konkrete visuelle Ausdruck der aktuellen Visualisierungen gefällt noch nicht richtig.
- **Deshalb jetzt:** Mit einem spezialisierten Agenten die künstlerischen Richtungen viel gründlicher untersuchen und ausprobieren.
- **Langfristig:** Eine oder mehrere beste Darstellungen später in Atelier integrieren; zunächst **nicht** die Hauptsoftware umbauen.

**Vorrang:** Künstlerische Qualität und visuelles Verhalten verbessern, nicht ohne Not die Datenpipeline, Serverarchitektur oder die bereits gelungene UI neu gestalten.

## 3. Bereits umgesetzt — belastbarer Iststand

### 3.1 Laufzeit und Bedienung

- Eigenständige Node.js-Anwendung (Node 20+), keine externen Runtime-npm-Pakete.
- Lokaler Server, standardmäßig `http://127.0.0.1:4173`.
- Responsive Dark-Mode-Arbeitsoberfläche: `public/index.html`, `public/styles.css`.
- Reproduzierbarer synthetischer Demo-Arbeitslauf (`src/core/demo.mjs`).
- Replay mit Start/Stop, Seek/Scrubber, Geschwindigkeitswechsel.
- Separat gekennzeichneter **Demo**- und **Live**-Modus, Ereignis-/Agenten-/Datei-/Tool-Zähler, jüngste Aktivitäten und Dateiliste.
- Export von Canvas-PNG und bereinigter Telemetrie als JSON.
- Browser-Rendering über native Canvas 2D, kein WebGL-Framework.

### 3.2 Schicht A — Ereigniserfassung, Normalisierung und Transport

| Datei | Verantwortung |
| --- | --- |
| `src/core/events.mjs` | Versioniertes Telemetrie-v1-Schema, typisierte Ereignisse, Allowlist, Pfadsicherung, Normalisierung |
| `src/core/collector.mjs` | In-Memory-Ringjournal, vollständige Batchvalidierung, Ratenlimit, Beobachter |
| `src/core/instrumentation.mjs` | Harness-unabhängige programmatische Hooks für echte Tool-/Modellaufrufe, Agenten, Dateien, Tests und Handoffs; HTTP-Batching |
| `src/core/materializer.mjs` | Inkrementelle kompakte Datei-/Agentenprojektion über das Ereignisjournal hinaus |
| `src/server.mjs` | HTTP-Ingest, Snapshot, Server-Sent Events, lokale Weboberfläche |
| `scripts/send-events.mjs` | NDJSON-Einspeisung und optional einmalige Git-Dateiinventur |

Wichtige Endpunkte:

- `POST /api/events`: einzeln oder als Batch strukturierte Ereignisse einspeisen.
- `GET /api/stream`: SSE-Stream; initialer Snapshot einschließlich kompakter Zustandsprojektion, anschließend Ereignisse.
- `GET /api/snapshot`: Journal, Statistik und Projektionszustand.
- `GET /api/health`: Betriebs-/Pufferzähler.

Bisher existiert **noch keine belegte native Anbindung** an konkrete DSH-, OpenCode-, Pi-, Hermes- oder Atelier-Hooks. Die generische Schnittstelle ist vorbereitet. Demo-Ereignisse sind **synthetisch**.

### 3.3 Schicht B — Ableitung und Visualisierung

| Datei | Verantwortung |
| --- | --- |
| `src/core/scene.mjs` | Ereignisfolge zu Agenten, Dateien, Interaktionen und Zählern verdichten |
| `src/core/layout.mjs` | Deterministische Positionen für Ordner und Dateiknoten |
| `public/main.mjs` | UI-Controller, Replay, Live-Quelle, Rendering, Exporte |
| `public/visualizers/shared.mjs` | Gemeinsame Zeichnungsfunktionen, Wellen, Topologie, Farbpalette |
| `public/visualizers/hybrid.mjs` | Aktueller Modus „Living artwork“, Rhythmus plus Struktur |
| `public/visualizers/cosmos.mjs` | Dateikosmos / Konstellation |
| `public/visualizers/streams.mjs` | Agentenströme und beobachtete Handoffs |
| `public/visualizers/rhythm.mjs` | Aktivitätspartitur / Wellenbild |

Die vier Modi konsumieren dieselbe abgeleitete Szene, ohne die Erfassungsschicht zu verändern. Ein Renderer stellt `title`, `subtitle` und `draw(ctx, {width, height, scene, events, time})` bereit und wird im UI-Controller registriert.

**Der künstlerische Entwicklungsstand ist ausdrücklich PROVISORISCH.** Weder geometrische Punktnetze noch Wellen sind als verbindliche endgültige Ästhetik festgelegt.

### 3.4 Leistungs- und Datenschutzregeln

- Standard: maximal 3.000 einzelne Ereignisse im Journal; bis zu 300 angenommene Events/s; kompakte Zustandsprojektion für bis zu 2.500 Dateien und 96 Agenten.
- Render-Deckel nominell 30 FPS, Auflösungsbegrenzung auf ca. 1,6 Mio. Pixel; verminderte Bewegung wird berücksichtigt, unsichtbare Tabs rendern nicht.
- Keine zusätzlichen LLM-Aufrufe, nur um Kunst zu erzeugen. Keine aggressive Hintergrund-Dateiüberwachung.
- Pfade nur relativ; bei Bedarf `CANVAS_REDACT_PATHS=1`.
- Keine Rohprompts, Gedankengänge, Toolargumente, Toolergebnisse, Quelldateiinhalte oder Credentials in der Telemetrie. Unbekannte Eventfelder werden verworfen.
- Lokale Bindung an Loopback. Ferner Netzwerkbetrieb ohne Absicherung ist nicht vorgesehen.
- **Das Repository ist zum Übergabezeitpunkt öffentlich!** Keine privaten Arbeitsläufe, Geheimnisse oder proprietären Projektdateien committen.

## 4. Was noch nicht vorhanden oder nicht abgenommen ist

- Kein echter Atelier- oder Harness-Adapter im laufenden produktiven System.
- Keine Einsicht in „Gedanken“ oder verborgenes Reasoning. Sichtbar sind nur explizit beobachtete Modellphasen bzw. tatsächliche Tool- und Dateiereignisse. Lange Modellphasen ≠ nachweislich tiefes Denken.
- Noch keine unabhängige systematische Kunst-/Usability-Bewertung durch den Auftraggeber.
- Keine belegte Browser-Screenshot-Abnahme oder Messung auf der Zielhardware in diesem PR; vorhandene GitHub-CI-Tests sind kein Ersatz.
- Ein einzelner laufender Szenenstand ist keine vollständig ausgereifte Multi-Run-/Persistenzarchitektur. Die gebundene Historie erlaubt keinen unbeschränkten historischen Replay.
- Das aktuelle Dateilayout basiert überwiegend auf Pfadzugehörigkeit, nicht auf verifizierter semantischer Import-/Abhängigkeitsanalyse.
- Art-Modi sind mögliche Ausgangspunkte, nicht Designvorgaben; der Nutzer möchte die Kunststile weiterentwickeln.

## 5. Konkreter Auftrag für den NÄCHSTEN Agenten

### A. Erst analysieren, dann Kunst entwerfen

1. Repo auschecken, `README.md`, `docs/ARCHITECTURE.md`, `docs/SCHEMA.md` und diese Übergabe lesen.
2. `npm run check` und `npm start` ausführen; Dark-Mode-Oberfläche und alle vier aktuellen Stile im Browser bei Replay, Seek und verschiedenen Fenstergrößen tatsächlich ansehen.
3. Verstehen, welche Daten **wirklich** verfügbar sind, welchen zeitlichen Verlauf sie haben und welche visuellen Aussagen sie tragen können. Unbeobachtetes nicht „künstlerisch“ als echte Telemetrie ausgeben.
4. Die vorhandene Oberfläche als Referenz bewahren. Änderungen daran nur, wenn sie dem visuellen Experiment nachweisbar helfen.

### B. Mehrere wirklich unterschiedliche künstlerische Prototypen

Mindestens drei **substantiell verschiedene** neue generative Ansätze innerhalb derselben App untersuchen. Nicht bloß Farben, Glow, Partikelgröße und Geometrie austauschen.

Mögliche Forschungsrichtungen (Inspiration, **keine Pflicht oder Festlegung**):

- **Generative Malerei / kinetische Tinte:** feine pigmentartige Striche, dichte Flächen, fließende Linien und Kompositionsschichten. Reale Ereignisse beeinflussen Pinselgestik, Takt, Stärke, Schichtung und Langzeitstruktur.
- **Wachsende Skulptur / Architektur:** ein kohärentes abstraktes Objekt entsteht über die Zeit; wiederholte Dateiänderungen formen konkrete bestehende Teile um; Abzweigungen/Agenten prägen Form und Richtung.
- **Organische Systeme / Korallen, Myzel, Gewebe:** langsames Wachstum, Verdichtung und Kopplung von Teilstrukturen, deren Lage wiedererkennbar bleibt.
- **Zeitbasierte Kalligraphie / choreografische Partitur:** visuell reichhaltiger Rhythmus aus Ereignisfolgen, Intervallen und Überlagerungen, nicht nur Sinuswellen.
- **Abstraktes Licht-/Materialsystem:** anspruchsvolle, zurückhaltende Farb- und Materialbehandlung; nur dann WebGL/Shader verwenden, wenn der visuelle Gewinn den Aufwand und die Laufzeitkosten rechtfertigt.

Wichtig: Ein schöner Frame reicht nicht. **Entwicklung über Zeit** ist Teil des Kunstwerks. Frühe, mittlere, späte, ruhige und stark parallele Arbeitsphasen müssen jeweils interessante, aber plausibel datengetriebene Kompositionen liefern.

### C. Was künstlerisch erforscht werden soll

- Langzeitkomposition: Wie sieht der Canvas nach 2, 10 und 30 Minuten aus? Wächst echte Struktur oder wird das Bild nur voller?
- Zeit und Nachhall: Wie bleiben wichtige frühere Phasen als sichtbare Geschichte erhalten, während aktuelle Aktivität erkennbar bleibt?
- Zusammenhang von Ereignissen: Welche Metriken aus zeitlichem Abstand, Dauer, Bursts, Handoffs, Schreibserien und Dateiüberarbeitungen erzeugen charakteristische Gesten?
- Parallele Agenten: Wie wirken unterschiedliche Arbeitsströme zusammen, ohne wie starre Swimlanes auszusehen?
- Balance zwischen Form und Aussage: Betrachter können intuitiv erkennen, dass Ruhe, Recherche, Schreiben, Tests oder parallele Arbeit vorliegt — **ohne** platte Piktogramme.
- Stilbewusste Gestaltung: Farbpalette, Kontrast, negative Fläche, Hierarchie, Materialität, Kompositionsdichte, Übergänge, klare künstlerische Handschrift.
- Wiederholbarkeit: Identische Events + Seed → im Wesentlichen identisches Ergebnis; kein beliebiges Rauschen, das Arbeitsdynamik übertönt.
- Export: Ein abgeschlossener Run soll als eigenständiges visuelles Objekt (PNG, später evtl. hochauflösend oder Video) interessant sein.

### D. Forschungs-/Vergleichsmodus

Die App sollte mehrere Modi mit demselben fixierten Event-Trace vergleichbar machen. Idealerweise:

- Jeder Stil ist als eigenes Plugin/Renderer-Modul implementiert.
- Vorher/Nachher und Stil-zu-Stil bei **identischem Seed, identischen Ereignissen, identischem Zeitpunkt** prüfbar.
- Ein kleines Vergleichsset definierter Phasen (z. B. Anfang, Datei-Burst, Handoff, Testphase, Abschluss).
- Ansichten/Screenshots oder Kontaktblatt verschiedener Varianten/Phasen für künstlerisches Feedback liefern; ggf. kurze Videosequenzen.
- Die bisherigen Modi als Baseline beibehalten, bis Nachfolger überzeugend sind.

## 6. Technische Guardrails für die Kunstexperimente

1. **Zwei Schichten beibehalten:** Telemetrie-Erfassung/Normalisierung unabhängig von Datenprojektion/Visualisierung. Neue Stilmodule sollen keine eigenen Tool-Log-Parser, LLM-Aufrufe oder Netzwerkpoller enthalten.
2. **Visualisierung soll keine Agenten steuern:** Keine Feedback-Schleife von Ästhetik zu Harness-Policies. Späterer Harness²-/ALTK-Einsatz ist gesonderte Entscheidung.
3. **Gleicher Dateninput für alle Stile:** Styles lesen eine normalisierte Szene und Ereignisfenster; optionale Stilzustände sauber isolieren.
4. **Speicher- und CPU-Budgets:** bounded arrays/state, keine ungeprüften O(N²)-Schleifen, Schatten/Blur/Partikelfelder gezielt dosieren, möglichst nur bei Änderungen oder mit fixem FPS-Limit zeichnen.
5. **Replay-Semantik:** Zeitreisen dürfen nicht dauerhaft falsche Nachzustände zeigen. Falls ein Renderer interne Historie braucht, deterministisch rekonstruieren oder Checkpoints benutzen.
6. **Fallback und Accessibility:** Funktion auch bei reduzierter Bewegung; angemessener 2D-Fallback bei optionaler GPU-Technik; Kontext und Zustand auch textlich zugänglich.
7. **Keine Geheimnisse:** Nicht Rohtext des LLM oder Source-Code-Inhalte für visuelle Effekte einspeisen, sofern nicht separat und ausdrücklich neu autorisiert.
8. **Keine ungefragte Produktionseinbindung:** Nicht das private Hauptrepo `bbJonas/atelier` verändern, nicht auf Servern deployen. Living Canvas bleibt Forschungs-/Experimentier-App.

## 7. Erwartete Ergebnisse des nächsten Entwicklungsdurchgangs

Der nächste Agent sollte nicht nur ein Moodboard liefern, sondern **lauffähige Experimente**:

1. Eine kurze kritische Bestandsaufnahme der bisherigen vier Modi und eine begründete gestalterische Zielsetzung.
2. Mindestens drei visuell klar unterscheidbare, tatsächlich animierte Stilprototypen, die aus identischen Daten gespeist werden.
3. Einen Vergleich mit Screenshots/Phasenbeispielen und einem präzisen Mapping „beobachtbares Ereignis → künstlerische Wirkung“.
4. Messung oder begründete Prüfung von FPS, CPU-/Speicherbedarf, Restart/Seek/Reproduzierbarkeit und Verhalten bei langen Runs.
5. Automatisierte Tests für neu eingeführte Mapping-/Zustandslogik, plus nachweisbare manuelle Browserabnahme.
6. Eine subjektive, aber nachvollziehbare Stilbewertung (ästhetische Eigenständigkeit, lebendiger Verlauf, Nachvollziehbarkeit, technische Kosten) mit offener Empfehlung, **nicht** ungefragt den „Gewinner“ festzuschreiben.
7. Dokumentation der API-/Renderer-Verträge für spätere Atelier-Integration.
8. Entwicklung auf separatem Branch und PR mit nachvollziehbaren Screenshots; kein ungenehmigter Merge oder Deploy.

**Abnahmekriterium künstlerisch:** Die Alternativen müssen durch **verschiedene Gestaltungsprinzipien** auffallen, nicht wie dieselbe generative Netzwerk-Animation mit verschiedenen Farben. Reales Event-Timing und wiederholte Veränderungen derselben Projektteile müssen im zeitlichen Verhalten nachvollziehbar sein.

## 8. Schnellstart und Referenzen

```bash
git clone https://github.com/bbJonas/atelier-living-canvas.git
cd atelier-living-canvas
npm run check
npm start
# Browser: http://127.0.0.1:4173
```

Beispiel für einen echten Telemetrie-Eingang (keine erfundene Modell-Reasoning-Ausgabe):

```bash
curl -sS -X POST http://127.0.0.1:4173/api/events \
  -H 'Content-Type: application/json' \
  -d '{"kind":"file.changed","runId":"art-trial-01","agentId":"builder","filePath":"src/app.ts","operation":"modify","linesAdded":17}'
```

- `README.md`: Installation und Bedienung.
- `docs/ARCHITECTURE.md`: Designentscheidungen und Grenzen.
- `docs/SCHEMA.md`: Eventvertrag; bei Widerspruch zur Laufzeit hat `src/core/events.mjs` Vorrang.
- `public/visualizers/`: bisherige Stilimplementierungen.
- `src/core/demo.mjs`: synthetischer Replay-Datensatz.
- `test/`: automatische Sicherheits-/Logik-/HTTP-Tests.
- Ursprünglicher Implementierungs-PR: https://github.com/bbJonas/atelier-living-canvas/pull/1

## 9. Entscheidungsstatus

**Entschieden:** eigenständiges Labor, zwei unabhängige Schichten, sehr schlanke Datenerfassung, echte beobachtete Ereignisse, Dark-Mode-Grundlayout beibehalten, hochwertige künstlerische Experimente, spätere Integrationsfähigkeit in Atelier.

**Nicht entschieden:** endgültiger Kunststil, Farbsprache, Renderer-Technik (Canvas 2D/WebGL), Anzahl langfristiger Visualisierungsmodi, endgültiges UI zur Auswahl, vollständige Atelier-Anbindung.

**Konsequenz:** Prototypen gegeneinander antreten lassen und visuelle Qualität am tatsächlichen Lauf beurteilen, bevor eine Richtung verbindlich wird.

---

### Sofort kopierbarer Folgeauftrag für einen Coding-/Design-Agenten

> Arbeite im Repository `bbJonas/atelier-living-canvas`. Lies zuerst `docs/HANDOFF_VISUAL_ART_DIRECTION.md` sowie README, Architektur und Schema, und prüfe den existierenden Demo- und Live-Betrieb. Die bestehende Dark-Mode-Oberfläche gefällt, **aber die derzeitigen Kunststile sind noch nicht überzeugend**. Deine Hauptaufgabe ist künstlerische Exploration: Entwickle mindestens drei grundlegend unterschiedliche, hochwertige, datengetriebene Visualisierungssprachen als modular auswählbare, laufende Prototypen, die **dieselbe** Agenten-Telemetrie interpretieren. Bewahre die unabhängige schlanke Capture-Schicht, gute Replay-Semantik, Determinismus, Datenschutz und geringe Ressourcenlast. Keine symbolische Hammer-/Gehirn-Darstellung, kein beliebiges hübsches Rauschen, keine bloßen Farbvarianten. Zeige die Entwicklung bei unterschiedlichen Replay-Phasen mit vergleichbaren Screenshots, prüfe die Performance und dokumentiere die Mapping-Regeln. Arbeite in einem neuen Feature-Branch mit PR; merge oder deploye nichts ohne Freigabe. Das Experiment soll später in Atelier integrierbar sein, aber das Atelier-Hauptrepository bleibt unangetastet.
