# Game View PoC - Manual Testing Checklist

## Overview

This checklist covers manual verification of the Game View (PixiJS-based settlement view) before merging into `main`. Run these tests in order after deploying the build.

---

## 0. Pre-flight

- [ ] `npm run build` completes with zero errors
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] `dist/` folder was generated successfully

---

## 1. Root Route `/` — Settlement Dashboard

- [ ] Dashboard loads without crashing
- [ ] Loading skeleton shows while Convex data is fetching
- [ ] Crisis banner renders with correct color coding (green/amber/red)
- [ ] Metric cards display population, food, wood, stone
- [ ] Agent list renders with stat bars (H, E, S, M, HP)
- [ ] Building list shows with status badges
- [ ] Task queue displays with progress bars
- [ ] Chronicle / Events section shows recent events
- [ ] **No console errors** on load

---

## 2. Canvas Rendering

- [ ] `<canvas>` element is present in the DOM (right-click → Inspect → canvas)
- [ ] Canvas fills the game area container
- [ ] Background color is `0x7ab5ff` (light sky blue)
- [ ] Map tiles render (static map layer)
- [ ] No WebGL context errors in console
- [ ] No `pixi.js` initialization errors

---

## 3. Agent Visibility

- [ ] Agent sprites/avatars appear on the canvas
- [ ] Multiple agents visible simultaneously
- [ ] Agent positions update over time (agents move)
- [ ] Human player's avatar is distinguishable (different color or highlight)
- [ ] Debug path lines visible for human player (if `VITE_SHOW_DEBUG_UI=true`)

---

## 4. Movement

- [ ] Clicking on an empty tile sends `moveTo` command to Convex
- [ ] Agent animates toward destination
- [ ] Clicking while already moving updates destination
- [ ] Position indicator (if present) shows target tile
- [ ] Console shows `Moving to {"x":..., "y":...}` on click
- [ ] Dragging does NOT trigger movement (only taps)
- [ ] Clicking on current tile does nothing

---

## 5. Pan & Zoom

- [ ] Mouse wheel zooms in/out smoothly
- [ ] Click-and-drag pans the viewport
- [ ] Zoom is bounded (doesn't zoom to 0 or infinity)
- [ ] On mobile: pinch-to-zoom works
- [ ] On mobile: single-finger pan works
- [ ] Viewport stays within world bounds

---

## 6. Agent Selection / Click

- [ ] Clicking an agent selects it (highlights it)
- [ ] Selected agent details appear in right panel
- [ ] Clicking empty space deselects
- [ ] Selected agent follows player if human

---

## 7. Mobile / Touch

- [ ] Page is responsive on mobile viewport (resize DevTools to 375px wide)
- [ ] Touch events don't cause scroll jank in game area
- [ ] Pan works with single touch
- [ ] Zoom works with pinch
- [ ] Tap to move works on touch
- [ ] UI panels are scrollable on small screens

---

## 8. No Regression: Dashboard

- [ ] Dashboard still loads at `/` when no game is active
- [ ] "No Active World Found" state shows correctly when `worldId` is null
- [ ] Loading state shows while `worldStatus === undefined`
- [ ] SettlementLiveView renders inside dashboard
- [ ] All metric cards still show correct colors

---

## 9. Build & Deployment

- [ ] `dist/` builds successfully
- [ ] All routes resolve (Vercel/Fly.io serve `dist/`)
- [ ] Assets (images, SVGs) load correctly
- [ ] Environment variables (`VITE_SHOW_DEBUG_UI`) are respected
- [ ] Production build is smaller than 500KB gzipped JS

---

## 10. Console Errors Check

Open browser DevTools → Console before any interaction and check for:

- [ ] No `Error:` level messages
- [ ] No PixiJS initialization errors
- [ ] No Convex query errors
- [ ] No unhandled promise rejections
- [ ] No missing asset 404s

---

## 11. Smoke Test After Re-deploy

- [ ] World loads in < 5 seconds on cold start
- [ ] Agents start moving within 10 seconds of load
- [ ] Ticking clock advances (if time debug UI is shown)

---

## Quick Pass Criteria

> If ALL items above are checked, the Game View PoC is ready to merge.

**Critical items** (must pass, do not skip):
1. Canvas renders without crash
2. Dashboard still works at `/`
3. Build passes
4. Zero console errors on load

**Nice-to-have** (can be fixed in follow-up PR):
- Mobile touch pan/zoom
- Debug path visualization
- Agent selection detail panel
