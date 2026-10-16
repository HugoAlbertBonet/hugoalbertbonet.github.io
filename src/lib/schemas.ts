// Schemas for everything in src/content/. The build fails with a clear message if a file doesn't match.
import { z } from 'astro/zod';

const text = z.string().min(1);

const timezone = z.string().refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Must be an IANA timezone, e.g. "Europe/Madrid"' },
);

/** Accent used for small colored marks: blue = professional/everyday, orange = personal/loud, ink = neutral. */
const accent = z.enum(['blue', 'orange', 'ink']);

export const profileSchema = z.object({
  name: text,
  /** Full intro headline; the part matching `headlineHighlight` is shown in orange. */
  headline: text,
  headlineHighlight: z.string().default(''),
  subline: text,
  /** Shorter subline for phones. Falls back to `subline`. */
  sublineShort: z.string().optional(),
  city: text,
  timezone,
  email: text,
  links: z.object({
    linkedin: text,
    github: text,
    scholar: z.string().optional(),
  }),
  /** Path under public/ (e.g. "/cv.pdf") or a full URL. */
  cvUrl: text,
  now: z.object({ title: text, line: text }),
  studying: z.object({ degree: text, school: text, until: text }),
  /** When you can start; used by the terminal's "when can you start?" answer. */
  availability: text,
  goodAt: z.array(z.object({ title: text, line: text, accent })).length(3),
  /**
   * First 8 are shown as icons on the homepage (they need a `mark`); "+N" opens the full list,
   * grouped by `group` in order of first appearance.
   */
  toolbox: z
    .array(z.object({ mark: z.string().min(1).max(3).optional(), name: text, color: accent.default('ink'), group: text }))
    .refine((tools) => tools.slice(0, 8).every((t) => t.mark), { message: 'The first 8 tools need a `mark` (1–3 letters)' }),
  /** Order of the groups in the full toolbox list. Groups not named here follow in order of first appearance. */
  toolboxGroups: z.array(text).default([]),
  /** Clickable prompts under the terminal. */
  suggestedQuestions: z.array(text).min(1),
  /** Question shown already answered in the terminal when the page loads. */
  exampleQuestion: text,
  quote: z.object({ text, author: text, aside: z.string().optional() }),
  /** Contact block. A line break (\n) in the headline is kept. */
  contact: z.object({ headline: text, aside: z.string().optional() }),
});

export const offTheClockSchema = z.array(
  z.object({
    kind: z.enum(['note', 'fact']),
    text,
    /** Image path under public/, shown with facts. */
    photo: z.string().optional(),
  }),
);

export const educationSchema = z.array(
  z.object({
    degree: text,
    school: text,
    city: text,
    start: text,
    end: text,
    current: z.boolean().default(false),
    highlight: text,
    /** Image path under public/. Without it, the school's initial is shown. */
    logo: z.string().optional(),
    awards: z.array(text).default([]),
  }),
);

export const experienceSchema = z.array(
  z.object({
    /** Stable id: used for #experience-<id> anchors and by projects' `relatedExperience`. */
    id: z.string().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and dashes'),
    role: text,
    org: text,
    start: text,
    /** Omit for current roles. */
    end: z.string().optional(),
    current: z.boolean().default(false),
    impact: text,
    bullets: z.array(text).default([]),
    tags: z.array(text).default([]),
    logo: z.string().optional(),
    /** Shown in the expanded row and as a professional slide in the homepage carousel. */
    mainProject: z
      .object({
        name: text,
        line: text,
        /** Screenshot or short video path under public/. */
        media: z.string().optional(),
      })
      .optional(),
  }),
);

const eventRole = z.enum(['Organizer', 'Speaker', 'Organizer + speaker']);

export const leadershipSchema = z.object({
  org: text,
  start: text,
  end: text,
  description: text,
  /** Where the team is based: listed on the map and origin of the competition arcs. */
  base: z.object({ name: text, city: text, country: text, note: text, lat: z.number(), lon: z.number() }),
  /** Images or silent videos (.mp4/.webm, with an optional poster image) under public/. */
  photos: z
    .array(z.object({ src: z.string().optional(), poster: z.string().optional(), alt: text, caption: text }))
    .min(1),
  /** Newest first. */
  roles: z.array(z.object({ years: text, role: text, what: text })).min(1),
  competitions: z.array(
    z.object({
      name: text,
      year: text,
      city: text,
      country: text,
      vehicle: text,
      /** Optional: what the vehicle's name means. */
      meaning: z.string().optional(),
      awards: z.array(text).default([]),
      image: z.string().optional(),
    }),
  ),
  events: z.array(z.object({ date: text, title: text, where: text, role: eventRole })),
});

export const placesSchema = z.array(
  z.object({
    kind: z.enum(['studied', 'competed', 'presented']),
    title: text,
    city: text,
    country: text,
    year: text,
    note: text,
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
);

export const coursesSchema = z.array(
  z.object({ name: text, provider: z.string().optional(), year: z.string().optional() }),
);

/** Project filters on the homepage, in display order. */
export const projectFields = {
  llm: 'LLMs & agents',
  vision: 'Vision & multimodal',
  rl: 'RL & optimization',
  apps: 'Apps & web',
} as const;

/** Frontmatter of src/content/projects/*.md. The Markdown body is the story on the project page. */
export const projectSchema = z.object({
  name: text,
  line: text,
  year: z.number().int(),
  /** One or more of: llm, vision, rl, apps (see projectFields). */
  fields: z.array(z.enum(['llm', 'vision', 'rl', 'apps'])).min(1),
  tags: z.array(text).default([]),
  /** Image path under public/. Without it, a generated cover is shown. */
  cover: z.string().optional(),
  /** Short silent looping video (.mp4) for the homepage carousel and the project page; `cover` is its poster. */
  preview: z.string().optional(),
  /** "contain" shows the whole cover (for figures and screenshots); "cover" (default) fills and crops. */
  coverFit: z.enum(['cover', 'contain']).default('cover'),
  /** Which part of the cover/preview to keep when it's cropped, as CSS object-position (e.g. "50% 80%"). */
  coverPosition: z.string().optional(),
  /** Letter(s) on the generated cover. Defaults to the name's first letter. */
  mark: z.string().max(3).optional(),
  /** Your role on the project, shown on its page. */
  role: z.string().optional(),
  links: z
    .object({
      live: z.string().optional(),
      code: z.string().optional(),
      paper: z.string().optional(),
      /** A file to install or download, e.g. an Android APK. */
      download: z.string().optional(),
    })
    .default({}),
  /** Experience `id` this project is related to. */
  relatedExperience: z.string().optional(),
  /** Show as a personal slide in the homepage carousel. */
  featured: z.boolean().default(false),
  /** Rank in the homepage list (1 = first). Pinned projects come first and show before "Show all". */
  pinned: z.number().int().positive().optional(),
});

export type Profile = z.infer<typeof profileSchema>;
export type OffTheClockItem = z.infer<typeof offTheClockSchema>[number];
export type Degree = z.infer<typeof educationSchema>[number];
export type Job = z.infer<typeof experienceSchema>[number];
export type Leadership = z.infer<typeof leadershipSchema>;
export type Place = z.infer<typeof placesSchema>[number];
export type Course = z.infer<typeof coursesSchema>[number];
export type ProjectData = z.infer<typeof projectSchema>;
