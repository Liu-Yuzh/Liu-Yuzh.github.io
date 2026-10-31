// yuzh-book/openbd.js : openBD から書誌を取る（ブラウザから直接読める）
import { fmtName, fmtDate, toIsbn13, ROLE } from './format.js';

export const fromOpenbd = async isbns => {
  if (!isbns.length) return [];
  const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbns.join(',')}`);
  if (!res.ok) throw new Error(`openBD ${res.status}`);
  return (await res.json()).filter(Boolean).map(b => {
    const s = b.summary || {};
    let authors = (b.onix?.DescriptiveDetail?.Contributor || []).map(c => {
      const name = c.PersonName?.content;
      if (!name) return null;
      return { name: fmtName(name), role: (c.ContributorRole || []).map(r => ROLE[r]).find(Boolean) };
    }).filter(Boolean);
    if (!authors.length && s.author) authors = s.author.split(/\s+/).filter(Boolean).map(n => ({ name: fmtName(n) }));
    return {
      isbn: s.isbn || toIsbn13(b.onix?.RecordReference),
      title: [s.title, s.volume].filter(Boolean).join(' ').trim(),
      authors, publisher: (s.publisher || '').trim(), pubdate: fmtDate(s.pubdate),
      cover: s.cover || '', source: 'openBD', sourceUrl: 'https://openbd.jp/',
    };
  });
};
