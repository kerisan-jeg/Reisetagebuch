# Projektdokumentation - Reisetagebuch

## Inhaltsverzeichnis

1. [Einordnung & Zielsetzung](#1-einordnung--zielsetzung)
2. [Zielgruppe & Stakeholder](#2-zielgruppe--stakeholder)
3. [Anforderungen & Umfang](#3-anforderungen--umfang)
4. [Vorgehen & Artefakte](#4-vorgehen--artefakte)
    - [Understand & Define](#41-understand--define)
    - [Sketch](#42-sketch)
    - [Decide](#43-decide)
    - [Prototype](#44-prototype)
    - [Validate](#45-validate)
5. [Erweiterungen [Optional]](#5-erweiterungen-optional)
6. [Projektorganisation [Optional]](#6-projektorganisation-optional)
7. [KI-Deklaration](#7-ki-deklaration)
8. [Anhang [Optional]](#8-anhang-optional)

> **Hinweis:** Massgeblich sind die im **Unterricht** und auf **Moodle** kommunizierten Anforderungen.

<!-- WICHTIG: DIE KAPITELSTRUKTUR DARF NICHT VERÄNDERT WERDEN! -->

<!-- Diese Vorlage ist für eine README.md im Repository gedacht. Abschnitte mit [Optional] können weggelassen werden, wenn in den Übungen nichts anderes verlangt wird. -->

## 1. Einordnung & Zielsetzung
**Kontext & Problem:** Reiseerlebnisse liegen verstreut in Notizen, Fotos und Chats; ein zentraler, reflektierbarer Überblick fehlt. Das Reisetagebuch bündelt Erinnerungen und erleichtert späteres Reflektieren.  
**Ziel:** Webbasierter Prototyp, mit dem Nutzer:innen Reisen anlegen, Erlebnisse festhalten und reflektieren – Fokus auf Erinnerungen statt Buchung/Planung.  
**Erfolgskennzahlen:** Erfassung einer Reise inklusive drei Einträgen in unter 5 Minuten; mindestens 80 % der Testenden finden ihre letzten drei Einträge ohne Hilfe; mindestens 70 % bewerten die Übersichtlichkeit als „gut“ oder besser.  
**Abgrenzung:** Keine Reisebuchungen, Empfehlungen oder KI-Auswertungen; schlanker, validierbarer MVP. Technik-Stack/Tooling in Abschnitt 4/7.

## 2. Zielgruppe & Stakeholder
**Primäre Zielgruppe:**  
Reisende (Einzelpersonen, Paare, Familien, Studierende/Backpacker:innen), die 1 bis 3 Freizeit-Reisen pro Jahr machen und nach der Reise Erlebnisse strukturiert und ohne komplexe Tools festhalten wollen – mit Text, Fotos/Medien, Ortsbezug und Bucket-List-Ideen.  

**Weitere Stakeholder:**  
Dozierende/Projektbetreuung (Bewertung von Konzept, Umsetzung, Doku), Testnutzende (Feedback zu Verständlichkeit/UX/Mehrwert), Technik/Hosting (stellt MVP-Datenhaltung/Schnittstellen bereit; kein Live-Sync, keine Verfügbarkeits-Garantien).  

**Annahmen (zu validieren):**  
- 70 % bevorzugen Dokumentation nach der Reise (reflektiert, zusammenhängend).  
- Freitext plus optionale Medien/Orte/Tags werden Pflichtformularen vorgezogen (mindestens 70 % Zustimmung).  
- Ruhiges, klar strukturiertes UI unterstützt Erinnerungsarbeit besser als überladene Oberflächen (mindestens 70 % bewerten Übersichtlichkeit positiv).  
- Kombination aus vergangenen Reisen und Bucket-List steigert langfristigen Nutzen (Nutzende erfassen mindestens ein zukünftiges Ziel).  
- Niedrige Einstiegshürde (Einloggen/Start in unter 30 Sekunden) erhöht Akzeptanz in Tests.

## 3. Anforderungen & Umfang

**User Stories**  
- Als reisende Person möchte ich mir ein Benutzerkonto anlegen und es über eine Verifikations-E-Mail bestätigen, damit meine Reisedaten sicher gespeichert und mir eindeutig zugeordnet werden können.  
- Als reisende Person möchte ich eine neue Reise mit Titel, Zeitraum und Reiseziel anlegen, damit ich meine Erlebnisse strukturiert dokumentieren kann.  
- Als reisende Person möchte ich nach der Reise Tagebucheinträge mit Text, Datum und Ort erfassen, damit ich meine Erinnerungen festhalten kann.  
- Als reisende Person möchte ich Fotos und Medien zu einzelnen Einträgen hinzufügen, damit meine Erlebnisse visuell ergänzt werden.  
- Als reisende Person möchte ich meine Reisen und Einträge später übersichtlich durchblättern und durchsuchen können, um Erinnerungen zu reflektieren oder erneut aufzurufen.  

**INVEST-Qualität**  
- Unabhängig: Account, Reise anlegen, Eintrag erfassen, Medien hinzufügen, Übersicht sind getrennt umsetzbar.  
- Verhandelbar: Details wie Verifikationsart, Pflichtfelder oder Medienformate sind anpassbar ohne Kernziel zu ändern.  
- Wertvoll: Jede Story stiftet Mehrwert (Datensicherheit, Struktur, Erinnerung, Reflexion).  
- Abschätzbar: Jede Story entspricht einem klar abgegrenzten Feature.  
- Testbar: Erfolgskriterien sind konkret (Account aktiviert, Reise sichtbar, Eintrag gespeichert, Medien angezeigt).  

**Kernfunktionalität (Mindestumfang)**  
- Konto erstellen und verifizieren: Registrierungsformular -> Verifikations-E-Mail -> freigeschalteter Account.  
- Reise anlegen: Dashboard/Reiseliste -> Formular -> Reise-Detailansicht.  
- Tagebucheintrag erstellen: Reise-Detail -> Eingabemaske -> Eintrag gespeichert.  
- Medien hinzufügen: Eintrag bearbeiten -> Medienauswahl -> Anzeige im Eintrag.  
- Reisen und Einträge anzeigen/durchsuchen: Listen- und Detailansichten mit einfacher Suche/Filter zur Reflexion und Archivierung.  
- Mindestumfang entspricht den in den Übungen bis Semesterwoche 8 erarbeiteten Funktionalitäten.  

**Akzeptanzkriterien**  
- Nutzende können ein Benutzerkonto anlegen und dieses über eine Verifikations-E-Mail erfolgreich aktivieren.  
- Nach erfolgreicher Verifikation können Nutzende eine Reise mit Titel, Zeitraum und Ziel ohne Fehlermeldung anlegen.  
- Tagebucheinträge mit Text und Datum lassen sich erstellen und werden korrekt einer Reise zugeordnet.  
- Hochgeladene Bilder oder Medien werden einem Eintrag zugewiesen und korrekt angezeigt.  
- Reisen und Einträge bleiben nach einem Reload erhalten und können erneut geladen werden.  
- Listen/Detailansichten erlauben das Durchsuchen/Filtern der Einträge; Ergebnisse werden korrekt angezeigt.  
- Die Anwendung ist auf gängigen Bildschirmgrößen nutzbar, ohne Layout- oder Funktionsbrüche.  

**Erweiterungen [Optional]**  
- Bucket-List für zukünftige Reisen.  
- Kartenansicht mit bereisten Orten.  
- Stichworte/Tags zur besseren Organisation.  
- Such- und Filterfunktionen.  
- Export einzelner Reisen (z. B. als PDF).  

**Zukünftige Arbeiten [Optional]**  
- Zeitstrahl-Darstellung von Reisen und Einträgen.  
- Erweiterte Medienverwaltung (Video, Audio).  
- Synchronisation über mehrere Geräte.  
- Erweiterte Benutzerverwaltung (Passwort-Reset, Profil).  
- Mehrsprachigkeit und barrierearme Komponenten.  

## 4. Vorgehen & Artefakte
Die Umsetzung erfolgte phasenbasiert entlang eines nutzerzentrierten Design- und Prototyping-Prozesses.

### 4.1 Understand & Define
- **Ausgangslage & Ziele:** Reiseerinnerungen sind über Geräte/Apps verteilt (Galerie, Notizen, Social Media). Ziel ist ein privates, digitales Reisetagebuch, das Reisen zentral erfasst, Erinnerungen strukturiert festhält und Bucket-List-Ideen sammelt. Keine soziale Plattform, sondern persönliches Archiv.  
- **Zielgruppenverständnis:** Reisende jeder Altersgruppe; Nutzung primär nach der Reise (Reflexion/Archivierung) und vor der Reise (Bucket List/Inspiration). Basis: eigene Erfahrung, informelle Gespräche mit Reisenden, Feedback aus Kleinklasse.  
- **Wesentliche Erkenntnisse:**  
  - Zentraler Überblick wichtiger als tiefe Einzelfeatures.  
  - Einfache, visuelle Erfassung mit wenig Setup.  
  - Klare Struktur und reduzierte Navigation für Verständlichkeit.  
  - Privatnutzung ohne Social-Sharing als Mehrwert.  
  - Kartenansicht unterstützt räumliche Erinnerung.  

### 4.2 Sketch
- **Ansatz:** Quantität vor Qualität (Low-Fidelity), mehrere Struktur- und Navigationskonzepte. Skizzen auf Papier und einfache Figma-Layouts.  
- **Varianten & Unterschiede:**  
  - Struktur: Timeline vs. Listen-/Detailansicht.  
  - Navigation: Zentrale Startseite vs. verteilte Einstiege.  
  - Fokus: Visuelle Galerie vs. textbasierte Einträge.  
- **Learnings:** Einige Varianten zu komplex oder zu wenig skalierbar; klare Navigation und Hub-Struktur bevorzugt.  
- **Begründung gewählte Variante:** Hub & Detail wurde gewählt, weil die Start-Übersicht klar bleibt, Detailseiten tief gehen können und Erweiterungen (Karte/Bucket) skalierbar bleiben.

### 4.3 Decide
- **Gewählte Variante & Begründung:** Zentrales Dashboard (Reisetagebuch) als Einstieg, dedizierte Unterseiten für Reisen, Karten, Profil. Gründe: Verständlichkeit, einfache Bedienung, realistische Umsetzbarkeit im Prototyp.  
- **End-to-End-Ablauf:** App starten → Login/Registrierung → E-Mail-Verifikation → Übersicht aller Reisen → Reise anlegen → Einträge/Medien erfassen → Anzeigen/Reflektieren → Bucket List pflegen.  
- **Referenz-Mockup:** Klickbarer High-Fidelity-Mockup in Figma; zentrale Screens (Hero, Reisen-Übersicht, Kartenansicht, Profil) als visuelle Referenz.  
- **App Flow (Mermaid):**  
```mermaid
flowchart LR
  start([App Start]) --> reg{Registriert?}
  reg -- Ja --> login[Login]
  reg -- Nein --> register[Registrierung]
  login --> dash[Reisetagebuch Dashboard]
  register --> dash
  dash --> reisen[Reisen-Übersicht]
  dash --> karte[Kartenansicht]
  dash --> profil[Profil]
  dash --> bucket[Bucket List]
  reisen --> neuReise[Reise anlegen]
  neuReise --> detail[Reise-Detail]
  detail --> eintrag[Tagebucheintrag/Medien]
  detail --> anzeigen[Anzeigen/Reflektieren]
  karte --> pins[Pins setzen/anzeigen]
  bucket --> ziel[Ziel hinzufügen]
```

### 4.4 Prototype
- **Kernfunktionalität:** Registrierung + E-Mail-Verifikation, Reisen-Übersicht, Reisen anlegen/anzeigen, Tagebucheinträge mit Text/Medien, Bucket List, Kartenansicht mit Pins, Profil mit Statistiken/Account-Verwaltung.  
- **Deployment:** Öffentliche URL: https://reisetagebuch1234.netlify.app  

#### 4.4.1 Entwurf (Design)
> Hinweis: Beschreibt den funktionalen Prototyp, nicht das Mockup.  
- **Informationsarchitektur:** Persistente Top-Navigation; nach Login führt das Reisetagebuch als Zentrale zu Reisen, Karten, Profil, Logout. Flache Struktur zur Reduktion kognitiver Last.  
- **Oberflächenentwürfe (Schlüssel-Screens):** Hero-Screen, Reisen-Übersicht, Kartenansicht mit Pins, Profil mit Statistiken und Account-Einstellungen. Visuell zurückhaltend, Inhalte der Nutzenden stehen im Fokus.  
- **Designentscheidungen:** Modern, neutral, persönlich; ruhige Farbpalette, klare Typografie und Abstände für Lesbarkeit; konsistente Komponenten für Eingaben, Karten-Pins und Cards.  
- **Screenshots (Mockups/Prototyp):**  
  - Reise anlegen (Formular, Prototyp): ![Reise anlegen](doku/Screenshot%202025-12-17%20105922.png)  
  - Profilseite (Prototyp): ![Profil](doku/Screenshot%202025-12-17%20105944.png)  
  - Dashboard/Hero (Prototyp): ![Dashboard/Hero](doku/Screenshot%202025-12-17%20110000.png)  
  - Reisen-Übersicht (Prototyp): ![Reisen-Übersicht](doku/Screenshot%202025-12-17%20110031.png)  
  - Kartenansicht (Pins setzen, Prototyp): ![Karte Pins](doku/Screenshot%202025-12-17%20110045.png)  
  - Kartenansicht mit Listen (Prototyp): ![Karte mit Listen](doku/Screenshot%202025-12-17%20110058.png)  
  - Login/Welcome (Prototyp): ![Login](doku/Screenshot%202025-12-17%20110109.png)  
  - Landing/Hero (Mockup): ![Landing](doku/Screenshot%202025-12-17%20110127.png)  
  - Reise-Detail (Prototyp): ![Reise-Detail](doku/Screenshot%202025-12-17%20110140.png)  
  - Skizze Kleinklasse (Low-Fi): ![Skizze Kleinklasse](doku/Screenshot%202025-12-17%20111125.png)  

#### 4.4.2 Umsetzung (Technik)
- **Technologie-Stack:** SvelteKit; produktiv Supabase (Auth, DB, Storage, Realtime); MongoDB-Sync aktiv, wenn `MONGODB_URI` gesetzt ist (Fallback Supabase-only).  
- **Tooling:** Figma für Design; moderne IDE; KI-Unterstützung in Kapitel KI-Deklaration dokumentiert.  
- **Struktur & Komponenten:** Seiten/Routen für Reisetagebuch, Reisen, Karten, Profil; wiederverwendbare Komponenten (Navigation, Karten-Elemente, Formulare).  
- **Daten & Schnittstellen:** Benutzende, Reisen, Tagebucheinträge, Medien, Bucket-List-Einträge; E-Mail-Verifikation technisch vorgesehen, im Prototyp eingeschränkt funktionsfähig.  
- **Besondere Entscheidungen:** Verzicht auf Social-Sharing zur Komplexitätsreduktion; Fokus auf private Nutzung.  
- Supabase für Auth/Storage/Realtime, MongoDB optional hinterlegt für spätere Migration.  
- E-Mail-Verifikation im Prototyp teils fehlerhaft; Fix im Auth-Flow eingeplant.  
- Persistenz-Fluss: Supabase-Queries -> Svelte-Stores -> Seiten/Komponenten (reaktives Laden).  

### 4.5 Validate
- **URL der getesteten Version:** https://reisetagebuch1234.netlify.app  
- **Demo-Video:** _(Link einfügen, falls gefordert)_  
- **Ziele der Prüfung:** Verständlichkeit von Navigation, Kontoerstellung, Reiseverwaltung; Auffindbarkeit zentraler Funktionen.  
- **Vorgehen:** Unmoderierte Remote-Usability-Tests.  
- **Stichprobe:** Vier bis fünf testende Personen mit Reiseerfahrung.  
- **Aufgaben/Szenarien:** Login; neue Reise erfassen; bestehende Reise wiederfinden; Reise löschen.  
- **Kennzahlen & Beobachtungen:** 4/5 konnten Reisen anlegen (ca. 3:30 min); 3/5 fanden Reisen ohne Hilfe; E-Mail-Verifikation schlug in 2/5 fehl (Link-Fehler); Lösch-Funktion wurde von 2/5 nicht gefunden.  
- **Task-Completion (Testskript-Auszug):**  
  | Task | Erfolgsquote | Ø Zeit | Auffälligkeiten |  
  | --- | --- | --- | --- |  
  | Login | 5/5 | 0:30 | – |  
  | Reise anlegen | 4/5 | 3:30 | Verifikationslink teils fehlerhaft |  
  | Reise finden | 3/5 | 0:40 | – |  
  | Reise löschen | 3/5 | 0:50 | Button schlecht auffindbar |  
- **Zusammenfassung:** Prototyp wird als sinnvoll und verständlich wahrgenommen; kleinere technische und strukturelle Schwächen sichtbar.  
- **Abgeleitete Verbesserungen:** Verifikationsprozess robuster gestalten; Lösch-Funktion klarer platzieren.  
- **Umgesetzte Anpassungen:** Lösch-Funktion wurde nach Evaluation ergänzt.  
- **Offene Issues (Auszug):**  
  | ID  | Problem                          | Prio   | Fix-Idee                              | Status |  
  | --- | -------------------------------- | ------ | -------------------------------------- | ------ |  
  | I-01| Verifikationslink fehlerhaft     | Hoch   | Auth-Link prüfen/Resend fixen          | Todo   |  
  | I-02| Lösch-Funktion schwer auffindbar | Mittel | Button/Label prominenter platzieren    | Todo   |  

## 5. Erweiterungen [Optional]
Dokumentiert Erweiterungen über den Mindestumfang hinaus.
- **Erweiterte Kartenansicht (umgesetzt, Leaflet/Clustering):**  
  - Nutzen: Gesamtüberblick aller Reisen mit klarer geografischer Zuordnung; visuelle Orientierung vergangener Reisen.  
  - Umsetzung: Interaktive Karte mit Pins/Clustern und Tooltips; zeigt alle Reisen (nicht nur Einzel-Pins).  
  - Abgrenzung: Über den Mindestumfang „Kartenansicht“ hinaus, da Gesamtübersicht + Clustering.  
- **Erweiterte Slideshow auf der Startseite (umgesetzt, Carousel):**  
  - Nutzen: Emotionaler Einstieg, höhere Nutzerbindung, schneller visueller Zugang zu Erinnerungen/geplanten Reisen.  
  - Umsetzung: Slideshow/Carousel auf der Landing/Home mit Reisebildern, CTAs in Reichweite.  
  - Abgrenzung: Ergänzt die Basis-Startseite um ein visuelles Feature; nicht erforderlich für Kern-Workflows.  
- **Login mit Verifikationslink (passwortlos, Beta via Supabase Auth):**  
  - Nutzen: Niedrige Einstiegshürde, höhere Benutzerfreundlichkeit, zusätzliche Sicherheit.  
  - Umsetzung: Versand von Verifikations-/Magic-Links per E-Mail; passwortloser Flow neben klassischer Registrierung.  
  - Abgrenzung: Zusatz-Login-Flow über das Minimum „Account anlegen/aktivieren“ hinaus.  
- **Foto-Upload-Funktion (umgesetzt, Supabase Storage):**  
  - Nutzen: Visuelle Anreicherung der Reiseeinträge, umfassendere Dokumentation.  
  - Umsetzung: Upload- und Verknüpfungs-Flow für Bilder zu Einträgen (Storage + URL-Mapping), Anzeige in Detailansichten.  
  - Abgrenzung: Erweiterung über das Minimum „Text/Medien verlinken“, da echter Upload/Storage statt statischer URLs.  

## 6. Projektorganisation [Optional]
- **Repository:** Zentrales Git-Repository mit main-Branch und Feature-Branches nach Bedarf; sprechende Commit-Messages (feat, fix, docs) zur Nachvollziehbarkeit. Link: _(einfügen: GitHub-URL)_.  
- **Ordnerstruktur:** Framework-Standard (SvelteKit); klare Trennung von Seiten/Routen, Komponenten, statischen Assets und Konfiguration.  
- **Issues / Planung:** Ideen/Aufgaben informell und iterativ; Priorisierung entlang des Prototyping-Prozesses, laufend angepasst. Kein formales Issue-Tool, Fokus auf schnelle Umsetzung.  
- **Testing:** Primär manuelle Smoke-Tests der Kernfunktionen; keine automatisierten Tests (bewusst aus dem Scope gelassen).  

## 7. KI-Deklaration

### Eingesetzte KI-Werkzeuge
- ChatGPT (Web/App, GPT-4.x) – Textunterstützung, Codevorschläge, Debugging, konzeptionelle Unterstützung.  
- GitHub Copilot (VS Code Extension) – Code-Completion, Debug-Hinweise.  
- Codex – Unterstützung bei komplexeren Code-Strukturen und Logikvorschlägen.  

### Zweck & Umfang
- Regelmäßiger, unterstützender Einsatz über den Projektverlauf.  
- Aufbau/Verständnis komplexerer Code-Strukturen; Debugging-Hinweise; Codevorschläge (manuell angepasst); Formulierung/Strukturierung der Dokumentation; Ideen/Inspirationsquelle in frühen Phasen.  
- KI als Hilfsmittel, kein Ersatz für eigene Entscheidungen/Implementierungen; keine ungeprüften Features übernommen.  

### Art der Beiträge
- Codevorschläge/Logikansätze (überarbeitet und integriert).  
- Debug-Unterstützung (v. a. Copilot).  
- Textentwürfe/Formulierungshilfen für Doku.  
- Inspiration bei konzeptionellen Fragen.  
- Alle Inhalte wurden geprüft und projektspezifisch angepasst.  

### Eigene Leistung (Abgrenzung)
- Idee/Konzeption vollständig eigenständig.  
- UX/UI-Design und Figma-Mockups eigenständig.  
- Funktionale Entscheidungen selbst getroffen; KI-Vorschläge bewusst angepasst/verworfenen/weiterentwickelt.  
- Implementierung, Überarbeitung und Qualitätssicherung eigenständig; finale Verantwortung lag beim Projektautor.  

### Reflexion
- Nutzen: Effizienz bei Routineaufgaben, Debugging, komplexeren technischen Fragen; bessere Dokumentationsstruktur.  
- Grenzen/Risiken: Vorschläge nicht immer korrekt oder projektspezifisch; kritische Prüfung zwingend erforderlich.  
- Qualitätssicherung: Manuelles Testen, iterative Überarbeitung, bewusste Entscheidungen; KI ergänzte, ersetzte aber nicht den kreativen/konzeptionellen Kern.  

### Prompt-Vorgehen [Optional]
- Zielgerichtete Prompts (neutral/technisch/akademisch); Ergebnisse iterativ nachgeschärft bis passend.  

### Quellen & Rechte [Optional]
- Sorgfalt bei Urheberrecht/Quellen: Keine ungekennzeichneten Fremd-Assets übernommen; KI-Outputs manuell verifiziert.  


---

<!-- Prüfliste (nicht abgeben, nur intern nutzen) -->
<!--
[ ] Kernfunktionalität gemäss Übungen umgesetzt (Workflows durchgängig)
[ ] Akzeptanzkriterien formuliert und erfüllt
[ ] Skizzen erstellt (mehrere Varianten, Unterschiede dokumentiert)
[ ] Referenz-Mockup in Decide verlinkt (URL/Screenshots)
[ ] Deployment erreichbar
[ ] Umsetzung (Technik) vollständig (Technologie-Stack; Tooling & KI-Einsatz inkl. Überlegungen; Struktur/Komponenten; Daten/Schnittstellen falls genutzt)
[ ] Evaluation durchgeführt; Ergebnisse dokumentiert; Verbesserungen abgeleitet
[ ] Dokumentation vollständig, klar strukturiert und konsistent
[ ] KI-Deklaration ausgefüllt (Werkzeuge; Zweck & Umfang; Art der Beiträge; Abgrenzung; Quellen & Rechte; optional: Prompt-Vorgehen, Reflexion)
[ ] Erweiterungen (falls vorhanden) begründet und abgegrenzt
[ ] Anhang gepflegt (Testskript/Materialien, Rohdaten/Auswertung) [optional]
-->
