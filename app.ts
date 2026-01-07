// Demo: Infinite-Canvas WebView Manager (simuliert)
// - Kein echtes WebView oder iframe
// - Widgets sind DOM-Elemente, die native Fenster imitieren

type Widget = {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const canvas = document.querySelector<HTMLDivElement>("#canvas");
const addBtn = document.querySelector<HTMLButtonElement>("#add-btn");
const urlInput = document.querySelector<HTMLInputElement>("#url-input");

if (!viewport || !canvas || !addBtn || !urlInput) {
  throw new Error("Missing required DOM elements.");
}

// Aktueller Pan/Zoom-Status des Canvas
const viewState = {
  panX: 0,
  panY: 0,
  scale: 1,
};

const widgets = new Map<string, Widget>();

let isPanning = false;
let panStart = { x: 0, y: 0 };
let viewStart = { x: 0, y: 0 };

let isDraggingWidget = false;
let dragWidgetId: string | null = null;
let dragStartWorld = { x: 0, y: 0 };
let dragWidgetStart = { x: 0, y: 0 };

let isResizingWidget = false;
let resizeWidgetId: string | null = null;
let resizeStartWorld = { x: 0, y: 0 };
let resizeWidgetStart = { w: 0, h: 0 };

// -----------------------------------------
// Koordinatentransformation
// -----------------------------------------
function worldToScreen(x: number, y: number) {
  return {
    x: x * viewState.scale + viewState.panX,
    y: y * viewState.scale + viewState.panY,
  };
}

function screenToWorld(x: number, y: number) {
  return {
    x: (x - viewState.panX) / viewState.scale,
    y: (y - viewState.panY) / viewState.scale,
  };
}

// -----------------------------------------
// Canvas Transformation (translate + scale)
// -----------------------------------------
function applyCanvasTransform() {
  canvas.style.transform = `translate(${viewState.panX}px, ${viewState.panY}px) scale(${viewState.scale})`;
  // Bei jeder Änderung die Geometrie der Widgets updaten
  widgets.forEach((widget) => syncWidgetGeometry(widget));
}

// -----------------------------------------
// Simulierte Kommunikation mit Rust
// -----------------------------------------
async function updateNativeWebviewGeometry(
  widget: Widget,
  screenX: number,
  screenY: number,
  screenW: number,
  screenH: number
) {
  console.log("Simulated Rust invoke:", widget.id, {
    screenX,
    screenY,
    screenW,
    screenH,
  });
}

// -----------------------------------------
// Widget Rendering & Geometrie
// -----------------------------------------
function createWidgetElement(widget: Widget) {
  const el = document.createElement("div");
  el.className = "widget";
  el.dataset.id = widget.id;

  const titlebar = document.createElement("div");
  titlebar.className = "titlebar";

  const title = document.createElement("span");
  title.className = "titlebar__title";
  title.textContent = widget.title;

  const closeBtn = document.createElement("button");
  closeBtn.className = "titlebar__close";
  closeBtn.textContent = "×";
  closeBtn.title = "Close";

  titlebar.appendChild(title);
  titlebar.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "widget__body";
  body.textContent = "Simulated WebView";

  const resize = document.createElement("div");
  resize.className = "resize";

  el.appendChild(titlebar);
  el.appendChild(body);
  el.appendChild(resize);

  // Drag-Handler (Titlebar)
  titlebar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const id = el.dataset.id;
    if (!id) return;

    const widgetData = widgets.get(id);
    if (!widgetData) return;

    isDraggingWidget = true;
    dragWidgetId = id;

    const worldPos = screenToWorld(event.clientX, event.clientY);
    dragStartWorld = { x: worldPos.x, y: worldPos.y };
    dragWidgetStart = { x: widgetData.x, y: widgetData.y };

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  });

  // Close-Handler
  closeBtn.addEventListener("click", () => {
    const id = el.dataset.id;
    if (!id) return;
    widgets.delete(id);
    el.remove();
  });

  // Resize-Handler
  resize.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const id = el.dataset.id;
    if (!id) return;

    const widgetData = widgets.get(id);
    if (!widgetData) return;

    isResizingWidget = true;
    resizeWidgetId = id;

    const worldPos = screenToWorld(event.clientX, event.clientY);
    resizeStartWorld = { x: worldPos.x, y: worldPos.y };
    resizeWidgetStart = { w: widgetData.width, h: widgetData.height };

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  });

  return el;
}

