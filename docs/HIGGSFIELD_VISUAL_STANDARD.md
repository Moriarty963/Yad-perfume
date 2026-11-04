# YAD ATELIER — Higgsfield visual production standard

## Goal
Create high-end studio visuals for each YAD fragrance and each confirmed bottle size while preserving the physical packaging, not inventing new bottles. Current production uses real, user-provided photos for Imagination where available and clearly labeled digital illustrations elsewhere. Never label synthetic images as photos of the delivered product.

## Reference images
- Treat user-supplied authentic bottle photos as geometry reference and packaging source of truth.
- Preserve cap shape and finish, collar, bottle glass proportions, liquid tint, label placement and real volume.
- Build variants for 6, 10, 20, 30, 50, 100 ml only from the corresponding size reference. Do not stretch the 20 ml image to impersonate another size.
- Begin with 20 ml as a style-control sample, then approve each other form-factor separately.

## Higgsfield workflow
1. Start from a real bottle reference image. Prefer image-to-image product-shot generation rather than pure text-to-image.
2. Use a consistent editorial photography setup for all variants: portrait 4:5, soft diffused studio key light from upper left, subtle warm fill, restrained ivory / stone background, natural glass refraction, gentle contact shadow, camera 70–90 mm equivalent, no distracting props, precise vertical framing.
3. Keep the physical bottle silhouette unchanged. If the model fails on the label typography, generate the bottle with a clean reserved label and composite accurate title and YAD brand in a deterministic browser/graphics overlay; never ship hallucinatory or misspelled labels.
4. Verify product geometry and text at desktop and iPhone size, then optimize asset to WebP (prefer original file shipped with app; avoid transient job URLs).
5. Upload approved files to `assets/studio/{fragrance-id}-{ml}ml.webp`. Register each explicitly in `YAD_STUDIO_VISUALS` in `app.js`. Display as “Визуализация” until a photo of the actual finished item is available.
6. Verify all six size changes, favorites, cart, price and order message. Publish to main only after visual review.

## Prompt template
> Premium luxury perfume product studio photograph with the EXACT bottle silhouette, cap shape, glass proportions and labeling area of the supplied YAD reference bottle. Hero bottle centered, isolated on warm off-white stone studio background, soft diffused key light camera-left, realistic natural glass refraction, subtle amber liquid, photorealistic soft shadows, controlled commercial retouching, 85 mm product photography lens, high detail, portrait 4:5. Preserve the product; do not invent a different cap or bottle. Leave label clean for verified lettering, no extra text, no extra bottles, no watermark.

## Fragrances
`immensite`, `imagination`, `escentric02`, `tygar`, `aventus`, `kirke`, `blackpepper`, `amberwood`, `tilia`, `megamare`.

## Quality gate
Real photo vs AI image must remain visibly distinguishable in content metadata. Confirm title spelling, volume marking and physical dimensions. Unsupported generated geometry is a concept visual, not a product photo. Keep a fallback digital SVG for each size. Record the approved source and date before replacing images in production.
