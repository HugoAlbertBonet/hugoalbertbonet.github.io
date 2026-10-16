---
name: "Sexism Identification in TikTok Videos (EXIST 2025)"
line: "1st place in the EXIST 2025 English learning-with-disagreement track, by describing video frames in words instead of processing the video."
role: "Team of two"
year: 2025
fields: [vision, llm]
tags: [blip, xlm-roberta, pytorch, shared task]
cover: "/projects/exist-2025.webp"
featured: true
pinned: 5
---

## The problem

Detecting sexism in short videos, and learning from the disagreement between annotators instead of throwing it away.

## What we built

With one teammate, a pipeline that captions video frames with BLIP and works from those captions instead of the raw video. I implemented one of the three tasks, my teammate another, and we built the last one together.

## Results

- **1st place** in the EXIST 2025 English learning-with-disagreement track.
- Frame captioning improved the ICM-Norm score by 75% over a fine-tuned ViViT video model.
