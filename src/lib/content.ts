import fs from 'node:fs';
import path from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';
import { z } from 'astro/zod';
import homeJson from '../../content/home.json';
import linksJson from '../../content/links.json';
import previewsJson from '../../content/library-previews.json';
import { timestamp } from './dates';

export type Entry = CollectionEntry<'entries'>;
export type Question = CollectionEntry<'questions'>;
export type LibraryItem = CollectionEntry<'library'>;
export type EntryType = Entry['data']['type'];
export type ItemState = 'published' | 'scheduled' | 'draft';

/* ------------------------------------------------------------------ */
/* Visibility                                                          */
/* ------------------------------------------------------------------ */

const DEV = import.meta.env.DEV;
/** In `npm run dev`, drafts and scheduled items are shown with a label so they can be reviewed.
 *  `npm run build` never includes them. */
const SHOW_UNPUBLISHED = DEV && process.env.THE_CURRENT_HIDE_DRAFTS !== '1';
const NOW = Date.now();

export const isLocalPreview = SHOW_UNPUBLISHED;

function stateOf(status: 'draft' | 'published', date?: string): ItemState {
  if (status !== 'published') return 'draft';
  return timestamp(date) <= NOW ? 'published' : 'scheduled';
}

export const entryState = (e: Entry): ItemState => stateOf(e.data.status, e.data.publishedAt);
export const questionState = (q: Question): ItemState => (q.data.status === 'published' ? 'published' : 'draft');
export const libraryState = (l: LibraryItem): ItemState => stateOf(l.data.status, l.data.addedAt);

function visible(state: ItemState, fixture: boolean): boolean {
  if (fixture && !DEV) return false;
  return state === 'published' || SHOW_UNPUBLISHED;
}

/* ------------------------------------------------------------------ */
/* Editorial config (home.json, links.json, library-previews.json)     */
/* ------------------------------------------------------------------ */

const ref = z.object({ kind: z.enum(['entry', 'library']), id: z.string().min(1) });

const homeSchema = z.object({
  currentQuestion: z.string().nullable().optional(),
  featuredEntries: z.array(z.string()).max(3, 'home.json: featuredEntries can list at most 3 entries').default([]),
});

const linksSchema = z.array(
  z.object({ from: ref, to: ref, label: z.string().min(1), order: z.number().default(0) }),
);

export type EditorialLink = z.infer<typeof linksSchema>[number];

export interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  fetchedAt?: string;
}
const previews = previewsJson as Record<string, LinkPreview>;
export const previewFor = (url: string): LinkPreview => previews[url] ?? {};

/* ------------------------------------------------------------------ */
/* Loading + build-time validation                                     */
/* ------------------------------------------------------------------ */

export interface SiteData {
  entries: Entry[]; // visible, newest first
  questions: Question[]; // visible (status), not filtered by links
  library: LibraryItem[]; // visible, newest first
  home: z.infer<typeof homeSchema>;
  links: EditorialLink[];
}

let cache: Promise<SiteData> | undefined;

export function getSite(): Promise<SiteData> {
  cache ??= load();
  return cache;
}

const byDate =
  <T,>(get: (x: T) => string | undefined) =>
  (a: T, b: T) =>
    (timestamp(get(b)) || Infinity) - (timestamp(get(a)) || Infinity);

