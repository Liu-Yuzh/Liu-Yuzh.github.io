// yuzh-templates/script.js : ページメニュー「テンプレから新規作成」
import { PROJECT, today } from '../yuzh-common/util.js';

const TEMPLATES = [
  { name: '読書メモ', title: () => '書名',
    body: ['#読書メモ', '', '[** 要点]', '', '[** 気になった所]', '', '[** 感想]', ''] },
  { name: '知識メモ（記事・動画など）', title: () => '記事や動画のタイトル',
    body: ['#知識メモ', '[ここにURL]', `見た日：${today()}`, '', '[** メモ]', ''] },
  { name: '文化創作：一次創作', title: () => '作品名　ネタ',
    body: ['#文化創作 #一次創作', '', '[** あらすじ・ネタ]', '', '[** 本文]', ''] },
  { name: '文化創作：ブルアカ二次創作', title: () => '作品名　ネタ',
    body: ['#文化創作 #ブルアカ二次創作', '', '[** あらすじ・ネタ]', '', '[** 本文]', ''] },
  { name: '文化創作：アークナイツ二次創作', title: () => '作品名　ネタ',
    body: ['#文化創作 #アークナイツ二次創作', '', '[** あらすじ・ネタ]', '', '[** 本文]', ''] },
  { name: '文化創作：二次創作（他作品）', title: () => '原作名　ネタ',
    body: ['#文化創作 #二次創作', '原作：', '', '[** あらすじ・ネタ]', '', '[** 本文]', ''] },
  { name: '文化創作：感想', title: () => '作品名　感想',
    body: ['#文化創作 #感想', '作品：', `見た日：${today()}`, '', '[** 感想]', ''] },
  { name: 'コンピュータ', title: () => 'テーマ',
    body: ['#コンピュータ', '', '[** 目的]', '', '[** やったこと]', '', '[** わかったこと]', '', '[** 参考]', ''] },
];

const openNewPage = (title, lines) => {
  const url = `https://scrapbox.io/${PROJECT}/${encodeURIComponent(title)}?body=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_self');
};

scrapbox.PageMenu.addMenu({
  title: 'テンプレから新規作成',
  // ペンのアイコン（外部画像を使わないよう SVG を埋め込み）
  image: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#555" d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm17.7-10.2a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>'),
});
for (const t of TEMPLATES) {
  scrapbox.PageMenu('テンプレから新規作成').addItem({
    title: t.name,
    onClick: () => {
      const title = window.prompt('ページのタイトル', t.title());
      if (!title) return;
      openNewPage(title.trim(), t.body);
    },
  });
}
