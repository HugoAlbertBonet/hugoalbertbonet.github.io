---
name: "CLIP Finder"
line: "Private, on-device photo search on Android: type \"dog on the beach at sunset\" and get results in 4 ms over 15,000 photos."
year: 2026
fields: [vision, apps]
tags: [clip, onnx, android, quantization]
cover: "/projects/clip-finder/cover.webp"
coverFit: contain
coverPosition: "50% 40%"
links:
  code: "https://github.com/HugoAlbertBonet/CLIPFinder"
  download: "https://drive.google.com/file/d/15chZ0NtQJkGCO1U1cvQ5F1mHzcleAco7/view?usp=sharing"
featured: true
pinned: 2
---

## Why

I hate that moment: you're excited to show your friends a photo from a few years ago, and they lose interest before you can find it. Gallery search only takes a word or two. CLIP Finder lets you describe the photo instead, as precisely as you like, and keeps every photo on your phone.

It started as a Christmas prototype and a gift for my mom. The people filter exists because she asked for it.

## What I built

An Android app that runs a quantized CLIP ViT-B/32 model on the phone with ONNX Runtime (the model was downloaded already quantized). CLIP maps images and text into the same space, so a sentence can find a photo.

- **Search in your own words**, with an optional negative prompt to exclude things, and translation of non-English queries.
- **People filters:** pick a few photos of someone, give them a name, and the app matches faces across your library so you can search "at the beach" with just that person.
- **Fast search:** I designed the quantized vector index (TurboQuant) that makes searching a large library quick.
- **Private by design:** indexing, search and face matching all run on the device. No account, and your photos never leave the phone.

![The search screen: a prompt, an optional negative prompt, and matching photos](/projects/clip-finder/search.webp)
![The people filter: search with a person you've named](/projects/clip-finder/people.webp)

## Results

Over a 15,000-photo library on a phone, search went from about 50 ms to 4 ms at 96% recall with a 3.9× smaller index, or 1 ms at 88% recall.

## Try it

The app isn't on Google Play. It runs on Android 8.0 or newer: download the APK, or build it from the code.
