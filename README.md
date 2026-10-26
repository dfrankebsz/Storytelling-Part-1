# StoryLab – Storytelling-Lernkurs für Klasse 8

Ein statischer, responsiver Lernkurs mit Netlify Functions und Netlify Blobs. Keine Supabase-Instanz, kein SQL-Editor, keine externe KI und kein genereller `AUTH`-Schlüssel erforderlich.

## Installation über GitHub und Netlify

1. ZIP lokal entpacken. **Den Inhalt des entpackten Ordners** in ein neues GitHub-Repository hochladen (nicht nur die ZIP-Datei selbst). Das Repository darf öffentlich sein; niemals Geheimnisse dort einfügen.
2. Bei Netlify: **Add new project > Import an existing project > GitHub** auswählen, Zugriff auf dein Repository erteilen.
3. Netlify liest `netlify.toml`. Build-Befehl: `npm run build`; Publish-Verzeichnis: `dist`; Functions: `netlify/functions`.
4. Im Netlify-Projekt unter **Project configuration > Environment variables** die Variable `TEACHER_CODE` anlegen. Wert: **ein geheimer, zufälliger, mindestens 12 Zeichen langer Code** (besser deutlich länger). Scope muss **Functions** enthalten. Nicht `netlify.toml` dafür verwenden!
5. Nach dem Hinzufügen/Ändern der Variable **neuen Deploy auslösen**. Bei Erfolg Website öffnen, unten **Lehrkraft** anklicken und mit dem Code anmelden. Es wird kein offenes Lehrer-Konto registriert; der Netlify-Code ist das Zugangsgeheimnis.
6. Als Test ein Schülerkonto anlegen, eine Szene schreiben, abmelden, im anderen Browser anmelden und auf den gespeicherten Text prüfen. Zusätzlich PDF-Ausgabe auf Smartphone testen.

**Wichtig:** Ein manuelles Hochladen der ZIP in Netlify statt des GitHub-Builds führt nicht zum gewünschten Functions-Deployment. Repository-Integration nutzen.

## Funktionsumfang

- Einzelarbeit; sechs Kursstationen mit Definitionen, Schaubild, Beispielen und interaktiven Eingaben.
- Zufalls-Storygenerator, Konflikt-Baukasten, Drei-Akt-Modell, sechs Schreibszenen.
- Selbstüberprüfung: Schüler öffnen Beispiele selbst und markieren, ob ihre Antworten geprüft wurden. Keine automatische fachliche Bewertung.
- Browser-Gastmodus mit lokalem Stand (`localStorage`).
- Schülerregistrierung über Nickname und Passwort, Anmeldung auf anderen Geräten, Cloud-Speicherung in Netlify Blobs.
- Lehrkräftebereich: Fortschrittsübersicht, Texte lesen, Passwörter zurücksetzen, Konten entfernen, alle gespeicherten Fortschritte löschen.
- PDF über den **systemeigenen Druckdialog** ("Drucken / als PDF sichern"); kein eigener binärer PDF-Dienst.

## Datenschutz und technische Grenzen

