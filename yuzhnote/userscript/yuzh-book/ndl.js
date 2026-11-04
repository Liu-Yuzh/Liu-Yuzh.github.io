// yuzh-book/ndl.js : 国立国会図書館サーチ（SRU）から書誌を取る（ブラウザ拡張経由）
import { bridgeFetch } from '../yuzh-common/bridge.js';
import { fmtName, fmtDate, toIsbn13 } from './format.js';

export const NDL_SRU = 'https://ndlsearch.ndl.go.jp/api/sru?operation=searchRetrieve&recordSchema=dcndl&maximumRecords=20&query=';
export const parseNdl = xml => {
  const outer = new DOMParser().parseFromString(xml, 'text/xml');
  const DCT = 'http://purl.org/dc/terms/', FOAF = 'http://xmlns.com/foaf/0.1/', RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  return [...outer.getElementsByTagName('recordData')].map(rd => {
    const inner = rd.textContent.trim().startsWith('<') ? rd.textContent : new XMLSerializer().serializeToString(rd);
    const d = new DOMParser().parseFromString(inner, 'text/xml');
    const bib = d.getElementsByTagNameNS('http://ndl.go.jp/dcndl/terms/', 'BibResource')[0];
    if (!bib) return null;
    const kids = (ns, name) => [...bib.childNodes].filter(n => n.namespaceURI === ns && n.localName === name);
    const isbn = kids(DCT, 'identifier').filter(n => /ISBN$/.test(n.getAttributeNS(RDF, 'datatype') || '')).map(n => toIsbn13(n.textContent)).filter(Boolean)[0];
    if (!isbn) return null;
    return {
      isbn,
      title: kids(DCT, 'title')[0]?.textContent.trim() || '',
      authors: kids(DCT, 'creator').map(c => c.getElementsByTagNameNS(FOAF, 'name')[0]?.textContent).filter(Boolean).map(n => ({ name: fmtName(n) })),
      publisher: kids(DCT, 'publisher').map(p => p.getElementsByTagNameNS(FOAF, 'name')[0]?.textContent.trim()).filter(Boolean)[0] || '',
      pubdate: fmtDate(kids(DCT, 'date')[0]?.textContent || kids(DCT, 'issued')[0]?.textContent),
      cover: '', source: '国立国会図書館サーチ', sourceUrl: `https://ndlsearch.ndl.go.jp/search?cs=bib&keyword=${isbn}`,
    };
  }).filter(Boolean);
};
export const ndlByIsbn = async isbn => parseNdl(await bridgeFetch(NDL_SRU + encodeURIComponent(`isbn=${isbn}`)))[0] || null;
export const ndlByTitle = async title => parseNdl(await bridgeFetch(NDL_SRU + encodeURIComponent(`title="${title.replace(/"/g, '')}" AND dpid=iss-ndl-opac`)));
