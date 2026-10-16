// Helpers for the ask terminal that don't need the backend: the thinking status shown while waiting,
// which sections to offer as "jump to" links, and the example answer shown when the page loads.
import type { SectionId } from './sections';

export type Intent = 'study' | 'start' | 'now' | 'best' | 'lead' | 'talk' | 'contact' | 'other';

/** First match wins, so more specific intents come first. */
const rules: [Intent, RegExp][] = [
  ['start', /\bstart\b|availab|hire|hiring|join|full.?time|when can/],
  ['study', /stud|degree|universit|educat|master|bachelor|school|course|graduat/],
  ['now', /working on|right now|currently|these days|\bnow\b|\bjob\b/],
  ['best', /project|built|proud|portfolio|best/],
  ['lead', /lead|hyperloop|team|compet|organi[sz]ation|club/],
  ['talk', /explain|communicat|talk|speak|present|event/],
  ['contact', /contact|e-?mail|reach|linkedin|github|touch/],
];

export function matchIntent(question: string): Intent {
  const q = question.toLowerCase();
  return rules.find(([, re]) => re.test(q))?.[0] ?? 'other';
}

/** Status line shown while waiting for the answer. */
export const thinkingStatus: Record<Intent, string> = {
  study: 'opening my transcript',
  start: 'checking my calendar',
  now: 'reading my experience',
  best: 'ranking my projects',
  lead: 'digging through team photos',
  talk: 'rehearsing my answer',
  contact: 'looking for my email',
  other: 'thinking',
};

const intentSections: Record<Intent, SectionId[]> = {
  study: ['education'],
  start: ['contact'],
  now: ['experience'],
  best: ['projects'],
  lead: ['leadership'],
  talk: ['leadership'],
  contact: ['contact'],
  other: [],
};

/** What an answer mentions, mapped to the section that covers it. */
const mentions: [SectionId, RegExp][] = [
  ['education', /\bUSC\b|(?<!Hyperloop )\bUPV\b|University|degree|M\.S\.|B\.S\.|GPA|Fulbright|master'?s|bachelor'?s|thesis|graduat/i],
  ['experience', /LiraLab|VRAIN|researcher|intern\b|Rebrot|imitation learning|robot arm|levitation controller/i],
  ['leadership', /Hyperloop|team lead|sponsorship|European Hyperloop Week|Unveiling/i],
  ['projects', /\bprojects?\b|watermark|CLIP Finder|Codenames|OpenClaw|EXIST|Slack (bot|assistant)/i],
  ['contact', /linkedin|e-?mail|@|reach (him|me|out)/i],
];

/** Up to three sections to jump to: from the question's topic first, then from what the answer mentions. */
export function sectionsFor(question: string, answer: string): SectionId[] {
  const found = new Set<SectionId>(intentSections[matchIntent(question)]);
  for (const [id, re] of mentions) if (re.test(answer)) found.add(id);
  return [...found].slice(0, 3);
}

/** Sections to suggest when the answer service can't be reached. */
export function fallbackSections(question: string): SectionId[] {
  const s = intentSections[matchIntent(question)];
  return s.length ? s : ['experience', 'projects'];
}

/** The answered example shown in the terminal on page load, in the agent's voice (third person). */
export function exampleAnswer(f: {
  firstName: string;
  studying: { degree: string; school: string; until: string };
  earlierDegrees: string[];
}): string {
  const earlier = f.earlierDegrees.length ? ` Before that: ${f.earlierDegrees.join(' and ')}.` : '';
  return `${f.firstName} is doing an ${f.studying.degree} at ${f.studying.school} and graduates in ${f.studying.until}.${earlier}`;
}
