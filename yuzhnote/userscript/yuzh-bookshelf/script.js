// yuzh-bookshelf/script.js : 「読書メモ」ページの本文の下に、表紙つきの本棚を出す
//   #積読 #読書中 #読了 のタグで絞り込むタブと、表紙の上の状態ラベルつき
import { PROJECT, pad } from '../yuzh-common/util.js';
import { STATUSES, statusOfLinks } from './status.js';

export const SHELF_PAGE = '読書メモ';
// 本ではない（目次などの）ページは本棚に出さない
export const SHELF_EXCLUDE = ['目次', 'ショートカットリンク集', 'メモフォーマット', '知識メモ', '文化創作', 'コンピュータ'];
const SHELF_ID = 'yuzh-bookshelf';
const FILTER_KEY = 'yuzh-shelf-filter';
const NONE = '未設定';
const getFilter = () => { try { return sessionStorage.getItem(FILTER_KEY) || ''; } catch { return ''; } };
const putFilter = f => { try { sessionStorage.setItem(FILTER_KEY, f); } catch {} };

const dateFromTitle = title => {
  const m = title.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  return m ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : '';
};

const renderShelf = async () => {
  document.getElementById(SHELF_ID)?.remove();
  if (scrapbox.Layout !== 'page' || scrapbox.Page.title !== SHELF_PAGE) return;

  const res = await fetch(`/api/pages/${PROJECT}/${encodeURIComponent(SHELF_PAGE)}`);
  if (!res.ok) return;
  const data = await res.json();
  const books = (data.relatedPages?.links1hop || [])
    .filter(p => !SHELF_EXCLUDE.includes(p.title))
    .sort((a, b) => b.updated - a.updated) // 新しく更新した順
    .map(b => ({ ...b, status: statusOfLinks(b.linksLc) }));

  const box = document.createElement('div');
  box.id = SHELF_ID;
  box.innerHTML = `<div class="yuzh-shelf-head">本棚（${books.length}冊）</div>`;

  // 絞り込みのタブ（すべて・積読・読書中・読了・未設定）。冊数が 0 の状態は出さない
  const count = s => books.filter(b => (b.status || NONE) === s).length;
  const tabs = [['', books.length], ...[...STATUSES, NONE].map(s => [s, count(s)]).filter(([, n]) => n)];
  let filter = getFilter();
  if (!tabs.some(([s]) => s === filter)) filter = '';
  const tabBox = document.createElement('div');
  tabBox.className = 'yuzh-shelf-tabs';
  tabBox.setAttribute('role', 'group');
  tabBox.setAttribute('aria-label', '読書の状態で絞り込む');
  const grid = document.createElement('div');
  grid.className = 'yuzh-shelf-grid';
  const show = () => {
    tabBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === filter)));
    grid.querySelectorAll('.yuzh-book').forEach(a => { a.hidden = !!filter && a.dataset.status !== filter; });
  };
  if (books.some(b => b.status)) { // 状態を1つも使っていなければタブは出さない
    for (const [s, n] of tabs) {
      const t = document.createElement('button');
      t.type = 'button';
      t.dataset.s = s;
      t.textContent = `${s || 'すべて'} ${n}`;
      t.addEventListener('click', () => { filter = s; putFilter(s); show(); });
      tabBox.append(t);
    }
    box.append(tabBox);
  }

  for (const b of books) {
    const a = document.createElement('a');
    a.className = 'yuzh-book';
    a.dataset.status = b.status || NONE;
    if (b.status) {
      const badge = document.createElement('span');
      badge.className = 'yuzh-book-status';
      badge.dataset.s = b.status;
      badge.textContent = b.status;
      a.append(badge);
    }
    a.href = `/${PROJECT}/${encodeURIComponent(b.title)}`;
    const name = b.title.replace(/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}[ 　,，]*/, '');
    if (b.image) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = b.image;
      a.append(img);
    } else {
      // 表紙画像がない本は、タイトル入りの仮表紙にする
      const cover = document.createElement('div');
      cover.className = 'yuzh-book-noimg';
      cover.textContent = name;
      a.append(cover);
    }
    const cap = document.createElement('div');
    cap.className = 'yuzh-book-cap';
    cap.textContent = name;
    const d = document.createElement('div');
    d.className = 'yuzh-book-date';
    d.textContent = dateFromTitle(b.title);
    a.append(...(b.image ? [cap, d] : [d]));
    grid.append(a);
  }
  box.append(grid);
  show();
  const lines = document.querySelector('.page .lines');
  if (lines && scrapbox.Page.title === SHELF_PAGE) lines.after(box);
};

const onPage = () => setTimeout(renderShelf, 500);
onPage();
scrapbox.on('page:changed', onPage);
scrapbox.on('layout:changed', onPage);
