(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const riserLayer = document.getElementById("riserLayer");
  const stageTransform = document.getElementById("stageTransform");
  const stageBtn = document.getElementById("stageBtn");
  const viewport = document.getElementById("workspaceViewport");
  if (!riserLayer || !stageTransform || !stageBtn || !viewport) return;

  riserLayer.setAttribute("pointer-events", "all");

  let selected = false;
  let gesture = null;
  let overlay = null;

  const svgEl = (tag, attrs = {}) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    return el;
  };

  function localPoint(clientX, clientY) {
    const svg = stageTransform.ownerSVGElement;
    const p = svg.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    const ctm = stageTransform.getScreenCTM();
    return ctm ? p.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
  }

  function openStagePanel() {
    const panel = document.getElementById("propertiesPanel");
    if (!panel?.classList.contains("open") || !document.getElementById("rX")) stageBtn.click();
  }

  function getInputs() {
    openStagePanel();
    return {
      x: document.getElementById("rX"),
      y: document.getElementById("rY"),
      w: document.getElementById("rWidth"),
      h: document.getElementById("rDepth"),
      r: document.getElementById("rRotation")
    };
  }

  function setInput(el, value) {
    if (!el) return;
    el.value = String(Math.round(value * 1000) / 1000);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function commitInput(el) {
    if (el) el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getRiserGeometry() {
    const g = riserLayer.querySelector("g");
    const rect = g?.querySelector("rect");
    if (!g || !rect) return null;
    const x = Number(rect.getAttribute("x"));
    const y = Number(rect.getAttribute("y"));
    const w = Number(rect.getAttribute("width"));
    const h = Number(rect.getAttribute("height"));
    const match = (g.getAttribute("transform") || "").match(/rotate\(([-\d.]+)/);
    const rotation = match ? Number(match[1]) : 0;
    return { g, rect, x, y, w, h, rotation, cx: x + w / 2, cy: y + h / 2 };
  }

  function unrotatePoint(p, cx, cy, degrees) {
    const a = -degrees * Math.PI / 180;
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: cx + dx * Math.cos(a) - dy * Math.sin(a),
      y: cy + dx * Math.sin(a) + dy * Math.cos(a)
    };
  }

  function drawOverlay() {
    overlay?.remove();
    overlay = null;
    if (!selected) return;
    const geo = getRiserGeometry();
    if (!geo) return;

    overlay = svgEl("g", {
      id: "riserDirectControls",
      transform: `rotate(${geo.rotation} ${geo.cx} ${geo.cy})`,
      "pointer-events": "all"
    });

    overlay.append(svgEl("rect", {
      x: geo.x, y: geo.y, width: geo.w, height: geo.h,
      fill: "none", stroke: "#59c7ff", "stroke-width": 2,
      "stroke-dasharray": "7 5", "vector-effect": "non-scaling-stroke",
      "pointer-events": "none"
    }));

    const handleSize = 14;
    const points = {
      nw: [geo.x, geo.y], n: [geo.cx, geo.y], ne: [geo.x + geo.w, geo.y],
      e: [geo.x + geo.w, geo.cy], se: [geo.x + geo.w, geo.y + geo.h],
      s: [geo.cx, geo.y + geo.h], sw: [geo.x, geo.y + geo.h], w: [geo.x, geo.cy]
    };

    Object.entries(points).forEach(([name, [x, y]]) => {
      const h = svgEl("rect", {
        x: x - handleSize / 2, y: y - handleSize / 2,
        width: handleSize, height: handleSize, rx: 3,
        fill: "#0f2028", stroke: "#59c7ff", "stroke-width": 2,
        "vector-effect": "non-scaling-stroke", cursor: `${name}-resize`,
        "data-riser-handle": name
      });
      overlay.append(h);
    });

    const rotY = geo.y - 42;
    overlay.append(svgEl("line", {
      x1: geo.cx, y1: geo.y, x2: geo.cx, y2: rotY + 8,
      stroke: "#59c7ff", "stroke-width": 2, "vector-effect": "non-scaling-stroke",
      "pointer-events": "none"
    }));
    overlay.append(svgEl("circle", {
      cx: geo.cx, cy: rotY, r: 9,
      fill: "#0f2028", stroke: "#59c7ff", "stroke-width": 2,
      "vector-effect": "non-scaling-stroke", cursor: "grab",
      "data-riser-handle": "rotate"
    }));

    riserLayer.after(overlay);
    overlay.addEventListener("pointerdown", startHandleGesture);
  }

  function startMove(event) {
    if (event.pointerType === "touch" && event.isPrimary === false) return;
    const geo = getRiserGeometry();
    if (!geo) return;
    selected = true;
    openStagePanel();
    event.preventDefault();
    event.stopPropagation();
    const p = localPoint(event.clientX, event.clientY);
    gesture = { mode: "move", start: p, geo, inputs: getInputs() };
    drawOverlay();
  }

  function startHandleGesture(event) {
    const handle = event.target?.dataset?.riserHandle;
    if (!handle) return;
    const geo = getRiserGeometry();
    if (!geo) return;
    event.preventDefault();
    event.stopPropagation();
    const p = localPoint(event.clientX, event.clientY);
    gesture = { mode: handle === "rotate" ? "rotate" : "resize", handle, start: p, geo, inputs: getInputs() };
  }

  function updateMove(p) {
    const { geo, start, inputs } = gesture;
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    setInput(inputs.x, (geo.x + dx) / 100);
    setInput(inputs.y, (geo.y + dy) / 100);
  }

  function updateRotate(p) {
    const { geo, inputs } = gesture;
    const angle = Math.atan2(p.y - geo.cy, p.x - geo.cx) * 180 / Math.PI + 90;
    setInput(inputs.r, ((angle % 360) + 360) % 360);
  }

  function updateResize(p) {
    const { geo, handle, inputs } = gesture;
    const q = unrotatePoint(p, geo.cx, geo.cy, geo.rotation);
    let left = geo.x, right = geo.x + geo.w, top = geo.y, bottom = geo.y + geo.h;

    if (handle.includes("w")) left = Math.min(q.x, right - 50);
    if (handle.includes("e")) right = Math.max(q.x, left + 50);
    if (handle.includes("n")) top = Math.min(q.y, bottom - 50);
    if (handle.includes("s")) bottom = Math.max(q.y, top + 50);

    const newW = right - left;
    const newH = bottom - top;
    setInput(inputs.x, left / 100);
    setInput(inputs.y, top / 100);
    setInput(inputs.w, newW / 100);
    setInput(inputs.h, newH / 100);
  }

  window.addEventListener("pointermove", event => {
    if (!gesture) return;
    if (event.pointerType === "touch" && !event.isPrimary) return;
    event.preventDefault();
    const p = localPoint(event.clientX, event.clientY);
    if (gesture.mode === "move") updateMove(p);
    else if (gesture.mode === "rotate") updateRotate(p);
    else updateResize(p);
    requestAnimationFrame(drawOverlay);
  }, { passive: false });

  window.addEventListener("pointerup", () => {
    if (!gesture) return;
    Object.values(gesture.inputs || {}).forEach(commitInput);
    gesture = null;
    requestAnimationFrame(drawOverlay);
  });

  function bindRiser() {
    riserLayer.setAttribute("pointer-events", "all");
    const g = riserLayer.querySelector("g");
    const rect = g?.querySelector("rect");
    if (!g || !rect) {
      selected = false;
      drawOverlay();
      return;
    }
    rect.style.cursor = "move";
    rect.style.pointerEvents = "all";
    rect.onpointerdown = startMove;
    rect.onclick = event => {
      selected = true;
      event.stopPropagation();
      openStagePanel();
      drawOverlay();
    };
    requestAnimationFrame(drawOverlay);
  }

  const observer = new MutationObserver(bindRiser);
  observer.observe(riserLayer, { childList: true, subtree: true });
  bindRiser();

  viewport.addEventListener("pointerdown", event => {
    if (event.target.closest?.("#riserLayer") || event.target.closest?.("#riserDirectControls")) return;
    if (selected && !gesture) {
      selected = false;
      drawOverlay();
    }
  }, true);
})();
