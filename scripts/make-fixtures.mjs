// Generate clearly-labelled PREVIEW SAMPLES for layout testing (0 / 1 / 5 / 30 entries, long text,
// long URLs, spreads, the keyword stream, Library cards).
//   npm run fixtures -- 30     then   npm run dev:fixtures
//   npm run fixtures -- 0      removes all samples
// Samples go to fixtures/ (git-ignored) and are never part of `npm run build`.
import fs from 'node:fs';
import path from 'node:path';

const count = Number.parseInt(process.argv[2] ?? '30', 10);
const root = 'fixtures';
fs.rmSync(root, { recursive: true, force: true });
if (!count) {
  console.log('Removed all preview samples.');
  process.exit(0);
}

const write = (kind, name, text) => {
  const dir = path.join(root, kind);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.md`), text);
};

write(
  'questions',
  'sample-question',
  `---
title: "[Preview sample] How do samples behave on a question page?"
introduction: This is a preview sample question used only to test layouts. It is not real content.
currentThinking: Preview sample text for the optional current-thinking field.
status: published
recommended: [sample-01, sample-03]
fixture: true
---
`,
);

// Library samples (no real links, so they show the generated-art fallback)
const kinds = ['report', 'book', 'article', 'report', 'video'];
for (let i = 1; i <= Math.min(5, count); i++) {
  write(
    'library',
    `sample-library-${i}`,
    `---
url: https://example.com/preview-sample-${i}
title: "[Preview sample] Library item ${i}"
kind: ${kinds[i - 1]}
publisher: Sample Publisher
year: 2025
why: Preview sample — one sentence on why this is worth reading.
topics: [Sample]
status: published
addedAt: 2026-10-0${i}
fixture: true
---
`,
  );
}

const types = ['note', 'insight', 'project', 'note', 'note'];
const topicPool = [
  ['Carbon', 'Corporate Strategy'],
  ['Energy Transition', 'Carbon'],
  ['Climate Risk', 'ESG Disclosure'],
  ['Carbon', 'Supply Chain'],
  ['Nature', 'Water'],
  ['Energy Transition', 'Policy'],
  ['Corporate Strategy', 'AI'],
  ['Carbon', 'Climate Risk', 'Finance'],
];
const contexts = ['course', 'seminar', 'forum', '', '', 'reading', 'practice'];
const longPara =
  'Preview sample paragraph for a long project write-up. It exists only to check line length, rhythm, and how a long read feels on a phone and on a wide screen. ';

for (let i = 1; i <= count; i++) {
  const n = String(i).padStart(2, '0');
  const type = types[(i - 1) % types.length];
  const day = new Date(Date.UTC(2026, 9, 12) - i * 3 * 86400000).toISOString().slice(0, 10);
  const isLong = i === 3;
  const isShortNote = i === 1;
  const isLongTitle = i === 4;
  const isKorean = i === 6;
  const topics = topicPool[(i - 1) % topicPool.length];
  const context = contexts[(i - 1) % contexts.length];
  const title = isLongTitle
    ? '[Preview sample] A deliberately very long title that keeps going to check wrapping on a 320 pixel wide phone screen without overflow'
    : isKorean
      ? '[미리보기 샘플] 한국어 기록이 목록과 본문에서 어떻게 보이는지 확인합니다'
      : `[Preview sample] ${type[0].toUpperCase() + type.slice(1)} number ${n}`;
  const insightFront =
    type === 'insight'
      ? `quote: "[Preview sample] A short line worth keeping, set large over the water."\nquoteBy: Preview Speaker\n`
      : '';
  const spreadFront = i === 5 ? 'spread: true\n' : '';
  const body = isShortNote
    ? 'Preview sample: a 150-character note. Short entries should still look complete without an image, headings, or a reading time.'
    : isLong
      ? ['## First part', '## Second part', '## Third part', '## Fourth part']
          .map(
            (h, k) =>
              `${h}\n\n${longPara.repeat(12)}${
                k === 1
                  ? '\n\n> [!spread drift center]\n> [Preview sample] A sentence set large in the middle of a project write-up.\n> — Preview sample'
                  : ''
              }`,
          )
          .join('\n\n') +
        '\n\n| Column | A longer column header | Another column | And one more |\n|---|---|---|---|\n| sample | sample value | sample value | sample value |'
      : isKorean
        ? '미리보기 샘플 문단입니다. 한글 본문의 줄 간격과 단어 단위 줄바꿈을 확인하기 위한 내용이며 실제 글이 아닙니다.'
        : type === 'insight'
          ? 'Preview sample: my take on the line above, in a few sentences.'
          : `Preview sample body. A long link to check wrapping: https://example.com/a/very/long/path/that/should/wrap/instead/of/overflowing/the/screen/${n}`;
  write(
    'entries',
    `sample-${n}`,
    `---
title: ${JSON.stringify(title)}
type: ${type}
summary: Preview sample ${type} — not real content.
status: published
publishedAt: ${day}
${context ? `context: ${context}\n` : ''}${insightFront}questions: [${i % 2 ? 'sample-question' : ''}]
topics: [${topics.join(', ')}]
${spreadFront}lang: ${isKorean ? 'ko' : 'en'}
fixture: true
---

${body}
`,
  );
}
console.log(`Wrote ${count} preview sample entries and ${Math.min(5, count)} Library items to fixtures/. Run "npm run dev:fixtures" to see them.`);
