// yuzh-tweet/tweet.js : ツイートを引用ブロックに書き換えるための部品（FxTwitter を使用）
//   >[https://x.com/ユーザー/status/ID @ユーザー]: 1行目
//   >2行目…
//   >[画像URL]
//   自分のツイートはスレッド全体を古い順に、1件ずつ別の引用ブロックにする
//   他人のツイートはそのツイートだけ
import { MY_TWITTER } from '../yuzh-common/util.js';

export const TWEET_RE = /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(\w+)\/status\/(\d+)/;
export const tweetCache = new Map();

export const fetchTweets = id => {
  if (!tweetCache.has(id)) {
    tweetCache.set(id, (async () => {
      const res = await fetch(`https://api.fxtwitter.com/2/thread/${id}`);
      if (!res.ok) throw new Error(`FxTwitter ${res.status}`);
      const j = await res.json();
      if (!j.status) throw new Error('ツイートが見つかりません');
      const mine = (j.status.author?.screen_name || '').toLowerCase() === MY_TWITTER;
      const list = (mine && j.thread?.length ? [...j.thread] : [j.status])
        .sort((a, b) => (a.created_timestamp || 0) - (b.created_timestamp || 0)); // 古い順
      return { mine, list };
    })().catch(e => { tweetCache.delete(id); throw e; }));
  }
  return tweetCache.get(id);
};

export const tweetMedia = t => [
  ...(t.media?.photos || []).map(p => p.url),
  ...(t.media?.videos || []).map(v => v.thumbnail_url),
].filter(Boolean).map(u => u.replace(/\?.*$/, '')); // ?name=… を外して、Cosense が画像と認識する形にする

// 1件のツイートを引用行にする（indent は元の行の字下げ）
export const tweetQuote = (t, indent = '') => {
  const sn = t.author?.screen_name || 'unknown';
  const url = `https://x.com/${sn}/status/${t.id}`;
  const [first = '', ...rest] = String(t.text || '').split('\n');
  return [
    `${indent}>[${url} @${sn}]: ${first}`,
    ...rest.map(s => `${indent}>${s}`),
    ...tweetMedia(t).map(u => `${indent}>[${u}]`),
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
  for (let i = 1; i < lines.length; i++) {
    const text = lines[i].text;
    if (onlyLineIds && !onlyLineIds.has(lines[i].id)) continue;
    let m = text.match(BARE_TWEET);
    if (m) { targets.push({ start: i, end: i, indent: m[1], id: m[2].match(TWEET_RE)[2], kind: 'bare' }); continue; }
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
      targets.push({ start: i, end, indent: ind, id: m[4], kind: 'mine' });
      i = end; // スレッドの途中のツイートを、別のまとまりとして数えない
    }
  }
  return targets;
};