async function load(): Promise<SiteData> {
  const [allEntries, allQuestions, allLibrary] = await Promise.all([
    getCollection('entries'),
    getCollection('questions'),
    getCollection('library'),
  ]);

  const homeParsed = homeSchema.safeParse(homeJson);
  const linksParsed = linksSchema.safeParse(linksJson);
  const errors: string[] = [];
  const fatal: string[] = [];
  if (!homeParsed.success) fatal.push(`content/home.json: ${homeParsed.error.message}`);
  if (!linksParsed.success) fatal.push(`content/links.json: ${linksParsed.error.message}`);
  const home = homeParsed.success ? homeParsed.data : { featuredEntries: [] };
  const links = linksParsed.success ? linksParsed.data : [];

  fatal.push(...findDuplicateFiles());
  for (const e of allEntries) fatal.push(...unsafeMarkdown(`entries/${e.id}`, e.body), ...rawDateErrors(e.filePath));
  for (const l of allLibrary) fatal.push(...unsafeMarkdown(`library/${l.id}`, l.body), ...rawDateErrors(l.filePath));

  const entryIds = new Set(allEntries.map((e) => e.id));
  const questionIds = new Set(allQuestions.map((q) => q.id));
  const libraryIds = new Set(allLibrary.map((l) => l.id));
  const exists = (r: { kind: 'entry' | 'library'; id: string }) =>
    r.kind === 'entry' ? entryIds.has(r.id) : libraryIds.has(r.id);

  for (const e of allEntries)
    for (const q of e.data.questions)
      if (!questionIds.has(q)) errors.push(`entries/${e.id}: unknown question "${q}"`);
  for (const q of allQuestions)
    for (const r of q.data.recommended)
      if (!entryIds.has(r)) errors.push(`questions/${q.id}: unknown recommended entry "${r}"`);
  for (const l of links) {
    if (!exists(l.from)) errors.push(`links.json: unknown ${l.from.kind} "${l.from.id}"`);
    if (!exists(l.to)) errors.push(`links.json: unknown ${l.to.kind} "${l.to.id}"`);
  }
  if (home.currentQuestion && !questionIds.has(home.currentQuestion))
    errors.push(`home.json: unknown question "${home.currentQuestion}"`);
  for (const id of home.featuredEntries)
    if (!entryIds.has(id)) errors.push(`home.json: unknown featured entry "${id}"`);

  for (const e of allEntries)
    if (e.data.topics.length > 4)
      console.warn(`[the-current] entries/${e.id}: ${e.data.topics.length} topics (4 or fewer recommended)`);

  if (fatal.length) throw new Error(`Content check failed:\n  - ${fatal.join('\n  - ')}`);
  if (errors.length) {
    // On this computer (drafts/ exists) every reference can be checked, so a broken one stops the build.
    // On the deploy server drafts/ is absent by design: a reference to a local draft is expected there,
    // so it is reported as a warning and the missing item is simply not shown.
    const strict = fs.existsSync(path.join(process.cwd(), 'drafts'));
    const message = `Content check ${strict ? 'failed' : 'warnings'}:\n  - ${errors.join('\n  - ')}`;
    if (strict) throw new Error(message);
    console.warn(`[the-current] ${message}`);
  }

  return {
    entries: allEntries
      .filter((e) => visible(entryState(e), e.data.fixture))
      .sort(byDate((e: Entry) => e.data.publishedAt)),
    questions: allQuestions.filter((q) => visible(questionState(q), q.data.fixture)),
    library: allLibrary
      .filter((l) => visible(libraryState(l), l.data.fixture))
      .sort(byDate((l: LibraryItem) => l.data.addedAt)),
    home,
    links: [...links].sort((a, b) => a.order - b.order),
  };
}

/**
 * YAML silently rolls impossible dates over (2026-13-45 becomes 2027-02-14), so the
 * date text is checked against the calendar as written in the file.
 */
function rawDateErrors(filePath?: string): string[] {
  if (!filePath) return [];
  const full = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(full)) return [];
  const front = fs.readFileSync(full, 'utf8').split(/^---\s*$/m)[1] ?? '';
  const errors: string[] = [];
  for (const m of front.matchAll(/^(publishedAt|updatedAt|addedAt):\s*['"]?(\d{4})-(\d{1,2})-(\d{1,2})/gm)) {
    const [, key, y, mo, d] = m;
    const date = new Date(Date.UTC(+y, +mo - 1, +d));
    if (date.getUTCFullYear() !== +y || date.getUTCMonth() !== +mo - 1 || date.getUTCDate() !== +d)
      errors.push(`${filePath.replaceAll('\\', '/')}: ${key} ${y}-${mo}-${d} is not a real date`);
  }
  return errors;
}

/** Raw HTML (including scripts) and javascript: links are not allowed in Markdown. Code is ignored. */
function unsafeMarkdown(where: string, body = ''): string[] {
  const text = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const errors: string[] = [];
  const tag = text.match(/<\/?[a-z][\w-]*(\s[^<>]*)?\/?>/i);
  if (tag) errors.push(`${where}: raw HTML is not allowed in Markdown (found ${tag[0].slice(0, 40)})`);
  if (/\]\(\s*<?\s*javascript:/i.test(text) || /^\s*\[[^\]]+\]:\s*javascript:/im.test(text))
    errors.push(`${where}: javascript: links are not allowed`);
  return errors;
}

