// yuzh-finish/script.js : ページの仕上げ（ツイートの引用化・書誌の自動入力）と、そのメニュー
//   ツイート：URL だけの行は、ページを開いたときと、手を止めて5秒たったときに変換する
//   書誌：自動で入れるのは「作って30分以内のページ」だけ。古いページはメニューから
import { toast, sleep } from '../yuzh-common/util.js';
import { localText, waitSynced, writePage } from '../yuzh-common/page-io.js';
import { hasBridge, bridgeState } from '../yuzh-common/bridge.js';
import { fetchTweets, tweetQuote, findTweetTargets } from '../yuzh-tweet/tweet.js';
import { isBibDone, isBookPage } from '../yuzh-book/format.js';
import { resolveBook, findCover, bibLines } from '../yuzh-book/book.js';
import { SHELF_PAGE, SHELF_EXCLUDE } from '../yuzh-bookshelf/script.js';

const RECENT_SEC = 30 * 60;
let finishing = false;

const finishPage = async ({ manual = '' } = {}) => {
  if (finishing || scrapbox.Layout !== 'page' || !scrapbox.Page.lines?.length) return;
  const title = scrapbox.Page.title;
  const lines = scrapbox.Page.lines;
  const now = Date.now() / 1000;
  const created = lines[0]?.created;
  const isNew = typeof created === 'number' && now - created < RECENT_SEC;
  const texts = lines.map(l => l.text);
  finishing = true; // 判定中に二重に動かないようにする
  const skipKey = 'yuzh-bib-skip:' + title;
  const declined = (() => { try { return sessionStorage.getItem(skipKey); } catch { return null; } })();

  // 自分のスレッドの引用で、すでに全件そろっているものは対象から外す
  const tweetTargets = [];
  for (const t of findTweetTargets(lines)) {
    if (t.kind === 'mine') {
      const r = await fetchTweets(t.id).catch(() => null);
      const block = texts.slice(t.start, t.end + 1).join('\n');
      if (!r || !r.mine || r.list.every(tw => block.includes(`/status/${tw.id}`))) continue;
    }
    tweetTargets.push(t);
  }
  const needBib = !isBibDone(texts) && (manual === 'bib' ||
    (!manual && isBookPage(texts) && isNew && !declined && !SHELF_EXCLUDE.includes(title) && title !== SHELF_PAGE));
  const stop = msg => { if (msg) toast(msg); finishing = false; };
  if (manual === 'bib' && isBibDone(texts)) return stop('このページにはもう書誌が入っています');
  if (manual === 'tweet' && !tweetTargets.length) return stop('変換が必要なツイートはありません');
  if (!tweetTargets.length && !needBib) return stop();

  try {
    toast('ページを仕上げています。少しだけ編集を待ってください…', 0);
    const page = await waitSynced(title);
    let next = page.lines.map(l => l.text);

    // ツイート：後ろから置き換える（行番号がずれないように）
    if (tweetTargets.length) {
      const fresh = findTweetTargets(page.lines);
      for (const t of [...fresh].reverse()) {
        try {
          const { mine, list } = await fetchTweets(t.id);
          // 自分の引用ブロックが、すでにスレッド全件を含んでいれば何もしない
          if (t.kind === 'mine') {
            const block = next.slice(t.start, t.end + 1).join('\n');
            if (!mine || list.every(tw => block.includes(`/status/${tw.id}`))) continue;
          }
          // 1件ずつ別の引用ブロックにする（空行で区切る）
          const out = list.flatMap((tw, k) => [...(k ? [t.indent] : []), ...tweetQuote(tw, t.indent)]);
          // 前後の行も引用だと1つのブロックにくっつくので、空行で区切る
          if (next[t.start - 1]?.startsWith(t.indent + '>')) out.unshift(t.indent);
          if (next[t.end + 1]?.startsWith(t.indent + '>')) out.push(t.indent);
          next.splice(t.start, t.end - t.start + 1, ...out);
        } catch (e) {
          toast(`ツイートを取得できませんでした：${e.message}`);
        }
      }
    }

    if (needBib) {
      toast('本を探しています…', 0);
      const book = await resolveBook(title);
      if (book) {
        const cover = await findCover(book);
        next = [next[0], ...bibLines(book, cover), ...next.slice(1)];
      } else {
        try { sessionStorage.setItem(skipKey, '1'); } catch {}
      }
    }

    const before = page.lines.map(l => l.text);
    if (next.join('\n') === before.join('\n')) { toast('変更はありませんでした'); return; }
    // 処理中に編集されていたら上書きしない
    if (localText() !== before.join('\n')) { toast('編集中のため中止しました。手が空いたらメニューから再実行してください', 6000); return; }
    await writePage(page.title, next);
    toast('仕上げました。再読み込みします');
    await sleep(800);
    location.reload();
  } catch (e) {
    toast(`仕上げに失敗しました：${e.message}`, 6000);
  } finally {
    finishing = false;
  }
};

scrapbox.PageMenu.addItem({ title: 'ツイートを引用に変換', onClick: () => finishPage({ manual: 'tweet' }) });
scrapbox.PageMenu.addItem({ title: '書誌を入れる', onClick: () => finishPage({ manual: 'bib' }) });
scrapbox.PageMenu.addItem({
  title: () => bridgeState() ? '書誌ブリッジ：使える' : '書誌ブリッジ：見つからない',
  onClick: async () => { toast(await hasBridge() ? 'ブラウザ拡張とつながっています（NDL・版元ドットコムも探せます）' : 'ブラウザ拡張が見つかりません。入れたあとページを再読み込みしてください', 5000); },
});
hasBridge();

// 書いている途中に貼ったURLも、手を止めて5秒たったら変換する
let idleTimer = null;
scrapbox.on('lines:changed', () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => finishPage(), 5000);
});

// ページを開いたとき・切り替えたとき
const onPage = () => setTimeout(() => finishPage(), 500);
onPage();
scrapbox.on('page:changed', onPage);
scrapbox.on('layout:changed', onPage);
