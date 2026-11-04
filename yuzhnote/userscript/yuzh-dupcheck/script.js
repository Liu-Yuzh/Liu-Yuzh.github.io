// yuzh-dupcheck/script.js : このページのリンクが、ほかのページにもすでにあれば知らせる
//   ・作って30分以内のページは、開いたときと、手を止めて6秒たったときに自動で調べる
//   ・ほかのページはページメニュー「同じリンクのページを探す」から
//   ・見つかったら、本文の上に「同じリンクがあるページ」の箱を出す（ページへのリンクつき）
import { PROJECT, toast, escapeHtml } from '../yuzh-common/util.js';
import { getPage } from '../yuzh-common/page-io.js';
import { blockedIndexes } from '../yuzh-common/blocks.js';
import { isImageUrl } from '../yuzh-common/image.js';

const BOX_ID = 'yuzh-dup';
const RECENT_SEC = 30 * 60;

// 調べないリンク（画像・カード画像・Cosense 内など）
const SKIP = [
  /^https?:\/\/(?:i\.)?gyazo\.com\//,
  /^https?:\/\/scrapbox\.io\//,
  /^https?:\/\/ricapitolare\.vercel\.app\//,
  /^https?:\/\/pbs\.twimg\.com\//,
  /^https?:\/\/(?:cover\.openbd\.jp|ndlsearch\.ndl\.go\.jp\/thumbnail|img\.hanmoto\.com)\//,
];
// 付いていても同じページを指す、計測用などのパラメータ
const TRACKING = /^(utm_\w+|fbclid|gclid|igshid|si|ref_src|ref_url|s|t|feature)$/;

const decode = s => { try { return decodeURIComponent(s); } catch { return s; } };

// 同じページを指す URL を同じ文字列（key）にする。query は検索に使う語
export const urlKey = raw => {
  let u;
  try { u = new URL(raw.replace(/#\.(png|jpe?g|gif|svg)$/i, '')); } catch { return null; }
  const host = u.hostname.replace(/^(www|mobile|m)\./, '');
  // X：ユーザー名が変わっても同じツイート
  const tw = (host === 'x.com' || host === 'twitter.com') && u.pathname.match(/^\/\w+\/status\/(\d+)/);
  if (tw) return { key: `x:${tw[1]}`, query: tw[1] };
  // YouTube：youtu.be と youtube.com/watch を同じにする
  const yt = host === 'youtu.be' ? u.pathname.slice(1).split('/')[0]
    : host === 'youtube.com' ? (u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)/) || [])[1]) : null;
  if (yt) return { key: `yt:${yt}`, query: yt };
  [...u.searchParams.keys()].forEach(k => { if (TRACKING.test(k)) u.searchParams.delete(k); });
  const path = u.pathname.replace(/\/+$/, '');
  const qs = u.searchParams.toString();
  const key = `${host}${path}${qs ? '?' + qs : ''}`.toLowerCase();
  // 検索には、パスのいちばん長い部分を使う（短すぎるときはホスト名）
  const seg = path.split('/').map(decode).sort((a, b) => b.length - a.length)[0];
  return { key, query: seg && seg.length >= 4 ? seg : host };
};

// 行の文字列の配列から、URL を { key, query, url } の一覧にする
const URL_IN_TEXT = /https?:\/\/[^\s\]]+/g;
export const urlsInTexts = (texts, { skipBlocks = true } = {}) => {
  const blocked = skipBlocks ? blockedIndexes(texts) : new Set();
  const out = new Map();
  texts.forEach((text, i) => {
    if (i === 0 || blocked.has(i)) return; // 1 行目はタイトル。コードブロックと表の中は除く
    for (const url of text.match(URL_IN_TEXT) || []) {
      if (isImageUrl(url) || SKIP.some(re => re.test(url))) continue;
      const k = urlKey(url);
      if (k && !out.has(k.key)) out.set(k.key, { ...k, url });
    }
  });
  return [...out.values()];
};

