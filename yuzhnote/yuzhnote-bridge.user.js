// ==UserScript==
// @name         YuzhNote 書誌取得ブリッジ
// @namespace    https://liu-yuzh.github.io/yuzhnote/
// @version      1.1.0
// @description  YuzhNote（Cosense）の UserScript が、国立国会図書館サーチ・版元ドットコムの書誌と、X のスレッドのつながりを読めるようにする
// @match        https://scrapbox.io/YuzhNote/*
// @match        https://scrapbox.io/YuzhNote
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @connect      ndlsearch.ndl.go.jp
// @connect      www.hanmoto.com
// @connect      cdn.syndication.twimg.com
// @run-at       document-start
// @downloadURL  https://liu-yuzh.github.io/yuzhnote/yuzhnote-bridge.user.js
// @updateURL    https://liu-yuzh.github.io/yuzhnote/yuzhnote-bridge.user.js
// ==/UserScript==

// しくみ：
//   Cosense のページ（UserScript）から window.postMessage で「この URL を読んで」と頼まれたら、
//   ブラウザ拡張の権限で取得して、本文を返す。
//   読める相手は下の ALLOWED に書いたサイトだけ。読むだけ（GET）で、送信やログイン情報は扱わない。
(function () {
  'use strict';

  const ALLOWED = ['ndlsearch.ndl.go.jp', 'www.hanmoto.com', 'cdn.syndication.twimg.com'];

  const gmRequest = (typeof GM !== 'undefined' && GM.xmlHttpRequest)
    ? opts => GM.xmlHttpRequest(opts)
    : (typeof GM_xmlhttpRequest !== 'undefined' ? opts => GM_xmlhttpRequest(opts) : null);

  const get = url => new Promise((resolve, reject) => {
    if (!gmRequest) return reject(new Error('この拡張では GM.xmlHttpRequest が使えません'));
    gmRequest({
      method: 'GET',
      url,
      timeout: 25000,
      anonymous: true, // Cookie を送らない
      onload: r => resolve({ status: r.status, text: r.responseText }),
      onerror: () => reject(new Error('通信に失敗しました')),
      ontimeout: () => reject(new Error('時間切れになりました')),
    });
  });

  window.addEventListener('message', async e => {
    // 拡張と画面では window が別物として扱われることがあるので、送り元は origin で確かめる
    if (e.origin !== 'https://scrapbox.io') return;
    const d = e.data || {};
    if (d.type === 'yuzh-bridge-ping') {
      window.postMessage({ type: 'yuzh-bridge-pong', version: '1.1.0' }, 'https://scrapbox.io');
      return;
    }
    if (d.type !== 'yuzh-bridge-req') return;

    const reply = res => window.postMessage({ type: 'yuzh-bridge-res', id: d.id, ...res }, 'https://scrapbox.io');
    let url;
    try { url = new URL(d.url); } catch { return reply({ ok: false, error: 'URL が正しくありません' }); }
    if (url.protocol !== 'https:' || !ALLOWED.includes(url.hostname)) {
      return reply({ ok: false, error: `${url.hostname} は許可されていません` });
    }
    try {
      const r = await get(url.href);
      reply({ ok: r.status >= 200 && r.status < 300, status: r.status, text: r.text });
    } catch (err) {
      reply({ ok: false, error: err.message });
    }
  });
})();
