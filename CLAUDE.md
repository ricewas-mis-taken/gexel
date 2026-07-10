# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Gexel" — a browser game that disguises itself as a spreadsheet app. A hidden keystroke sequence
on the fake spreadsheet screen unlocks a hub-and-spoke arcade collection (Pac-Man, Galaga, Frogger,
a racing game, Tetris) themed around "escaping the cubicle." Plain React + Vite, no router, no
backend — all state is in-memory React state plus `localStorage`.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — ESLint (flat config in `eslint.config.js`)

There is no test suite configured in this repo.

## Architecture

**Phase-based single-page-app.** `src/App.jsx` has no router; it's a big string-keyed state
machine (`phase` state + `renderPhase()`) that swaps between top-level screens: spreadsheet →
intro dialogue → orientation → hub screen → one of the 5 arcade games → per-game intro/ending
transitions. Typing `gexel` while on the spreadsheet screen triggers the jump to the intro; `/`
toggles an on-screen debug panel that can jump directly to any phase (see the `PHASES` array in
`App.jsx` — add new phases there to make them debug-reachable).

**Shared chrome.** `src/components/AppShell.jsx` renders the fake-Excel window frame (green
ribbon, "File Home Insert..." tabs, 900x600 fixed canvas) that nearly every screen wraps itself
in. Shared ribbon style constants (`selectStyle`, `ribbonBtn`, `cornerCell`, `headerCell`,
`rowHeader`) are exported from there rather than duplicated per screen.

**Progress/currency persists across reloads via `CoinContext`** (`src/components/coincontext.jsx`):
- `GAME_ORDER` defines the fixed sequence of the 5 games (`pacman`, `galaga`, `frogger`,
  `roadgame`, `tetris`) — this drives both the hub's "next game" logic and which RAM-bar sprite
  stage to show.
- Coins are split into committed (`coins`, persisted to `localStorage` under
  `gexel_coins_total`) and uncommitted `sessionCoins` for the current run. Call
  `addSessionCoins()` during gameplay, then `commitSession()` on a win or `discardSession()` on
  death/quit — don't write directly to `coins`.
- `markGameComplete(gameKey)` persists to `localStorage` under `gexel_progress`; `hasProgress`
  lets `App.jsx` skip straight back to the hub screen (`mainGame` phase) on reload instead of
  replaying the intro.

**Each arcade game is a large, self-contained component** (`pacman.jsx`, `Galaga.jsx`,
`frogger.jsx`, `roadgame.jsx`, `tetris.jsx`, 400–1000 lines each) owning its own `<canvas>`,
`requestAnimationFrame` loop, tile-map/collision logic, keyboard handlers, and sound effects.
There's no shared game engine or abstraction between them — expect duplicated patterns (maze
layout as a string grid, sprite drawing helpers, etc.) rather than a common base. When fixing a
bug in one game, don't assume the others share the code path.

**`src/components/transitions/`** holds per-game cutscene/instruction screens (e.g.
`pacmanintro.jsx`, `galagainstruction.jsx`, `TetrisEnding.jsx`) that play between the hub and the
game itself. Some (`froggerintro.jsx`, `froggerinstructions.jsx`) are currently empty placeholder
files.

**Assets** live under `src/assets/`, one subfolder per game (`pacman/`, `frogger/`, `sf2/`,
`speedrace/`, `tetris/`, `galaga/`) for sprites/sfx, imported as ES modules (not referenced by
string path) so Vite fingerprints them. The custom pixel font `PokemonClassic.ttf` and used across
dialogue/UI text is loaded via `@font-face` from `public/fonts/` (declared inline per-component
with `<style>{'@font-face {...}'}</style>`, not globally once).

## Known gotcha: import/filename casing

Windows/git are case-insensitive by default, so this currently works, but several imports do not
match the actual on-disk filename casing, e.g.:

- `import Pacman from "./components/Pacman"` → actual file is `pacman.jsx`
- `import Roadgame from "./components/Roadgame"` → actual file is `roadgame.jsx`
- `import ... from "./components/CoinContext"` → actual file is `coincontext.jsx`
- several `transitions/PacmanIntro`, `transitions/GalagaIntro`, etc. imports vs. lowercase
  `pacmanintro.jsx` / `galagaintro.jsx` files

This will break the build on a case-sensitive filesystem (Linux CI, most static-hosting build
containers). If you rename/move any component, match case exactly, and be cautious about "fixing"
this broadly since it touches many import sites at once.
