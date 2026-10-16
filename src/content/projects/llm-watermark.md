---
name: "LLM Watermarking Library"
line: "An open-source library that marks LLM-generated text so it can be detected later: 95% detection at a 0.01% false-positive rate."
year: 2026
fields: [llm]
tags: [python, pytorch, vllm, llama.cpp, transformers]
cover: "/projects/llm-watermark/cover.webp"
preview: "/projects/llm-watermark/detection.mp4"
coverFit: contain
coverPosition: "50% 85%"
links:
  code: "https://github.com/HugoAlbertBonet/llmwatermark"
featured: true
pinned: 1
---

## The problem

Without a way to tell whether a language model wrote a text, it becomes practically impossible to hold anyone accountable in some situations, to detect models trained on another model's stolen outputs, or to notice when one model is being passed off as another. Classifiers that guess from writing style are unreliable in both directions. Watermarking takes the other route: it leaves the evidence at generation time.

## How it works

At every step, the library hashes the preceding tokens with a secret key, uses that to split the vocabulary into a pseudorandom "greenlist" and the rest, and nudges the model toward the greenlist. One token proves nothing, since about a quarter of them land there by chance. Across a few dozen tokens, though, the excess becomes a statistical signature that a one-proportion z-test recovers, and nobody without the key can find it, reproduce it or forge it.

## What I built

A "green-list" (KGW-style) watermarking library. It plugs into Hugging Face Transformers, vLLM, llama.cpp and SGLang, with seeding that is bit-identical across NumPy, PyTorch CPU and CUDA, so the same watermark works on every backend. The detector only needs the tokenizer and the secret key: no model, no GPU, no PyTorch. It has an object-oriented API and 394 pytest tests in CI.

## Results

- Detects 95% of 256-token passages at a 0.01% false-positive rate (AUC 0.995), with zero false positives on 3,200 human-written texts.
- Overhead is about 0.25 ms per decoding step (+5.2% on vLLM).
- Optimizing the per-token math for CPU cut mask time from 526 to 150 µs.

The one knob is `delta`, how hard the model is nudged toward the greenlist. I tuned it with held-out perplexity and three blinded LLM judges: detection is near its ceiling by delta 2, and the quality cost arrives between 2 and 4. So 2 is the default.

![Detection rate rises to 95% at delta 2 and stays near 100% after, while perplexity climbs steeply past delta 2](/projects/llm-watermark/tradeoff.webp)

Watermarked text and unwatermarked text separate cleanly by the share of tokens that land on the greenlist:

![Histogram: human and unwatermarked texts center near 24% greenlist tokens, watermarked texts near 46%](/projects/llm-watermark/separation.webp)

Confidence grows with length, so short passages need a stronger watermark or a lower threshold:

![Cumulative z-score against scored tokens: watermarked texts climb past the threshold of 4, unwatermarked ones stay near zero](/projects/llm-watermark/confidence.webp)

## What I'd tell someone using it

The watermark isn't in the model. It's a bias added while the sampler runs, so if you load the same model under an engine without the library, you get clean, unwatermarked text with no warning. That's why every serving path needs its own adapter.
