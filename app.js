(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STAGE_WIDTH = 1400;
  const STAGE_HEIGHT = 900;
  const STORAGE_KEY = "drum-designer-project-v1";

  const equipment = [
    { category: "Drums", type: "kick", name: '22" Kick', size: 170, icon: "circle" },
    { category: "Drums", type: "snare", name: '14" Snare', size: 112, icon: "circle" },
    { category: "Drums", type: "tom", name: '8" Tom', size: 78, icon: "circle" },
    { category: "Drums", type: "tom", name: '10" Tom', size: 90, icon: "circle" },
    { category: "Drums", type: "tom", name: '12" Tom', size: 102, icon: "circle" },
    { category: "Drums", type: "floorTom", name: '14" Floor Tom', size: 120, icon: "circle" },
    { category: "Drums", type: "floorTom", name: '16" Floor Tom', size: 138, icon: "circle" },
    { category: "Drums", type: "floorTom", name: '18" Floor Tom', size: 150, icon: "circle" },

    { category: "Cymbals", type: "hihat", name: '14" Hi-Hats', size: 105, icon: "cymbal" },
    { category: "Cymbals", type: "crash", name: '16" Crash', size: 118, icon: "cymbal" },
    { category: "Cymbals", type: "crash", name: '18" Crash', size: 135, icon: "cymbal" },
    { category: "Cymbals", type: "crash", name: '19" Crash', size: 143, icon: "cymbal" },
    { category: "Cymbals", type: "ride", name: '21" Ride', size: 162, icon: "cymbal" },
    { category: "Cymbals", type: "china", name: '18" China', size: 136, icon: "cymbal" },
    { category: "Cymbals", type: "splash", name: '10" Splash', size: 72, icon: "cymbal" },
    { category: "Cymbals", type: "stack", name: '12" Stack', size: 82, icon: "cymbal" },

    { category: "Electronic", type: "multipad", name: "Sample Pad", width: 130, height: 92, icon: "rect" },
    { category: "Electronic", type: "triggerPad", name: "Trigger Pad", size: 78, icon: "circle" },
    { category: "Electronic", type: "laptop", name: "Laptop", width: 130, height: 90, icon: "rect" },
    { category: "Electronic", type: "module", name: "Drum Module", width: 105, height: 72, icon: "rect" },

    { category: "Hardware", type: "throne", name: "Throne", size: 100, icon: "circle" },
    { category: "Hardware", type: "pedal", name: "Kick Pedal", width: 48, height: 100, icon: "pedal" },
    { category: "Hardware", type: "doublePedal", name: "Double Pedal", width: 110, height: 100, icon: "pedal" },
    { category: "Hardware", type: "stand", name: "Boom Stand", size: 86, icon: "rect" },
    { category: "Hardware", type: "rack", name: "Drum Rack", width: 250, height: 60, icon: "rect" },

    { category: "Stage", type: "mic", name: "Microphone", width: 32, height: 100, icon: "rect" },
    { category: "Stage", type: "overhead", name: "Overhead Mic", width: 32, height: 125, icon: "rect" },
    { category: "Stage", type: "monitor", name: "Stage Monitor", width: 130, height: 86, icon: "rect" },
    { category: "Stage", type: "stagebox", name: "Stage Box", width: 90, height: 58, icon: "rect" },

    { category: "Accessories", type: "cowbell", name: "Cowbell", width: 62, height: 38, icon: "rect" },
    { category: "Accessories", type: "tambourine", name: "Tambourine", size: 58, icon: "circle" },
    { category: "Accessories", type: "block", name: "Jam Block", width: 65, height: 34, icon: "rect" },
    { category: "Accessories", type: "custom", name: "Custom Item", width: 90, height: 65, icon: "rect" }
  ];

  const els = {
    projectName: document.getElementById("projectName"),
    libraryContent: document.getElementById("libraryContent"),
    librarySearch: document.getElementById("librarySearch"),
    libraryPanel: document.getElementById("libraryPanel"),
    libraryToggle: document.getElementById("libraryToggle"),
    libraryClose: document.getElementById("libraryClose"),
    viewport: document.getElementById("workspaceViewport"),
    svg: document.getElementById("workspaceSvg"),
    objectLayer: document.getElementById("objectLayer"),
    gridLayer: document.getElementById("gridLayer"),
    floatingTools: document.getElementById("floatingTools"),
    propertiesPanel: document.getElementById("propertiesPanel"),
    propertiesContent: document.getElementById("propertiesContent"),
    selectionReadout: document.getElementById("selectionReadout"),
    objectCount: document.getElementById("objectCount"),
    zoomReadout: document.getElementById("zoomReadout"),
    toast: document.getElementById("toast")
  };

  const state = {
    objects: [],
    selectedId: null,
    zoom: 0.72,
    panX: 0,
    panY: 0,
    cleanView: false,
    history: [],
    future: [],
    spaceDown: false,
    panGesture: null,
    objectGesture: null
  };

  function uid() {
    return `dd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function snapshot() {
    return JSON.stringify({
      projectName: els.projectName.value,
      objects: state.objects
    });
  }

  function restore(serialized) {
    try {
      const data = JSON.parse(serialized);
      state.objects = Array.isArray(data.objects) ? data.objects : [];
      els.projectName.value = data.projectName || "My Drum Setup";
      state.selectedId = null;
      render();
    } catch (error) {
      console.error("Could not restore Drum Designer state", error);
      toast("Could not restore that project");
    }
  }

  function pushHistory(before = null) {
    const snap = before ?? snapshot();
    if (state.history[state.history.length - 1] !== snap) {
      state.history.push(snap);
      if (state.history.length > 80) state.history.shift();
    }
    state.future.length = 0;
  }

  function undo() {
    if (!state.history.length) return;
    state.future.push(snapshot());
    restore(state.history.pop());
    toast("Undone");
  }

  function redo() {
    if (!state.future.length) return;
    state.history.push(snapshot());
    restore(state.future.pop());
    toast("Redone");
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove("show"), 1500);
  }

  function createSvg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function getSelected() {
    return state.objects.find(obj => obj.id === state.selectedId) || null;
  }

  function addObject(definition, x = STAGE_WIDTH / 2, y = STAGE_HEIGHT / 2) {
    const before = snapshot();
    const object = {
      id: uid(),
      type: definition.type,
      category: definition.category,
      name: definition.name,
      x,
      y,
      width: definition.width || definition.size || 100,
      height: definition.height || definition.size || 100,
      rotation: 0,
      scale: 1,
      locked: false,
      labelVisible: true
    };
    state.objects.push(object);
    state.selectedId = object.id;
    pushHistory(before);
    render();
    return object;
  }

  function renderLibrary(filter = "") {
    const query = filter.trim().toLowerCase();
    els.libraryContent.innerHTML = "";
    const categories = [...new Set(equipment.map(item => item.category))];

    categories.forEach(category => {
      const items = equipment.filter(item => item.category === category && (!query || item.name.toLowerCase().includes(query) || item.type.toLowerCase().includes(query)));
      if (!items.length) return;

      const section = document.createElement("section");
      section.className = "library-category";
      const title = document.createElement("div");
      title.className = "category-title";
      title.textContent = category;
      section.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "library-grid";

      items.forEach(item => {
        const card = document.createElement("div");
        card.className = "library-item";
        card.draggable = true;
        card.dataset.type = item.type;
        const icon = document.createElement("div");
        icon.className = `library-icon ${item.icon}`;
        const label = document.createElement("span");
        label.textContent = item.name;
        card.append(icon, label);
        card.addEventListener("dragstart", event => {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("text/plain", item.type);
        });
        card.addEventListener("dblclick", () => addObject(item));
        grid.appendChild(card);
      });

      section.appendChild(grid);
      els.libraryContent.appendChild(section);
    });
  }

  function applyViewTransform() {
    const transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom}) translate(${-STAGE_WIDTH / 2}px, ${-STAGE_HEIGHT / 2}px)`;
    els.svg.style.transform = transform;
    els.zoomReadout.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function clientToWorld(clientX, clientY) {
    const rect = els.viewport.getBoundingClientRect();
    const sx = clientX - rect.left - rect.width / 2 - state.panX;
    const sy = clientY - rect.top - rect.height / 2 - state.panY;
    return {
      x: STAGE_WIDTH / 2 + sx / state.zoom,
      y: STAGE_HEIGHT / 2 + sy / state.zoom
    };
  }

  function clampObject(obj) {
    obj.x = Math.max(-100, Math.min(STAGE_WIDTH + 100, obj.x));
    obj.y = Math.max(-100, Math.min(STAGE_HEIGHT + 100, obj.y));
  }

  function appendCircleDrum(group, obj, shellColor = "#757f86") {
    const r = Math.min(obj.width, obj.height) / 2;
    group.appendChild(createSvg("circle", { r, fill: shellColor, stroke: "#24292d", "stroke-width": 8, filter: "url(#softShadow)" }));
    group.appendChild(createSvg("circle", { r: Math.max(12, r - 10), fill: "url(#drumGradient)", stroke: "#aeb5ba", "stroke-width": 3 }));
    group.appendChild(createSvg("circle", { r: Math.max(8, r - 18), fill: "none", stroke: "#cdd3d6", "stroke-width": 1.5, opacity: .65 }));
    [0, 60, 120, 180, 240, 300].forEach(angle => {
      const rad = angle * Math.PI / 180;
      const x = Math.cos(rad) * (r - 7);
      const y = Math.sin(rad) * (r - 7);
      group.appendChild(createSvg("circle", { cx: x, cy: y, r: 2.8, fill: "#22272b" }));
    });
  }

  function appendCymbal(group, obj, special = "") {
    const r = Math.min(obj.width, obj.height) / 2;
    group.appendChild(createSvg("circle", { r, fill: "url(#cymbalGradient)", stroke: "#71501f", "stroke-width": 3, filter: "url(#softShadow)" }));
    [0.78, 0.58, 0.38].forEach(scale => group.appendChild(createSvg("circle", { r: r * scale, fill: "none", stroke: "#7e5d27", "stroke-width": 1, opacity: .32 })));
    if (special === "china") {
      group.appendChild(createSvg("circle", { r: r * .72, fill: "none", stroke: "#ffe89a", "stroke-width": 5, opacity: .4 }));
    }
    if (special === "stack") {
      group.appendChild(createSvg("circle", { r: r * .78, fill: "none", stroke: "#3f321d", "stroke-width": 4, opacity: .6 }));
    }
    group.appendChild(createSvg("circle", { r: Math.max(7, r * .11), fill: "#8c6727", stroke: "#5f451c", "stroke-width": 2 }));
    group.appendChild(createSvg("circle", { r: Math.max(2, r * .035), fill: "#1b1d1f" }));
  }

  function appendRect(group, obj, fill = "#3f474e") {
    const x = -obj.width / 2;
    const y = -obj.height / 2;
    group.appendChild(createSvg("rect", { x, y, width: obj.width, height: obj.height, rx: 8, fill, stroke: "#89939a", "stroke-width": 3, filter: "url(#softShadow)" }));
  }

  function appendObjectArt(group, obj) {
    switch (obj.type) {
      case "kick":
        appendCircleDrum(group, obj, "#30373c");
        group.appendChild(createSvg("circle", { r: Math.min(obj.width, obj.height) * .18, fill: "#353a3f", opacity: .8 }));
        break;
      case "snare":
        appendCircleDrum(group, obj, "#9aa4aa");
        break;
      case "tom":
        appendCircleDrum(group, obj, "#68737a");
        break;
      case "floorTom":
        appendCircleDrum(group, obj, "#505b62");
        [40, 140, 220, 320].forEach(angle => {
          const r = Math.min(obj.width, obj.height) / 2;
          const rad = angle * Math.PI / 180;
          group.appendChild(createSvg("line", { x1: Math.cos(rad) * r * .82, y1: Math.sin(rad) * r * .82, x2: Math.cos(rad) * r * 1.12, y2: Math.sin(rad) * r * 1.12, stroke: "#778188", "stroke-width": 4 }));
        });
        break;
      case "crash": case "ride": case "splash": case "hihat":
        appendCymbal(group, obj);
        if (obj.type === "hihat") group.appendChild(createSvg("circle", { r: Math.min(obj.width, obj.height) * .36, fill: "none", stroke: "#4f3a1a", "stroke-width": 2, opacity: .7 }));
        break;
      case "china": case "stack":
        appendCymbal(group, obj, obj.type);
        break;
      case "multipad":
        appendRect(group, obj, "#20252a");
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const cellW = (obj.width - 18) / 3;
            const cellH = (obj.height - 18) / 3;
            group.appendChild(createSvg("rect", { x: -obj.width / 2 + 6 + col * cellW, y: -obj.height / 2 + 6 + row * cellH, width: cellW - 3, height: cellH - 3, rx: 3, fill: "#3b4248", stroke: "#111", "stroke-width": 1 }));
          }
        }
        break;
      case "triggerPad":
        appendCircleDrum(group, obj, "#252b30");
        break;
      case "laptop":
        appendRect(group, obj, "#333b41");
        group.appendChild(createSvg("rect", { x: -obj.width * .4, y: -obj.height * .36, width: obj.width * .8, height: obj.height * .58, rx: 3, fill: "#15191c", stroke: "#657078", "stroke-width": 2 }));
        group.appendChild(createSvg("line", { x1: -obj.width * .44, y1: obj.height * .32, x2: obj.width * .44, y2: obj.height * .32, stroke: "#a1aab0", "stroke-width": 4 }));
        break;
      case "module":
        appendRect(group, obj, "#252a2e");
        for (let i = 0; i < 4; i++) group.appendChild(createSvg("circle", { cx: -obj.width * .3 + i * obj.width * .2, cy: 0, r: 7, fill: "#111", stroke: "#7a848b", "stroke-width": 1 }));
        break;
      case "throne":
        group.appendChild(createSvg("circle", { r: Math.min(obj.width, obj.height) / 2, fill: "#1c2024", stroke: "#555e65", "stroke-width": 5, filter: "url(#softShadow)" }));
        group.appendChild(createSvg("circle", { r: Math.min(obj.width, obj.height) * .35, fill: "#272c31", stroke: "#111", "stroke-width": 2 }));
        break;
      case "pedal": case "doublePedal":
        appendRect(group, obj, "#3a4147");
        group.appendChild(createSvg("rect", { x: -obj.width * .32, y: -obj.height * .38, width: obj.width * .64, height: obj.height * .66, rx: 10, fill: "url(#hardwareGradient)", stroke: "#252a2e", "stroke-width": 2 }));
        group.appendChild(createSvg("line", { x1: 0, y1: -obj.height * .4, x2: 0, y2: -obj.height * .58, stroke: "#aeb5ba", "stroke-width": 4 }));
        group.appendChild(createSvg("circle", { cy: -obj.height * .62, r: 8, fill: "#30363b" }));
        break;
      case "stand":
        group.appendChild(createSvg("circle", { r: 7, fill: "#8f999f" }));
        [90, 210, 330].forEach(angle => {
          const rad = angle * Math.PI / 180;
          group.appendChild(createSvg("line", { x1: 0, y1: 0, x2: Math.cos(rad) * obj.width * .48, y2: Math.sin(rad) * obj.height * .48, stroke: "#778188", "stroke-width": 4, "stroke-linecap": "round" }));
        });
        break;
      case "rack":
        group.appendChild(createSvg("rect", { x: -obj.width / 2, y: -6, width: obj.width, height: 12, rx: 6, fill: "url(#hardwareGradient)", stroke: "#3e454a", "stroke-width": 2 }));
        group.appendChild(createSvg("line", { x1: -obj.width * .42, y1: 0, x2: -obj.width * .42, y2: obj.height * .48, stroke: "#808a90", "stroke-width": 8 }));
        group.appendChild(createSvg("line", { x1: obj.width * .42, y1: 0, x2: obj.width * .42, y2: obj.height * .48, stroke: "#808a90", "stroke-width": 8 }));
        break;
      case "mic": case "overhead":
        group.appendChild(createSvg("line", { x1: 0, y1: obj.height * .38, x2: 0, y2: -obj.height * .35, stroke: "#7e888e", "stroke-width": 5 }));
        group.appendChild(createSvg("ellipse", { cx: 0, cy: -obj.height * .42, rx: 10, ry: 17, fill: "#24292d", stroke: "#8c969c", "stroke-width": 2 }));
        group.appendChild(createSvg("line", { x1: -obj.width * .45, y1: obj.height * .4, x2: obj.width * .45, y2: obj.height * .4, stroke: "#687279", "stroke-width": 4 }));
        break;
      case "monitor":
        group.appendChild(createSvg("path", { d: `M ${-obj.width/2} ${obj.height/2} L ${-obj.width*.38} ${-obj.height/2} L ${obj.width*.38} ${-obj.height/2} L ${obj.width/2} ${obj.height/2} Z`, fill: "#252a2e", stroke: "#697279", "stroke-width": 3, filter: "url(#softShadow)" }));
        group.appendChild(createSvg("ellipse", { cy: 4, rx: obj.width * .27, ry: obj.height * .28, fill: "#111417", stroke: "#464e54", "stroke-width": 3 }));
        break;
      case "tambourine":
        group.appendChild(createSvg("circle", { r: Math.min(obj.width, obj.height) / 2, fill: "none", stroke: "#aab2b7", "stroke-width": 9, filter: "url(#softShadow)" }));
        break;
      case "cowbell": case "block": case "stagebox": case "custom":
        appendRect(group, obj, obj.type === "block" ? "#9b3f35" : "#3b444a");
        break;
      default:
        appendRect(group, obj);
    }
  }

  function renderObject(obj) {
    const group = createSvg("g", {
      class: `drum-object${obj.id === state.selectedId ? " selected" : ""}${obj.locked ? " locked" : ""}`,
      "data-id": obj.id,
      transform: `translate(${obj.x} ${obj.y}) rotate(${obj.rotation}) scale(${obj.scale})`
    });

    appendObjectArt(group, obj);

    const selectionPadding = 10;
    group.appendChild(createSvg("rect", {
      class: "selection-ring",
      x: -obj.width / 2 - selectionPadding,
      y: -obj.height / 2 - selectionPadding,
      width: obj.width + selectionPadding * 2,
      height: obj.height + selectionPadding * 2,
      rx: 9,
      fill: "none",
      stroke: "#f0c95e",
      "stroke-width": 3 / Math.max(.7, obj.scale),
      "stroke-dasharray": "8 6",
      "pointer-events": "none"
    }));

    if (obj.labelVisible) {
      const label = createSvg("text", { class: `drum-label${["multipad", "laptop", "module", "monitor", "stagebox", "custom"].includes(obj.type) ? " light" : ""}`, y: 1 });
      label.textContent = obj.name;
      group.appendChild(label);
    }

    group.addEventListener("pointerdown", onObjectPointerDown);
    group.addEventListener("dblclick", event => {
      event.stopPropagation();
      selectObject(obj.id);
      openProperties();
    });
    return group;
  }

  function render() {
    els.objectLayer.innerHTML = "";
    state.objects.forEach(obj => els.objectLayer.appendChild(renderObject(obj)));
    els.svg.classList.toggle("clean-mode", state.cleanView);
    els.floatingTools.hidden = !state.selectedId || state.cleanView;
    const selected = getSelected();
    els.selectionReadout.textContent = selected ? `${selected.name} · ${Math.round(selected.x)}, ${Math.round(selected.y)}` : "Nothing selected";
    els.objectCount.textContent = `${state.objects.length} item${state.objects.length === 1 ? "" : "s"}`;
    applyViewTransform();
    if (els.propertiesPanel.classList.contains("open")) renderProperties();
  }

  function selectObject(id) {
    state.selectedId = id;
    render();
  }

  function onObjectPointerDown(event) {
    if (state.cleanView || state.spaceDown || event.button === 1) return;
    event.preventDefault();
    event.stopPropagation();
    const id = event.currentTarget.dataset.id;
    const obj = state.objects.find(item => item.id === id);
    if (!obj) return;
    state.selectedId = id;
    if (obj.locked) {
      render();
      toast("That item is locked");
      return;
    }
    const world = clientToWorld(event.clientX, event.clientY);
    state.objectGesture = {
      id,
      pointerId: event.pointerId,
      startWorldX: world.x,
      startWorldY: world.y,
      startX: obj.x,
      startY: obj.y,
      before: snapshot(),
      moved: false
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    render();
  }

  function onPointerMove(event) {
    if (state.objectGesture && event.pointerId === state.objectGesture.pointerId) {
      const obj = state.objects.find(item => item.id === state.objectGesture.id);
      if (!obj) return;
      const world = clientToWorld(event.clientX, event.clientY);
      obj.x = state.objectGesture.startX + (world.x - state.objectGesture.startWorldX);
      obj.y = state.objectGesture.startY + (world.y - state.objectGesture.startWorldY);
      clampObject(obj);
      state.objectGesture.moved = true;
      const node = els.objectLayer.querySelector(`[data-id="${CSS.escape(obj.id)}"]`);
      if (node) node.setAttribute("transform", `translate(${obj.x} ${obj.y}) rotate(${obj.rotation}) scale(${obj.scale})`);
      els.selectionReadout.textContent = `${obj.name} · ${Math.round(obj.x)}, ${Math.round(obj.y)}`;
      return;
    }

    if (state.panGesture && event.pointerId === state.panGesture.pointerId) {
      state.panX = state.panGesture.startPanX + (event.clientX - state.panGesture.startClientX);
      state.panY = state.panGesture.startPanY + (event.clientY - state.panGesture.startClientY);
      applyViewTransform();
    }
  }

  function onPointerUp(event) {
    if (state.objectGesture && event.pointerId === state.objectGesture.pointerId) {
      if (state.objectGesture.moved) pushHistory(state.objectGesture.before);
      state.objectGesture = null;
      render();
    }
    if (state.panGesture && event.pointerId === state.panGesture.pointerId) {
      state.panGesture = null;
      els.viewport.classList.remove("panning");
    }
  }

  function startPan(event) {
    if (!(event.button === 1 || state.spaceDown)) return;
    event.preventDefault();
    state.panGesture = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: state.panX,
      startPanY: state.panY
    };
    els.viewport.classList.add("panning");
    els.viewport.setPointerCapture?.(event.pointerId);
  }

  function setZoom(next, anchorClient = null) {
    const old = state.zoom;
    next = Math.max(.25, Math.min(2.2, next));
    if (Math.abs(next - old) < .001) return;

    if (anchorClient) {
      const rect = els.viewport.getBoundingClientRect();
      const ax = anchorClient.x - rect.left - rect.width / 2;
      const ay = anchorClient.y - rect.top - rect.height / 2;
      const worldOffsetX = (ax - state.panX) / old;
      const worldOffsetY = (ay - state.panY) / old;
      state.panX = ax - worldOffsetX * next;
      state.panY = ay - worldOffsetY * next;
    }

    state.zoom = next;
    applyViewTransform();
  }

  function fitStage() {
    const rect = els.viewport.getBoundingClientRect();
    state.zoom = Math.min((rect.width - 60) / STAGE_WIDTH, (rect.height - 60) / STAGE_HEIGHT, 1);
    state.panX = 0;
    state.panY = 0;
    applyViewTransform();
  }

  function deleteSelected() {
    const selected = getSelected();
    if (!selected) return;
    const before = snapshot();
    state.objects = state.objects.filter(obj => obj.id !== selected.id);
    state.selectedId = null;
    pushHistory(before);
    closeProperties();
    render();
    toast("Item deleted");
  }

  function duplicateSelected() {
    const selected = getSelected();
    if (!selected) return;
    const before = snapshot();
    const copy = { ...selected, id: uid(), x: selected.x + 28, y: selected.y + 28, name: selected.name };
    state.objects.push(copy);
    state.selectedId = copy.id;
    pushHistory(before);
    render();
    toast("Duplicated");
  }

  function rotateSelected(amount) {
    const selected = getSelected();
    if (!selected || selected.locked) return;
    const before = snapshot();
    selected.rotation = (selected.rotation + amount + 360) % 360;
    pushHistory(before);
    render();
  }

  function changeLayer(direction) {
    const index = state.objects.findIndex(obj => obj.id === state.selectedId);
    if (index < 0) return;
    const before = snapshot();
    if (direction > 0 && index < state.objects.length - 1) {
      [state.objects[index], state.objects[index + 1]] = [state.objects[index + 1], state.objects[index]];
    } else if (direction < 0 && index > 0) {
      [state.objects[index], state.objects[index - 1]] = [state.objects[index - 1], state.objects[index]];
    } else return;
    pushHistory(before);
    render();
  }

  function propertyRow(label, input) {
    const row = document.createElement("div");
    row.className = "property-row";
    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    row.append(labelEl, input);
    return row;
  }

  function makeInput(type, value, onChange, attrs = {}) {
    const input = document.createElement("input");
    input.type = type;
    input.value = value;
    Object.entries(attrs).forEach(([key, val]) => input.setAttribute(key, val));
    input.addEventListener("change", () => onChange(input));
    return input;
  }

  function renderProperties() {
    const obj = getSelected();
    els.propertiesContent.innerHTML = "";
    if (!obj) {
      els.propertiesContent.textContent = "Select an item to edit it.";
      return;
    }

    const identity = document.createElement("div");
    identity.className = "property-group";
    identity.innerHTML = '<div class="property-group-title">Identity</div>';
    identity.appendChild(propertyRow("Name", makeInput("text", obj.name, input => updateProperty(obj, "name", input.value))));
    identity.appendChild(propertyRow("Category", makeInput("text", obj.category, () => {}, { disabled: "disabled" })));

    const transform = document.createElement("div");
    transform.className = "property-group";
    transform.innerHTML = '<div class="property-group-title">Transform</div>';
    transform.appendChild(propertyRow("X", makeInput("number", Math.round(obj.x), input => updateProperty(obj, "x", Number(input.value)), { step: "1" })));
    transform.appendChild(propertyRow("Y", makeInput("number", Math.round(obj.y), input => updateProperty(obj, "y", Number(input.value)), { step: "1" })));
    transform.appendChild(propertyRow("Width", makeInput("number", Math.round(obj.width), input => updateProperty(obj, "width", Math.max(20, Number(input.value))), { min: "20", step: "1" })));
    transform.appendChild(propertyRow("Height", makeInput("number", Math.round(obj.height), input => updateProperty(obj, "height", Math.max(20, Number(input.value))), { min: "20", step: "1" })));
    transform.appendChild(propertyRow("Rotation", makeInput("number", obj.rotation, input => updateProperty(obj, "rotation", Number(input.value)), { step: "1" })));
    transform.appendChild(propertyRow("Scale", makeInput("number", obj.scale, input => updateProperty(obj, "scale", Math.max(.25, Math.min(3, Number(input.value)))), { min: ".25", max: "3", step: ".05" })));

    const display = document.createElement("div");
    display.className = "property-group";
    display.innerHTML = '<div class="property-group-title">Display</div>';
    const labelToggle = document.createElement("input");
    labelToggle.type = "checkbox";
    labelToggle.checked = obj.labelVisible;
    labelToggle.addEventListener("change", () => updateProperty(obj, "labelVisible", labelToggle.checked));
    const lockToggle = document.createElement("input");
    lockToggle.type = "checkbox";
    lockToggle.checked = obj.locked;
    lockToggle.addEventListener("change", () => updateProperty(obj, "locked", lockToggle.checked));
    display.appendChild(propertyRow("Show label", labelToggle));
    display.appendChild(propertyRow("Locked", lockToggle));

    els.propertiesContent.append(identity, transform, display);
  }

  function updateProperty(obj, key, value) {
    const before = snapshot();
    obj[key] = value;
    clampObject(obj);
    pushHistory(before);
    render();
  }

  function openProperties() {
    if (!getSelected()) return;
    els.propertiesPanel.classList.add("open");
    els.propertiesPanel.setAttribute("aria-hidden", "false");
    renderProperties();
  }

  function closeProperties() {
    els.propertiesPanel.classList.remove("open");
    els.propertiesPanel.setAttribute("aria-hidden", "true");
  }

  function saveProject() {
    localStorage.setItem(STORAGE_KEY, snapshot());
    toast("Project saved in this browser");
  }

  function loadProject() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      toast("No saved project yet");
      return;
    }
    pushHistory();
    restore(saved);
    fitStage();
    toast("Project loaded");
  }

  function clearProject() {
    if (state.objects.length && !confirm("Start a new empty drum layout?")) return;
    pushHistory();
    state.objects = [];
    state.selectedId = null;
    els.projectName.value = "Untitled Drum Setup";
    closeProperties();
    render();
    fitStage();
  }

  function definition(type, fallbackName = type) {
    return equipment.find(item => item.type === type && item.name === fallbackName) || equipment.find(item => item.type === type) || { category: "Custom", type, name: fallbackName, width: 90, height: 70 };
  }

  function loadDemoKit() {
    const before = snapshot();
    state.objects = [];
    const items = [
      ["kick", '22" Kick', 700, 390, 0, 1.12],
      ["snare", '14" Snare', 560, 550, -8, 1.0],
      ["tom", '10" Tom', 625, 365, -8, 1],
      ["tom", '12" Tom', 765, 365, 8, 1],
      ["floorTom", '16" Floor Tom', 875, 535, 0, 1.08],
      ["hihat", '14" Hi-Hats', 425, 470, -7, 1],
      ["crash", '18" Crash', 450, 275, -6, 1.08],
      ["crash", '16" Crash', 930, 290, 8, 1],
      ["ride", '21" Ride', 885, 405, 8, 1.12],
      ["china", '18" China', 1050, 475, 14, 1],
      ["splash", '10" Splash', 620, 245, 0, .9],
      ["stack", '12" Stack', 780, 235, 0, .9],
      ["multipad", "Sample Pad", 395, 600, -12, .95],
      ["doublePedal", "Double Pedal", 700, 615, 0, .9],
      ["throne", "Throne", 690, 745, 0, 1],
      ["overhead", "Overhead Mic L", 340, 315, 22, 1],
      ["overhead", "Overhead Mic R", 1075, 315, -22, 1],
      ["mic", "Kick Mic", 700, 505, 0, .85],
      ["mic", "Snare Mic", 510, 490, 30, .8],
      ["monitor", "Drum Monitor", 1000, 715, -12, 1]
    ];

    items.forEach(([type, name, x, y, rotation, scale]) => {
      const base = equipment.find(item => item.type === type && (item.name === name || name.startsWith(item.name))) || equipment.find(item => item.type === type);
      if (!base) return;
      state.objects.push({
        id: uid(), type: base.type, category: base.category, name,
        x, y, width: base.width || base.size || 100, height: base.height || base.size || 100,
        rotation, scale, locked: false, labelVisible: true
      });
    });
    state.selectedId = null;
    els.projectName.value = "Hybrid Rock Kit";
    pushHistory(before);
    render();
    fitStage();
    toast("Demo kit loaded");
  }

  function exportPng() {
    const clone = els.svg.cloneNode(true);
    clone.classList.add("clean-mode");
    clone.style.transform = "none";
    clone.style.position = "static";
    clone.querySelectorAll(".selection-ring").forEach(node => node.remove());
    const guide = clone.querySelector("#stageGuides");
    if (guide) guide.remove();
    const grid = clone.querySelector("#gridLayer");
    if (grid) grid.setAttribute("opacity", "0");

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clone);
    if (!source.includes("xmlns=")) source = source.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = STAGE_WIDTH * 2;
      canvas.height = STAGE_HEIGHT * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.drawImage(image, 0, 0, STAGE_WIDTH, STAGE_HEIGHT);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      const safeName = (els.projectName.value || "drum-layout").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
      link.download = `${safeName || "drum-layout"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("PNG exported");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      toast("PNG export failed");
    };
    image.src = url;
  }

  function nudgeSelected(dx, dy) {
    const obj = getSelected();
    if (!obj || obj.locked) return;
    const before = snapshot();
    obj.x += dx;
    obj.y += dy;
    clampObject(obj);
    pushHistory(before);
    render();
  }

  function bindEvents() {
    els.librarySearch.addEventListener("input", () => renderLibrary(els.librarySearch.value));
    els.libraryToggle?.addEventListener("click", () => els.libraryPanel.classList.add("open"));
    els.libraryClose?.addEventListener("click", () => els.libraryPanel.classList.remove("open"));

    els.viewport.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    els.viewport.addEventListener("drop", event => {
      event.preventDefault();
      const type = event.dataTransfer.getData("text/plain");
      const def = equipment.find(item => item.type === type);
      if (!def) return;
      const pos = clientToWorld(event.clientX, event.clientY);
      addObject(def, pos.x, pos.y);
      els.libraryPanel.classList.remove("open");
    });

    els.viewport.addEventListener("pointerdown", event => {
      if (event.target === els.viewport || event.target === els.svg || event.target.id === "stageBackground" || event.target.id === "gridLayer") {
        if (event.button === 1 || state.spaceDown) startPan(event);
        else {
          state.selectedId = null;
          closeProperties();
          render();
        }
      }
    });

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    els.viewport.addEventListener("wheel", event => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : .9;
      setZoom(state.zoom * factor, { x: event.clientX, y: event.clientY });
    }, { passive: false });

    document.getElementById("newProjectBtn").addEventListener("click", clearProject);
    document.getElementById("demoBtn").addEventListener("click", loadDemoKit);
    document.getElementById("saveBtn").addEventListener("click", saveProject);
    document.getElementById("loadBtn").addEventListener("click", loadProject);
    document.getElementById("undoBtn").addEventListener("click", undo);
    document.getElementById("redoBtn").addEventListener("click", redo);
    document.getElementById("zoomOutBtn").addEventListener("click", () => setZoom(state.zoom * .9));
    document.getElementById("zoomInBtn").addEventListener("click", () => setZoom(state.zoom * 1.1));
    document.getElementById("zoomReadout").addEventListener("click", fitStage);
    document.getElementById("fitBtn").addEventListener("click", fitStage);
    document.getElementById("exportBtn").addEventListener("click", exportPng);
    document.getElementById("cleanViewBtn").addEventListener("click", () => {
      state.cleanView = !state.cleanView;
      document.getElementById("cleanViewBtn").textContent = state.cleanView ? "Exit Clean" : "Clean View";
      closeProperties();
      render();
    });

    document.getElementById("gridToggle").addEventListener("change", event => {
      els.gridLayer.setAttribute("opacity", event.target.checked ? ".55" : "0");
    });

    document.getElementById("duplicateBtn").addEventListener("click", duplicateSelected);
    document.getElementById("rotateLeftBtn").addEventListener("click", () => rotateSelected(-15));
    document.getElementById("rotateRightBtn").addEventListener("click", () => rotateSelected(15));
    document.getElementById("backBtn").addEventListener("click", () => changeLayer(-1));
    document.getElementById("frontBtn").addEventListener("click", () => changeLayer(1));
    document.getElementById("propertiesBtn").addEventListener("click", openProperties);
    document.getElementById("deleteBtn").addEventListener("click", deleteSelected);
    document.getElementById("propertiesClose").addEventListener("click", closeProperties);

    els.projectName.addEventListener("change", () => {
      toast("Project renamed");
    });

    window.addEventListener("keydown", event => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (event.code === "Space" && !typing) {
        state.spaceDown = true;
        event.preventDefault();
      }
      if (typing) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === "ArrowLeft") nudgeSelected(event.shiftKey ? -10 : -2, 0);
      else if (event.key === "ArrowRight") nudgeSelected(event.shiftKey ? 10 : 2, 0);
      else if (event.key === "ArrowUp") nudgeSelected(0, event.shiftKey ? -10 : -2);
      else if (event.key === "ArrowDown") nudgeSelected(0, event.shiftKey ? 10 : 2);
      else if (event.key.toLowerCase() === "r") rotateSelected(event.shiftKey ? -15 : 15);
    });

    window.addEventListener("keyup", event => {
      if (event.code === "Space") state.spaceDown = false;
    });
    window.addEventListener("blur", () => { state.spaceDown = false; });
    window.addEventListener("resize", () => applyViewTransform());
  }

  function init() {
    renderLibrary();
    bindEvents();
    loadDemoKit();
    setTimeout(fitStage, 0);
  }

  init();
})();
