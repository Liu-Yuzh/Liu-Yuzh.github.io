// yuzh-book/format.js : 書誌の判定と整形（ISBN・著者名・日付）
import { pad } from '../yuzh-common/util.js';

export const BIB_DONE = /^from \[(openBD|国立国会図書館サーチ|版元ドットコム)[ \]]/;
export const isBibDone = lines => lines.some(l => BIB_DONE.test(l));
export const isBookPage = lines => lines.some(l => /(^|\s)#読書メモ(\s|$)/.test(l));
export const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・:：\-－―‐,，.。!！?？「」『』()（）]/g, '');

export const toIsbn13 = s => {
  const d = String(s).replace(/[^0-9Xx]/g, '');
  if (/^97[89]\d{10}$/.test(d)) return d;
  if (/^\d{9}[\dXx]$/.test(d)) {
    const body = '978' + d.slice(0, 9);
    const sum = [...body].reduce((a, c, i) => a + Number(c) * (i % 2 ? 3 : 1), 0);
    return body + ((10 - (sum % 10)) % 10);
  }
  return null;
};

export const ROLE = { B01: '編', B06: '訳', B20: '監修', A12: '絵' };
export const fmtName = s => {
  const t = String(s).trim().replace(/\s*[0-9]{4}-([0-9]{4})?$/, ''); // NDL の生没年を外す
  return /[぀-ヿ一-鿿]/.test(t) ? t.replace(/[,，\s　]+/g, '') : t.replace(/,(\S)/, ', $1');
};
export const fmtDate = s => {
  const d = String(s || '').replace(/[^\d]/g, ' ').trim().split(/\s+/);
  if (d.length === 1 && d[0].length >= 6) { // 20061015 / 200610
    const x = d[0];
    return x.length >= 8 ? `${x.slice(0, 4)}-${x.slice(4, 6)}-${x.slice(6, 8)}` : `${x.slice(0, 4)}-${x.slice(4, 6)}`;
  }
  return d.filter(Boolean).map((p, i) => i ? pad(p) : p).join('-'); // 2024.6 → 2024-06
};
