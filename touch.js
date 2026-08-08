(() => {
  "use strict";

  // Drumit touch gestures.
  // Uses real browser touch events and Drumit's existing zoom buttons so the
  // editor's internal zoom state always stays authoritative and in sync.

  const viewport = document.getElementById("workspaceViewport");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");

  if (!viewport || !zoomInBtn || !zoomOutBtn) return;

  // Tell the browser that Drumit owns gestures inside the design surface.
  viewport.style.touchAction = "none";
  viewport.style.overscrollBehavior = "none";

  let pinching = false;
  let lastDistance = 0;
  let accumulatedScale = 1;
  let lastMidX = 0;
  let lastMidY = 0;

  const getDistance = (a, b) => {
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    return Math.hypot(dx, dy);
  };

  const getMidpoint = (a, b) => ({
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  });

  function beginPinch(event) {
    if (event.touches.length < 2) return;

    const a = event.touches[0];
    const b = event.touches[1];
    const mid = getMidpoint(a, b);

    pinching = true;
    lastDistance = Math.max(1, getDistance(a, b));
    accumulatedScale = 1;
    lastMidX = mid.x;
    lastMidY = mid.y;

    event.preventDefault();
    event.stopPropagation();
  }

  function updatePinch(event) {
    if (!pinching || event.touches.length < 2) return;

    const a = event.touches[0];
    const b = event.touches[1];
    const currentDistance = Math.max(1, getDistance(a, b));
    const ratio = currentDistance / lastDistance;
    const mid = getMidpoint(a, b);

    accumulatedScale *= ratio;

    // Use Drumit's own + / - controls. Each click updates the real editor
    // state, so selection, dragging and coordinate conversion stay correct.
    // The threshold is deliberately small enough to feel responsive on touch.
    const zoomInThreshold = 1.055;
    const zoomOutThreshold = 1 / zoomInThreshold;

    while (accumulatedScale >= zoomInThreshold) {
      zoomInBtn.click();
      accumulatedScale /= zoomInThreshold;
    }

    while (accumulatedScale <= zoomOutThreshold) {
      zoomOutBtn.click();
      accumulatedScale /= zoomOutThreshold;
    }

    lastDistance = currentDistance;
    lastMidX = mid.x;
    lastMidY = mid.y;

    event.preventDefault();
    event.stopPropagation();
  }

  function endPinch(event) {
    if (!pinching) return;

    if (event.touches.length < 2) {
      pinching = false;
      lastDistance = 0;
      accumulatedScale = 1;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  // Capture-phase listeners run before SVG object/stage drag handlers, which
  // prevents a two-finger gesture being mistaken for two independent drags.
  viewport.addEventListener("touchstart", event => {
    if (event.touches.length >= 2) beginPinch(event);
  }, { passive: false, capture: true });

  viewport.addEventListener("touchmove", event => {
    if (event.touches.length >= 2) {
      if (!pinching) beginPinch(event);
      updatePinch(event);
    }
  }, { passive: false, capture: true });

  viewport.addEventListener("touchend", endPinch, { passive: false, capture: true });
  viewport.addEventListener("touchcancel", endPinch, { passive: false, capture: true });

  // Safari/iPadOS can emit separate gesture events even when touch-action is
  // disabled. Block those so the browser page itself never zooms underneath
  // the Drumit editor.
  ["gesturestart", "gesturechange", "gestureend"].forEach(type => {
    viewport.addEventListener(type, event => event.preventDefault(), { passive: false });
  });
})();
