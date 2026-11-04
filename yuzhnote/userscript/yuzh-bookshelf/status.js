// yuzh-bookshelf/status.js : 読書の状態（#積読 #読書中 #読了）の判定と書き換え
import { today } from '../yuzh-common/util.js';
import { BIB_DONE } from '../yuzh-book/format.js';

export const STATUSES = ['積読', '読書中', '読了'];
export const DONE_DATE = /^\s*読了日：/;

const tagRe = t => new RegExp(`(^|\\s)#${t}(?=\\s|$)`);
const BOOK_TAG = /(^|\s)#読書メモ(?=\s|$)/;

// 本棚用：ページのリンク（linksLc：小文字にしたリンク先の一覧）から状態を読む
export const statusOfLinks = linksLc => STATUSES.find(s => (linksLc || []).includes(s.toLowerCase())) || '';

// ページの行から状態を読む
export const statusOfTexts = texts => STATUSES.find(s => texts.some(l => tagRe(s).test(l))) || '';

// 状態のタグを付け替えた行の配列を返す（status が '' なら外す）
//   タグは #読書メモ のすぐ後ろに置く。読了にしたときは「読了日：」の行がなければ足す
export const setStatus = (texts, status) => {
  let next = texts.flatMap((l, i) => {
    if (i === 0) return [l];
    let t = l;
    for (const s of STATUSES) t = t.replace(new RegExp(`(^|\\s)#${s}(?=\\s|$)`, 'g'), '$1').replace(/[ \t]{2,}/g, ' ');
    if (t === l) return [l];
    t = t.replace(/\s+$/, '');
    return t.trim() ? [t] : []; // 状態のタグだけの行は、行ごと消す
  });
  if (!status) return next;
  const at = next.findIndex((l, i) => i > 0 && BOOK_TAG.test(l));
  if (at < 0) next.splice(1, 0, `#${status}`);
  else next[at] = next[at].replace(BOOK_TAG, `$1#読書メモ #${status}`);
  if (status === '読了' && !next.some(l => DONE_DATE.test(l))) {
    // タグの行と書誌（from [openBD …] の行）のうち、後ろにあるほうの次の行に入れる
    const tagAt = at < 0 ? 1 : at;
    const bibAt = next.findIndex(l => BIB_DONE.test(l));
    next.splice(Math.max(tagAt, bibAt) + 1, 0, `読了日：${today()}`);
  }
  return next;
};
