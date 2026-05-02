# postMessage – Wie die automatische Höhenanpassung funktioniert

Das Widget läuft in einem `<iframe>`. iFrames sind von der Elternseite isoliert – JavaScript der Elternseite kann nicht direkt in den iFrame schauen und umgekehrt. `window.postMessage` ist der einzige sichere Kommunikationskanal zwischen beiden Welten.

---

## Das Problem ohne postMessage

Ein iFrame hat eine feste Höhe. Ohne Kommunikation würde das Widget entweder:
- zu klein sein → interner Scrollbalken sichtbar, unbrauchbar
- zu groß sein → leerer Weißraum unter dem Widget

Die Höhe des Widget-Inhalts ändert sich ständig: bei jedem Schritt im Funnel, auf verschiedenen Bildschirmgrößen, wenn Fehlermeldungen erscheinen oder Schriften geladen werden.

---

## Der Ablauf Schritt für Schritt

```
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│        IFRAME (Widget)          │      │      ELTERNSEITE (Kunde)        │
│                                 │      │                                 │
│  ResizeObserver beobachtet      │      │  embed.js / manueller Script    │
│  den Container                  │      │  hört auf 'message'-Events      │
│                                 │      │                                 │
│  Höhe ändert sich               │      │                                 │
│         ↓                       │      │                                 │
│  scrollHeight messen            │      │                                 │
│         ↓                       │      │                                 │
│  window.parent.postMessage(     │ ───► │  event.data.type === 'funnel-  │
│    { type: 'funnel-resize',     │      │  resize' → iframe.style.height  │
│      height: 412 }              │      │  = 412px setzen                 │
│  )                              │      │                                 │
└─────────────────────────────────┘      └─────────────────────────────────┘
```

**1. ResizeObserver im Widget** (`components/funnel.tsx`)

```ts
const ro = new ResizeObserver(sendHeight);
ro.observe(containerRef.current);
```

`ResizeObserver` feuert automatisch bei jeder Größenänderung des beobachteten Elements – beim ersten Render, nach Schritt-Wechsel, nach Font-Load, bei Responsive-Breakpoints.

**2. Höhe messen**

```ts
const height = containerRef.current.scrollHeight;
```

Gemessen wird `scrollHeight` des äußersten Container-Divs (`containerRef`). Dieser div umschließt die gesamte weiße Widget-Card inklusive dem Shadow-Padding (siehe unten). `scrollHeight` gibt die tatsächliche gerenderte Höhe zurück, auch wenn Teile außerhalb des Viewports liegen.

**3. Nachricht senden**

```ts
window.parent.postMessage({ type: 'funnel-resize', height: 412 }, '*');
```

- `window.parent` = das Browserfenster der Elternseite
- `'*'` als targetOrigin = akzeptiert alle Domains (nötig weil der Kunde-Domain nicht bekannt ist)
- `type: 'funnel-resize'` = eindeutiger Bezeichner damit der Listener nur unsere Nachrichten verarbeitet

**4. Listener auf der Elternseite** (`public/embed.js`)

```js
window.addEventListener('message', function(event) {
  if (!event.data || event.data.type !== 'funnel-resize') return;
  var height = parseInt(event.data.height, 10);
  if (height > 0) iframe.style.height = height + 'px';
});
```

Der Listener filtert nach `type: 'funnel-resize'` – andere postMessage-Events auf der Seite (z.B. von Chat-Widgets, Analytics, etc.) werden ignoriert.

---

## Warum `containerRef` und nicht `document.body`?

`document.body` wäre naheliegend, ist aber falsch:

- Das Widget nutzt `min-h-dvh` im Layout (Viewport-Höhe). `document.body.scrollHeight` würde immer mindestens die volle Viewport-Höhe zurückgeben – der iFrame wäre permanent zu groß.
- `containerRef.scrollHeight` misst nur die Widget-Card selbst, unabhängig vom Rest der Seite.

---

## Shadow-Padding: Warum der Container größer als die Card ist

Die weiße Card hat einen `box-shadow`. Schatten werden **außerhalb** des Elements gezeichnet, beeinflussen aber nicht `scrollHeight`. Damit der Shadow nicht vom iFrame-Rand abgeschnitten wird, hat der `containerRef`-Container ein berechnetes Padding:

```
┌─ containerRef (scrollHeight wird gemessen) ──────────────┐
│  paddingTop:    SHADOW_PADDING.top    (z.B. 8px)         │
│                                                           │
│  ┌─ weiße Card mit box-shadow ───────────────────────┐   │
│  │  Shadow malt sich ins Padding des Containers      │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  paddingBottom: SHADOW_PADDING.bottom (z.B. 13px)        │
└───────────────────────────────────────────────────────────┘
```

Das Padding wird in `funnel.tsx` automatisch aus den Shadow-Definitionen berechnet – wenn der Shadow geändert wird, passt sich das Padding selbst an. Der iFrame bekommt damit immer genau die richtige Höhe inklusive sichtbarem Schatten.

---

## Sicherheit: Ist `'*'` als targetOrigin ein Problem?

Kurze Antwort: Nein, in diesem Fall nicht.

Die Nachricht enthält ausschließlich eine Pixel-Zahl (Widget-Höhe) – keine Tokens, keine Nutzer-Daten, keine sensiblen Informationen. Selbst wenn eine fremde Seite die Nachricht abfängt, kann sie damit nichts anfangen. Der Listener auf der Elternseite setzt nur eine CSS-Höhe.

Für Payloads mit sensiblen Daten wäre ein konkreter targetOrigin (`'https://kunde-domain.de'`) Pflicht – hier ist es unnötig komplex.

---

## Debugging

**iFrame bleibt zu klein / zu groß**

Browser-Konsole der Elternseite öffnen:
```js
window.addEventListener('message', console.log);
```
Kommt kein Event mit `type: 'funnel-resize'`? → Widget sendet nicht (prüfe ob `window.parent !== window`).

**iFrame springt ständig in der Höhe**

ResizeObserver und iFrame-Höhenänderung können sich gegenseitig triggern. Das Widget verhindert das durch den `if (height > 0)`-Check und weil `containerRef` nur die interne Card misst, nicht die iFrame-Außenhöhe.

**Mehrere Widgets auf einer Seite**

`embed.js` verwaltet alle iFrames über eine `WeakMap` (contentWindow → iframe-Element). Jedes `funnel-resize`-Event wird dem richtigen iFrame zugeordnet. Fallback: wenn nur ein Widget auf der Seite ist, wird das erste Element der Liste verwendet.
