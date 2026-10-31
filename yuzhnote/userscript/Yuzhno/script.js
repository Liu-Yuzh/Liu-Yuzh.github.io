// YuzhNote の UserScript の入口。機能はページごとに分けて置き、ここでは読み込むだけにする
// 各ページの説明は [UserScript一覧] を参照
const load = (page, file = 'script.js') =>
  import(`/api/code/${scrapbox.Project.name}/${page}/${file}`)
    .catch(e => console.error(`[${page}/${file}] 読み込みに失敗しました:`, e));

load('yuzh-templates');   // テンプレから新規作成
load('yuzh-charcount');   // 文字数カウント
load('yuzh-headings');    // 見出しジャンプ・見出しボタン（kuroma6666 から）
load('yuzh-bookshelf');   // 読書メモの本棚
load('yuzh-finish');      // ツイートの引用化・書誌の自動入力
load('knowledge-graph-for-Scrapbox', 'entry.js')   // 全体グラフ・ローカルグラフ（kuroma6666 から）
  .then(m => m?.run?.());