function syncWidgetGeometry(widget: Widget) {
  const el = canvas.querySelector<HTMLDivElement>(`.widget[data-id="${widget.id}"]`);
  if (!el) return;

  // World-Space -> Canvas DOM
  el.style.left = `${widget.x}px`;
  el.style.top = `${widget.y}px`;
  el.style.width = `${widget.width}px`;
  el.style.height = `${widget.height}px`;
  el.style.setProperty("--widget-scale", `${widget.scale}`);

  // Screen-Space für simulierte Native-Geometrie
  const screenPos = worldToScreen(widget.x, widget.y);
  const screenW = widget.width * viewState.scale * widget.scale;
  const screenH = widget.height * viewState.scale * widget.scale;

  updateNativeWebviewGeometry(widget, screenPos.x, screenPos.y, screenW, screenH);
}

function addWidget(url: string) {
  const id = `widget-${crypto.randomUUID()}`;
  const widget: Widget = {
    id,
    title: url || "https://example.com",
    x: Math.round(Math.random() * 800 - 400),
    y: Math.round(Math.random() * 600 - 300),
    width: 360,
    height: 240,
    scale: 1,
  };

  widgets.set(id, widget);
  const el = createWidgetElement(widget);
  canvas.appendChild(el);
  syncWidgetGeometry(widget);
}

// -----------------------------------------
// Global Pointer Events (Drag, Resize, Pan)
// -----------------------------------------
window.addEventListener("pointermove", (event) => {
  if (isDraggingWidget && dragWidgetId) {
    const widgetData = widgets.get(dragWidgetId);
    if (!widgetData) return;

    const worldPos = screenToWorld(event.clientX, event.clientY);
    const dx = worldPos.x - dragStartWorld.x;
    const dy = worldPos.y - dragStartWorld.y;

    widgetData.x = dragWidgetStart.x + dx;
    widgetData.y = dragWidgetStart.y + dy;

    syncWidgetGeometry(widgetData);
    return;
  }

  if (isResizingWidget && resizeWidgetId) {
    const widgetData = widgets.get(resizeWidgetId);
    if (!widgetData) return;

    const worldPos = screenToWorld(event.clientX, event.clientY);
    const dw = worldPos.x - resizeStartWorld.x;
    const dh = worldPos.y - resizeStartWorld.y;

    widgetData.width = Math.max(180, resizeWidgetStart.w + dw);
    widgetData.height = Math.max(120, resizeWidgetStart.h + dh);

    syncWidgetGeometry(widgetData);
    return;
  }

  if (isPanning) {
    const dx = event.clientX - panStart.x;
    const dy = event.clientY - panStart.y;
    viewState.panX = viewStart.x + dx;
    viewState.panY = viewStart.y + dy;
    applyCanvasTransform();
  }
});

window.addEventListener("pointerup", () => {
  isDraggingWidget = false;
  dragWidgetId = null;
  isResizingWidget = false;
  resizeWidgetId = null;
  isPanning = false;
});

// Pan: Space + Drag auf leeren Bereich
viewport.addEventListener("pointerdown", (event) => {
  const target = event.target as HTMLElement;
  if (target.closest(".widget")) {
    return;
  }

  if (event.button !== 0 || !event.isPrimary) return;
  if (!event.getModifierState(" ")) {
    // fallback: Space-State über globalen Key
    if (!spacePressed) return;
  }

  isPanning = true;
  panStart = { x: event.clientX, y: event.clientY };
  viewStart = { x: viewState.panX, y: viewState.panY };
});

// Zoom: Ctrl + Wheel
viewport.addEventListener("wheel", (event) => {
  if (!event.ctrlKey) return;
  event.preventDefault();

  const zoomIntensity = 0.0015;
  const delta = -event.deltaY * zoomIntensity;
  const nextScale = Math.min(2.5, Math.max(0.3, viewState.scale * (1 + delta)));

  const mouseWorld = screenToWorld(event.clientX, event.clientY);
  viewState.scale = nextScale;

  const newScreen = worldToScreen(mouseWorld.x, mouseWorld.y);
  viewState.panX += event.clientX - newScreen.x;
  viewState.panY += event.clientY - newScreen.y;

  applyCanvasTransform();
});

// Globaler Space-Status
let spacePressed = false;
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    spacePressed = true;
    viewport.classList.add("viewport--panning");
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    spacePressed = false;
    viewport.classList.remove("viewport--panning");
  }
});

// -----------------------------------------
// UI Aktionen
// -----------------------------------------
addBtn.addEventListener("click", () => {
  addWidget(urlInput.value.trim());
});

// Initiale Demo-Widgets
addWidget("https://news.example");
addWidget("https://maps.example");
applyCanvasTransform();
