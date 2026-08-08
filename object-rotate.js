(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const objectLayer = document.getElementById("objectLayer");
  const propertiesBtn = document.getElementById("propertiesBtn");
  if (!objectLayer || !propertiesBtn) return;

  let gesture = null;
  let refreshQueued = false;

  const svgEl = (tag, attrs = {}) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    return el;
  };

  function selectedGroup() {
    return objectLayer.querySelector(".drum-object.selected");
  }

  function currentRotation() {
    const input = document.getElementById("pRotation");
    if (input) return Number(input.value) || 0;
    const group = selectedGroup();
    const match = (group?.getAttribute("transform") || "").match(/rotate\(([-\d.]+)/);
    return match ? Number(match[1]) : 0;
  }

  function ensureProperties() {
    if (!document.getElementById("pRotation")) propertiesBtn.click();
    return document.getElementById("pRotation");
  }

  function objectCenterScreen(group) {
    const svg = group.ownerSVGElement;
    const point = svg.createSVGPoint();
    point.x = 0;
    point.y = 0;
    const matrix = group.getScreenCTM();
    return matrix ? point.matrixTransform(matrix) : { x: 0, y: 0 };
  }

  function angleFrom(center, clientX, clientY) {
    return Math.atan2(clientY - center.y, clientX - center.x) * 180 / Math.PI;
  }

  function normalize(value) {
    return ((Number(value) % 360) + 360) % 360;
  }

  function setRotation(value, commit = false) {
    const input = ensureProperties();
    if (!input) return;
    input.value = String(Math.round(normalize(value) * 10) / 10);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (commit) input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function drawHandle() {
    if (gesture) return;

    objectLayer.querySelectorAll(".object-direct-rotate").forEach(node => node.remove());
    const group = selectedGroup();
    if (!group || group.classList.contains("locked")) return;

    const ring = group.querySelector(".selection-ring");
    if (!ring) return;

    const x = Number(ring.getAttribute("x"));
    const y = Number(ring.getAttribute("y"));
    const width = Number(ring.getAttribute("width"));
    const centerX = x + width / 2;
    const handleY = y - 46;

    const controls = svgEl("g", {
      class: "object-direct-rotate",
      "data-object-control": "rotate"
    });

    controls.append(svgEl("line", {
      x1: centerX,
      y1: y,
      x2: centerX,
      y2: handleY + 12,
      stroke: "#59c7ff",
      "stroke-width": 2.5,
      "vector-effect": "non-scaling-stroke",
      "pointer-events": "none"
    }));

    // Large invisible target makes rotation easy to grab on phones/tablets.
    const hit = svgEl("circle", {
      cx: centerX,
      cy: handleY,
      r: 24,
      fill: "transparent",
      cursor: "grab",
      "data-object-rotate-hit": "true"
    });

    const visible = svgEl("circle", {
      cx: centerX,
      cy: handleY,
      r: 12,
      fill: "#10212a",
      stroke: "#59c7ff",
      "stroke-width": 3,
      "vector-effect": "non-scaling-stroke",
      "pointer-events": "none"
    });

    const dot = svgEl("circle", {
      cx: centerX,
      cy: handleY,
      r: 3,
      fill: "#59c7ff",
      "pointer-events": "none"
    });

    controls.append(hit, visible, dot);
    group.append(controls);

    hit.addEventListener("pointerdown", event => {
      if (event.pointerType === "touch" && event.isPrimary === false) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const selected = selectedGroup();
      if (!selected) return;

      const center = objectCenterScreen(selected);
      gesture = {
        pointerId: event.pointerId,
        center,
        startAngle: angleFrom(center, event.clientX, event.clientY),
        startRotation: currentRotation()
      };
      hit.setPointerCapture?.(event.pointerId);
      hit.style.cursor = "grabbing";
    });
  }

  window.addEventListener("pointermove", event => {
    if (!gesture) return;
    if (event.pointerId !== gesture.pointerId) return;
    if (event.pointerType === "touch" && event.isPrimary === false) return;

    event.preventDefault();
    const now = angleFrom(gesture.center, event.clientX, event.clientY);
    setRotation(gesture.startRotation + (now - gesture.startAngle), false);
  }, { passive: false });

  function finishGesture(event) {
    if (!gesture) return;
    if (event?.pointerId != null && event.pointerId !== gesture.pointerId) return;
    setRotation(currentRotation(), true);
    gesture = null;
    queueRefresh();
  }

  window.addEventListener("pointerup", finishGesture);
  window.addEventListener("pointercancel", finishGesture);

  function queueRefresh() {
    if (refreshQueued || gesture) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      drawHandle();
    });
  }

  const observer = new MutationObserver(queueRefresh);
  observer.observe(objectLayer, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "transform"]
  });

  objectLayer.addEventListener("click", queueRefresh, true);
  queueRefresh();
})();
