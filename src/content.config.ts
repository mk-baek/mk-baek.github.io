import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Content lives in three places:
 *  - content/   published or ready-to-publish files (committed)
 *  - drafts/    local-only drafts (git-ignored, never pushed)
 *  - fixtures/  generated preview samples, loaded only with `npm run dev:fixtures`
 */
const withFixtures = process.env.THE_CURRENT_FIXTURES === '1';

const patterns = (kind: string) => [
  `content/${kind}/*.md`,
  `drafts/${kind}/*.md`,
  ...(withFixtures ? [`fixtures/${kind}/*.md`] : []),
];

/** The file name (without .md) is the id and the URL slug. */
const idFromFileName = ({ entry }: { entry: string }) =>
  entry.split('/').pop()!.replace(/\.md$/i, '').toLowerCase();

/**
 * Dates are read in Asia/Seoul. `2026-10-13` means midnight in Seoul;
 * a time without an offset is also read as Seoul time.
 * The stored value is an ISO string with an explicit offset.
 */
const seoulDate = z.union([z.string(), z.date()]).transform((value, ctx) => {
  let iso: string;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Invalid date' });
      return z.NEVER;
    }
    const isDateOnly =
      value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0;
    iso = isDateOnly ? `${value.toISOString().slice(0, 10)}T00:00:00+09:00` : value.toISOString();
  } else {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) iso = `${s}T00:00:00+09:00`;
    else if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(s))
      iso = `${s.replace(' ', 'T')}${s.length === 16 ? ':00' : ''}+09:00`;
    else iso = s;
  }
  if (Number.isNaN(Date.parse(iso))) {
    ctx.addIssue({ code: 'custom', message: `Invalid date "${String(value)}". Use YYYY-MM-DD.` });
    return z.NEVER;
  }
  return iso;
});

const source = z.object({
  title: z.string().min(1),
  authorOrPublisher: z.string().optional(),
  url: z.url().optional(),
  publishedYear: z.number().int().optional(),
  locator: z.string().optional(),
});

const cover = z.object({ src: z.string().min(1), alt: z.string() });

/**
 * Illustrated opening ("spread"). true = on with defaults, false = off.
 * scene: drift | contour | ripple | shimmer (omitted → chosen from the slug)
 * quote: a line to set large instead of the title; tone: light | deep; place: left | center | right
 */
const spread = z.union([
  z.boolean(),
  z.object({
    scene: z.enum(['drift', 'contour', 'ripple', 'shimmer']).optional(),
    quote: z.string().optional(),
    attribution: z.string().optional(),
    tone: z.enum(['light', 'deep']).default('light'),
    place: z.enum(['left', 'center', 'right']).default('left'),
  }),
]);
const status = z.enum(['draft', 'published']).default('draft');
const lang = z.enum(['en', 'ko']).default('en');

/**
 * Journal entries.
 *  project — longer pieces: projects, retrospectives, worked-through arguments
 *  note    — short thoughts on an article, a talk, a class, someone's writing
 *  insight — a line worth keeping (a quote or idea) plus my own take
 * Where it came from goes in `context`; course / seminar / forum = "From classes & talks".
 */
const entries = defineCollection({
  loader: glob({ pattern: patterns('entries'), generateId: idFromFileName }),
  schema: z
    .object({
      title: z.string().min(1),
      type: z.enum(['project', 'note', 'insight']),
      summary: z.string().min(1),
      status,
      publishedAt: seoulDate.optional(),
      updatedAt: seoulDate.optional(),
      context: z.enum(['course', 'seminar', 'forum', 'reading', 'practice', 'reflection']).optional(),
      /** insight: the line itself, and who said or wrote it */
      quote: z.string().optional(),
      quoteBy: z.string().optional(),
      /** shown under the quote, e.g. "원문 일부 발췌" (excerpt), with a link to where the quote comes from */
      quoteNote: z.string().optional(),
      quoteSource: z.object({ title: z.string().min(1), url: z.url() }).optional(),
      /** what the "On" box under the title points to (Notes fall back to their first source) */
      on: source.optional(),
      /** one line set in a soft box under the title (e.g. a project's motto) */
      tagline: z.string().optional(),
      /** a second quote shown under the title, in place of the "exploring" line */
      headQuote: z.object({ text: z.string().min(1), by: z.string().optional() }).optional(),
      questions: z.array(z.string()).max(2, 'An entry links to at most 2 questions').default([]),
      topics: z.array(z.string()).default([]),
      sources: z.array(source).default([]),
      cover: cover.optional(),
      spread: spread.optional(),
      /** Pin to the home page's The Current Flow: 1 comes first, then 2 … (unpinned items fill in, newest first) */
      featured: z.number().int().min(1).optional(),
      lang,
      fixture: z.boolean().default(false),
    })
    .superRefine((d, ctx) => {
      if (d.status === 'published' && !d.publishedAt)
        ctx.addIssue({ code: 'custom', message: 'A published entry needs publishedAt' });
      if (d.status === 'published' && d.type === 'insight' && !d.quote)
        ctx.addIssue({ code: 'custom', message: 'A published Insight needs a quote' });
    }),
});

const questions = defineCollection({
  loader: glob({ pattern: patterns('questions'), generateId: idFromFileName }),
  schema: z.object({
    title: z.string().min(1),
    introduction: z.string().min(1),
    currentThinking: z.string().optional(),
    status,
    recommended: z.array(z.string()).max(3, 'At most 3 recommended entries').default([]),
    spread: spread.optional(),
    lang,
    fixture: z.boolean().default(false),
  }),
});

/**
 * Library: recommended books, reports, articles — links, not uploaded files.
 * Previews (title, description, image) come from content/library-previews.json,
 * filled by `npm run library:previews`. Anything written here wins over the preview.
 */
const library = defineCollection({
  loader: glob({ pattern: patterns('library'), generateId: idFromFileName }),
  schema: z
    .object({
      url: z.url(),
      title: z.string().optional(),
      kind: z.enum(['book', 'report', 'article', 'video', 'podcast', 'other']).default('article'),
      author: z.string().optional(),
      publisher: z.string().optional(),
      year: z.number().int().optional(),
      why: z.string().min(1, 'Say in one sentence why you recommend it'),
      /** optional: replaces the fetched preview text ("" hides it) */
      description: z.string().optional(),
      topics: z.array(z.string()).default([]),
      status,
      addedAt: seoulDate.optional(),
      archiveUrl: z.url().optional(),
      image: z.string().optional(),
      /** Pin to the home page's The Current Flow: 1 comes first, then 2 … (unpinned items fill in, newest first) */
      featured: z.number().int().min(1).optional(),
      lang,
      fixture: z.boolean().default(false),
    })
    .superRefine((d, ctx) => {
      if (d.status === 'published' && !d.addedAt)
        ctx.addIssue({ code: 'custom', message: 'A published Library item needs addedAt' });
    }),
});

export const collections = { entries, questions, library };
