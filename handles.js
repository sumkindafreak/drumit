(() => {
  "use strict";

  // Make direct-edit resize/rotation controls easier to grab,
  // especially on phones and tablets. This works on top of the
  // existing Stage and Riser interaction code without changing the
  // underlying geometry or saved project data.

  const stageLayer = document.getElementById("stageInteractionLayer");
  const riserLayer = document.getElementById("riserLayer");
  if (!stageLayer || !riserLayer) return;

  function enlargeStageHandles() {
    stageLayer.querySelectorAll(".stage-handle").forEach(handle => {
      handle.setAttribute("r", "13");
      handle.setAttribute("stroke-width", "3");
      handle.style.cursor = handle.dataset.handle ? `${handle.dataset.handle}-resize` : "pointer";
    });

    stageLayer.querySelectorAll(".stage-rotate-handle").forEach(handle => {
      handle.setAttribute("r", "15");
      handle.setAttribute("stroke-width", "3");
    });
  }

  function enlargeRiserHandles() {
    const overlay = document.getElementById("riserDirectControls");
    if (!overlay) return;

    overlay.querySelectorAll("rect[data-riser-handle]").forEach(handle => {
      const x = Number(handle.getAttribute("x"));
      const y = Number(handle.getAttribute("y"));
      const width = Number(handle.getAttribute("width"));
      const height = Number(handle.getAttribute("height"));
      const cx = x + width / 2;
      const cy = y + height / 2;
      const size = 24;

      handle.setAttribute("x", String(cx - size / 2));
      handle.setAttribute("y", String(cy - size / 2));
      handle.setAttribute("width", String(size));
      handle.setAttribute("height", String(size));
      handle.setAttribute("rx", "5");
      handle.setAttribute("stroke-width", "3");
    });

    overlay.querySelectorAll('circle[data-riser-handle="rotate"]').forEach(handle => {
      handle.setAttribute("r", "15");
      handle.setAttribute("stroke-width", "3");
    });
  }

  function refresh() {
    enlargeStageHandles();
    enlargeRiserHandles();
  }

  const observer = new MutationObserver(() => requestAnimationFrame(refresh));
  observer.observe(stageLayer, { childList: true, subtree: true });
  observer.observe(document.getElementById("workspaceSvg"), { childList: true, subtree: true });

  refresh();
})();