/** Same file name in content/, drafts/ or fixtures/ would produce the same slug. */
function findDuplicateFiles(): string[] {
  const errors: string[] = [];
  for (const kind of ['entries', 'questions', 'library']) {
    const seen = new Map<string, string>();
    for (const dir of ['content', 'drafts', 'fixtures']) {
      const full = path.join(process.cwd(), dir, kind);
      if (!fs.existsSync(full)) continue;
      for (const file of fs.readdirSync(full)) {
        if (!file.toLowerCase().endsWith('.md')) continue;
        const id = file.replace(/\.md$/i, '').toLowerCase();
        const where = `${dir}/${kind}/${file}`;
        if (seen.has(id)) errors.push(`duplicate slug "${id}": ${seen.get(id)} and ${where}`);
        else seen.set(id, where);
      }
    }
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** Questions that have at least one visible entry; only these get a page. */
export function explorableQuestions(site: SiteData): Question[] {
  return site.questions.filter((q) => site.entries.some((e) => e.data.questions.includes(q.id)));
}

export function questionById(site: SiteData, id: string, explorableOnly = true): Question | undefined {
  const list = explorableOnly ? explorableQuestions(site) : site.questions;
  return list.find((q) => q.id === id);
}

export const entriesForQuestion = (site: SiteData, id: string) =>
  site.entries.filter((e) => e.data.questions.includes(id));

export const typeLabel: Record<EntryType, string> = { project: 'Project', note: 'Note', insight: 'Insight' };
export const typePlural: Record<EntryType, string> = { project: 'Projects', note: 'Notes', insight: 'Insights' };

/** Classes, seminars and forums — shown together as "From classes & talks". */
export const TALK_CONTEXTS = ['course', 'seminar', 'forum'] as const;
export const isFromTalks = (e: Entry) => (TALK_CONTEXTS as readonly string[]).includes(e.data.context ?? '');

export const libraryKindLabel: Record<LibraryItem['data']['kind'], string> = {
  book: 'Book',
  report: 'Report',
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  other: 'Link',
};

/**
 * Library reading order: by publication year, newest first and oldest last.
 * Same year → the one added more recently first, then by title. Items without a year go last.
 */
export function libraryByYear(items: LibraryItem[]): LibraryItem[] {
  const year = (l: LibraryItem) => l.data.year ?? Number.NEGATIVE_INFINITY;
  const added = (l: LibraryItem) => timestamp(l.data.addedAt) || Number.NEGATIVE_INFINITY;
  return [...items].sort(
    (a, b) => year(b) - year(a) || added(b) - added(a) || a.id.localeCompare(b.id),
  );
}

/** Title and description for a Library card: what the author wrote wins over the fetched preview. */
export function libraryCard(item: LibraryItem) {
  const p = previewFor(item.data.url);
  let host = '';
  try {
    host = new URL(item.data.url).hostname.replace(/^www\./, '');
  } catch {}
  return {
    title: item.data.title ?? p.title ?? host,
    description: item.data.description ?? p.description,
    image: item.data.image ?? p.image,
    site: item.data.publisher ?? p.siteName ?? host,
    host,
  };
}

/* ------------------------------------------------------------------ */
/* The current flow: newest Journal entries and Library picks together */
/* ------------------------------------------------------------------ */

export interface FlowItem {
  kind: 'entry' | 'library';
  id: string;
  label: string; // "Note", "Project", "Library · Report" …
  showDate: boolean; // Notes are shown without a date
  title: string;
  summary: string;
  href: string;
  external: boolean;
  date?: string; // what the list is sorted by
  dateLabel: string; // "Updated" when an entry was revised after publishing
  state: ItemState;
  scene?: SpreadOptions['scene'];
  image?: string; // Library preview image, if any
  lang: 'en' | 'ko';
}

/**
 * Dates stay in the content files (they still decide the order of lists)
 * but are not shown on the site. Set to true to show them again.
 */
export const SHOW_DATES = false;
export const showsDate = (_e: Entry) => SHOW_DATES;

/**
 * The Current Flow on the home page: 2 Journal entries, then 2 Library items.
 * In each group, pinned items (`featured: 1`, `2` …) come first in that order;
 * the rest fill in newest first.
 */
export function latestFlow(site: SiteData, perGroup = 2): FlowItem[] {
  const latest = (a?: string, b?: string) => (timestamp(b) > timestamp(a) ? b : a);
  const rank = (f?: number) => f ?? Infinity;
  // Undated drafts (local preview only) sort first so they can be reviewed.
  const newest = (a?: string, b?: string) => (timestamp(b) || Infinity) - (timestamp(a) || Infinity);
  const entries = [...site.entries]
    .sort((a, b) => rank(a.data.featured) - rank(b.data.featured) || newest(latest(a.data.publishedAt, a.data.updatedAt), latest(b.data.publishedAt, b.data.updatedAt)))
    .slice(0, perGroup);
  const library = libraryByYear(site.library)
    .sort((a, b) => rank(a.data.featured) - rank(b.data.featured))
    .slice(0, perGroup);
  return [
    ...entries.map((e): FlowItem => {
      const date = latest(e.data.publishedAt, e.data.updatedAt);
      return {
        kind: 'entry',
        id: e.id,
        label: typeLabel[e.data.type],
        title: e.data.title,
        summary: e.data.summary,
        href: `/journal/${e.id}/`,
        external: false,
        date,
        dateLabel: date && date !== e.data.publishedAt ? 'Updated' : '',
        showDate: showsDate(e),
        state: entryState(e),
        scene: entrySpread(e)?.scene,
        lang: e.data.lang,
      };
    }),
    ...library.map((l): FlowItem => {
      const card = libraryCard(l);
      return {
        kind: 'library',
        id: l.id,
        label: `Library · ${libraryKindLabel[l.data.kind]}`,
        title: card.title,
        summary: l.data.why,
        // on the home page every link stays on this site: a Library pick opens its card on the Library page
        href: `/library/#${l.id}`,
        external: false,
        date: l.data.addedAt,
        dateLabel: 'Added',
        showDate: SHOW_DATES,
        state: libraryState(l),
        image: card.image,
        lang: l.data.lang,
      };
    }),
  ];
}

/* ------------------------------------------------------------------ */
/* Keyword stream: the topics my writing keeps returning to            */
/* ------------------------------------------------------------------ */

export interface Keyword {
  label: string;
  count: number;
  /** where the word leads: the Journal filtered by it, or the Library when only Library items carry it */
  href: string;
  /** 1 (rare) … 4 (most frequent) — drives the size on the home page */
  weight: 1 | 2 | 3 | 4;
}

/** Topics across visible Journal entries, most frequent first (ties: most recent first). */
export function keywordStream(site: SiteData, limit = 10): Keyword[] {
  // Journal topics count fully; Library topics count less, so they fill the stream
  // without outranking what I write about.
  const tally = new Map<string, { label: string; count: number; latest: number; inJournal: boolean }>();
  const add = (topics: string[], t: number, weight: number, inJournal: boolean) => {
    for (const raw of topics) {
      const label = raw.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      const cur = tally.get(key) ?? { label, count: 0, latest: 0, inJournal: false };
      cur.count += weight;
      cur.latest = Math.max(cur.latest, t);
      cur.inJournal ||= inJournal;
      tally.set(key, cur);
    }
  };
  for (const e of site.entries) add(e.data.topics, timestamp(e.data.publishedAt) || NOW, 1, true);
  for (const l of site.library) add(l.data.topics, timestamp(l.data.addedAt) || NOW, 0.25, false);
  // Rank: most frequent first, then most recent, then a stable tie-break so the order never jumps around.
  const tieBreak = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
  const ranked = [...tally.values()]
    .sort((a, b) => b.count - a.count || b.latest - a.latest || tieBreak(a.label) - tieBreak(b.label))
    .slice(0, limit);

  // Size by rank (not raw counts), so the stream has big and small, bold and light words
  // even when only a few entries exist. A more frequent topic is never smaller than a rarer one.
  const n = ranked.length;
  const weightAt = (i: number): Keyword['weight'] => {
    const r = n <= 1 ? 0 : i / (n - 1);
    return r < 0.15 ? 4 : r < 0.4 ? 3 : r < 0.7 ? 2 : 1;
  };
  const weighted = ranked.map((k, i) => ({
    label: k.label,
    count: k.count,
    href: k.inJournal ? `/journal/?topic=${encodeURIComponent(k.label)}` : `/library/?topic=${encodeURIComponent(k.label)}`,
    weight: weightAt(i),
  }));

  // Display order alternates big and small so it reads like a moving current, not a sorted list.
  const flowing: Keyword[] = [];
  for (let lo = 0, hi = n - 1; lo <= hi; lo++, hi--) {
    flowing.push(weighted[lo]);
    if (hi !== lo) flowing.push(weighted[hi]);
  }
  return flowing;
}

/* ------------------------------------------------------------------ */
/* "Continue this question"                                            */
/* ------------------------------------------------------------------ */

export type Related = { kind: 'entry'; item: Entry; label?: string } | { kind: 'library'; item: LibraryItem; label?: string };

export interface Continuation {
  /** 'continue' = all related; 'mixed' = related first, topped up with recent entries; 'recent' = nothing related. */
  mode: 'continue' | 'mixed' | 'recent' | 'none';
  items: Related[];
}

const SAME_QUESTION_LABEL = 'Another entry on the same question';
const RECENT_LABEL = 'Recent from the journal';
/** Every entry ends with exactly this many suggestions (fewer only if the journal is smaller). */
const MAX_RELATED = 2;

export function continuation(site: SiteData, current: { id: string; questions: string[] }): Continuation {
  const items: Related[] = [];
  const seen = new Set<string>([`entry:${current.id}`]);
  const add = (r: Related) => {
    const key = `${r.kind}:${r.item.id}`;
    if (seen.has(key) || items.length >= MAX_RELATED) return;
    seen.add(key);
    items.push(r);
  };

  // 1. Links the author registered, in their order. Hidden targets are skipped.
  for (const l of site.links) {
    if (l.from.kind !== 'entry' || l.from.id !== current.id) continue;
    if (l.to.kind === 'entry') {
      const item = site.entries.find((e) => e.id === l.to.id);
      if (item) add({ kind: 'entry', item, label: l.label });
    } else {
      const item = site.library.find((x) => x.id === l.to.id);
      if (item) add({ kind: 'library', item, label: l.label });
    }
  }

  // 2. Other entries on the same explorable question(s).
  const explorable = new Set(explorableQuestions(site).map((q) => q.id));
  const qs = current.questions.filter((q) => explorable.has(q));
  for (const e of site.entries)
    if (e.data.questions.some((q) => qs.includes(q))) add({ kind: 'entry', item: e, label: SAME_QUESTION_LABEL });

  // 3. Top up with the latest entries so there are always two suggestions.
  const related = items.length;
  for (const e of site.entries) add({ kind: 'entry', item: e, label: related ? RECENT_LABEL : undefined });
  if (!items.length) return { mode: 'none', items };
  return { mode: related === 0 ? 'recent' : related < items.length ? 'mixed' : 'continue', items };
}

/* ------------------------------------------------------------------ */
/* Illustrated spreads                                                 */
/* ------------------------------------------------------------------ */

export interface SpreadOptions {
  scene?: 'drift' | 'contour' | 'ripple' | 'shimmer';
  quote?: string;
  attribution?: string;
  tone: 'light' | 'deep';
  place: 'left' | 'center' | 'right';
}

type SpreadField = Entry['data']['spread'];

/** Projects and questions open with a spread unless turned off; notes opt in.
 *  Insights always set their quote large. */
export function resolveSpread(field: SpreadField, onByDefault: boolean): SpreadOptions | null {
  if (field === false) return null;
  if (field === undefined) return onByDefault ? { tone: 'light', place: 'left' } : null;
  if (field === true) return { tone: 'light', place: 'left' };
  return field;
}

export function entrySpread(e: Entry): SpreadOptions | null {
  const d = e.data;
  if (d.type === 'insight' && d.quote && d.spread !== false) {
    const chosen = typeof d.spread === 'object' ? d.spread : undefined;
    return {
      scene: chosen?.scene ?? 'shimmer',
      tone: chosen?.tone ?? 'deep',
      place: chosen?.place ?? 'left',
      quote: chosen?.quote ?? d.quote,
      attribution: chosen?.attribution ?? d.quoteBy,
    };
  }
  return resolveSpread(d.spread, d.type === 'project');
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

/** Rough Markdown → plain text, for the search index. */
export function plainText(md = ''): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[#>\-*+\s]+/gm, '')
    .replace(/[*_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
