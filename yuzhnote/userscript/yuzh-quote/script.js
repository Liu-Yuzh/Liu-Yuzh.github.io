// yuzh-quote/script.js : 選んだ文字のメニュー「引用」… 選んだ行を > の引用にする
//   読書メモのページでは、ページ数をたずねて、最後の行に (p.23) を付ける（空欄なら付けない）
//   すでに全部の行が引用なら、引用を外す
import { isBookPage } from '../yuzh-book/format.js';

const QUOTED = /^(\s*)>\s?(.*)$/;
// 23 / p23 / ｐ．２３ / 23-25 / 23〜25 → 23 / 23–25
const normPages = s => s.normalize('NFKC').trim().replace(/^p\.?\s*/i, '').replace(/\s*[-~〜ー－–—]\s*/, '–');

scrapbox.PopupMenu.addButton({
  title: '引用',
  onClick: text => {
    const lines = text.split('\n');
    // 引用を外す
    if (lines.every(l => QUOTED.test(l) || !l.trim())) {
      return lines.map(l => l.replace(QUOTED, '$1$2').replace(/\s*\(p\.[\d–]+\)\s*$/, '')).join('\n');
    }
    let ref = '';
    const texts = (scrapbox.Page.lines || []).map(l => l.text);
    if (isBookPage(texts)) {
      const key = 'yuzh-quote-page:' + scrapbox.Page.title;
      let last = '';
      try { last = sessionStorage.getItem(key) || ''; } catch {}
      const p = window.prompt('ページ数（例：23、23-25。空欄なら付けない）', last);
      if (p === null) return undefined; // やめたときは何も変えない
      const pages = normPages(p);
      if (pages) {
        ref = ` (p.${pages})`;
        try { sessionStorage.setItem(key, pages.split('–').pop()); } catch {}
      }
    }
    const last = lines.map(l => l.trim() !== '').lastIndexOf(true);
    return lines.map((l, i) => {
      if (!l.trim()) return l;
      // すでに引用の行は二重にしない。書き方は yuzh-tweet の引用と同じ「>本文」
      const m = l.match(QUOTED) || l.match(/^(\s*)(.*)$/);
      return `${m[1]}>${m[2]}${i === last ? ref : ''}`;
    }).join('\n');
  },
});
