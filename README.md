# iobroker.lordener-widgets

Eigene vis-2-Widgets für ioBroker (privates Projekt).

## Enthaltene Widgets

- **Heizung** – Thermostat-Widget (Soll-/Ist-Temperatur, +/- Buttons, Fensterstatus, Erreichbarkeit, Batterie, Modusumschaltung)
- **Alarm** – Alarmanlagensteuerung (Modi Voll/Innen/Aus, PIN-geschützt)
- **Rollo** – Rollladensteuerung (Positions-Grafik + konfigurierbare Positions-Buttons)
- **Fenster** – Fensterstatus-Anzeige (Zustand, Erreichbarkeit, Batterie)

## Installation

1. Repo als ZIP herunterladen oder klonen.
2. Adapter in ioBroker installieren (Admin → Instanzen → "+" → passendes Paket/Ordner wählen), analog zu einer manuell installierten Adapter-Version.
3. Widgets erscheinen in vis-2 unter der Kategorie "Lordener Widgets".

Nach jedem Update: im vis-2-Editor-Tab einmal hart neu laden (Strg+F5), da `customWidgets.js` sonst pro Browser-Tab gecacht bleibt.

## Quelle

Der React/TypeScript-Quellcode (Vite + Module Federation, Basis: `ioBroker/ioBroker.vis-2-widgets-react-template`) liegt unter `src-widgets-ts/`.

Build (auf einem Rechner mit npm-Registry-Zugriff):

```
cd src-widgets-ts
npm install
npm run build
```

Das Ergebnis landet in `src-widgets-ts/build/` (`customWidgets.js` + `assets/*.js`) und muss anschließend in `widgets/lordener-widgets/` des Adapter-Pakets kopiert werden (überschreibt die vorhandene, fertig gebaute Version im Repo-Root).
