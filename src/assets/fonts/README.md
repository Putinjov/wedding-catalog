# Boutique fonts

These are unmodified upstream WOFF2 files, committed so that Next.js builds do not depend on downloading Google Fonts. `manifest.json` records immutable source URLs, file sizes and SHA-256 hashes.

- Inter: Rasmus Andersson / the Inter Project Authors, upstream commit `66647c0bbbe41a850d79d9c76fb13add3378940f`; normal variable face, weights 100–900.
- Cormorant Garamond: Christian Thalmann / the Cormorant Project Authors, upstream commit `6d210fd3550b7358ca62d6ba3e354ec1ec940813`; normal faces, weights 400/500/600.
- Licenses: `Inter-OFL.txt` and `Cormorant-OFL.txt`, SIL Open Font License 1.1. The Inter license was obtained from `google/fonts` commit `5bb28733cec313b63fbd415b574b5ae35c8aa8b8`, `ofl/inter/OFL.txt`. Keep these notices with the fonts.

The original character coverage is retained, including accented Latin and Cyrillic. No subsetting or font conversion tool is required by install or build. The four files total 726,216 bytes; these full character-set assets are larger than Google Fonts' Latin-only subsets. Next.js emits content-hashed same-origin font assets. This is a build-reliability fix, not a claim of smaller font downloads.

To update intentionally: review the upstream release and license, replace the assets, update the manifest, then run the font integrity tests, the production build, and desktop/mobile rendering checks. Do not add runtime CDN links or restore build-time `next/font/google` fetching.
