(() => {
  'use strict';

  const STORAGE_KEY = 'drumit.fillComposer.library.v1';
  const MAX_HISTORY = 80;

  const INSTRUMENTS = [
    { id: 'hihat', label: 'Hi-Hat', short: 'HH', staffY: 34, cymbal: true },
    { id: 'crash', label: 'Crash', short: 'CR', staffY: 28, cymbal: true },
    { id: 'ride', label: 'Ride', short: 'RD', staffY: 39, cymbal: true },
    { id: 'tom1', label: 'Tom 1', short: 'T1', staffY: 48 },
    { id: 'tom2', label: 'Tom 2', short: 'T2', staffY: 59 },
    { id: 'floor', label: 'Floor Tom', short: 'FT', staffY: 78 },
    { id: 'snare', label: 'Snare', short: 'SN', staffY: 68 },
    { id: 'kick', label: 'Kick', short: 'K', staffY: 96 }
  ];

  const state = {
    name: 'Untitled Fill',
    bpm: 120,
    timeSignature: '4/4',
    bars: 1,
    subdivision: 16,
    stickMode: 'AUTO',
    loop: true,
    cells: {},
    cursorStep: 0,
    playingStep: -1,
    isPlaying: false
  };

  const history = [];
  const future = [];
  let audioContext = null;
  let timerId = null;
  let toastTimer = null;

  const el = {
    backToDesignerBtn: document.getElementById('backToDesignerBtn'),
    fillName: document.getElementById('fillName'),
    bpmInput: document.getElementById('bpmInput'),
    timeSignature: document.getElementById('timeSignature'),
    barsSelect: document.getElementById('barsSelect'),
    subdivisionSelect: document.getElementById('subdivisionSelect'),
    stickMode: document.getElementById('stickMode'),
    instrumentLabels: document.getElementById('instrumentLabels'),
    beatHeader: document.getElementById('beatHeader'),
    sequencerGrid: document.getElementById('sequencerGrid'),
    stickingRow: document.getElementById('stickingRow'),
    sequencerScroll: document.getElementById('sequencerScroll'),
    notationScroll: document.getElementById('notationScroll'),
    notationSvg: document.getElementById('notationSvg'),
    padRack: document.getElementById('padRack'),
    autoAdvance: document.getElementById('autoAdvance'),
    rewindBtn: document.getElementById('rewindBtn'),
    playBtn: document.getElementById('playBtn'),
    stopBtn: document.getElementById('stopBtn'),
    loopToggle: document.getElementById('loopToggle'),
    positionReadout: document.getElementById('positionReadout'),
    durationReadout: document.getElementById('durationReadout'),
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    demoBtn: document.getElementById('demoBtn'),
    clearBtn: document.getElementById('clearBtn'),
    saveBtn: document.getElementById('saveBtn'),
    loadBtn: document.getElementById('loadBtn'),
    importBtn: document.getElementById('importBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importInput: document.getElementById('importInput'),
    loadDialog: document.getElementById('loadDialog'),
    savedFillList: document.getElementById('savedFillList'),
    toast: document.getElementById('toast')
  };

  function signatureParts() {
    const [numerator, denominator] = state.timeSignature.split('/').map(Number);
    return { numerator, denominator };
  }

  function stepsPerBeat() {
    const { denominator } = signatureParts();
    if (state.subdivision === 12) return 3;
    return Math.max(1, state.subdivision / denominator);
  }

  function totalSteps() {
    const { numerator } = signatureParts();
    return Math.round(numerator * stepsPerBeat() * state.bars);
  }

  function stepDurationSeconds() {
    const { denominator } = signatureParts();
    const beatDuration = (60 / state.bpm) * (4 / denominator);
    return beatDuration / stepsPerBeat();
  }

  function fillDurationSeconds() {
    return totalSteps() * stepDurationSeconds();
  }

  function cellKey(instrumentId, step) {
    return `${instrumentId}:${step}`;
  }

  function getCell(instrumentId, step) {
    return state.cells[cellKey(instrumentId, step)] || null;
  }

  function cloneCells() {
    return JSON.parse(JSON.stringify(state.cells));
  }

  function pushHistory() {
    history.push(cloneCells());
    if (history.length > MAX_HISTORY) history.shift();
    future.length = 0;
    updateUndoRedoButtons();
  }

  function undo() {
    if (!history.length) return;
    future.push(cloneCells());
    state.cells = history.pop();
    renderDataOnly();
    updateUndoRedoButtons();
    showToast('Undo');
  }

  function redo() {
    if (!future.length) return;
    history.push(cloneCells());
    state.cells = future.pop();
    renderDataOnly();
    updateUndoRedoButtons();
    showToast('Redo');
  }

  function updateUndoRedoButtons() {
    el.undoBtn.disabled = history.length === 0;
    el.redoBtn.disabled = future.length === 0;
  }

  function nextAutoStick(instrumentId, step) {
    if (instrumentId === 'kick') return 'K';

    let priorHandHits = 0;
    for (let s = 0; s <= step; s += 1) {
      for (const instrument of INSTRUMENTS) {
        if (instrument.id === 'kick') continue;
        if (s === step && instrument.id === instrumentId) break;
        if (getCell(instrument.id, s)) priorHandHits += 1;
      }
    }
    return priorHandHits % 2 === 0 ? 'R' : 'L';
  }

  function chosenStick(instrumentId, step) {
    if (instrumentId === 'kick') return 'K';
    if (state.stickMode === 'AUTO') return nextAutoStick(instrumentId, step);
    return state.stickMode;
  }

  function cycleStick(current, instrumentId) {
    if (instrumentId === 'kick') return 'K';
    const values = ['R', 'L', 'B', 'K'];
    const index = values.indexOf(current);
    return values[(index + 1 + values.length) % values.length];
  }

  function cycleCell(instrumentId, step) {
    pushHistory();
    const key = cellKey(instrumentId, step);
    const current = state.cells[key];

    if (!current) {
      state.cells[key] = { hit: 'normal', stick: chosenStick(instrumentId, step) };
    } else if (current.hit === 'normal') {
      current.hit = 'accent';
    } else if (current.hit === 'accent') {
      current.hit = 'ghost';
    } else {
      delete state.cells[key];
    }

    state.cursorStep = step;
    renderDataOnly();
  }

  function removeCell(instrumentId, step) {
    const key = cellKey(instrumentId, step);
    if (!state.cells[key]) return;
    pushHistory();
    delete state.cells[key];
    state.cursorStep = step;
    renderDataOnly();
  }

  function changeCellStick(instrumentId, step) {
    const cell = getCell(instrumentId, step);
    if (!cell) return;
    pushHistory();
    cell.stick = cycleStick(cell.stick, instrumentId);
    state.cursorStep = step;
    renderDataOnly();
  }

  function writePad(instrumentId) {
    const step = Math.min(state.cursorStep, totalSteps() - 1);
    const key = cellKey(instrumentId, step);
    pushHistory();
    state.cells[key] = { hit: 'normal', stick: chosenStick(instrumentId, step) };
    playInstrument(instrumentId, 'normal');

    if (el.autoAdvance.checked) {
      state.cursorStep = Math.min(totalSteps() - 1, step + 1);
    }
    renderDataOnly();
    ensureCursorVisible();
  }

  function beatClass(step) {
    const spb = stepsPerBeat();
    const { numerator } = signatureParts();
    const stepsPerBar = Math.round(numerator * spb);
    if (step % stepsPerBar === 0) return 'bar-start';
    if (step % spb === 0) return 'beat-start';
    return '';
  }

  function renderStructure() {
    const count = totalSteps();
    const columns = `repeat(${count}, var(--step-width))`;
    el.beatHeader.style.gridTemplateColumns = columns;
    el.sequencerGrid.style.gridTemplateColumns = columns;
    el.stickingRow.style.gridTemplateColumns = columns;

    renderLabels();
    renderBeatHeader();
    renderGrid();
    renderPads();
    renderDataOnly();
  }

  function renderLabels() {
    el.instrumentLabels.innerHTML = '';
    for (const instrument of INSTRUMENTS) {
      const label = document.createElement('div');
      label.className = 'instrument-label';
      label.dataset.instrument = instrument.id;
      label.innerHTML = `<span class="instrument-swatch"></span><span>${instrument.label}</span>`;
      el.instrumentLabels.appendChild(label);
    }
    const sticking = document.createElement('div');
    sticking.className = 'instrument-label sticking-label';
    sticking.textContent = 'Sticking';
    el.instrumentLabels.appendChild(sticking);
  }

  function subdivisionLabel(indexWithinBeat) {
    const spb = stepsPerBeat();
    if (spb === 1) return '';
    if (spb === 2) return ['', '&'][indexWithinBeat] || '';
    if (spb === 3) return ['', 'trip', 'let'][indexWithinBeat] || '';
    if (spb === 4) return ['', 'e', '&', 'a'][indexWithinBeat] || '';
    if (spb === 8) return ['', 'e', '&', 'a', '+', 'e', '&', 'a'][indexWithinBeat] || '';
    return String(indexWithinBeat + 1);
  }

  function renderBeatHeader() {
    el.beatHeader.innerHTML = '';
    const count = totalSteps();
    const spb = stepsPerBeat();
    const { numerator } = signatureParts();
    const stepsPerBar = Math.round(numerator * spb);

    for (let step = 0; step < count; step += 1) {
      const beatIndex = Math.floor((step % stepsPerBar) / spb);
      const subdivisionIndex = step % spb;
      const barIndex = Math.floor(step / stepsPerBar);
      const cell = document.createElement('div');
      cell.className = `beat-cell ${beatClass(step)}`;
      if (subdivisionIndex === 0) {
        cell.textContent = `${barIndex + 1}.${beatIndex + 1}`;
      } else {
        cell.textContent = subdivisionLabel(subdivisionIndex);
      }
      el.beatHeader.appendChild(cell);
    }
  }

  function renderGrid() {
    el.sequencerGrid.innerHTML = '';
    const count = totalSteps();

    for (const instrument of INSTRUMENTS) {
      for (let step = 0; step < count; step += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `step-cell ${beatClass(step)}`;
        cell.dataset.instrument = instrument.id;
        cell.dataset.step = String(step);
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `${instrument.label}, step ${step + 1}`);

        cell.addEventListener('click', (event) => {
          if (event.shiftKey) changeCellStick(instrument.id, step);
          else cycleCell(instrument.id, step);
        });

        cell.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          removeCell(instrument.id, step);
        });

        el.sequencerGrid.appendChild(cell);
      }
    }

    el.stickingRow.innerHTML = '';
    for (let step = 0; step < count; step += 1) {
      const stickCell = document.createElement('div');
      stickCell.className = `sticking-cell ${beatClass(step)}`;
      stickCell.dataset.step = String(step);
      el.stickingRow.appendChild(stickCell);
    }
  }

  function renderPads() {
    el.padRack.innerHTML = '';
    for (const instrument of INSTRUMENTS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pad-button';
      button.dataset.instrument = instrument.id;
      button.textContent = instrument.label;
      button.addEventListener('click', () => writePad(instrument.id));
      el.padRack.appendChild(button);
    }
  }

  function renderDataOnly() {
    const count = totalSteps();
    const gridCells = el.sequencerGrid.querySelectorAll('.step-cell');

    for (const cellElement of gridCells) {
      const instrumentId = cellElement.dataset.instrument;
      const step = Number(cellElement.dataset.step);
      const cell = getCell(instrumentId, step);
      cellElement.innerHTML = '';
      cellElement.classList.toggle('cursor-step', step === state.cursorStep);
      cellElement.classList.toggle('playing-step', step === state.playingStep);

      if (cell) {
        const chip = document.createElement('span');
        chip.className = `hit-chip ${cell.hit}`;
        chip.dataset.instrument = instrumentId;
        chip.textContent = cell.stick || '';
        cellElement.appendChild(chip);
      }
    }

    const stickElements = el.stickingRow.querySelectorAll('.sticking-cell');
    for (const stickElement of stickElements) {
      const step = Number(stickElement.dataset.step);
      const sticks = [];
      for (const instrument of INSTRUMENTS) {
        const cell = getCell(instrument.id, step);
        if (cell && cell.stick && !sticks.includes(cell.stick)) sticks.push(cell.stick);
      }
      stickElement.textContent = sticks.join('+');
      stickElement.classList.toggle('has-stick', sticks.length > 0);
    }

    if (state.cursorStep >= count) state.cursorStep = Math.max(0, count - 1);
    renderNotation();
    updateReadouts();
  }

  function svgElement(tag, attrs = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
    return node;
  }

  function renderNotation() {
    const count = totalSteps();
    const stepSpacing = 42;
    const left = 78;
    const width = Math.max(720, left + count * stepSpacing + 35);
    const svg = el.notationSvg;
    svg.setAttribute('viewBox', `0 0 ${width} 154`);
    svg.setAttribute('width', String(width));
    svg.innerHTML = '';

    const paper = svgElement('rect', { x: 0, y: 0, width, height: 154, fill: '#f7f5ee' });
    svg.appendChild(paper);

    const title = svgElement('text', { x: 14, y: 19, fill: '#56534d', 'font-size': 9, 'font-weight': 800, 'letter-spacing': '.08em' });
    title.textContent = `${state.timeSignature}  ·  ${state.bpm} BPM  ·  ${state.bars} BAR${state.bars === 1 ? '' : 'S'}`;
    svg.appendChild(title);

    const staffTop = 42;
    const staffGap = 12;
    for (let line = 0; line < 5; line += 1) {
      svg.appendChild(svgElement('line', { x1: 50, y1: staffTop + line * staffGap, x2: width - 18, y2: staffTop + line * staffGap, stroke: '#282725', 'stroke-width': 1 }));
    }

    const drumText = svgElement('text', { x: 8, y: 70, fill: '#282725', 'font-size': 10, 'font-weight': 900 });
    drumText.textContent = 'DRUM';
    svg.appendChild(drumText);

    const { numerator } = signatureParts();
    const spb = stepsPerBeat();
    const stepsPerBar = Math.round(numerator * spb);
    for (let step = 0; step <= count; step += 1) {
      if (step % stepsPerBar !== 0) continue;
      const x = left - 15 + step * stepSpacing;
      svg.appendChild(svgElement('line', { x1: x, y1: staffTop, x2: x, y2: staffTop + staffGap * 4, stroke: '#282725', 'stroke-width': step === count ? 2 : 1.2 }));
      if (step < count) {
        const barNo = svgElement('text', { x: x + 5, y: 34, fill: '#77736c', 'font-size': 8, 'font-weight': 800 });
        barNo.textContent = `BAR ${Math.floor(step / stepsPerBar) + 1}`;
        svg.appendChild(barNo);
      }
    }

    for (let step = 0; step < count; step += 1) {
      const x = left + step * stepSpacing;
      const hits = INSTRUMENTS.map((instrument) => ({ instrument, cell: getCell(instrument.id, step) })).filter((item) => item.cell);
      if (!hits.length) continue;

      hits.forEach(({ instrument, cell }, index) => {
        const xOffset = hits.length > 1 ? (index - (hits.length - 1) / 2) * 3.5 : 0;
        const noteX = x + xOffset;
        const noteY = instrument.staffY;
        const opacity = cell.hit === 'ghost' ? 0.45 : 1;
        const group = svgElement('g', { opacity });

        if (instrument.cymbal) {
          group.appendChild(svgElement('line', { x1: noteX - 5, y1: noteY - 5, x2: noteX + 5, y2: noteY + 5, stroke: '#202020', 'stroke-width': 2 }));
          group.appendChild(svgElement('line', { x1: noteX + 5, y1: noteY - 5, x2: noteX - 5, y2: noteY + 5, stroke: '#202020', 'stroke-width': 2 }));
        } else {
          group.appendChild(svgElement('ellipse', { cx: noteX, cy: noteY, rx: 6, ry: 4, fill: '#202020', transform: `rotate(-18 ${noteX} ${noteY})` }));
        }

        const stemUp = noteY >= 65;
        const stemStartY = noteY;
        const stemEndY = stemUp ? noteY - 28 : noteY + 28;
        const stemX = stemUp ? noteX + 5 : noteX - 5;
        group.appendChild(svgElement('line', { x1: stemX, y1: stemStartY, x2: stemX, y2: stemEndY, stroke: '#202020', 'stroke-width': 1.4 }));

        if (cell.hit === 'accent') {
          const accent = svgElement('text', { x: noteX - 4, y: noteY - 12, fill: '#202020', 'font-size': 11, 'font-weight': 900 });
          accent.textContent = '>';
          group.appendChild(accent);
        }

        if (cell.hit === 'ghost') {
          const leftParen = svgElement('text', { x: noteX - 11, y: noteY + 4, fill: '#202020', 'font-size': 12 });
          leftParen.textContent = '(';
          const rightParen = svgElement('text', { x: noteX + 7, y: noteY + 4, fill: '#202020', 'font-size': 12 });
          rightParen.textContent = ')';
          group.appendChild(leftParen);
          group.appendChild(rightParen);
        }

        svg.appendChild(group);
      });

      const sticks = hits.map((item) => item.cell.stick).filter(Boolean);
      if (sticks.length) {
        const sticking = svgElement('text', { x, y: 132, fill: '#3b3a37', 'font-size': 10, 'font-weight': 900, 'text-anchor': 'middle' });
        sticking.textContent = [...new Set(sticks)].join('+');
        svg.appendChild(sticking);
      }
    }

    const cursorX = left + state.cursorStep * stepSpacing;
    svg.appendChild(svgElement('line', { x1: cursorX, y1: 22, x2: cursorX, y2: 139, stroke: '#b68a24', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.55 }));
  }

  function updateReadouts() {
    const count = totalSteps();
    const spb = stepsPerBeat();
    const { numerator } = signatureParts();
    const stepsPerBar = Math.round(numerator * spb);
    const safeStep = Math.min(Math.max(0, state.cursorStep), count - 1);
    const bar = Math.floor(safeStep / stepsPerBar) + 1;
    const inBar = safeStep % stepsPerBar;
    const beat = Math.floor(inBar / spb) + 1;
    const subStep = (inBar % spb) + 1;
    el.positionReadout.textContent = `Bar ${bar} · Beat ${beat} · Step ${subStep}`;
    el.durationReadout.textContent = `${fillDurationSeconds().toFixed(1)} sec`;
    el.playBtn.classList.toggle('active', state.isPlaying);
    el.playBtn.textContent = state.isPlaying ? '❚❚' : '▶';
    el.playBtn.setAttribute('aria-label', state.isPlaying ? 'Pause' : 'Play');
  }

  function ensureCursorVisible() {
    const target = el.sequencerGrid.querySelector(`.step-cell[data-instrument="hihat"][data-step="${state.cursorStep}"]`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  function ensureAudioContext() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioContext = new AudioCtx();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  function noiseBurst(context, when, duration, filterFrequency, gainValue) {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) data[i] = Math.random() * 2 - 1;

    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(filterFrequency, when);
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(when);
    source.stop(when + duration);
  }

  function tone(context, when, frequency, endFrequency, duration, gainValue) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), when + duration);
    gain.gain.setValueAtTime(gainValue, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(when);
    oscillator.stop(when + duration);
  }

  function playInstrument(instrumentId, hitType = 'normal', when = null) {
    const context = ensureAudioContext();
    if (!context) return;
    const start = when ?? context.currentTime;
    const dynamic = hitType === 'accent' ? 1.25 : hitType === 'ghost' ? 0.34 : 0.82;

    switch (instrumentId) {
      case 'kick':
        tone(context, start, 145, 46, 0.18, 0.7 * dynamic);
        break;
      case 'snare':
        noiseBurst(context, start, 0.13, 900, 0.42 * dynamic);
        tone(context, start, 190, 145, 0.09, 0.25 * dynamic);
        break;
      case 'tom1':
        tone(context, start, 210, 125, 0.2, 0.48 * dynamic);
        break;
      case 'tom2':
        tone(context, start, 165, 95, 0.22, 0.5 * dynamic);
        break;
      case 'floor':
        tone(context, start, 120, 66, 0.26, 0.54 * dynamic);
        break;
      case 'hihat':
        noiseBurst(context, start, 0.055, 5200, 0.18 * dynamic);
        break;
      case 'ride':
        noiseBurst(context, start, 0.22, 3600, 0.2 * dynamic);
        tone(context, start, 790, 700, 0.14, 0.08 * dynamic);
        break;
      case 'crash':
        noiseBurst(context, start, 0.5, 2800, 0.28 * dynamic);
        break;
      default:
        break;
    }
  }

  function triggerStep(step) {
    state.playingStep = step;
    state.cursorStep = step;
    for (const instrument of INSTRUMENTS) {
      const cell = getCell(instrument.id, step);
      if (cell) playInstrument(instrument.id, cell.hit);
    }
    renderDataOnly();
    ensureCursorVisible();
  }

  function startPlayback() {
    if (state.isPlaying) {
      pausePlayback();
      return;
    }
    ensureAudioContext();
    state.isPlaying = true;
    if (state.cursorStep >= totalSteps() - 1) state.cursorStep = 0;
    triggerStep(state.cursorStep);

    const intervalMs = Math.max(12, stepDurationSeconds() * 1000);
    timerId = window.setInterval(() => {
      let next = state.playingStep + 1;
      if (next >= totalSteps()) {
        if (state.loop) next = 0;
        else {
          stopPlayback(false);
          return;
        }
      }
      triggerStep(next);
    }, intervalMs);
    updateReadouts();
  }

  function pausePlayback() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    state.isPlaying = false;
    state.playingStep = -1;
    renderDataOnly();
  }

  function stopPlayback(resetCursor = true) {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    state.isPlaying = false;
    state.playingStep = -1;
    if (resetCursor) state.cursorStep = 0;
    renderDataOnly();
  }

  function rewind() {
    state.cursorStep = 0;
    state.playingStep = state.isPlaying ? 0 : -1;
    renderDataOnly();
    el.sequencerScroll.scrollLeft = 0;
    el.notationScroll.scrollLeft = 0;
  }

  function currentFillObject() {
    return {
      version: 1,
      type: 'drumit-fill',
      name: state.name.trim() || 'Untitled Fill',
      bpm: state.bpm,
      timeSignature: state.timeSignature,
      bars: state.bars,
      subdivision: state.subdivision,
      cells: cloneCells(),
      updatedAt: new Date().toISOString()
    };
  }

  function applyFillObject(data) {
    if (!data || data.type !== 'drumit-fill' || !data.cells) throw new Error('Not a Drumit fill file');
    stopPlayback();
    state.name = String(data.name || 'Imported Fill').slice(0, 80);
    state.bpm = clamp(Number(data.bpm) || 120, 30, 260);
    state.timeSignature = validSignature(data.timeSignature) ? data.timeSignature : '4/4';
    state.bars = clamp(Math.round(Number(data.bars) || 1), 1, 4);
    state.subdivision = [8, 12, 16, 32].includes(Number(data.subdivision)) ? Number(data.subdivision) : 16;
    state.cells = sanitizeCells(data.cells);
    state.cursorStep = 0;
    history.length = 0;
    future.length = 0;
    syncControlsFromState();
    renderStructure();
    showToast(`Loaded “${state.name}”`);
  }

  function sanitizeCells(cells) {
    const clean = {};
    const instrumentIds = new Set(INSTRUMENTS.map((item) => item.id));
    for (const [key, value] of Object.entries(cells || {})) {
      const [instrumentId, rawStep] = key.split(':');
      const step = Number(rawStep);
      if (!instrumentIds.has(instrumentId) || !Number.isInteger(step) || step < 0 || step > 2048) continue;
      const hit = ['normal', 'accent', 'ghost'].includes(value?.hit) ? value.hit : 'normal';
      const stick = ['R', 'L', 'K', 'B'].includes(value?.stick) ? value.stick : instrumentId === 'kick' ? 'K' : 'R';
      clean[key] = { hit, stick };
    }
    return clean;
  }

  function validSignature(value) {
    return ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8'].includes(value);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getLibrary() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function setLibrary(library) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }

  function saveCurrentFill() {
    state.name = el.fillName.value.trim() || 'Untitled Fill';
    const data = currentFillObject();
    const library = getLibrary();
    const existingIndex = library.findIndex((item) => item.name.toLowerCase() === data.name.toLowerCase());
    if (existingIndex >= 0) library[existingIndex] = data;
    else library.unshift(data);
    setLibrary(library.slice(0, 100));
    renderSavedFillList();
    showToast(`Saved “${data.name}”`);
  }

  function renderSavedFillList() {
    const library = getLibrary();
    el.savedFillList.innerHTML = '';
    if (!library.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-library';
      empty.textContent = 'No saved fills yet. Write something, give it a name, then press Save.';
      el.savedFillList.appendChild(empty);
      return;
    }

    library.forEach((fill, index) => {
      const row = document.createElement('div');
      row.className = 'saved-fill';
      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'saved-fill-title';
      title.textContent = fill.name || 'Untitled Fill';
      const meta = document.createElement('div');
      meta.className = 'saved-fill-meta';
      meta.textContent = `${fill.timeSignature || '4/4'} · ${fill.bpm || 120} BPM · ${fill.bars || 1} bar${Number(fill.bars) === 1 ? '' : 's'}`;
      info.append(title, meta);

      const load = document.createElement('button');
      load.type = 'button';
      load.textContent = 'Load';
      load.addEventListener('click', () => {
        applyFillObject(fill);
        el.loadDialog.close();
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => {
        const fresh = getLibrary();
        fresh.splice(index, 1);
        setLibrary(fresh);
        renderSavedFillList();
      });

      row.append(info, load, remove);
      el.savedFillList.appendChild(row);
    });
  }

  function exportCurrentFill() {
    state.name = el.fillName.value.trim() || 'Untitled Fill';
    const data = currentFillObject();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeName = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'drumit-fill';
    anchor.href = url;
    anchor.download = `${safeName}.drumit.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('Fill exported as JSON');
  }

  async function importFillFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      applyFillObject(data);
    } catch (error) {
      console.error('[Drumit Fill Composer] Import failed:', error);
      showToast('Could not import that fill file');
    } finally {
      el.importInput.value = '';
    }
  }

  function clearFill() {
    if (!Object.keys(state.cells).length) return;
    pushHistory();
    state.cells = {};
    state.cursorStep = 0;
    renderDataOnly();
    showToast('Fill cleared');
  }

  function loadDemoFill() {
    pushHistory();
    state.name = '16th Tom Run';
    state.bpm = 118;
    state.timeSignature = '4/4';
    state.bars = 1;
    state.subdivision = 16;
    state.cells = {};

    const pattern = [
      ['kick', 0, 'normal', 'K'],
      ['hihat', 0, 'accent', 'R'],
      ['hihat', 1, 'normal', 'L'],
      ['hihat', 2, 'normal', 'R'],
      ['hihat', 3, 'normal', 'L'],
      ['snare', 4, 'accent', 'R'],
      ['snare', 5, 'normal', 'L'],
      ['tom1', 6, 'normal', 'R'],
      ['tom1', 7, 'normal', 'L'],
      ['tom2', 8, 'accent', 'R'],
      ['tom2', 9, 'normal', 'L'],
      ['floor', 10, 'normal', 'R'],
      ['floor', 11, 'normal', 'L'],
      ['snare', 12, 'accent', 'R'],
      ['tom1', 13, 'normal', 'L'],
      ['floor', 14, 'normal', 'R'],
      ['kick', 15, 'accent', 'K'],
      ['crash', 15, 'accent', 'L']
    ];

    for (const [instrument, step, hit, stick] of pattern) {
      state.cells[cellKey(instrument, step)] = { hit, stick };
    }

    state.cursorStep = 0;
    syncControlsFromState();
    renderStructure();
    showToast('Demo fill loaded');
  }

  function syncControlsFromState() {
    el.fillName.value = state.name;
    el.bpmInput.value = String(state.bpm);
    el.timeSignature.value = state.timeSignature;
    el.barsSelect.value = String(state.bars);
    el.subdivisionSelect.value = String(state.subdivision);
    el.loopToggle.checked = state.loop;
    for (const button of el.stickMode.querySelectorAll('[data-stick]')) {
      button.classList.toggle('active', button.dataset.stick === state.stickMode);
    }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add('show');
    toastTimer = window.setTimeout(() => el.toast.classList.remove('show'), 1700);
  }

  function bindEvents() {
    el.backToDesignerBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

    el.fillName.addEventListener('input', () => {
      state.name = el.fillName.value;
    });

    el.bpmInput.addEventListener('change', () => {
      const wasPlaying = state.isPlaying;
      if (wasPlaying) pausePlayback();
      state.bpm = clamp(Number(el.bpmInput.value) || 120, 30, 260);
      el.bpmInput.value = String(state.bpm);
      renderDataOnly();
      if (wasPlaying) startPlayback();
    });

    el.timeSignature.addEventListener('change', () => {
      stopPlayback(false);
      state.timeSignature = el.timeSignature.value;
      state.cursorStep = Math.min(state.cursorStep, totalSteps() - 1);
      renderStructure();
    });

    el.barsSelect.addEventListener('change', () => {
      stopPlayback(false);
      state.bars = Number(el.barsSelect.value);
      state.cursorStep = Math.min(state.cursorStep, totalSteps() - 1);
      renderStructure();
    });

    el.subdivisionSelect.addEventListener('change', () => {
      stopPlayback(false);
      state.subdivision = Number(el.subdivisionSelect.value);
      state.cursorStep = Math.min(state.cursorStep, totalSteps() - 1);
      renderStructure();
      showToast('Grid resolution changed');
    });

    el.stickMode.addEventListener('click', (event) => {
      const button = event.target.closest('[data-stick]');
      if (!button) return;
      state.stickMode = button.dataset.stick;
      syncControlsFromState();
    });

    el.playBtn.addEventListener('click', startPlayback);
    el.stopBtn.addEventListener('click', () => stopPlayback(true));
    el.rewindBtn.addEventListener('click', rewind);
    el.loopToggle.addEventListener('change', () => { state.loop = el.loopToggle.checked; });
    el.undoBtn.addEventListener('click', undo);
    el.redoBtn.addEventListener('click', redo);
    el.demoBtn.addEventListener('click', loadDemoFill);
    el.clearBtn.addEventListener('click', clearFill);
    el.saveBtn.addEventListener('click', saveCurrentFill);
    el.loadBtn.addEventListener('click', () => {
      renderSavedFillList();
      if (typeof el.loadDialog.showModal === 'function') el.loadDialog.showModal();
      else showToast('Saved fill browser is not supported here');
    });
    el.exportBtn.addEventListener('click', exportCurrentFill);
    el.importBtn.addEventListener('click', () => el.importInput.click());
    el.importInput.addEventListener('change', () => {
      const [file] = el.importInput.files;
      if (file) importFillFile(file);
    });

    document.addEventListener('keydown', (event) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const editing = tag === 'input' || tag === 'select' || tag === 'textarea';

      if (event.code === 'Space' && !editing) {
        event.preventDefault();
        startPlayback();
        return;
      }

      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (command && event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (!editing && event.key === 'ArrowRight') {
        state.cursorStep = Math.min(totalSteps() - 1, state.cursorStep + 1);
        renderDataOnly();
        ensureCursorVisible();
      } else if (!editing && event.key === 'ArrowLeft') {
        state.cursorStep = Math.max(0, state.cursorStep - 1);
        renderDataOnly();
        ensureCursorVisible();
      }
    });
  }

  function initialise() {
    console.info('[Drumit Fill Composer] Starting');
    syncControlsFromState();
    bindEvents();
    renderStructure();
    renderSavedFillList();
    updateUndoRedoButtons();
  }

  initialise();
})();
