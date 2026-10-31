// yuzh-common/bridge.js : ブラウザ拡張「YuzhNote 書誌取得ブリッジ」とのやりとり
// NDL・版元ドットコムはブラウザの制限（CORS）で直接読めないため、拡張に取ってきてもらう
import { sleep } from './util.js';

let state = null; // null=確認中 / true=使える / false=見つからない
const waiters = new Map();

window.addEventListener('message', e => {
  if (e.origin !== location.origin) return; // 拡張とページでは window が別物になることがあるので origin で確かめる
  const d = e.data;
  if (d?.type === 'yuzh-bridge-pong') state = true;
  if (d?.type === 'yuzh-bridge-res' && waiters.has(d.id)) {
    waiters.get(d.id)(d);
    waiters.delete(d.id);
  }
});

export const bridgeState = () => state;

// 拡張が後から読み込まれることもあるので、見つからなかったときは毎回たずね直す
export const hasBridge = async () => {
  if (state === true) return true;
  state = null;
  window.postMessage({ type: 'yuzh-bridge-ping' }, location.origin);
  for (let i = 0; i < 15 && state === null; i++) await sleep(100);
  if (state === null) state = false;
  return state;
};

export const bridgeFetch = async url => {
  if (!await hasBridge()) throw new Error('ブラウザ拡張が入っていません');
  const id = Math.random().toString(36).slice(2);
  const res = await new Promise((resolve, reject) => {
    waiters.set(id, resolve);
    window.postMessage({ type: 'yuzh-bridge-req', id, url }, location.origin);
    setTimeout(() => { if (waiters.delete(id)) reject(new Error('拡張からの応答がありません')); }, 30000);
  });
  if (!res.ok) throw new Error(res.error || `取得に失敗（${res.status}）`);
  return res.text;
};
