// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { remarkSpreads } from './src/lib/remark-spreads.mjs';

// Raw HTML and `javascript:` links in Markdown are rejected by the content check
// in src/lib/content.ts, so the build stops before they can reach the site.
// `> [!spread …]` quote blocks become illustrated spreads (src/lib/remark-spreads.mjs).
export default defineConfig({
  site: 'https://mk-baek.github.io',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  markdown: {
    processor: unified({ remarkPlugins: [remarkSpreads] }),
  },
});
