// Everything on the site as one JSON file at /content.json, so the agent backend answers from the same data.
import type { APIRoute } from 'astro';
import { courses, education, experience, getProjects, leadership, offTheClock, places, profile } from '../lib/content';
import { sections } from '../lib/sections';

export const GET: APIRoute = async () => {
  const projects = (await getProjects()).map((p) => ({ slug: p.id, ...p.data, story: p.body ?? '' }));
  const body = { sections, profile, offTheClock, education, experience, leadership, places, projects, courses };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json' } });
};
