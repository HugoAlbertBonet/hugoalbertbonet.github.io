---
name: "Codenames Spymaster with SFT, DPO and RL"
line: "Teaching a small language model to give Codenames clues, with SFT, DPO and GRPO on a single 8 GB laptop GPU."
year: 2026
fields: [llm, rl]
tags: [qwen2.5, qlora, dpo, grpo, unsloth]
cover: "/projects/codenames/cover.webp"
preview: "/projects/codenames/sft-turn.mp4"
coverFit: contain
coverPosition: "50% 45%"
links:
  code: "https://github.com/HugoAlbertBonet/codenames-spymaster-grpo"
featured: true
pinned: 3
---

## Why

I love the board game Codenames. I wanted to see whether a small language model could learn to play it as the spymaster, and to practice SFT, DPO and reinforcement learning for LLMs along the way.

## The setup

The spymaster model sees the board's words grouped by their hidden colors and answers with a single clue and a number, like `CLUE: football, NUMBER: 1`. A frozen teammate sees the clue and the unguessed words, never the colors, and picks words by sentence-embedding similarity. The game then scores the turn. Everything ran on one 8 GB laptop GPU, with 4-bit QLoRA.

## See it play

Same board, same teammate, different clue policy. The raw Qwen 1.5B model's clue, `TURN 2`, leads the teammate to one blue word and then a red one; after fine-tuning, `FOOTBALL 1` finds two blue words.

![Raw Qwen 1.5B, clue TURN 2: the teammate guesses "throwing", then the red word "care"; reward 0](/projects/codenames/base.gif)
![Fine-tuned model: the clue FOOTBALL 1 reveals the blue words "stadium" and "throwing"; reward +2](/projects/codenames/sft.gif)

## Results

Supervised fine-tuning (SFT) of Qwen2.5-1.5B on 2,000 synthetic examples, tested on 1,000 random boards:

- Invalid clues fell from 55.2% to 5.6%.
- Correct guesses per turn rose from 0.31 to 1.20.

With GRPO on the smaller Qwen2.5-0.5B, invalid clues fell from 63.4% to 8.7%, and the model beat the untrained one on 526 of 1,000 boards (lost 114).

**DPO and GRPO after SFT did not beat SFT**, so SFT stayed the best model. That doesn't prove they can't work, and it's documented as a negative result.

## A safety finding

SFT made the model more useful, but it also raised "assassin" hits, the mistake that loses the game. In a prespecified test, a teammate that abstains on low-confidence guesses cut them from 8.5% to 7.1%. That's a change to the teammate, not a training gain.

Two hand-picked turns, including a failure. On a board of words held out from the training boards, `MOUNTAIN 2` finds three blue words; `ASTRONOMY 1` finds one, then the assassin:

![Clue MOUNTAIN 2 on held-out words: the teammate finds volcano, canyon and snow; reward +3](/projects/codenames/oov.gif)
![Clue ASTRONOMY 1: the teammate finds "stars", then reveals the assassin; reward -4](/projects/codenames/failure.gif)
