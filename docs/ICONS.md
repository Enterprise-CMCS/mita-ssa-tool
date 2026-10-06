# Icons

Source of truth is two SVGs. The PNGs are generated from them and **committed**, not gitignored,
because CI has no SVG rasteriser and these change roughly never — they are source assets, unlike the
workbook, which is a genuine build output.

**What lives where, and why it matters.** Vite copies `public/` into the published site verbatim,
and the service worker precaches it, so anything left there is downloaded by every pilot user.
`favicon.svg` belongs there because it is served. The maskable SVG does not — it is only ever input
to `rsvg-convert` — so it lives in `assets/icons/`. This file is in `docs/` for the same reason: a
README in `public/` would appear as a stray page on the pilot URL.

| File                             | Size    | Served? | Used for                                                          |
| -------------------------------- | ------- | ------- | ----------------------------------------------------------------- |
| `public/favicon.svg`             | vector  | yes     | Browser tab icon, via Vite's base-url placeholder in `index.html` |
| `assets/icons/icon-maskable.svg` | vector  | **no**  | Build-time source for the maskable PNG only                       |
| `public/pwa-192.png`             | 192×192 | yes     | Web app manifest, `purpose: any`                                  |
| `public/pwa-512.png`             | 512×512 | yes     | Web app manifest, `purpose: any`                                  |
| `public/pwa-maskable-512.png`    | 512×512 | yes     | Web app manifest, `purpose: maskable`                             |
| `public/apple-touch-icon.png`    | 180×180 | yes     | iOS home screen, which ignores the manifest                       |

## Regenerating

Needs `rsvg-convert` (`brew install librsvg`). Run from the repository root:

```sh
rsvg-convert -w 192 -h 192 public/favicon.svg             -o public/pwa-192.png
rsvg-convert -w 512 -h 512 public/favicon.svg             -o public/pwa-512.png
rsvg-convert -w 512 -h 512 assets/icons/icon-maskable.svg -o public/pwa-maskable-512.png
rsvg-convert -w 180 -h 180 public/favicon.svg             -o public/apple-touch-icon.png
```

## Why a glyph and not lettering

Rasterising text depends on a font being installed, so the PNGs would differ between machines. Five
ascending bars carry the maturity-model idea, survive being scaled to 16px, and rasterise identically
anywhere.

## Why two SVGs

A maskable icon is masked by the platform — a circle on Android, a squircle on iOS. It must be full
bleed with no rounded corners of its own, and everything meaningful has to sit inside the central 80%
(a circle of radius 205 on a 512 canvas) because the rest can be cropped. `favicon.svg` is the
opposite: it has its own rounded corners and fills more of the canvas, because nothing masks it.

## Contrast

White on the theme primary `#0071bc` measures **5.14:1**, above the 3:1 WCAG 2.1 requires for a
graphical object. The figure matches the one already recorded in `src/theme/index.ts` for the same
pair; an earlier version of this file said 4.6:1, which was wrong and contradicted the theme.
