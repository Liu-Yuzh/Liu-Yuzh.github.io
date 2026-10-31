// yuzh-headings/script.js : 見出しまわり
//   ・ページメニュー「見出し」… ページ内の [* ] [** ] の見出しへ移動する
//   ・選んだ文字のメニュー「#」… 選んだ文字を [** ] の見出しにする
// 出典：/kuroma6666/kuroma6666（code:script.js の「ページの見出しを作る」「Popup Menuに小見出し表示を行うボタンを追加する」）
//      を YuzhNote 用に整理したもの

// 選んだ文字を小見出しにする
scrapbox.PopupMenu.addButton({
  title: '#',
  onClick: text => `[** ${text}]`,
});

// 見出しの一覧をページメニューに出す
const BOLD1 = '[* ';
const BOLD2 = '[** ';

// 行のノードから、飾りを除いた文字だけを取り出す
const plainText = node => {
  if (Array.isArray(node)) return node.map(plainText).join('');
  if (typeof node === 'string') return node;
  if (!node) return '';
  if (node.type === 'icon' || node.type === 'strong-icon') return node.unit?.page ?? '';
  if (node.type === 'hashTag') return '';
  return plainText(node.children);
};

scrapbox.PageMenu.addMenu({
  title: '見出し',
  // 「≡」のアイコン（外部画像を使わないよう SVG を埋め込み）
  image: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#555" d="M4 6h16v2H4zm0 5h10v2H4zm0 5h13v2H4z"/></svg>'),
  onClick: () => {
    const menu = scrapbox.PageMenu('見出し');
    menu.removeAllItems();
    let found = 0;
    for (const line of scrapbox.Page.lines || []) {
      if (line.title) continue;
      const isH1 = line.text.startsWith(BOLD1);
      const isH2 = line.text.startsWith(BOLD2);
      if (!isH1 && !isH2) continue;
      const text = line.nodes ? plainText(line.nodes) : line.text.replace(/^\[\*+\s|\]$/g, '');
      menu.addItem({
        title: (isH1 ? '● ' : '　○ ') + text,
        onClick: () => { location.hash = line.id; },
      });
      found++;
    }
    if (!found) menu.addItem({ title: '（見出しはありません）', onClick: () => null });
  },
});
