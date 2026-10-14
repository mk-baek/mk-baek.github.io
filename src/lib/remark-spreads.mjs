// Turns a quote block that starts with [!spread] into a full-width illustrated spread.
//
//   > [!spread ripple]
//   > How might we design a future in which we serve water — and so ourselves?
//   > — Minkyung Baek
//
// Options inside the brackets, in any order:
//   scene: drift | contour | ripple | shimmer   (omitted → chosen from the text)
//   tone:  light | deep
//   place: left | center | right
// A last line starting with "—" or "--" becomes the attribution.
import { SCENES, sceneSvg } from './art.mjs';

const MARKER = /^\s*\[!spread([^\]]*)\]\s*/i;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function text(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  if (node.type === 'break') return '\n';
  return (node.children ?? []).map(text).join('');
}

export function spreadHtml({ scene, tone, place, lines, attribution, seed }) {
  const quote = lines.map((l) => `<p>${esc(l).replace(/\n/g, '<br>')}</p>`).join('');
  return (
    `<figure class="spread spread--${tone} spread--${place}" data-spread>` +
    `<div class="spread__art">${sceneSvg(scene, seed)}</div>` +
    `<div class="spread__text"><blockquote class="spread__quote">${quote}</blockquote>` +
    (attribution ? `<figcaption class="spread__by">${esc(attribution)}</figcaption>` : '') +
    `</div>` +
    `<button type="button" class="spread__save" data-spread-save>Save as image</button>` +
    `</figure>`
  );
}

export function remarkSpreads() {
  return (tree) => {
    tree.children = tree.children.map((node) => {
      if (node.type !== 'blockquote') return node;
      const first = node.children[0];
      const firstText = first?.type === 'paragraph' ? first.children[0] : undefined;
      if (firstText?.type !== 'text') return node;
      const m = firstText.value.match(MARKER);
      if (!m) return node;

      const opts = m[1].toLowerCase().split(/[\s,]+/).filter(Boolean);
      const scene = opts.find((o) => SCENES.includes(o)) ?? '';
      const tone = opts.includes('deep') ? 'deep' : 'light';
      const place = opts.find((o) => ['left', 'center', 'right'].includes(o)) ?? 'left';

      firstText.value = firstText.value.slice(m[0].length);
      let lines = node.children
        .filter((c) => c.type === 'paragraph')
        .flatMap((p) => text(p).split(/\n(?=\s*(?:—|--))/))
        .map((s) => s.trim())
        .filter(Boolean);
      let attribution = '';
      const last = lines[lines.length - 1];
      if (lines.length > 1 && /^(—|--)/.test(last)) {
        attribution = last.replace(/^(—|--)\s*/, '');
        lines = lines.slice(0, -1);
      }
      if (lines.length === 0) return node;
      return { type: 'html', value: spreadHtml({ scene, tone, place, lines, attribution, seed: lines.join(' ') }) };
    });
  };
}
