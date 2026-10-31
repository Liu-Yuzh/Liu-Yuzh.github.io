// yuzh-common/util.js : どのモジュールでも使う小さな道具
export const PROJECT = scrapbox.Project.name;   // 'YuzhNote'
export const MY_TWITTER = 'basyo_engineer';     // 自分の X アカウント（小文字）

export const pad = n => String(n).padStart(2, '0');
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 画面下に小さなお知らせを出す（ms=0 で出しっぱなし）
export const toast = (msg, ms = 3500) => {
  let el = document.getElementById('yuzh-toast');
  if (!el) { el = document.createElement('div'); el.id = 'yuzh-toast'; document.body.append(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  if (ms) el._t = setTimeout(() => el.classList.remove('show'), ms);
};