- Konten und Schülertexte liegen in den **Netlify-Blobs** des Projekts. Je nach Netlify-Region und Vertrag kann dies datenschutzrechtlich relevant sein. **Vor schulischem Einsatz Einwilligungs-/Datenschutzkonzept und Auftragsverarbeitung prüfen**, möglichst Pseudonyme verwenden. Keine echten Schülernamen verlangen.
- Schülerpasswörter werden als gesalzene `scrypt`-Hashes gespeichert. Authentifizierung durch serverseitig gespeicherte zufällige Sitzungs-Tokens, sieben Tage gültig. Tokens werden auf Clientgeräten in `localStorage` gespeichert: auf gemeinsam genutzten Geräten abmelden! Nur über HTTPS verwenden.
- Wiederhergestellte Schülerpasswörter werden der Lehrkraft **einmalig** angezeigt; sie muss sie sicher weitergeben. Ein zwangsweiser Passwortwechsel beim ersten Login ist derzeit nicht umgesetzt.
- Gast-Lernstände werden lokal gespeichert und bei Browserdatenlöschung gelöscht. Gastmodus synchronisiert nicht. Das lokale Gerät behält nach einer Anmeldung eine Kopie.
- Cloud-Synchronisierung folgt **letztem Speichern gewinnt**; gleichzeitige Bearbeitung desselben Kontos auf mehreren Geräten ist nicht konfliktfrei. Bei erneuter Anmeldung kann zwischen lokalem und Cloud-Stand gewählt werden. Nach einem Verbindungsfehler bleibt der lokale Stand erhalten; die automatische Wiederholung ist begrenzt.
- Netlify Blobs ist ein **Objektspeicher, keine transaktionale Datenbank**. Besonders für kleine Klassen/Kurse geeignet; für viele parallele Registrierungen, komplexe Rechte oder starke Missbrauchsabwehr wäre eine richtige Datenbank/Auth-Lösung sinnvoll. Rate-Limiting im Beispiel ist best effort und kein vollwertiger Schutz gegen verteilte Angriffe.
- **Lehrer-Code bei Verdacht auf Bekanntwerden ändern und neu deployen.** Die bestehenden Lehrer-Sitzungen werden nach einem Codewechsel ungültig.
- Das komplette Löschen betrifft servergespeicherte Fortschritte. Lokale Kopien auf Schülergeräten werden dabei **nicht** zentral entfernt und könnten erneut synchronisiert werden, wenn Schüler später speichern. Für rechtssichere Löschanforderungen zusätzliche organisatorische Maßnahmen planen.
- Die Funktionen werden durch die API aufgerufen; der Blob-Speicher wird nicht öffentlich bereitgestellt. Netlify Blobs-Rechte liegen in den serverseitigen Functions.
- Druckdialog-Optionen unterscheiden sich je nach Windows/macOS/iOS/Android und Browser. Ein PDF-Download ist vom Druck-/PDF-Support des Geräts abhängig.

## Lokales Testen

Node.js >=20, dann:

```bash
npm install
npx netlify dev
```

Für Lehrerlogin bei lokalem Test eine `.env` (nicht committen) mit `TEACHER_CODE=...` verwenden. Für Netlify Blobs kann Netlify CLI Projektzugriff benötigen. `npm run build` erstellt `dist/`.

## Dateien

- `public/index.html` – Startseite
- `public/style.css` – responsive Darstellung / Druckdesign
- `public/app.js` – komplette Lernlogik
- `netlify/functions/api.mjs` – Authentifizierung, Blob-Lese-/Schreiboperationen, Lehrer-API
- `netlify.toml` – Build und Redirect-Regeln
- `package.json` – Netlify Blobs-Abhängigkeit

## Quellen zu den eingesetzten Schnittstellen

- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- https://docs.netlify.com/build/functions/environment-variables/


## Version 1.1 – verständlicher und anschaulicher

- Kürzere Sätze und einfachere Erklärungen für Klasse 8
- Gelb umrandete und ausdrücklich markierte Beispiele (keine Musterlösungen im Eingabefeld)
- Blaue Arbeitsaufträge, grüne Begriffserklärungen und nummerierte Schreibszenen
- Funktionen für Anmeldung, Speicherung, Lehrerbereich und PDF bleiben erhalten


## Version 1.2: Vorlage für Gemini Storybook

Der PDF-Druck enthält jetzt die selbst geschriebene Geschichte mit **sechs nummerierten Szenenüberschriften**. Die Gem-Anleitung und der KI-Auftrag sind bewusst **nicht Teil des PDF**, sondern stehen nach dem Export im Kurs. Der Prompt kann dort kopiert werden.

**Altersgrenze:** Gemini Storybook ist laut aktueller offizieller Google-Hilfe nicht für unter 18-Jährige verfügbar. Der beschriebene Anschlussprozess ist daher als *von der Lehrkraft durchgeführte spätere Nutzung* erklärt; kein Schüler soll Altersregeln umgehen. Klären Sie vor dem Hochladen Datenschutz und Berechtigungen.

Google-Hilfe: https://support.google.com/gemini/answer/16434396?hl=de
