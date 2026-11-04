// ==UserScript==
// @name         YuzhNote 書誌取得ブリッジ
// @namespace    https://liu-yuzh.github.io/yuzhnote/
// @version      1.2.0
// @description  YuzhNote（Cosense）の UserScript が、国立国会図書館サーチ・版元ドットコムの書誌と、X のスレッドのつながりを読めるようにする。メモ送信エディタが YuzhNote のページ一覧（タグの候補）を読めるようにする
// @match        https://scrapbox.io/YuzhNote/*
// @match        https://scrapbox.io/YuzhNote
// @match        https://liu-yuzh.github.io/yuzhnote/*
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @connect      ndlsearch.ndl.go.jp
// @connect      www.hanmoto.com
// @connect      cdn.syndication.twimg.com
// @connect      scrapbox.io
// @run-at       document-start
// @downloadURL  https://liu-yuzh.github.io/yuzhnote/yuzhnote-bridge.user.js
// @updateURL    https://liu-yuzh.github.io/yuzhnote/yuzhnote-bridge.user.js
// ==/UserScript==

// しくみ：
//   ページ（Cosense の UserScript や、メモ送信エディタ）から window.postMessage で「この URL を読んで」と頼まれたら、
//   ブラウザ拡張の権限で取得して、本文を返す。
//   読める相手は、頼んできたページごとに下の RULES に書いたものだけ。読むだけ（GET）で、送信はしない。
(function () {
  'use strict';

  const VERSION = '1.2.0';
  const ORIGIN = location.origin;

  // 頼んできたページ → 読んでよい URL
  const RULES = {
    // Cosense：書誌と X の埋め込み用データ。ログイン情報（Cookie）は送らない
    'https://scrapbox.io': {
      allow: url => ['ndlsearch.ndl.go.jp', 'www.hanmoto.com', 'cdn.syndication.twimg.com'].includes(url.hostname),
      anonymous: true,
    },
    // メモ送信エディタ：YuzhNote のページ一覧だけ。非公開のプロジェクトでも読めるよう、Cosense のログインのまま読む
    'https://liu-yuzh.github.io': {
      allow: url => url.hostname === 'scrapbox.io' && url.pathname === '/api/pages/YuzhNote',
      anonymous: false,
    },
  };
  const rule = RULES[ORIGIN];
  if (!rule) return;

  const gmRequest = (typeof GM !== 'undefined' && GM.xmlHttpRequest)
    ? opts => GM.xmlHttpRequest(opts)
    : (typeof GM_xmlhttpRequest !== 'undefined' ? opts => GM_xmlhttpRequest(opts) : null);

  const get = url => new Promise((resolve, reject) => {
    if (!gmRequest) return reject(new Error('この拡張では GM.xmlHttpRequest が使えません'));
    gmRequest({
      method: 'GET',
      url,
      timeout: 25000,
      anonymous: rule.anonymous,
      onload: r => resolve({ status: r.status, text: r.responseText }),
      onerror: () => reject(new Error('通信に失敗しました')),
      ontimeout: () => reject(new Error('時間切れになりました')),
    });
  });

  window.addEventListener('message', async e => {
    // 拡張と画面では window が別物として扱われることがあるので、送り元は origin で確かめる
    if (e.origin !== ORIGIN) return;
    const d = e.data || {};
    if (d.type === 'yuzh-bridge-ping') {
      window.postMessage({ type: 'yuzh-bridge-pong', version: VERSION }, ORIGIN);
      return;
    }
    if (d.type !== 'yuzh-bridge-req') return;

    const reply = res => window.postMessage({ type: 'yuzh-bridge-res', id: d.id, ...res }, ORIGIN);
    let url;
    try { url = new URL(d.url); } catch { return reply({ ok: false, error: 'URL が正しくありません' }); }
    if (url.protocol !== 'https:' || !rule.allow(url)) {
      return reply({ ok: false, error: `${url.hostname}${url.pathname} は許可されていません` });
    }
    try {
      const r = await get(url.href);
      reply({ ok: r.status >= 200 && r.status < 300, status: r.status, text: r.text });
    } catch (err) {
      reply({ ok: false, error: err.message });
    }
  });
})();
