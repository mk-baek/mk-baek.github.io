// Create a new draft from a template.
//   npm run new -- project "What a carbon audit taught me"
//   npm run new -- note "On the latest EU taxonomy update"
//   npm run new -- insight "Water always wins"
//   npm run new -- library "IEA World Energy Outlook"
//   npm run new -- question "How do environmental risks change corporate choices?"
// The file goes to drafts/ (local only, never pushed). Publish it later with `npm run publish-entry -- <slug>`.
import fs from 'node:fs';
import path from 'node:path';

const [kind, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(' ').trim();
const kinds = { project: 'entries', note: 'entries', insight: 'entries', question: 'questions', library: 'library' };

if (!kinds[kind] || !title) {
  console.error('Usage: npm run new -- <project|note|insight|library|question> "Title"');
  process.exit(1);
}

const slug =
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/[^a-z0-9\s-]/g, '') // Korean titles: write an English slug by renaming the file
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70)
    .replace(/-$/, '') || `entry-${new Date().toISOString().slice(0, 10)}`;

const template = fs.readFileSync(path.join('templates', `${kind}.md`), 'utf8');
const body = /^title: /m.test(template)
  ? template.replace(/^title: .*$/m, `title: ${JSON.stringify(title)}`)
  : template.replace(/^# title: .*$/m, `title: ${JSON.stringify(title)}`);

const dir = path.join('drafts', kinds[kind]);
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${slug}.md`);
if (fs.existsSync(file) || fs.existsSync(path.join('content', kinds[kind], `${slug}.md`))) {
  console.error(`A file named ${slug}.md already exists. Choose another title or rename the file.`);
  process.exit(1);
}
fs.writeFileSync(file, body);
console.log(`Created ${file.replaceAll('\\', '/')}`);
const where = kind === 'library' ? 'library/' : kind === 'question' ? `questions/${slug}/` : `journal/${slug}/`;
console.log(`Preview it with "npm run dev" → http://localhost:4321/${where}`);
if (kind === 'library') console.log('Then fetch its preview card: npm run library:previews');
