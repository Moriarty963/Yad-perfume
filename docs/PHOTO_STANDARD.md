# YAD — photo standard / Imagination 20 ml

## Source of truth
The customer-supplied reference photo, not generated bottle art. Confirm physical geometry against the product before publishing.

## Observed reference
- Transparent rectangular glass with softly rounded edges, thick clear base.
- Pale amber liquid.
- Tall matte ivory/white cylindrical cap with gold bands.
- Ivory label: YAD / PERFUME ATELIER / Imagination / EXTRAIT DE PARFUM / 20 ML.
- Neutral warm beige studio setting.

## Asset contract
Place these four **actual** WebP files into `assets/real/`:
- `imagination-20ml-main.webp`
- `imagination-20ml-cap.webp`
- `imagination-20ml-label.webp`
- `imagination-20ml-glass.webp`

These filenames are already prepared in the handoff archive `yad-imagination-photo-gallery.zip`.
Do not substitute SVG illustrations, fabricated photos, or a different fragrance label.

## Acceptance
1. Confirm each asset is present and returns HTTP 200 in the preview.
2. Check label spelling and correct 20 ml marking at full size and on mobile.
3. Ensure photo gallery changes images without altering selected size or price.
4. When size differs from 20 ml, show its correct confirmed packaging image; do not imply a 20 ml bottle represents a 50 ml product.
5. Test cart, favorites, variant selection and checkout on mobile.
6. Publish only after explicit visual approval. Keep main unchanged.

## Current limitation
The archive exists in the conversation workspace, but is not yet committed to the GitHub repository. The manifest is a contract, not proof that images are deployed.
