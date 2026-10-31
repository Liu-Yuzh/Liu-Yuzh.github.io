// yuzh-book/hanmoto.js : 版元ドットコムの本のページから書誌を読み取る（ブラウザ拡張経由）
import { bridgeFetch } from '../yuzh-common/bridge.js';
import { fmtName, fmtDate } from './format.js';

export const hanmotoByIsbn = async isbn => {
  const url = `https://www.hanmoto.com/bd/isbn/${isbn}`;
  const html = await bridgeFetch(url);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (/メンテナンス/.test(doc.title)) throw new Error('版元ドットコムはメンテナンス中です');
  // ① 構造化データ（JSON-LD）があればそれを使う
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const arr = [].concat(JSON.parse(s.textContent)).flatMap(x => x['@graph'] || [x]);
      const b = arr.find(x => /Book|Product/.test([].concat(x['@type']).join(',')));
      if (b?.name) {
        return {
          isbn, title: b.name,
          authors: [].concat(b.author || []).map(a => ({ name: fmtName(a.name || a) })),
          publisher: [].concat(b.publisher || [])[0]?.name || '', pubdate: fmtDate(b.datePublished),
          cover: [].concat(b.image || [])[0] || '', source: '版元ドットコム', sourceUrl: url,
        };
      }
    } catch {}
  }
  // ② なければ、ページの見出しや「著／発行／発売日」の表記から読み取る
  const meta = n => doc.querySelector(`meta[property="${n}"],meta[name="${n}"]`)?.content || '';
  const text = doc.body?.innerText || doc.body?.textContent || '';
  const pick = re => (text.match(re)?.[1] || '').trim();
  const title = (doc.querySelector('h1')?.textContent || meta('og:title').split('|')[0]).trim();
  if (!title) throw new Error('版元ドットコムのページを読み取れませんでした');
  return {
    isbn, title,
    authors: pick(/([^\n]+?)\s*(?:著|編|訳)\s*\n/).split(/[、,／\/]/).filter(Boolean).map(n => ({ name: fmtName(n) })),
    publisher: pick(/発行[：:]\s*([^\n]+)/),
    pubdate: fmtDate(pick(/(?:発売日|発行日|書店発売日)[：:]?\s*([0-9]{4}[年\/.\-][0-9]{1,2}[月\/.\-]?[0-9]{0,2})/)),
    cover: meta('og:image'), source: '版元ドットコム', sourceUrl: url,
  };
};
