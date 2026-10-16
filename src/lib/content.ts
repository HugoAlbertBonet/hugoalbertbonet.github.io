// Single entry point for site content. Components import from here, never from the JSON files.
import { getCollection, type CollectionEntry } from 'astro:content';
import type { z } from 'astro/zod';
import {
  coursesSchema,
  educationSchema,
  experienceSchema,
  leadershipSchema,
  offTheClockSchema,
  placesSchema,
  profileSchema,
} from './schemas';
import profileJson from '../content/profile.json';
import offTheClockJson from '../content/offTheClock.json';
import educationJson from '../content/education.json';
import experienceJson from '../content/experience.json';
import leadershipJson from '../content/leadership.json';
import placesJson from '../content/places.json';
import coursesJson from '../content/courses.json';

function load<S extends z.ZodType>(file: string, schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`src/content/${file} is invalid:\n${issues}`);
  }
  return result.data;
}

export const profile = load('profile.json', profileSchema, profileJson);
export const offTheClock = load('offTheClock.json', offTheClockSchema, offTheClockJson);
export const education = load('education.json', educationSchema, educationJson);
export const experience = load('experience.json', experienceSchema, experienceJson);
export const leadership = load('leadership.json', leadershipSchema, leadershipJson);
export const places = load('places.json', placesSchema, placesJson);
export const courses = load('courses.json', coursesSchema, coursesJson);

{
  const ids = experience.map((j) => j.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) throw new Error(`src/content/experience.json: duplicate id "${dupes[0]}"`);
}

export type Project = CollectionEntry<'projects'>;

/** Personal projects: pinned ones first (by rank), then newest first. Checks `relatedExperience` points at a real role. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects');
  for (const p of all) {
    const rel = p.data.relatedExperience;
    if (rel && !experience.some((j) => j.id === rel)) {
      throw new Error(`src/content/projects/${p.id}.md: relatedExperience "${rel}" is not an id in experience.json`);
    }
  }
  const rank = (p: Project) => p.data.pinned ?? Infinity;
  return all.sort(
    (a, b) => rank(a) - rank(b) || b.data.year - a.data.year || a.data.name.localeCompare(b.data.name),
  );
}

export type CarouselSlide =
  | { kind: 'pro'; name: string; line: string; org: string; experienceId: string; media?: string }
  | {
      kind: 'personal';
      name: string;
      line: string;
      slug: string;
      cover?: string;
      preview?: string;
      coverPosition?: string;
    };

/** Homepage "Favorite projects": each role's main project and each featured project, alternating. */
export async function getCarouselSlides(): Promise<CarouselSlide[]> {
  const pro: CarouselSlide[] = experience.flatMap((j) =>
    j.mainProject
      ? [{ kind: 'pro' as const, ...j.mainProject, org: j.org, experienceId: j.id }]
      : [],
  );
  const personal: CarouselSlide[] = (await getProjects())
    .filter((p) => p.data.featured)
    .map((p) => ({ kind: 'personal' as const, name: p.data.name, line: p.data.line, slug: p.id, cover: p.data.cover, preview: p.data.preview, coverPosition: p.data.coverPosition }));
  const slides: CarouselSlide[] = [];
  for (let i = 0; i < Math.max(pro.length, personal.length); i++) {
    if (pro[i]) slides.push(pro[i]);
    if (personal[i]) slides.push(personal[i]);
  }
  return slides;
}

/** Color of a project's generated cover, by its position in the project list (stable across filters). */
export function coverLook(index: number): 'graphite' | 'blue' | 'orange' {
  return (['graphite', 'blue', 'orange'] as const)[index % 3];
}

export { projectFields } from './schemas';

/** First letter or digit of a name, for logo fallbacks ("[University]" -> "U"). */
export function initialOf(name: string): string {
  return (name.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase();
}
