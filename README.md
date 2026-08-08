# Drum Designer

A browser-based top-down drum kit and stage layout designer.

The first working version is intentionally dependency-free: plain HTML, CSS and JavaScript, so it can run directly from GitHub Pages without a build process.

## Current features

- Top-down 1400×900 stage workspace
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
- Desktop-first interface with basic tablet/mobile adaptation

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

GitHub will publish the app at:

`https://sumkindafreak.github.io/randoms/`

## Controls

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

## Next development targets

The current version establishes the editor and visual language. Natural next additions are multi-selection and grouping, cable/audio/MIDI routing, real-world stage measurements, reusable equipment inventory, input lists, PDF stage-rider export and multiple saved projects.
