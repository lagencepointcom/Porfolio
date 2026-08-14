# AGENTS.md

## Cursor Cloud specific instructions

This repo is a static Vite portfolio (`porfolio`). There is no backend, database, or auth.

### Run

- Dev server: `npm run dev` — http://localhost:5173/ (`strictPort: true` in `vite.config.js`)
- Production preview: `npm run preview` (also port 5173; stop the dev server first)
- Standard scripts live in `package.json`. There are **no lint or test scripts**.

### Notes

- Dependencies: `npm ci` (Node 22, lockfile present).
- Linux is case-sensitive. Public graphisme files such as `public/images/graphisme/Commune-de-chevroux-paddle.webp` must match the paths in `src/portfolio-images.js` exactly.
- After adding source images under `Images/`, regenerate public assets with `npm run images:sync` (then `npm run images:optimize` if you only need compression).
- GitHub Pages builds use `npm run build:gh-pages` (`GITHUB_PAGES=true`, base `/Porfolio/`). Local dev uses `base: '/'`.
