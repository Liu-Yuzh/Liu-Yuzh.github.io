// yuzh-common/page-io.js : ページを読む・書き換える
// 書き換えは Cosense のインポート機能で「同じタイトルのページを上書き」して行う
import { PROJECT, sleep } from './util.js';

export const getPage = async title => {
  const res = await fetch(`/api/pages/${PROJECT}/${encodeURIComponent(title)}`);
  if (!res.ok) throw new Error(`ページ取得に失敗（${res.status}）`);
  return res.json();
};

// 今画面に出ている本文
export const localText = () => (scrapbox.Page.lines || []).map(l => l.text).join('\n');

// サーバーに保存済みの内容が、画面の内容と一致するまで待つ（打ちかけの文字を消さないため）
export const waitSynced = async title => {
  for (let i = 0; i < 20; i++) {
    const p = await getPage(title).catch(() => null);
    if (p?.persistent && p.lines.map(l => l.text).join('\n') === localText()) return p;
    await sleep(1000);
  }
  throw new Error('保存の完了を確認できませんでした。少し待ってからメニューで再実行してください');
};

export const writePage = async (title, newLines) => {
  const fd = new FormData();
  fd.append('import-file', new Blob([JSON.stringify({ pages: [{ title, lines: newLines }] })], { type: 'application/octet-stream' }));
  fd.append('name', 'undefined');
  const headers = {};
  if (window._csrf) headers['X-CSRF-TOKEN'] = window._csrf;
  const res = await fetch(`/api/page-data/import/${PROJECT}.json`, { method: 'POST', headers, body: fd });
  if (!res.ok) throw new Error(`書き込みに失敗（${res.status}）`);
};
