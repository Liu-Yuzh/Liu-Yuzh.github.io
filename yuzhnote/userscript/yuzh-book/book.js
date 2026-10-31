// yuzh-book/book.js : 書名から本を決めて、ページに入れる行を作る
//   書名 → ISBN 候補（NDL・Google Books・Open Library）→ 詳細（openBD → NDL → 版元ドットコム）
import { escapeHtml, toast } from '../yuzh-common/util.js';
import { hasBridge } from '../yuzh-common/bridge.js';
import { norm, toIsbn13 } from './format.js';
import { fromOpenbd } from './openbd.js';
import { ndlByIsbn, ndlByTitle } from './ndl.js';
import { hanmotoByIsbn } from './hanmoto.js';

// ISBN → 詳細（openBD → NDL → 版元ドットコム の順に探す）
export const bookByIsbn = async isbn => {
  const [b] = await fromOpenbd([isbn]).catch(() => []);
  if (b) return b;
  for (const f of [ndlByIsbn, hanmotoByIsbn]) {
    try { const r = await f(isbn); if (r) return r; } catch {}
  }
  return null;
};

// 書名 → 候補（NDL は拡張があるときだけ）
export const searchBooks = async title => {
  const q = encodeURIComponent(title);
  const isbns = [];
  const add = list => list.map(toIsbn13).filter(Boolean).forEach(i => { if (!isbns.includes(i)) isbns.push(i); });
  const ndl = [];
  await Promise.all([
    fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${q}&maxResults=10&printType=books`)
      .then(r => r.ok ? r.json() : {})
      .then(j => (j.items || []).forEach(it => add((it.volumeInfo?.industryIdentifiers || []).map(x => x.identifier))))
      .catch(() => {}),
    fetch(`https://openlibrary.org/search.json?title=${q}&fields=isbn&limit=10`)
      .then(r => r.ok ? r.json() : {})
      .then(j => (j.docs || []).forEach(d => add(d.isbn || [])))
      .catch(() => {}),
    ndlByTitle(title).then(rs => { ndl.push(...rs); add(rs.map(r => r.isbn)); }).catch(() => {}),
  ]);
  const jp = isbns.sort((a, b) => (b.startsWith('9784') ? 1 : 0) - (a.startsWith('9784') ? 1 : 0)).slice(0, 15);
  const fromBd = await fromOpenbd(jp).catch(() => []);
  // openBD にない本は NDL の結果で補う
  const got = new Set(fromBd.map(b => b.isbn));
  return [...fromBd, ...ndl.filter(r => !got.has(r.isbn))];
};

// 画像が実際に表示できるか確かめる
export const imageOk = url => new Promise(resolve => {
  const img = new Image();
  const t = setTimeout(() => resolve(false), 6000);
  img.onload = () => { clearTimeout(t); resolve(img.naturalWidth > 10); };
  img.onerror = () => { clearTimeout(t); resolve(false); };
  img.src = url;
});
export const findCover = async book => {
  const urls = [
    book.cover,
    `https://www.hanmoto.com/bd/img/${book.isbn}.jpg`,
    `https://ndlsearch.ndl.go.jp/thumbnail/${book.isbn}.jpg`,
    `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`,
  ].filter(Boolean);
  for (const u of urls) if (await imageOk(u)) return u;
  return '';
};

export const bibLines = (book, cover) => [
  ...(cover ? [`[${cover}]`] : []),
  `タイトル：${book.title}`,
  `著者：${book.authors.map(a => `[${a.name}]${a.role ? `（${a.role}）` : ''}`).join(' ') || '不明'}`,
  `出版社：${book.publisher ? `[${book.publisher}]` : '不明'}`,
  `発売日：${book.pubdate || '不明'}`,
  `ISBN：${book.isbn}`,
  `from [${book.source} ${book.sourceUrl}]`,
];

// 候補が複数あるときに選んでもらう画面
export const pickBook = (title, books) => new Promise(resolve => {
  const wrap = document.createElement('div');
  wrap.id = 'yuzh-picker';
  wrap.innerHTML = `<div class="yuzh-picker-box">
      <div class="yuzh-picker-head">「${escapeHtml(title)}」の候補</div>
      <div class="yuzh-picker-list"></div>
      <div class="yuzh-picker-foot">
        <button type="button" data-act="isbn">ISBNを入力</button>
        <button type="button" data-act="cancel">やめる</button>
      </div>
    </div>`;
  const list = wrap.querySelector('.yuzh-picker-list');
  if (!books.length) list.innerHTML = '<p class="yuzh-picker-empty">見つかりませんでした。本の裏表紙のISBNを入力すると確実です。</p>';
  const done = v => { wrap.remove(); resolve(v); };
  books.forEach(b => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'yuzh-picker-item';
    btn.innerHTML = `<b>${escapeHtml(b.title)}</b><span>${escapeHtml(b.authors.map(a => a.name).join(' '))} ／ ${escapeHtml(b.publisher)} ／ ${escapeHtml(b.pubdate)}（${escapeHtml(b.source)}）</span>`;
    btn.onclick = () => done(b);
    list.append(btn);
  });
  wrap.querySelector('[data-act=cancel]').onclick = () => done(null);
  wrap.querySelector('[data-act=isbn]').onclick = async () => {
    const isbn = toIsbn13(window.prompt('ISBN（10桁または13桁）') || '');
    if (!isbn) return;
    toast('ISBNで探しています…', 0);
    const b = await bookByIsbn(isbn);
    if (b) done(b);
    else toast(await hasBridge() ? 'openBD・NDL・版元ドットコムのどこにも見つかりませんでした' : 'openBDに見つかりませんでした（ブラウザ拡張を入れるとNDL・版元ドットコムも探せます）', 6000);
  };
  document.body.append(wrap);
});

// 書名から本を決める（タイトルにISBNが書いてあればそれを使う。完全一致が1冊ならそのまま、それ以外は選択）
export const resolveBook = async title => {
  const direct = toIsbn13(title.match(/97[89][\d-]{10,14}|\b\d{9}[\dXx]\b/)?.[0] || '');
  if (direct) { const b = await bookByIsbn(direct); if (b) return b; }
  const books = await searchBooks(title);
  const exact = books.filter(b => [b.title, b.title.split(/\s+:\s+/)[0]].some(t => norm(t) === norm(title)));
  if (exact.length === 1) return exact[0];
  return pickBook(title, exact.length ? exact : books);
};
