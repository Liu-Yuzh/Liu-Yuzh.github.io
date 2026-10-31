// yuzh-tweet/tweet.js : ツイートを Cosense の引用の形にするための部品
//   >[https://x.com/ユーザー/status/ID @ユーザー]: 1行目
//   >2行目…
//   >[画像URL]
//   本文と画像は Cosense 自身の機能（ツイートを貼ったときに使う /api/embed-text/twitter）で取る
//   自分のツイートは、ブラウザ拡張経由で X の埋め込み用データを読み、スレッドの最初までさかのぼって古い順に並べる
//   他人のツイートはそのツイートだけ
import { MY_TWITTER } from '../yuzh-common/util.js';
import { blockedIndexes } from '../yuzh-common/blocks.js';
import { hasBridge, bridgeFetch } from '../yuzh-common/bridge.js';
import { imageLink } from '../yuzh-common/image.js';

export const TWEET_RE = /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(\w+)\/status\/(\d+)/;
export const tweetCache = new Map();

// Cosense の機能でツイートの本文・画像を取る
const embedText = async (screenName, id) => {
  const url = `https://x.com/${screenName}/status/${id}`;
  const res = await fetch(`/api/embed-text/twitter?url=${encodeURIComponent(url)}`, { method: 'POST' });
  if (!res.ok) throw new Error(`ツイートを取得できませんでした（${res.status}）`);
  const d = await res.json();
  if (!d.description || !d.screenName) throw new Error('ツイートの本文がありませんでした');
  return { id, screenName: d.screenName, description: d.description, images: d.images || [] };
};

// X の埋め込み用データ（syndication）。返信先がわかる。ブラウザ拡張経由でしか読めない
const syndToken = id => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
const syndCache = new Map();
const syndication = id => {
  if (!syndCache.has(id)) {
    syndCache.set(id, bridgeFetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=ja&token=${syndToken(id)}`)
      .then(JSON.parse).catch(e => { syndCache.delete(id); throw e; }));
  }
  return syndCache.get(id);
};

// 元の形式の画像 URL（.jpg / .png など）。動画・GIF はサムネイル画像
const originalImages = synd => (synd.mediaDetails || []).map(m => m.media_url_https).filter(Boolean);

// 自分のツイートの返信先を、自分のツイートが続く限りさかのぼる（古い順の ID の配列を返す）
const myAncestors = async id => {
  const chain = [];
  let cur = id;
  for (let i = 0; i < 50; i++) {
    const t = await syndication(cur);
    const parentId = t.in_reply_to_status_id_str;
    if (!parentId || (t.in_reply_to_screen_name || '').toLowerCase() !== MY_TWITTER) break;
    chain.unshift(parentId);
    cur = parentId;
  }
  return chain;
};

// ツイートを取る。自分のツイートなら、さかのぼったスレッドもあわせて古い順に返す
export const fetchTweets = (id, screenName = 'i') => {
  if (!tweetCache.has(id)) {
    tweetCache.set(id, (async () => {
      const self = await embedText(screenName, id);
      const mine = self.screenName.toLowerCase() === MY_TWITTER;
      if (!await hasBridge()) return { mine, list: [self] }; // 拡張がなければ、そのツイートだけ
      const before = [];
      if (mine) {
        const ancestors = await myAncestors(id).catch(() => []);
        for (const aid of ancestors) before.push(await embedText(self.screenName, aid));
      }
      const list = [...before, self];
      // 拡張で読める X の埋め込み用データから、画像を元の形式（png など）で取り直す
      for (const t of list) {
        const imgs = await syndication(t.id).then(originalImages).catch(() => []);
        if (imgs.length) t.images = imgs;
      }
      return { mine, list };
    })().catch(e => { tweetCache.delete(id); throw e; }));
  }
  return tweetCache.get(id);
};

// 画像の URL を、Cosense が画像として表示できる形にする
//   X の画像サーバーは拡張子で形式を選ぶ（…/XXXX.png など）。拡張子のない URL は format= の値で決める
//   webp は拡張子では取れないので、format= の値が webp のときは jpg で取る
//   それ以外の形式は yuzh-common/image.js の imageLink で、Cosense に画像と認めさせる
export const tweetImage = u => {
  const m = u.match(/^(https:\/\/pbs\.twimg\.com\/media\/[\w-]+)(?:\.(\w+))?(?:\?(.*))?$/);
  if (!m) return imageLink(u);
  let fmt = (m[2] || new URLSearchParams(m[3] || '').get('format') || 'jpg').toLowerCase();
  if (fmt === 'webp') fmt = 'jpg';
  return imageLink(`${m[1]}.${fmt}`);
};

// Cosense と同じ整え方：空行を除き、[ ] ` を空白にする
const escapeForEmbed = s => s.replace(/[\s\r\n\u2028\u2029]+/g, ' ').replace(/\s*[[\]`]\s*/g, ' ').trim();

// 1件のツイートを引用行にする（indent は元の行の字下げ）
export const tweetQuote = (t, indent = '') => {
  const url = `https://x.com/${t.screenName}/status/${t.id}`;
  const lines = t.description.split('\n').filter(l => !/^\s*$/.test(l)).map(escapeForEmbed);
  return [
    `${indent}>[${url} @${t.screenName}]: ${lines[0] || ''}`,
    ...lines.slice(1).map(l => `${indent}>${l}`),
    ...t.images.map(u => `${indent}>[${tweetImage(u)}]`),
  ];
};

// 変換の対象になる行
//  ・thread: URL（エディタから送った行）
//  ・URL だけの行（[URL] も含む）
//  ・自分のツイートの引用（スレッドの続きが足りないもの）
export const BARE_TWEET = /^(\s*)(?:thread:\s*)?\[?(https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/\w+\/status\/\d+\S*?)\]?\s*$/;
export const QUOTE_HEAD = /^(\s*)>\[(https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(\w+)\/status\/(\d+))[^\]]*\]/;

// 置き換える範囲 { start, end, indent, id } の一覧を作る
export const findTweetTargets = (lines, onlyLineIds = null) => {
  const targets = [];
  const blocked = blockedIndexes(lines.map(l => l.text)); // コードブロックと表の中は対象外
  for (let i = 1; i < lines.length; i++) {
    if (blocked.has(i)) continue;
    const text = lines[i].text;
    if (onlyLineIds && !onlyLineIds.has(lines[i].id)) continue;
    let m = text.match(BARE_TWEET);
    if (m) { const u = m[2].match(TWEET_RE); targets.push({ start: i, end: i, indent: m[1], id: u[2], screenName: u[1], kind: 'bare' }); continue; }
    m = text.match(QUOTE_HEAD);
    if (m && m[3].toLowerCase() === MY_TWITTER) {
      // スレッドの範囲：引用の行が続く間と、空行をはさんで自分のツイートの引用が続く間
      const ind = m[1];
      const isMyHead = s => { const h = s?.match(QUOTE_HEAD); return h && h[1] === ind && h[3].toLowerCase() === MY_TWITTER; };
      let end = i;
      for (;;) {
        if (lines[end + 1]?.text.startsWith(ind + '>')) { end++; continue; }
        if (lines[end + 1] && !lines[end + 1].text.trim() && isMyHead(lines[end + 2]?.text)) { end += 2; continue; }
        break;
      }
      targets.push({ start: i, end, indent: ind, id: m[4], screenName: m[3], kind: 'mine' });
      i = end; // スレッドの途中のツイートを、別のまとまりとして数えない
    }
  }
  return targets;
};
