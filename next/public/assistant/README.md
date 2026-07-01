# Ask Nexus robot art

Drop the four mascot images here and the assistant upgrades from the placeholder
orb to the live robot automatically — no code change.

| File | Pose | Shown when |
|------|------|-----------|
| `robot-center.png` | facing forward | resting / default |
| `robot-left.png` | looking left | idle "look around" |
| `robot-right.png` | looking right | idle "look around" |
| `robot-surprised.png` | mouth open | on hover |

- Use **transparent PNG** (so it sits cleanly on the glass panel). WebP also works —
  if you prefer WebP, change `EXT` in
  `next/src/components/assistant/assistant-mascot.tsx` to `"webp"`.
- Roughly square images (e.g. 512×512) look best; the component scales them.
- Until these files exist, a friendly glowing orb is shown instead.
