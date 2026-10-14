import type { APIRoute } from 'astro';
import { getSite, explorableQuestions } from '../lib/content';
import { isoDay } from '../lib/dates';

/** Published addresses only. Drafts, scheduled items and fixtures never reach a production build. */
export const GET: APIRoute = async ({ site: base }) => {
  const site = await getSite();
  const url = (p: string) => new URL(p, base).href;
  const rows: { loc: string; lastmod?: string }[] = [
    { loc: url('/') },
    { loc: url('/journal/') },
    { loc: url('/library/') },
    { loc: url('/about/') },
    { loc: url('/connect/') },
    ...site.entries.map((e) => ({
      loc: url(`/journal/${e.id}/`),
      lastmod: isoDay(e.data.updatedAt ?? e.data.publishedAt),
    })),
    ...explorableQuestions(site).map((q) => ({ loc: url(`/questions/${q.id}/`) })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.map((r) => `  <url><loc>${r.loc}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
