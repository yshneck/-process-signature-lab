# Process Signature Lab v0.1

Mobile/Web-first research prototype for local image micro-forensics.

## What it does
- Runs in Safari/modern browsers.
- Image pixels are processed locally; no upload endpoint exists.
- Extracts deterministic micro-features from luminance, color, high-pass residuals, gradients,
  spatial residual correlation, multi-distance frequency proxies, patch heterogeneity, and
  cross-feature dependency measures.
- Exports a JSON result for later dataset analysis.
- Does NOT claim AI/Human classification in v0.1.

## iPhone
This is a static web app. Serve the folder over HTTPS (e.g. GitHub Pages), open it in Safari,
then Share > Add to Home Screen. After the first successful load, the service worker caches
the app shell for offline use. Selected image analysis remains on-device.

## Research integrity
Metadata/EXIF and filenames are not used as evidence. The analysis raster is bounded to 1536 px
on its longest side to control mobile memory/runtime; the original dimensions are retained in
the result. This is a deliberate mobile tier, not a replacement for the future full-resolution
reference tier. The next milestone is to add the remainder of Feature Registry v0.1, unit/sanity
tests, labeled batch collection, and full-vs-mobile equivalence tests before any classifier.
