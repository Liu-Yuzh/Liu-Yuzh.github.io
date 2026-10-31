// yuzh-common/blocks.js : コードブロック（code:）と表（table:）の中の行を見分ける
// これらの中の URL は書き換えない
export const blockedIndexes = texts => {
  const blocked = new Set();
  let blockIndent = -1; // ブロックの見出し行の字下げ。-1 ならブロックの外
  texts.forEach((text, i) => {
    const indent = text.match(/^\s*/)[0].length;
    if (blockIndent >= 0) {
      if (indent > blockIndent) {
        blocked.add(i);
        return;
      }
      blockIndent = -1;
    }
    if (/^\s*(code|table):\S/.test(text)) { blocked.add(i); blockIndent = indent; }
  });
  return blocked;
};
