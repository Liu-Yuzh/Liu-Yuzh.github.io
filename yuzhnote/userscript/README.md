# YuzhNote の UserScript（控え）

Cosense プロジェクト [YuzhNote](https://scrapbox.io/YuzhNote/) で動かしている UserScript の控えです。
実際に動いているのは Cosense の各ページのコードブロックで、フォルダ名がページ名、ファイル名がコードブロック名に対応します。

| フォルダ（Cosense のページ） | 内容 |
| --- | --- |
| `Yuzhno` | 入口。各ページのコードを読み込むだけ |
| `yuzh-common` | 共通の道具（日付・お知らせ表示、ページの読み書き、ブラウザ拡張とのやりとり） |
| `yuzh-templates` | テンプレから新規作成 |
| `yuzh-charcount` | 文字数カウント |
| `yuzh-headings` | 見出しジャンプ・見出しボタン（kuroma6666 の UserScript を整理したもの） |
| `yuzh-bookshelf` | 読書メモの本棚 |
| `yuzh-tweet` | ツイートの取得と、引用ブロックへの整形 |
| `yuzh-book` | 書誌の取得（openBD・国立国会図書館サーチ・版元ドットコム）と整形 |
| `yuzh-finish` | ページの仕上げ（ツイートの引用化・書誌の自動入力）とメニュー |
| `settings-style.css` | UserCSS（`settings` ページの `code:style.css`） |

全体グラフ・ローカルグラフは [/kuroma6666/knowledge-graph-for-Scrapbox](https://scrapbox.io/kuroma6666/knowledge-graph-for-Scrapbox) をそのまま写して使っているため、ここには置いていません。
