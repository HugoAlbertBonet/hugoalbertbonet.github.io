---
name: add-project
description: Add or update a personal project on this personal website (Astro, src/content/projects/*.md). Use whenever the user wants a project on the site — "add my X project", "put this repo on my site", "new project page", "feature this on the homepage", "update the description of project Y", or pastes a project write-up, GitHub link or screenshot meant for the site — even if they don't say "skill" or name the file.
---

# Add a project to the site

Each personal project is one Markdown file in `src/content/projects/`. That single file produces:

- a row in the homepage **Projects** list (filterable by field; `pinned` ones come first),
- its own page at `/projects/<slug>/` (cover, story, role, stack, links, newer/older navigation),
- an orange slide in the homepage **Favorite projects** carousel if `featured: true`,
- an entry in `/content.json`, which the ask-terminal agent reads, so the agent can answer about it.

The schema lives in `src/lib/schemas.ts` (`projectSchema`). The build fails with a precise message if the file doesn't match, so the build is the check.

If `PROFILE.md` exists at the repo root, it is the source the user's agent answers from: add the project there too (same facts, under `## Projects`), and follow its accuracy guardrails when writing the site copy.

Professional work does not go here: a project done in a job belongs in that role's `mainProject` in `src/content/experience.json`. If the user describes work-for-an-employer, say so and offer to put it there instead (or link a personal spin-off to the role with `relatedExperience`).

## 1. Gather the facts

Required: **name**, **one-line description** (what it does, ideally why), **year**, and one or more **fields**: `llm` (LLMs & agents), `vision` (vision & multimodal), `rl` (RL & optimization), `apps` (apps & web). Pick every field that genuinely fits; most projects have one or two.

Optional: tags (the stack, lowercase like `python`, `react`), links (live / code / paper), the user's role, a cover image, whether to feature it, whether to pin it near the top, a related role, and the story.

Take what the user gave you (message, pasted README, repo link) and only ask for required facts that are truly missing. Don't invent facts about the user's work: if the story or a detail is unknown, write a `[bracketed placeholder]`. The site uses brackets everywhere for "real content goes here", and the user will recognize them.

## 2. Pick the slug

Kebab-case from the name: "RAG Assistant" → `rag-assistant`. The slug becomes the URL, so keep it short and stable. Check `src/content/projects/` first: if a file with that slug exists, you're updating, not adding — edit it in place.

## 3. Write `src/content/projects/<slug>.md`

```markdown
---
name: "RAG Assistant"
mark: R                          # optional: letter(s) on the generated cover; defaults to the name's first letter
role: "Solo builder"             # optional: shown in the facts card
line: "Answers questions about course notes with citations, so studying takes less searching."
year: 2026
fields: [llm, apps]              # one or more of: llm, vision, rl, apps
tags: [python, rag, fastapi]
cover: "/projects/rag-assistant.png"   # optional: file under public/
links:                           # optional, any subset
  live: "https://..."
  code: "https://github.com/..."
  paper: "https://..."
relatedExperience: current-role  # optional: an `id` from src/content/experience.json
featured: true                   # optional: adds an orange slide to the homepage carousel
pinned: 3                        # optional: rank in the homepage list (1 = first); the list shows 6 before "Show all"
---

A few short paragraphs, first person: the problem, what you built, what happened when people used it,
what you learned or would do next. Markdown works (## headings, lists, links, images, code).
```

Notes that save a failed build:

- **Quote** `name`, `line` and `role` when they contain `:` `#` `[` or start with a special character. Placeholders in brackets always need quotes.
- `year` is a number, not a string.
- `relatedExperience` must match an `id` in `src/content/experience.json`; read that file to pick the right one. It renders as a "↗ Related to <Company>" chip that opens that role.
- Omit fields you don't have rather than leaving them empty.
- `mark` only matters while there's no cover; skip it for normal names.

Writing style for `line` and the story: plain, concrete and short, like the rest of the site. No emoji, no hype words.

## 4. Cover image (optional)

If the user provides an image, copy it to `public/projects/<slug>.<ext>` and set `cover: "/projects/<slug>.<ext>"`. Landscape works best: it is shown at 16:9 on the project page and cropped to a small thumbnail in the list. Without a cover, the site draws a generated one in the site colors, which is fine.

## 5. Featured, pinned or neither

`featured: true` puts the project in the homepage carousel, alternating with the main projects from Experience. Keep the carousel to a handful of slides (about 4 featured projects): if the user features a new one and there are already several, mention it and ask whether to unfeature an older one.

`pinned: N` ranks the project in the homepage list; the first 6 are visible before "Show all". Unpinned projects follow, newest first. If the new project should be near the top, give it a rank and shift the others' numbers so ranks stay unique.

## 6. Verify

```bash
npm run build
```

This runs `astro check` and the content schema. Then confirm:

- `dist/projects/<slug>/index.html` exists,
- the project appears in `dist/content.json` under `projects`,
- if `relatedExperience` was set, the build didn't fail on it (it's checked).

If a preview server is running on port 4321, it serves the new `dist/` right away. Otherwise suggest `npm run dev` and give the URL `http://localhost:4321/projects/<slug>/`.

Finish by telling the user what was added, the page URL, and any `[placeholders]` left for them to fill.
