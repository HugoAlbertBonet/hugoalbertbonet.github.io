---
name: "OpenClaw Agent with Local LLM Fallback"
line: "A self-hosted Telegram assistant that keeps working when cloud models are down, by falling back to local models on an 8 GB laptop GPU."
year: 2026
fields: [llm, apps]
tags: [llama.cpp, ollama, faster-whisper, linux]
pinned: 6
---

## The problem

A personal AI assistant that keeps working when cloud models are unavailable, on a laptop with only 8 GB of GPU memory.

## What I built

A self-hosted OpenClaw agent on Telegram that routes requests across remote frontier models and falls back to local Gemma 4 models, downloaded already quantized to 4 bits. It runs confined in a mount-namespace sandbox and accepts voice notes, transcribed with faster-whisper on the CPU.

## Results

A 4-bit KV cache with flash attention kept an 8B model fully on the GPU at 128k context (5.4 GB) and raised prefill speed from 2,572 to 2,998 tokens per second.