const search = async q => {
  const res = await fetch(`/api/pages/${PROJECT}/search/query?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return (await res.json()).pages || [];
};

// 読んだページのリンクは、ページを開いている間だけ覚えておく
const pageCache = new Map(); // title → Promise<Set<key>>
const keysOfPage = title => {
  if (!pageCache.has(title)) {
    pageCache.set(title, getPage(title)
      .then(p => new Set(urlsInTexts(p.lines.map(l => l.text), { skipBlocks: false }).map(u => u.key)))
      .catch(() => new Set()));
  }
  return pageCache.get(title);
};

// Map { url → [ページ名…] } を返す
const findDuplicates = async (title, urls) => {
  const found = new Map();
  for (const u of urls.slice(0, 15)) {
    const pages = (await search(u.query).catch(() => [])).filter(p => p.title !== title).slice(0, 8);
    const hits = [];
    for (const p of pages) {
      // 検索結果の抜き出し行で確かめ、なければページを読んで確かめる
      const inSnippet = urlsInTexts(['', ...(p.lines || [])], { skipBlocks: false }).some(x => x.key === u.key);
      if (inSnippet || (await keysOfPage(p.title)).has(u.key)) hits.push(p.title);
    }
    if (hits.length) found.set(u.url, hits);
  }
  return found;
};

const shortUrl = url => url.replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').slice(0, 60);

const render = found => {
  document.getElementById(BOX_ID)?.remove();
  if (!found.size) return;
  const box = document.createElement('div');
  box.id = BOX_ID;
  box.innerHTML = `<div class="yuzh-dup-head">同じリンクがほかのページにもあります<button type="button" aria-label="閉じる">×</button></div>`
    + [...found].map(([url, titles]) => `<div class="yuzh-dup-row"><span class="yuzh-dup-url">${escapeHtml(shortUrl(url))}</span>`
      + titles.map(t => `<a href="/${PROJECT}/${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('') + '</div>').join('');
  box.querySelector('button').addEventListener('click', () => box.remove());
  document.querySelector('.page .lines')?.before(box);
};

let checking = false;
let lastSig = '';
const check = async ({ manual = false } = {}) => {
  if (checking || scrapbox.Layout !== 'page' || !scrapbox.Page.lines?.length) return;
  const lines = scrapbox.Page.lines;
  const created = lines[0]?.created;
  const isNew = typeof created === 'number' && Date.now() / 1000 - created < RECENT_SEC;
  if (!manual && !isNew) return;
  const title = scrapbox.Page.title;
  const urls = urlsInTexts(lines.map(l => l.text));
  const sig = title + '\n' + urls.map(u => u.key).join('\n');
  if (!manual && sig === lastSig) return; // リンクが変わっていなければ調べ直さない
  lastSig = sig;
  if (!urls.length) { render(new Map()); if (manual) toast('このページには調べるリンクがありません'); return; }
  checking = true;
  try {
    if (manual) toast('同じリンクのページを探しています…', 0);
    const found = await findDuplicates(title, urls);
    if (scrapbox.Page.title !== title) return; // 調べている間にページを移った
    render(found);
    if (manual) toast(found.size ? `${found.size}件のリンクが、ほかのページにもありました` : '同じリンクのページは見つかりませんでした');
  } catch (e) {
    if (manual) toast(`探せませんでした：${e.message}`, 5000);
  } finally {
    checking = false;
  }
};

scrapbox.PageMenu.addItem({ title: '同じリンクのページを探す', onClick: () => check({ manual: true }) });

let idleTimer = null;
scrapbox.on('lines:changed', () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => check(), 6000);
});
const onPage = () => {
  document.getElementById(BOX_ID)?.remove();
  lastSig = '';
  pageCache.clear();
  setTimeout(() => check(), 1200);
};
onPage();
scrapbox.on('page:changed', onPage);
scrapbox.on('layout:changed', onPage);
