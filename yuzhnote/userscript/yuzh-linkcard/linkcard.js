// yuzh-linkcard/linkcard.js : URL だけの行を、リンク先のカード画像（アイコン・タイトル・説明文）にする
//   [https://ricapitolare.vercel.app/svg?url=URL#.svg URL]
//   カード画像は ricapitolare（/kuroma6666 でも使っているサービス）が作る。画像を押すと元のページが開く
import { blockedIndexes } from '../yuzh-common/blocks.js';

const CARD_BASE = 'https://ricapitolare.vercel.app/svg?url=';

export const cardLine = (url, indent = '') => `${indent}[${CARD_BASE}${encodeURIComponent(url)}#.svg ${url}]`;

// カードにしない URL（それぞれ別の表示があるもの）
const SKIP = [
  /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/\w+\/status\//, // ツイート（引用にする）
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//,           // YouTube（Cosense が埋め込む）
  /\.(?:png|jpe?g|gif|webp|svg|bmp)(?:[?#].*)?$/i,                     // 画像
  /^https?:\/\/(?:i\.)?gyazo\.com\//,                                   // Gyazo
  /^https?:\/\/scrapbox\.io\//,                                         // Cosense 内のリンク
  /^https?:\/\/ricapitolare\.vercel\.app\//,                            // すでにカード
  /^https?:\/\/(?:open\.spotify\.com|www\.nicovideo\.jp\/watch|nico\.ms)\//, // Cosense が埋め込むもの
];
export const isCardable = url => /^https?:\/\/\S+$/.test(url) && !SKIP.some(re => re.test(url));

// 「URL だけ」の行：  https://… または [https://…]
const BARE_URL = /^(\s*)\[?(https?:\/\/[^\s\]]+)\]?\s*$/;

// texts（行の文字列の配列）から、カードにする行の { index, indent, url } を集める
export const findCardTargets = texts => {
  const blocked = blockedIndexes(texts);
  const out = [];
  texts.forEach((text, i) => {
    if (i === 0 || blocked.has(i)) return; // 1 行目はタイトル
    const m = text.match(BARE_URL);
    if (m && isCardable(m[2])) out.push({ index: i, indent: m[1], url: m[2] });
  });
  return out;
};

// 書き換え後の行の配列を返す
export const applyCards = texts => {
  const next = [...texts];
  for (const t of findCardTargets(texts)) next[t.index] = cardLine(t.url, t.indent);
  return next;
};
