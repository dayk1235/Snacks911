# fix-overflow

Fix horizontal overflow across the app.

## Steps

1. Search all files for `100vw` → replace with `100%`
2. Add `overflow-x: hidden` to html/body in `globals.css`
3. Add `max-width: 100%` to `*`, `*::before`, `*::after`
4. Add `max-width: 100%; height: auto` to `img, svg, video, canvas`
5. Check navbar, hero, sticky bars for fixed widths that exceed mobile
6. Build and verify — no horizontal scroll
