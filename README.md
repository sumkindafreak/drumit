# Drumit

Drumit is a browser-based drum kit, stage-layout and drum-fill writing tool.

It is intentionally dependency-free: plain HTML, CSS and JavaScript, so it can run directly from GitHub Pages without a build process.

## Current features

### Kit & Stage Designer

- Top-down stage workspace
- Drums, cymbals, electronic gear, hardware, stage equipment and accessories
- Drag equipment from the component library onto the stage
- Free movement and overlapping/layering
- Pan and zoom workspace
- Rotate, duplicate, delete, bring forward and send backward
- Per-item properties for name, position, dimensions, rotation, scale, labels and locking
- Undo / redo history
- Optional grid
- Clean presentation mode
- Browser-local project save/load
- Built-in hybrid rock demo kit
- High-resolution PNG export
- Desktop, tablet and mobile adaptation

### Fill Composer

Open `composer.html`, or press **Fill Composer** from the main Drumit toolbar.

- Drum step sequencer for hi-hat, crash, ride, toms, snare and kick
- 1–4 bar fills
- 2/4, 3/4, 4/4, 5/4, 6/8, 7/8 and 12/8 time signatures
- 1/8, 1/16, 1/32 and triplet grids
- Normal, accent and ghost-note hit states
- R / L / K / B sticking with automatic alternating sticking
- Automatic notation preview above the sequencer
- Moving playback cursor
- Browser-generated drum preview sounds using Web Audio
- Loop playback
- Tap Kit entry pads with optional auto-advance
- Undo / redo
- Browser-local fill library
- JSON fill export and import
- Built-in demo fill
- Horizontally scrollable mobile-friendly sequencer

## Run locally

You can open `index.html` directly in a modern browser.

For the most reliable browser behaviour, serve the folder with any small local web server. For example, if Python is installed:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Run with GitHub Pages

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**.
5. Save.

GitHub Pages address:

`https://sumkindafreak.github.io/drumit/`

Fill Composer:

`https://sumkindafreak.github.io/drumit/composer.html`

## Designer controls

- Drag library item: place equipment
- Drag stage item: move it
- Mouse wheel: zoom
- Space + drag or middle mouse: pan
- Double-click item: properties
- Delete / Backspace: remove selected item
- Ctrl/Cmd + D: duplicate
- Ctrl/Cmd + Z: undo
- Ctrl/Cmd + Shift + Z: redo
- Arrow keys: nudge
- Shift + Arrow: larger nudge
- R: rotate 15°

## Fill Composer controls

- Click a grid cell: Normal → Accent → Ghost → Off
- Shift + click a written hit: change sticking
- Right-click a written hit: remove it
- Tap Kit pad: write the current step
- Space: play / pause
- Ctrl/Cmd + Z: undo
- Ctrl/Cmd + Shift + Z: redo
- Left / Right Arrow: move the entry cursor

## Next development targets

The Fill Composer is the start of Drumit's music-writing side. Planned improvements include tighter engraving-quality drum notation, flams, drags, rimshots, open/closed hi-hats, cymbal chokes, velocity editing, reusable fill tags, song arrangement, MIDI input/output, and direct interaction with the user's designed Drumit kit.
