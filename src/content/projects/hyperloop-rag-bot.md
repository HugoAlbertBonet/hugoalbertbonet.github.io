---
name: "Hyperloop UPV RAG Slack Bot"
line: "A Slack assistant that answers questions from the team's technical documentation, so non-engineers don't have to ask engineers."
year: 2023
fields: [llm, apps]
tags: [llamaindex, openai api, flask, slack api]
---

## The problem

Hyperloop UPV loses over 70% of its members every year, and non-technical members needed answers from the technical documentation without asking the engineers.

## What I built

A Slack assistant using retrieval-augmented generation, built with LlamaIndex, GPT-3.5 Turbo and Flask. Later, for a UPV course, I added OpenAI function calling to route requests to tools (email, live weather, web search) and CLIP-based photo search.

## Results

Used by 7 team members.
