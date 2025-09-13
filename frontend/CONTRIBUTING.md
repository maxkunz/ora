# 🤝 CONTRIBUTING.md –  SPA Framework

Vielen Dank für dein Interesse, ein Modul zu diesem Projekt beizutragen!  
Dieser Leitfaden erklärt dir, wie du ein neues Modul korrekt integrierst und welche Konventionen zu beachten sind.

---

## 🗂 Modulstruktur

1. Lege im Ordner `pages/` einen neuen Ordner mit dem Namen deines Moduls an (z. B. `pages/beispielmodul/`).
2. Füge **zwei Dateien** hinzu:
   - `beispielmodul.html` – enthält das HTML-Template
   - `beispielmodul.js` – enthält die Modul-Logik

---

## 🧭 Routing in `index.html`

Damit dein Modul angezeigt werden kann, musst du zwei Dinge in der `index.html` ergänzen:

### 1. Navigationseintrag in der Sidebar

- Im `<aside>`-Block der `index.html` findest du ein `<nav>` mit Links zu den Modulen.
- Füge dort einen neuen `<a>`-Tag mit einem passenden Heroicon hinzu.
- Beispiel:

```html
<a href="/beispielmodul" class="flex items-center space-x-3 px-3 py-2 rounded hover:bg-gray-200">
   <span>
      <svg  ...><!-- Heroicon SVG --></svg>
   </span>
   <span x-show="sidebarOpen">Beispielmodul</span>
</a>
```

> 💡 Heroicons findest du unter: [https://heroicons.com/](https://heroicons.com/)

### 2. Route-Template hinzufügen

- Scrolle zum `<template>`-Abschnitt im linken Contentbereich und ergänze einen neuen `x-route`:

```html
<template x-route="/beispielmodul" x-template="/pages/beispielmodul/beispielmodul.html"></template>
```

- Achte darauf, dass `x-route` dem `href` in der Sidebar entspricht.

---

## 🔌 JavaScript-Konventionen

### Globale Datenzugriffe

Im Projekt gibt es mehrere **Alpine Stores**, die global nutzbar sind:

- `globalData` (Allgemeine App-Zustände, z. B. ausgewählte Targets)
- `genesys` (Zugriff auf Genesys APIs: `client`, `architectApi`, `routingApi`, `kbApi`)
- `toast` (Feedback-Nachrichten)
- `modal` (Modalfenster)
- `dropdownMenu` (Matrix Dropdown Menü)
- `drag` (Window Resize Drag)
- `aiAssist` (AI-Unterstützung)

### Zugriff auf Alpine

In deiner Modul-JS-Datei ist `Alpine` über das Fensterobjekt verfügbar:

```js
const Alpine = window.Alpine;
```

### Zugriff auf Genesys API:

```js
const client = window.Alpine.store("genesys").client;
const routingApi = window.Alpine.store("genesys").routingApi;
const architectApi = window.Alpine.store("genesys").architectApi;
const kbApi = window.Alpine.store("genesys").kbApi;
```

---

## 🔔 Toasts anzeigen

Toasts helfen dir, den Nutzer über Aktionen zu informieren:

```js
window.Alpine.store("toast").show("Eintrag gespeichert", "success", 3000);
```

**Parameter:**
- `message`: Inhalt des Toasts
- `type`: `success`, `loading`, `error`
- `duration`: Anzeigedauer in Millisekunden (optional, -1 für keine Dauer)

---

## 🪟 Modale Dialoge anzeigen

Modale Dialoge helfen dir, Benutzeraktionen zu bestätigen oder zu unterbrechen (z. B. „Bist du sicher?“).

Ein Modal wird so aufgerufen:

```js
window.Alpine.store("modal").confirm({
  title: "Löschen bestätigen",
  message: "Möchtest du diesen Eintrag wirklich löschen?",
  confirmLabel: "Ja, löschen",
  cancleLabel: "Abbrechen",
  onConfirm: () => {
    // deine Löschlogik hier
    console.log("Eintrag gelöscht");
  }
});
```

**Parameter:**
- `title`: Überschrift des Modals
- `message`: Beschreibungstext
- `confirmLabel`: Text für den Bestätigungsbutton
- `cancleLabel`: Text für den Abbrechen-Button
- `onConfirm`: Callback-Funktion, die bei Bestätigung ausgeführt wird

---

## 📦 Weiteres

- Nutze möglichst **bestehende Komponenten** und Stores.
- Halte dein Modul **modular und übersichtlich**.
- Wenn du globale Komponenten brauchst, bespreche das im Team.

---

Danke, dass du zur Weiterentwicklung beiträgst! 💛