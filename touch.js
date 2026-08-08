(() => {
  "use strict";

  // Drumit touch gesture bridge.
  // Keeps the existing editor's internal zoom/pan state authoritative by
  // translating a two-finger gesture into the wheel + middle-button events
  // that Drumit already understands.

  const viewport = document.getElementById("workspaceViewport");
  if (!viewport || !window.PointerEvent) return;

  viewport.style.touchAction = "none";

  const touches = new Map();
  let pinching = false;
  let lastDistance = 0;
  let lastMidpoint = null;
  let zoomAccumulator = 0;
  let ignoreUntilAllReleased = false;

  const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  function firstTwoTouches() {
    const values = [...touches.values()];
    return values.length >= 2 ? [values[0], values[1]] : null;
  }

  function dispatchSyntheticPointer(type, point, button = 1, buttons = 4) {
    const event = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerType: "mouse",
      clientX: point.x,
      clientY: point.y,
      button,
      buttons
    });
    if (type === "pointerdown") viewport.dispatchEvent(event);
    else window.dispatchEvent(event);
  }

  function endAnyExistingEditorGesture(point) {
    // A first finger may already have begun dragging a drum or stage before
    // the second finger landed. End that gesture cleanly before pinching.
    dispatchSyntheticPointer("pointerup", point, 0, 0);
  }

  function beginPinch() {
    const pair = firstTwoTouches();
    if (!pair) return;

    const mid = midpoint(pair[0], pair[1]);
    pinching = true;
    ignoreUntilAllReleased = true;
    lastDistance = Math.max(1, distance(pair[0], pair[1]));
    lastMidpoint = mid;
    zoomAccumulator = 0;

    endAnyExistingEditorGesture(mid);

    // Start Drumit's existing pan gesture at the pinch midpoint. As the
    // midpoint moves, the canvas follows both fingers naturally.
    dispatchSyntheticPointer("pointerdown", mid, 1, 4);
  }

  function updatePinch() {
    const pair = firstTwoTouches();
    if (!pair || !pinching) return;

    const currentDistance = Math.max(1, distance(pair[0], pair[1]));
    const mid = midpoint(pair[0], pair[1]);

    // Pan using the movement of the two-finger midpoint.
    dispatchSyntheticPointer("pointermove", mid, 1, 4);

    // Drumit's wheel zoom currently changes zoom in 10% steps. Accumulate
    // pinch movement so small finger movements remain smooth and deliberate
    // rather than firing a zoom step on every pointer event.
    const ratio = currentDistance / lastDistance;
    zoomAccumulator += Math.log(ratio);
    const threshold = Math.log(1.045);

    while (zoomAccumulator >= threshold) {
      viewport.dispatchEvent(new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        clientX: mid.x,
        clientY: mid.y,
        deltaY: -1
      }));
      zoomAccumulator -= threshold;
    }

    while (zoomAccumulator <= -threshold) {
      viewport.dispatchEvent(new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        clientX: mid.x,
        clientY: mid.y,
        deltaY: 1
      }));
      zoomAccumulator += threshold;
    }

    lastDistance = currentDistance;
    lastMidpoint = mid;
  }

  function finishPinch() {
    if (!pinching) return;
    const point = lastMidpoint || { x: 0, y: 0 };
    dispatchSyntheticPointer("pointerup", point, 1, 0);
    pinching = false;
    lastDistance = 0;
    lastMidpoint = null;
    zoomAccumulator = 0;
  }

  viewport.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch") return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (touches.size === 2) {
      // Stop the second real touch from starting another editor drag.
      event.preventDefault();
      event.stopImmediatePropagation();
      beginPinch();
    } else if (touches.size > 2 || pinching) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  viewport.addEventListener("pointermove", event => {
    if (event.pointerType !== "touch" || !touches.has(event.pointerId)) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinching) {
      event.preventDefault();
      event.stopImmediatePropagation();
      updatePinch();
    } else if (ignoreUntilAllReleased) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  function releaseTouch(event) {
    if (event.pointerType !== "touch") return;
    touches.delete(event.pointerId);

    if (pinching && touches.size < 2) {
      event.preventDefault();
      event.stopImmediatePropagation();
      finishPinch();
    }

    if (touches.size === 0) ignoreUntilAllReleased = false;
  }

  viewport.addEventListener("pointerup", releaseTouch, true);
  viewport.addEventListener("pointercancel", releaseTouch, true);

  // iOS Safari may still attempt page-level gesture handling in some versions.
  ["gesturestart", "gesturechange", "gestureend"].forEach(type => {
    viewport.addEventListener(type, event => event.preventDefault(), { passive: false });
  });
})();
