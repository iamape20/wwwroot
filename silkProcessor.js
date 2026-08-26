'use strict';
// silkProcessor.js
//
// Removes a near-white background from a downloaded silk image and
// returns a cropped, transparent PNG buffer. Same approach used
// manually on the sample silk: soft-edge alpha rather than a hard
// cutout (a hard threshold leaves a white "halo" of half-white edge
// pixels against a dark site background), then crop to the actual
// content bounding box so no dead white margin survives as opaque
// or as visible padding.
//
// Usage:
//   const { removeSilkBackground } = require("./silkProcessor");
//   const cleanBuffer = await removeSilkBackground(downloadedBuffer);
//   fs.writeFileSync(outPath, cleanBuffer);

const sharp = require("sharp");

// Distance-from-white (0-441, since max is sqrt(3*255^2)) at which a
// pixel is treated as fully background (LOW) vs fully foreground
// (HIGH). Between the two, alpha ramps smoothly - this is what avoids
// the jagged/haloed edge a hard cutout produces.
const LOW = 12;
const HIGH = 60;

async function removeSilkBackground(inputBuffer, options = {}) {

    const { low = LOW, high = HIGH, padding = 2 } = options;

    const img = sharp(inputBuffer).ensureAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const out = Buffer.from(data); // mutable copy

    for (let i = 0; i < width * height; i++) {

        const o = i * channels;
        const r = data[o], g = data[o + 1], b = data[o + 2];
        const a = data[o + 3];

        const dist = Math.sqrt(
            (255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2
        );

        const alphaFromColor = Math.max(
            0,
            Math.min(255, ((dist - low) / (high - low)) * 255)
        );

        out[o + 3] = Math.min(a, Math.round(alphaFromColor));

    }

    let pipeline = sharp(out, { raw: { width, height, channels } }).png();

    // Crop to the actual non-transparent content, not the full
    // downloaded canvas - most silk feeds pad generously around the
    // real artwork.
    const trimmed = await pipeline
        .trim({ threshold: 1 }) // trims fully-transparent (alpha ~0) border
        .toBuffer();

    if (!padding) return trimmed;

    // Re-add a small transparent margin so the silk doesn't butt
    // right up against adjacent UI (badge borders, silk stack edges).
    const meta = await sharp(trimmed).metadata();

    return sharp({
        create: {
            width: meta.width + padding * 2,
            height: meta.height + padding * 2,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite([{ input: trimmed, left: padding, top: padding }])
        .png()
        .toBuffer();

}

module.exports = { removeSilkBackground };
