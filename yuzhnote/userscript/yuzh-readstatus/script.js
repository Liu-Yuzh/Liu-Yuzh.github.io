// yuzh-readstatus/script.js : ページメニュー「読書の状態」… 読書メモに #積読 #読書中 #読了 を付ける
//   読了にしたときは「読了日：今日」の行も入れる。書き換えたあとは再読み込みする
import { toast, sleep } from '../yuzh-common/util.js';
import { localText, waitSynced, writePage } from '../yuzh-common/page-io.js';
import { isBookPage } from '../yuzh-book/format.js';
import { STATUSES, statusOfTexts, setStatus } from '../yuzh-bookshelf/status.js';

const MENU = '読書の状態';
let busy = false;

const change = async status => {
  if (busy || scrapbox.Layout !== 'page') return;
  const texts = (scrapbox.Page.lines || []).map(l => l.text);
  if (!isBookPage(texts)) return toast('読書メモ（#読書メモ のページ）で使えます');
  if (statusOfTexts(texts) === status) return toast(status ? `もう「${status}」になっています` : '状態は付いていません');
  busy = true;
  try {
    toast('書き換えています…', 0);
    const title = scrapbox.Page.title;
    const page = await waitSynced(title);
    const before = page.lines.map(l => l.text);
    const next = setStatus(before, status);
    if (localText() !== before.join('\n')) { toast('編集中のため中止しました。手が空いたらもう一度選んでください', 6000); return; }
    await writePage(page.title, next);
    toast(status ? `「${status}」にしました。再読み込みします` : '状態を外しました。再読み込みします');
    await sleep(800);
    location.reload();
  } catch (e) {
    toast(`書き換えに失敗しました：${e.message}`, 6000);
  } finally {
    busy = false;
  }
};

scrapbox.PageMenu.addMenu({
  title: MENU,
  // 本のアイコン（外部画像を使わないよう SVG を埋め込み）
  image: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#555" d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>'),
});
for (const s of STATUSES) {
  scrapbox.PageMenu(MENU).addItem({ title: () => `${statusOfTexts((scrapbox.Page.lines || []).map(l => l.text)) === s ? '✓ ' : ''}${s}`, onClick: () => change(s) });
}
scrapbox.PageMenu(MENU).addItem({ title: '状態を外す', onClick: () => change('') });
