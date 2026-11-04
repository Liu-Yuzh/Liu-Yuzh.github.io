// yuzh-linkcard/script.js : 選んだ URL をカードにするボタン（選んだ文字のメニューに「カード」を出す）
// 出典：/kuroma6666/kuroma6666 の code:script.js の「ricapitolare」ボタンを参考にしたもの
//       URL だけの行の自動変換は yuzh-finish が行う
import { cardLine, isCardable } from './linkcard.js';

scrapbox.PopupMenu.addButton({
  title: 'カード',
  onClick: text => {
    const url = text.trim();
    if (!isCardable(url)) return undefined; // URL でなければ何もしない
    return cardLine(url);
  },
});
