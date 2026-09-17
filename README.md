# Process Signature Lab v0.2
Mobile-first deterministic research instrument.

Changes from v0.1:
- Ground-truth research labels A/B/C/D, anonymous source id, transformation id.
- Expanded feature registry: multiple residual filters and moments, luminance-conditioned noise,
  spatial autocorrelation, multiscale/directional difference energy, color-channel coupling,
  gradient/orientation, local entropy, patch heterogeneity, quantization proxies.
- Expanded cross-feature dependency family X.
- Runtime and feature-count instrumentation.
- Ground truth is stored with the result but never used in feature extraction.
- No AI/human classifier and no authenticity claim.

Research requirement: v0.2 is an instrumentation expansion, not yet the final 180–250-feature registry.
Before scaling the dataset, validate repeatability, runtime on iPhone, JSON export, and then add
full FFT/DCT/CFA candidates plus mobile-vs-full-resolution equivalence tests.
