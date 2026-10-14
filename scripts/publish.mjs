// Publish a draft: move it from drafts/ to content/, set status: published and today's date (Seoul).
//   npm run publish-entry -- design-as-water
//   npm run publish-entry -- design-as-water 2026-10-20   (schedule for a later date)
// Nothing is pushed: review with "npm run dev", then commit and push.
import fs from 'node:fs';
import path from 'node:path';

const [slug, date] = process.argv.slice(2);
if (!slug) {
  console.error('Usage: npm run publish-entry -- <slug> [YYYY-MM-DD]');
  process.exit(1);
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const publishDate = date ?? today;
if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
  console.error('Date must look like 2026-10-20');
  process.exit(1);
}

const kinds = ['entries', 'library', 'questions'];
const kind = kinds.find((k) => fs.existsSync(path.join('drafts', k, `${slug}.md`)));
if (!kind) {
  console.error(`No draft named ${slug}.md in drafts/entries, drafts/library or drafts/questions.`);
  process.exit(1);
}

const from = path.join('drafts', kind, `${slug}.md`);
const to = path.join('content', kind, `${slug}.md`);
let text = fs.readFileSync(from, 'utf8');

if (/✍️/.test(text)) {
  console.error(`${from} still contains ✍️ writing prompts. Replace or delete them before publishing.`);
  process.exit(1);
}

const setField = (src, key, value) => {
  const re = new RegExp(`^#?\\s*${key}:.*$`, 'm');
  return re.test(src) ? src.replace(re, `${key}: ${value}`) : src.replace(/^---\r?\n/, `---\n${key}: ${value}\n`);
};

text = setField(text, 'status', 'published');
if (kind === 'entries') text = setField(text, 'publishedAt', publishDate);
if (kind === 'library') text = setField(text, 'addedAt', publishDate);

// Draft images live in public/_drafts/<slug>/ (git-ignored). On publish they move to
// public/images/<slug>/ (committed) and the links in the post are updated.
const draftImages = path.join('public', '_drafts', slug);
if (fs.existsSync(draftImages)) {
  const publicImages = path.join('public', 'images', slug);
  fs.mkdirSync(path.dirname(publicImages), { recursive: true });
  fs.renameSync(draftImages, publicImages);
  text = text.replaceAll(`/_drafts/${slug}/`, `/images/${slug}/`);
  console.log(`Moved images to ${publicImages.replaceAll('\\', '/')} (they will be part of the public site).`);
}

fs.mkdirSync(path.dirname(to), { recursive: true });
fs.writeFileSync(to, text);
fs.unlinkSync(from);
console.log(`Published ${to.replaceAll('\\', '/')} (${kind === 'questions' ? 'question' : `date ${publishDate}`}).`);
console.log('Next: check it with "npm run dev", then commit and push to put it online.');
